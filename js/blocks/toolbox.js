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

/**
 * Sötét téma: a blokk NEM telt színnel megy, hanem sötét, enyhén a kategória
 * felé színezett kitöltéssel és a kategória színével húzott kerettel.
 *
 *   colourPrimary   — a blokk kitöltése (sötét)
 *   colourSecondary — az árnyékblokkoké, pl. a beágyazott gym_number (kicsit világosabb)
 *   colourTertiary  — a keret (a kategória élénk színe)
 *
 * A legördülő menü hátterét a Blockly szintén a colourPrimary-ből veszi
 * (zelos: FIELD_DROPDOWN_COLOURED_DIV), ezért lesz a menü is sötét, fehér
 * szöveggel — külön CSS nélkül.
 */
SG.buildTheme = function () {
  return Blockly.Theme.defineTheme('scratchgym', {
    base: Blockly.Themes.Classic,

    blockStyles: {
      gym_exercise_style: {
        colourPrimary: '#16233d',
        colourSecondary: '#1e3054',
        colourTertiary: SG.COLORS.exercise
      },
      gym_control_style: {
        colourPrimary: '#2a2113',
        colourSecondary: '#3a2d18',
        colourTertiary: SG.COLORS.control
      },
      gym_progress_style: {
        colourPrimary: '#2b1619',
        colourSecondary: '#3b1e22',
        colourTertiary: SG.COLORS.progress
      },
      gym_logic_style: {
        colourPrimary: '#15271b',
        colourSecondary: '#1d3625',
        colourTertiary: SG.COLORS.logic
      },
      gym_value_style: {
        colourPrimary: '#1f1834',
        colourSecondary: '#2b2148',
        colourTertiary: SG.COLORS.value
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
      workspaceBackgroundColour: '#0b111d',
      toolboxBackgroundColour: '#111a2b',
      toolboxForegroundColour: '#e7edf9',
      flyoutBackgroundColour: '#0e1626',
      flyoutForegroundColour: '#8a99b5',
      flyoutOpacity: 1,
      scrollbarColour: '#2c3a55',
      insertionMarkerColour: '#8ab4ff',
      insertionMarkerOpacity: 0.5,
      cursorColour: '#8ab4ff'
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

  /**
   * Előre kitöltött gyakorlatblokk. Így a leggyakoribb alapgyakorlatok néven
   * húzhatók ki a listából, nem kell utólag legördülőt választani hozzájuk.
   */
  function preset(id, sets, reps, mode, weight, increment, rest) {
    return {
      kind: 'block',
      type: 'gym_exercise',
      fields: {
        EXERCISE: id,
        SETS: sets,
        REPS: reps,
        WEIGHT_MODE: mode,
        WEIGHT: weight,
        INCREMENT: increment,
        REST: rest
      }
    };
  }

  return {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: '🏋 Gyakorlatok',
        categorystyle: 'gym_exercise_category',
        contents: [
          { kind: 'block', type: 'gym_exercise' },
          preset('guggolas',       4, '5',    'progressive', 60, 5,   120),
          preset('fekvenyomas',    4, '8-12', 'progressive', 40, 2.5,  90),
          preset('felhuzas',       3, '5',    'progressive', 80, 5,   150),
          preset('vallbol_nyomas', 3, '8-12', 'progressive', 25, 2.5,  90),
          preset('evezes',         4, '8-12', 'progressive', 35, 2.5,  90),
          preset('huzodzkodas',    3, '6-10', 'bodyweight',   0, 0,    90)
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
