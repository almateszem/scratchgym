/* scratchgym — értékblokkok: számok, állapotlekérdezés, számítások.
 *
 * Mind kimenetes ('Number' vagy 'Exercise'), tehát a logikai és progressziós
 * blokkok értékbemeneteibe dughatók. Az állapot-tulajdonságok listája közös a
 * progressziós blokkokkal (SG.STATE_PROPERTY_OPTIONS, blocks-progress.js).
 *
 * A SG.defineValueBlocks()-t a main.js hívja, miután a Blockly betöltődött.
 */

window.SG = window.SG || {};

/**
 * Gyakorlat-legördülő a hivatkozásblokkhoz: a "saját gyakorlat" szentinel
 * nélkül. A gym_exercise_ref-en nincs névmező, így a szentinel értékkel nem
 * lehetne azonosítani, melyik gyakorlatról van szó.
 */
SG.exerciseRefDropdownOptions = function () {
  return SG.Exercises.map(function (ex) {
    return [ex.name + '  ·  ' + ex.category, ex.id];
  });
};

SG.defineValueBlocks = function () {

  /* ------------------------------------------------------------------ *
   * gym_number — sima szám
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_number'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldNumber(0), 'NUM');

      this.setOutput(true, 'Number');
      this.setStyle('gym_value_style');
      this.setTooltip('Egy szám. A többi értékbemenetbe ez az alapértelmezett kitöltés.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_state_value — az edzés-állapot lekérdezése
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_state_value'] = {
    init: function () {
      this.appendValueInput('EXERCISE')
        .setCheck('Exercise')
        .appendField('🏋');
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(SG.STATE_PROPERTY_OPTIONS), 'PROPERTY');

      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setStyle('gym_value_style');
      this.setTooltip('A gyakorlat egyik állapotértéke — ugyanaz a lista, amit a ' +
        'progressziós blokkok írnak.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_math — alapműveletek
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_math'] = {
    init: function () {
      this.appendValueInput('A').setCheck('Number');
      this.appendValueInput('B')
        .setCheck('Number')
        .appendField(new Blockly.FieldDropdown([
          ['+', 'add'],
          ['−', 'sub'],
          ['×', 'mul'],
          ['÷', 'div']
        ]), 'OP');

      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setStyle('gym_value_style');
      this.setTooltip('Két szám alapművelete.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_percent_of — százalékszámítás
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_percent_of'] = {
    init: function () {
      this.appendValueInput('PERCENT').setCheck('Number');
      this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('%-a ennek:');

      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setStyle('gym_value_style');
      this.setTooltip('Egy érték megadott százaléka — pl. a működő max 85%-a.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_round_plate — kerekítés tárcsalépésre
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_round_plate'] = {
    init: function () {
      this.appendValueInput('VALUE').setCheck('Number');
      this.appendValueInput('STEP')
        .setCheck('Number')
        .appendField('kerekítve');
      this.appendDummyInput()
        .appendField('kg-ra')
        .appendField(new Blockly.FieldDropdown([
          ['le',            'down'],
          ['fel',           'up'],
          ['legközelebbi',  'nearest']
        ]), 'DIRECTION');

      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setStyle('gym_value_style');
      this.setTooltip('A számolt súly kerekítése arra, ami a tárcsákból tényleg ' +
        'kirakható — pl. 2,5 kg-os lépésre.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_week_index — hol tartunk a tervben
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_week_index'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ['hét',         'week'],
          ['ciklushét',   'cycleWeek'],
          ['ciklusszám',  'cycleIndex']
        ]), 'WHICH');

      this.setOutput(true, 'Number');
      this.setStyle('gym_value_style');
      this.setTooltip('Hányadik hétnél tartunk: a terv elejétől számolva (hét), ' +
        'a cikluson belül (ciklushét), vagy hányadik ciklusban (ciklusszám).');
    }
  };

  /* ------------------------------------------------------------------ *
   * Gyakorlat-hivatkozások
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_exercise_ref'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🏋')
        .appendField(SG.createExerciseDropdown(SG.exerciseRefDropdownOptions()), 'EXERCISE');

      this.setOutput(true, 'Exercise');
      this.setStyle('gym_value_style');
      this.setTooltip('Hivatkozás a terv egy gyakorlatára.');
    }
  };

  Blockly.Blocks['gym_current_exercise'] = {
    init: function () {
      this.appendDummyInput().appendField('aktuális gyakorlat');

      this.setOutput(true, 'Exercise');
      this.setStyle('gym_value_style');
      this.setTooltip('A "minden gyakorlatra a tervben" blokkban éppen soron ' +
        'lévő gyakorlat.');
    }
  };
};
