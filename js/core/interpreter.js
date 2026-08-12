/* scratchgym — a workspace kiolvasása és feloldása.
 *
 * Egyetlen igazságforrás: az előnézet és az export is ugyanezt hívja.
 * Blockly code-generator API-t szándékosan NEM használunk — nem futtatható
 * kódot generálunk, hanem közvetlenül bejárjuk a blokkfát.
 *
 * A modul csak egy szűk blokk-interfészre támaszkodik (type, getFieldValue,
 * getNextBlock, getInputTargetBlock, isEnabled, isShadow, isInsertionMarker),
 * így Blockly nélkül, egyszerű mock-blokkokkal is tesztelhető.
 */

window.SG = window.SG || {};

SG.Interpreter = (function () {

  /* ------------------------------------------------------------------ *
   * Segédek
   * ------------------------------------------------------------------ */

  function num(block, field, fallback) {
    var raw = Number(block.getFieldValue(field));
    return isFinite(raw) ? raw : (fallback || 0);
  }

  /** Letiltott blokk = "kikommentezett": kihagyjuk. Az árnyék- és beszúrás-jelölő
   *  blokkok szerkesztés közbeni átmeneti elemek, ezek sem valódi tartalom. */
  function isUsable(block) {
    if (!block) return false;
    if (typeof block.isInsertionMarker === 'function' && block.isInsertionMarker()) return false;
    if (typeof block.isShadow === 'function' && block.isShadow()) return false;
    if (typeof block.isEnabled === 'function' && !block.isEnabled()) return false;
    return true;
  }

  /** Egy stack lineáris kibontása. getTopBlocks() csak a stack-fejeket adja. */
  function walkStack(firstBlock) {
    var out = [];
    var block = firstBlock;
    var guard = 0;
    while (block && guard++ < 10000) {
      if (isUsable(block)) out.push(block);
      block = typeof block.getNextBlock === 'function' ? block.getNextBlock() : null;
    }
    return out;
  }

  /** Figyelmeztetés-gyűjtő, ismétlődés nélkül. */
  function createWarningCollector() {
    var list = [];
    var seen = {};
    return {
      list: list,
      add: function (message) {
        if (seen[message]) return;
        seen[message] = true;
        list.push(message);
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * Blokk -> sablon (a hetektől független, deklaratív alak)
   * ------------------------------------------------------------------ */

  function readExercise(block) {
    var exerciseId = block.getFieldValue('EXERCISE');
    var isCustom = exerciseId === SG.EXERCISE_CUSTOM;

    var name;
    if (isCustom) {
      name = String(block.getFieldValue('CUSTOM_NAME') || '').trim() || 'Névtelen gyakorlat';
    } else {
      var known = SG.findExercise(exerciseId);
      // Ismeretlen id (pl. régi mentés, azóta törölt gyakorlat): az id-t mutatjuk.
      name = known ? known.name : String(exerciseId);
    }

    var mode = block.getFieldValue('WEIGHT_MODE');
    var weight;
    if (mode === 'bodyweight') {
      weight = { mode: 'bodyweight' };
    } else if (mode === 'progressive') {
      weight = {
        mode: 'progressive',
        startKg: num(block, 'WEIGHT'),
        incrementKgPerWeek: num(block, 'INCREMENT')
      };
    } else {
      weight = { mode: 'fixed', valueKg: num(block, 'WEIGHT') };
    }

    return {
      type: 'exercise',
      exerciseId: isCustom ? null : exerciseId,
      exerciseName: name,
      isCustomExercise: isCustom,
      sets: num(block, 'SETS', 1),
      reps: String(block.getFieldValue('REPS') || '').trim(),
      restAfterSec: num(block, 'REST'),
      weight: weight
    };
  }

  function readCircuit(block, warnings) {
    var inner = readActivities(block.getInputTargetBlock('DO'), warnings);
    if (!inner.length) {
      warnings.add('Van üres kör-blokk — nem tartalmaz gyakorlatot.');
    }
    return {
      type: 'circuit',
      rounds: num(block, 'ROUNDS', 1),
      restBetweenRoundsSec: num(block, 'CIRCUIT_REST'),
      activities: inner
    };
  }

  function readActivities(firstBlock, warnings) {
    return walkStack(firstBlock).map(function (block) {
      if (block.type === 'gym_circuit') return readCircuit(block, warnings);
      if (block.type === 'gym_exercise') return readExercise(block);
      return null;
    }).filter(Boolean);
  }

  /**
   * A teljes heti sablon kiolvasása.
   * @return {{weeksTotal: number, days: Array}}
   */
  function readTemplate(workspace, warnings) {
    var topBlocks = (workspace && typeof workspace.getTopBlocks === 'function')
      ? workspace.getTopBlocks(true).filter(isUsable)
      : [];

    var repeatBlocks = topBlocks.filter(function (b) { return b.type === 'gym_repeat_weeks'; });
    var looseDayHeads = topBlocks.filter(function (b) { return b.type === 'gym_day'; });

    if (repeatBlocks.length > 1) {
      warnings.add('Több „ismételd N héten át" blokk van — csak az első számít.');
    }

    var repeatBlock = repeatBlocks[0] || null;
    var weeksTotal = 1;
    var dayBlocks;

    if (repeatBlock) {
      weeksTotal = Math.max(1, Math.round(num(repeatBlock, 'WEEKS', 1)));
      dayBlocks = walkStack(repeatBlock.getInputTargetBlock('WEEK_TEMPLATE'));
      if (looseDayHeads.length) {
        warnings.add('Van napblokk az ismétlés-blokkon kívül — az nem kerül a tervbe.');
      }
    } else {
      // Nincs ciklus: a szabadon álló napok alkotnak egy egyhetes tervet.
      dayBlocks = [];
      looseDayHeads.forEach(function (head) {
        dayBlocks = dayBlocks.concat(walkStack(head));
      });
    }

    // Árva gyakorlat/kör a workspace tetején: sehova nem tartozik.
    var orphans = topBlocks.filter(function (b) {
      return b.type === 'gym_exercise' || b.type === 'gym_circuit';
    });
    if (orphans.length) {
      warnings.add('Van gyakorlat vagy kör, ami nincs egyetlen napban sem — az kimarad a tervből.');
    }

    // Napok csoportosítása. Duplikált nap esetén összefűzünk, nem dobunk el.
    var byDay = {};
    SG.DAYS.forEach(function (day) { byDay[day.value] = []; });

    var seenDays = {};
    dayBlocks.forEach(function (block) {
      var dayValue = block.getFieldValue('DAY');
      if (!byDay[dayValue]) byDay[dayValue] = [];
      if (seenDays[dayValue]) {
        warnings.add('Ugyanaz a nap többször szerepel — a gyakorlatok egymás után kerülnek be.');
      }
      seenDays[dayValue] = true;
      byDay[dayValue] = byDay[dayValue].concat(
        readActivities(block.getInputTargetBlock('ACTIVITIES'), warnings)
      );
    });

    var days = SG.DAYS.map(function (day) {
      return {
        dayOfWeek: day.value,
        dayLabelHu: day.label,
        activities: byDay[day.value]
      };
    });

    if (!repeatBlock && hasProgressiveExercise(days)) {
      warnings.add('Van progresszív gyakorlat, de nincs „ismételd N héten át" blokk — ' +
        'a terv egyhetes, a súlyok a kezdőértéken maradnak.');
    }

    return { weeksTotal: weeksTotal, days: days };
  }

  function hasProgressiveExercise(days) {
    function scan(activities) {
      for (var i = 0; i < activities.length; i++) {
        var activity = activities[i];
        if (activity.type === 'circuit') {
          if (scan(activity.activities)) return true;
        } else if (activity.weight && activity.weight.mode === 'progressive') {
          return true;
        }
      }
      return false;
    }
    for (var i = 0; i < days.length; i++) {
      if (scan(days[i].activities)) return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------ *
   * Sablon -> konkrét heti értékek
   * ------------------------------------------------------------------ */

  function resolveActivity(template, week) {
    if (template.type === 'circuit') {
      return {
        type: 'circuit',
        rounds: template.rounds,
        restBetweenRoundsSec: template.restBetweenRoundsSec,
        activities: template.activities.map(function (child) {
          return resolveActivity(child, week);
        })
      };
    }

    var weightKg = null;
    var isBodyweight = false;

    if (template.weight.mode === 'bodyweight') {
      isBodyweight = true;
    } else if (template.weight.mode === 'fixed') {
      weightKg = template.weight.valueKg;
    } else {
      weightKg = SG.Progression.weightForWeek({
        startKg: template.weight.startKg,
        incrementKgPerWeek: template.weight.incrementKgPerWeek
      }, week);
    }

    return {
      type: 'exercise',
      exerciseId: template.exerciseId,
      exerciseName: template.exerciseName,
      isCustomExercise: template.isCustomExercise,
      sets: template.sets,
      reps: template.reps,
      restAfterSec: template.restAfterSec,
      // Honnan jött a súly: 'fixed' | 'progressive' | 'bodyweight'. A fogyasztó
      // app ebből tudja, hogy az érték hetente változik-e.
      weightMode: template.weight.mode,
      weightKg: weightKg,
      isBodyweight: isBodyweight
    };
  }

  function resolveWeek(days, week) {
    return {
      week: week,
      days: days.map(function (day) {
        return {
          dayOfWeek: day.dayOfWeek,
          dayLabelHu: day.dayLabelHu,
          activities: day.activities.map(function (activity) {
            return resolveActivity(activity, week);
          })
        };
      })
    };
  }

  /* ------------------------------------------------------------------ *
   * Publikus API
   * ------------------------------------------------------------------ */

  /**
   * A teljes program kiszámítása.
   * @return {{weeksTotal, template, resolvedWeeks, warnings}}
   */
  function computeProgram(workspace) {
    var warnings = createWarningCollector();
    var parsed = readTemplate(workspace, warnings);

    var resolvedWeeks = [];
    for (var week = 1; week <= parsed.weeksTotal; week++) {
      resolvedWeeks.push(resolveWeek(parsed.days, week));
    }

    return {
      weeksTotal: parsed.weeksTotal,
      template: { days: parsed.days },
      resolvedWeeks: resolvedWeeks,
      warnings: warnings.list
    };
  }

  /** Egyetlen hét feloldott adata. */
  function computeWeek(workspace, week) {
    var warnings = createWarningCollector();
    var parsed = readTemplate(workspace, warnings);
    var clamped = Math.min(Math.max(1, week || 1), parsed.weeksTotal);
    return resolveWeek(parsed.days, clamped);
  }

  /** Csak a figyelmeztetések (nem blokkoló, magyar nyelvű szövegek). */
  function validate(workspace) {
    var warnings = createWarningCollector();
    readTemplate(workspace, warnings);
    return warnings.list;
  }

  return {
    computeProgram: computeProgram,
    computeWeek: computeWeek,
    validate: validate,
    // tesztelhetőség / újrafelhasználás miatt kivezetve
    walkStack: walkStack,
    resolveActivity: resolveActivity
  };
})();
