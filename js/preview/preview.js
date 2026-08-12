/* scratchgym — élő előnézet panel.
 *
 * A számolt programot cache-eljük: a hét-csúszka mozgatása csak újrarendereli
 * a már kiszámolt hetet, nem indít újraszámolást.
 *
 * Minden szöveg textContent-tel kerül a DOM-ba (nincs innerHTML), így a
 * felhasználó által beírt saját gyakorlatnevek nem tudnak markupot injektálni.
 */

window.SG = window.SG || {};

SG.Preview = (function () {

  var program = null;
  var selectedWeek = 1;

  var el = {};

  function init() {
    el.grid = document.getElementById('weekGrid');
    el.warnings = document.getElementById('warnings');
    el.control = document.getElementById('weekControl');
    el.slider = document.getElementById('weekSlider');
    el.readout = document.getElementById('weekReadout');
    el.note = document.getElementById('weekNote');

    el.slider.addEventListener('input', function () {
      selectedWeek = Number(el.slider.value) || 1;
      renderWeek();
      renderReadout();
    });
  }

  /** Új számítási eredmény érkezett a workspace-ből. */
  function update(nextProgram) {
    program = nextProgram;

    if (selectedWeek > program.weeksTotal) selectedWeek = program.weeksTotal;
    if (selectedWeek < 1) selectedWeek = 1;

    var multiWeek = program.weeksTotal > 1;
    el.control.hidden = !multiWeek;
    el.slider.max = String(program.weeksTotal);
    el.slider.value = String(selectedWeek);

    el.note.textContent = multiWeek
      ? ''
      : 'Egyhetes terv (nincs progresszió).';

    renderWarnings();
    renderReadout();
    renderWeek();
  }

  function renderReadout() {
    el.readout.textContent = selectedWeek + ' / ' + program.weeksTotal;
  }

  function renderWarnings() {
    el.warnings.textContent = '';
    if (!program.warnings.length) {
      el.warnings.hidden = true;
      return;
    }
    el.warnings.hidden = false;

    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'dismiss';
    dismiss.textContent = '×';
    dismiss.title = 'Elrejtés';
    dismiss.addEventListener('click', function () { el.warnings.hidden = true; });
    el.warnings.appendChild(dismiss);

    var list = document.createElement('ul');
    program.warnings.forEach(function (message) {
      var item = document.createElement('li');
      item.textContent = message;
      list.appendChild(item);
    });
    el.warnings.appendChild(list);
  }

  function renderWeek() {
    el.grid.textContent = '';
    var week = program.resolvedWeeks[selectedWeek - 1];
    if (!week) return;

    week.days.forEach(function (day) {
      el.grid.appendChild(renderDay(day));
    });
  }

  function renderDay(day) {
    var card = document.createElement('section');
    card.className = 'day-card' + (day.activities.length ? '' : ' is-empty');

    var heading = document.createElement('h3');
    heading.textContent = day.dayLabelHu;
    card.appendChild(heading);

    var body = document.createElement('div');
    body.className = 'day-body';

    if (!day.activities.length) {
      var note = document.createElement('p');
      note.className = 'empty-note';
      note.textContent = 'Nincs gyakorlat';
      body.appendChild(note);
    } else {
      body.appendChild(renderActivityList(day.activities));
    }

    card.appendChild(body);
    return card;
  }

  function renderActivityList(activities) {
    var list = document.createElement('ul');
    list.className = 'activity-list';
    activities.forEach(function (activity) {
      list.appendChild(activity.type === 'circuit'
        ? renderCircuit(activity)
        : renderExercise(activity));
    });
    return list;
  }

  function renderCircuit(circuit) {
    var item = document.createElement('li');
    item.className = 'activity';

    var head = document.createElement('div');
    head.className = 'circuit-head';
    head.textContent = '🔁 Kör × ' + circuit.rounds +
      ' (pihenő: ' + formatSeconds(circuit.restBetweenRoundsSec) + ')';
    item.appendChild(head);

    if (circuit.activities.length) {
      item.appendChild(renderActivityList(circuit.activities));
    } else {
      var empty = document.createElement('div');
      empty.className = 'circuit-empty';
      empty.textContent = 'üres kör';
      item.appendChild(empty);
    }

    return item;
  }

  function renderExercise(exercise) {
    var item = document.createElement('li');
    item.className = 'activity';

    var name = document.createElement('div');
    name.className = 'ex-name';
    name.textContent = exercise.exerciseName;
    item.appendChild(name);

    var meta = document.createElement('span');
    meta.className = 'ex-meta';

    meta.appendChild(document.createTextNode(
      exercise.sets + ' × ' + (exercise.reps || '?') + '  ·  '));

    var weight = document.createElement('span');
    weight.className = 'weight';
    if (exercise.isBodyweight) {
      weight.textContent = 'testsúly';
    } else {
      weight.textContent = formatKg(exercise.weightKg);
      // A progresszív súly hetente változik — kiemeljük, hogy látszódjon,
      // erre hat a hét-csúszka.
      if (exercise.weightMode === 'progressive') weight.classList.add('is-progressive');
    }
    meta.appendChild(weight);

    meta.appendChild(document.createTextNode(
      '  ·  ⏱ ' + formatSeconds(exercise.restAfterSec)));

    item.appendChild(meta);
    return item;
  }

  function formatKg(value) {
    if (value === null || value === undefined) return '—';
    return (Math.round(value * 100) / 100) + ' kg';
  }

  function formatSeconds(total) {
    var seconds = Math.max(0, Math.round(Number(total) || 0));
    if (seconds < 60) return seconds + ' mp';
    var minutes = Math.floor(seconds / 60);
    var rest = seconds % 60;
    return rest ? (minutes + ':' + String(rest).padStart(2, '0') + ' perc')
                : (minutes + ' perc');
  }

  return {
    init: init,
    update: update
  };
})();
