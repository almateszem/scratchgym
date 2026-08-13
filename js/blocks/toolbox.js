/* scratchgym — Blockly téma és toolbox.
   A SG.buildTheme()/SG.buildToolbox()-t a main.js hívja a Blockly betöltése után. */

window.SG = window.SG || {};

SG.COLORS = {
  exercise: '#4c97ff',
  control: '#ff9f1a',
  progress: '#e8514b',
  logic: '#59c059',
  value: '#9966ff'
};

SG.buildTheme = function () {
  return Blockly.Theme.defineTheme('scratchgym', {
    base: Blockly.Themes.Classic,

    blockStyles: {
      gym_exercise_style: {
        colourPrimary: SG.COLORS.exercise,
        colourSecondary: '#3373cc',
        colourTertiary: '#2b5ea6'
      },
      gym_control_style: {
        colourPrimary: SG.COLORS.control,
        colourSecondary: '#e08800',
        colourTertiary: '#b06a00'
      },
      gym_progress_style: {
        colourPrimary: SG.COLORS.progress,
        colourSecondary: '#c8403a',
        colourTertiary: '#a3332e'
      },
      gym_logic_style: {
        colourPrimary: SG.COLORS.logic,
        colourSecondary: '#46b946',
        colourTertiary: '#389438'
      },
      gym_value_style: {
        colourPrimary: SG.COLORS.value,
        colourSecondary: '#855cd6',
        colourTertiary: '#774dcb'
      }
    },

    categoryStyles: {
      gym_exercise_category: { colour: SG.COLORS.exercise },
      gym_control_category: { colour: SG.COLORS.control },
      gym_progress_category: { colour: SG.COLORS.progress },
      gym_logic_category: { colour: SG.COLORS.logic },
      gym_value_category: { colour: SG.COLORS.value }
    },

    componentStyles: {
      workspaceBackgroundColour: '#f7f8fb',
      toolboxBackgroundColour: '#ffffff',
      toolboxForegroundColour: '#1e2a3a',
      flyoutBackgroundColour: '#eef1f7',
      flyoutForegroundColour: '#6b7a90',
      flyoutOpacity: 1,
      scrollbarColour: '#c3cbd9',
      insertionMarkerColour: '#1e2a3a',
      insertionMarkerOpacity: 0.3,
      cursorColour: '#1e2a3a'
    }
  });
};

SG.buildToolbox = function () {

  /* Shadow-kitöltések: a toolboxból kihúzott blokk így rögtön ki van töltve,
     de a foglalatba húzott saját blokk azonnal felülírja. */

  function num(value) {
    return { shadow: { type: 'gym_number', fields: { NUM: value } } };
  }

  function exercise() {
    return { shadow: { type: 'gym_exercise_ref' } };
  }

  return {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: '🏋 Gyakorlatok',
        categorystyle: 'gym_exercise_category',
        contents: [
          { kind: 'block', type: 'gym_exercise' }
        ]
      },
      {
        kind: 'category',
        name: '📅 Napok és körök',
        categorystyle: 'gym_control_category',
        contents: [
          { kind: 'block', type: 'gym_day' },
          { kind: 'block', type: 'gym_circuit' }
        ]
      },
      {
        kind: 'category',
        name: '🔁 Progresszió',
        categorystyle: 'gym_progress_category',
        contents: [
          { kind: 'block', type: 'gym_repeat_weeks' },
          { kind: 'block', type: 'gym_on_week_close' },
          {
            kind: 'block',
            type: 'gym_change_state',
            inputs: { EXERCISE: exercise(), DELTA: num(2.5) }
          },
          {
            kind: 'block',
            type: 'gym_set_state',
            inputs: { EXERCISE: exercise(), VALUE: num(0) }
          },
          {
            kind: 'block',
            type: 'gym_deload',
            inputs: { EXERCISE: exercise(), PERCENT: num(10) }
          },
          {
            kind: 'block',
            type: 'gym_reset_counter',
            inputs: { EXERCISE: exercise() }
          }
        ]
      },
      {
        kind: 'category',
        name: '🧠 Logika',
        categorystyle: 'gym_logic_category',
        contents: [
          { kind: 'block', type: 'gym_if' },
          { kind: 'block', type: 'gym_switch_week' },
          { kind: 'block', type: 'gym_for_each' },
          {
            kind: 'block',
            type: 'gym_compare',
            inputs: { A: num(0), B: num(0) }
          },
          { kind: 'block', type: 'gym_and' },
          { kind: 'block', type: 'gym_or' },
          { kind: 'block', type: 'gym_not' },
          {
            kind: 'block',
            type: 'gym_all_sets_done',
            inputs: { EXERCISE: exercise() }
          },
          {
            kind: 'block',
            type: 'gym_week_multiple',
            inputs: { N: num(4) }
          }
        ]
      },
      {
        kind: 'category',
        name: '🔢 Értékek',
        categorystyle: 'gym_value_category',
        contents: [
          { kind: 'block', type: 'gym_number' },
          {
            kind: 'block',
            type: 'gym_state_value',
            inputs: { EXERCISE: exercise() }
          },
          {
            kind: 'block',
            type: 'gym_math',
            inputs: { A: num(0), B: num(0) }
          },
          {
            kind: 'block',
            type: 'gym_percent_of',
            inputs: { PERCENT: num(85), VALUE: num(0) }
          },
          {
            kind: 'block',
            type: 'gym_round_plate',
            inputs: { VALUE: num(0), STEP: num(2.5) }
          },
          { kind: 'block', type: 'gym_week_index' },
          { kind: 'block', type: 'gym_exercise_ref' },
          { kind: 'block', type: 'gym_current_exercise' }
        ]
      }
    ]
  };
};

/**
 * Kezdő workspace új felhasználónak: egy 8 hetes ciklus, hétfői nappal és két
 * gyakorlattal — hogy az előnézet és a hét-csúszka rögtön mutasson valamit.
 * Blockly serialization formátum (ugyanaz, amit a localStorage is tárol).
 */
SG.starterWorkspace = function () {
  function exercise(id, sets, reps, mode, weight, increment, rest, next) {
    var block = {
      type: 'gym_exercise',
      fields: {
        EXERCISE: id,
        CUSTOM_NAME: 'Saját gyakorlat',
        SETS: sets,
        REPS: reps,
        WEIGHT_MODE: mode,
        WEIGHT: weight,
        INCREMENT: increment,
        REST: rest
      }
    };
    if (next) block.next = { block: next };
    return block;
  }

  return {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'gym_repeat_weeks',
          x: 60,
          y: 60,
          fields: { WEEKS: 8 },
          inputs: {
            WEEK_TEMPLATE: {
              block: {
                type: 'gym_day',
                fields: { DAY: 'monday' },
                inputs: {
                  ACTIVITIES: {
                    block: exercise('guggolas', 4, '5', 'progressive', 60, 5, 120,
                      exercise('fekvenyomas', 4, '8-12', 'progressive', 40, 2.5, 90))
                  }
                }
              }
            }
          }
        }
      ]
    }
  };
};
