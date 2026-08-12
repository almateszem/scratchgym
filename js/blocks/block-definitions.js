/* scratchgym — a négy egyedi Blockly blokk.
 *
 * Kapcsolat-típusok:
 *   'GymActivity' — gyakorlat és kör; mindkettő ugyanezt használja, ezért a kör
 *                   tetszőleges mélységben ágyazható önmagába, külön logika nélkül.
 *   'GymDay'      — napblokkok, a heti sablon stackje.
 *
 * A SG.defineBlocks()-t a main.js hívja, miután a Blockly betöltődött.
 */

window.SG = window.SG || {};

SG.defineBlocks = function () {

  /** Újrarenderelés verzió-biztosan (Blockly 11-ben queueRender, régebben render). */
  function rerender(block) {
    if (!block.rendered) return;
    if (typeof block.queueRender === 'function') block.queueRender();
    else if (typeof block.render === 'function') block.render();
  }

  /* ------------------------------------------------------------------ *
   * gym_exercise — egy gyakorlat
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_exercise'] = {
    init: function () {
      var DropdownCls = SG.FieldSearchableDropdown || Blockly.FieldDropdown;

      this.appendDummyInput('ROW_NAME')
        .appendField('🏋')
        .appendField(new DropdownCls(SG.exerciseDropdownOptions(), function (newValue) {
          var block = this.getSourceBlock();
          // A validátor a mező konstruktorából is lefuthat, amikor még nincs blokk.
          if (block) block.updateCustomVisibility_(newValue);
        }), 'EXERCISE');

      this.appendDummyInput('ROW_CUSTOM')
        .appendField('neve:')
        .appendField(new Blockly.FieldTextInput('Saját gyakorlat'), 'CUSTOM_NAME');

      // A pihenő szándékosan ugyanebben a sorban van: mindig látszik, és így
      // két sorral alacsonyabb a blokk a magas Zelos rendererben.
      this.appendDummyInput('ROW_SETS')
        .appendField('sorozat')
        .appendField(new Blockly.FieldNumber(3, 1, 99, 1), 'SETS')
        .appendField('× ismétlés')
        .appendField(new Blockly.FieldTextInput('8-12'), 'REPS')
        .appendField('⏱ pihenő')
        .appendField(new Blockly.FieldNumber(90, 0, 3600, 5), 'REST')
        .appendField('mp');

      this.appendDummyInput('ROW_MODE')
        .appendField('⚖ súly:')
        .appendField(new Blockly.FieldDropdown([
          ['fix', 'fixed'],
          ['progresszív', 'progressive'],
          ['testsúly', 'bodyweight']
        ], function (newValue) {
          var block = this.getSourceBlock();
          if (block) block.updateWeightVisibility_(newValue);
        }), 'WEIGHT_MODE');

      this.appendDummyInput('ROW_WEIGHT')
        .appendField(new Blockly.FieldLabel('érték'), 'WEIGHT_LABEL')
        .appendField(new Blockly.FieldNumber(20, 0, 1000, 0.5), 'WEIGHT')
        .appendField('kg');

      this.appendDummyInput('ROW_INCREMENT')
        .appendField('hetente')
        .appendField(new Blockly.FieldNumber(2.5, -100, 100, 0.5), 'INCREMENT')
        .appendField('kg');

      this.setPreviousStatement(true, 'GymActivity');
      this.setNextStatement(true, 'GymActivity');
      this.setStyle('gym_exercise_style');
      this.setTooltip('Egy gyakorlat: sorozat, ismétlés, súly és pihenő.\n' +
        'Progresszív módban a súly hetente nő a megadott növekménnyel.');

      // Kezdeti láthatóság. Betöltéskor a mentett értékek setValue-ja hívja a
      // validátorokat, azok pedig ismét ezeket a metódusokat.
      this.updateCustomVisibility_(this.getFieldValue('EXERCISE'));
      this.updateWeightVisibility_(this.getFieldValue('WEIGHT_MODE'));
    },

    /** A "saját gyakorlat" névmező csak a szentinel opciónál látszik. */
    updateCustomVisibility_: function (exerciseValue) {
      var input = this.getInput('ROW_CUSTOM');
      if (!input) return;
      input.setVisible(exerciseValue === SG.EXERCISE_CUSTOM);
      rerender(this);
    },

    /** Testsúlynál nincs súlymező; a növekmény csak progresszív módban kell. */
    updateWeightVisibility_: function (mode) {
      var weightRow = this.getInput('ROW_WEIGHT');
      var incrementRow = this.getInput('ROW_INCREMENT');
      if (!weightRow || !incrementRow) return;

      weightRow.setVisible(mode === 'fixed' || mode === 'progressive');
      incrementRow.setVisible(mode === 'progressive');

      var label = this.getField('WEIGHT_LABEL');
      if (label) label.setValue(mode === 'progressive' ? 'kezdő' : 'érték');

      rerender(this);
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_circuit — szuperszett / köredzés
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_circuit'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🔁 kör ×')
        .appendField(new Blockly.FieldNumber(3, 1, 99, 1), 'ROUNDS')
        .appendField('⏱ pihenő körök közt')
        .appendField(new Blockly.FieldNumber(60, 0, 3600, 5), 'CIRCUIT_REST')
        .appendField('mp');

      this.appendStatementInput('DO').setCheck('GymActivity');

      this.setPreviousStatement(true, 'GymActivity');
      this.setNextStatement(true, 'GymActivity');
      this.setStyle('gym_control_style');
      this.setTooltip('Szuperszett / köredzés: a benne lévő gyakorlatok N körben ' +
        'ismétlődnek. Kör a körbe is tehető.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_day — egy nap a hétből
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_day'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('📅')
        .appendField(new Blockly.FieldDropdown(SG.dayDropdownOptions()), 'DAY');

      this.appendStatementInput('ACTIVITIES').setCheck('GymActivity');

      this.setPreviousStatement(true, 'GymDay');
      this.setNextStatement(true, 'GymDay');
      this.setStyle('gym_control_style');
      this.setTooltip('A hét egy napja. Ide kerülnek az aznapi gyakorlatok és körök.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_repeat_weeks — a többhetes ciklus
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_repeat_weeks'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🔁 ismételd')
        .appendField(new Blockly.FieldNumber(8, 1, 104, 1), 'WEEKS')
        .appendField('héten át');

      this.appendStatementInput('WEEK_TEMPLATE').setCheck('GymDay');

      // Kalap-blokk: nincs előző/következő kapcsolat, ez a program gyökere.
      this.setStyle('gym_progress_style');
      this.hat = 'cap';
      this.setTooltip('A benne lévő heti sablon ennyi héten át ismétlődik.\n' +
        'A súlyok hetente a gyakorlatokon beállított növekmény szerint nőnek.');
    }
  };
};
