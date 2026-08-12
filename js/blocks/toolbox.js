/* scratchgym — Blockly téma és toolbox.
   A SG.buildTheme()/SG.buildToolbox()-t a main.js hívja a Blockly betöltése után. */

window.SG = window.SG || {};

SG.COLORS = {
  exercise: '#4c97ff',
  control: '#ff9f1a',
  progress: '#e8514b'
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
      }
    },

    categoryStyles: {
      gym_exercise_category: { colour: SG.COLORS.exercise },
      gym_control_category: { colour: SG.COLORS.control },
      gym_progress_category: { colour: SG.COLORS.progress }
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
          { kind: 'block', type: 'gym_repeat_weeks' }
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
