/* scratchgym — progressziós utasításblokkok.
 *
 * Ezek a blokkok az edzés-állapotot írják: a hét lezárásakor lefutó szabályok.
 * Egyelőre csak összerakhatók — a kiértékelést külön lépésben kapják meg.
 *
 * Kapcsolat-típusok:
 *   'GymRule'  — progressziós utasítás; ezek stackelhetők egymás alá, és csak
 *                ilyen mehet a kalap, a gym_if és a gym_for_each belsejébe.
 *                (Így nem lehet gyakorlatot vagy napot szabály közé tenni.)
 *   'Exercise' — melyik gyakorlat állapotáról van szó (értékblokk).
 *   'Number'   — a mennyiségek, szintén értékblokkból.
 *
 * A SG.defineProgressBlocks()-t a main.js hívja, miután a Blockly betöltődött.
 */

window.SG = window.SG || {};

/**
 * Az edzés-állapot tulajdonságai. A `value` a stabil enum (ez kerül majd az
 * exportba és az értelmezőbe), a felirat csak a szerkesztőnek szól.
 * A gym_state_value ugyanezt a listát használja — ezért van itt, közösen.
 */
SG.STATE_PROPERTY_OPTIONS = [
  ['működő max (kg)',        'workingMaxKg'],
  ['utolsó súly (kg)',       'lastWeightKg'],
  ['utolsó ismétlésszám',    'lastReps'],
  ['legjobb súly (kg)',      'bestWeightKg'],
  ['egymás utáni sikerek',   'consecutiveSuccess'],
  ['egymás utáni bukások',   'consecutiveFail'],
  ['edzések száma',          'sessionCount']
];

/** Melyik számlálót nullázzuk. */
SG.COUNTER_RESET_OPTIONS = [
  ['egymás utáni bukások',  'consecutiveFail'],
  ['egymás utáni sikerek',  'consecutiveSuccess'],
  ['mindkettő',             'both']
];

SG.defineProgressBlocks = function () {

  /** "🏋 [gyakorlat]" értékbemenet — minden állapotíró blokk ezzel kezdődik. */
  function appendExerciseInput(block) {
    return block.appendValueInput('EXERCISE')
      .setCheck('Exercise')
      .appendField('🏋');
  }

  /** Egy sorban futó, szabálylánchoz kapcsolható utasításblokk alapbeállításai. */
  function asRuleStatement(block) {
    block.setInputsInline(true);
    block.setPreviousStatement(true, 'GymRule');
    block.setNextStatement(true, 'GymRule');
    block.setStyle('gym_progress_style');
  }

  /* ------------------------------------------------------------------ *
   * gym_on_week_close — a szabályok gyökere
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_on_week_close'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('🏁 hét lezárásakor');

      this.appendStatementInput('DO').setCheck('GymRule');

      // Kalap-blokk: nincs előző/következő kapcsolat, ez a szabálylánc gyökere.
      this.setStyle('gym_progress_style');
      this.hat = 'cap';
      this.setTooltip('A benne lévő szabályok minden hét lezárásakor lefutnak, ' +
        'a következő hét súlyainak kiszámítása előtt.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_change_state — relatív változtatás
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_change_state'] = {
    init: function () {
      appendExerciseInput(this);

      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(SG.STATE_PROPERTY_OPTIONS), 'PROPERTY')
        .appendField('változzon');

      this.appendValueInput('DELTA').setCheck('Number');

      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ['kg', 'kg'],
          ['%', 'percent']
        ]), 'UNIT');

      asRuleStatement(this);
      this.setTooltip('A gyakorlat egyik állapotértékét a megadott mennyiséggel ' +
        'változtatja. Kg-ban vagy a jelenlegi érték százalékában.\n' +
        'Negatív értékkel csökkent.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_set_state — abszolút beállítás
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_set_state'] = {
    init: function () {
      appendExerciseInput(this);

      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(SG.STATE_PROPERTY_OPTIONS), 'PROPERTY')
        .appendField('legyen');

      this.appendValueInput('VALUE').setCheck('Number');

      asRuleStatement(this);
      this.setTooltip('A gyakorlat egyik állapotértékét a megadott értékre állítja, ' +
        'a korábbitól függetlenül.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_deload — visszalépés a súlyokban
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_deload'] = {
    init: function () {
      appendExerciseInput(this);

      this.appendValueInput('PERCENT')
        .setCheck('Number')
        .appendField('deload');

      this.appendDummyInput()
        .appendField('%');

      asRuleStatement(this);
      this.setTooltip('Deload: a gyakorlat működő maxát a megadott százalékkal ' +
        'csökkenti — tipikusan sorozatos bukás után.');
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_reset_counter — számlálók nullázása
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_reset_counter'] = {
    init: function () {
      appendExerciseInput(this);

      this.appendDummyInput()
        .appendField('számláló nullázása:')
        .appendField(new Blockly.FieldDropdown(SG.COUNTER_RESET_OPTIONS), 'COUNTER');

      asRuleStatement(this);
      this.setTooltip('A siker- vagy bukásszámlálót nullázza — általában akkor, ' +
        'amikor a szabály már reagált a sorozatra.');
    }
  };
};
