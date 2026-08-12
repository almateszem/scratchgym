/* scratchgym — gyakorlat-adatbázis.
   Bővítés: egyszerűen fűzz hozzá új {id, name, category} elemet a tömbhöz.
   Az `id` stabil, ékezet nélküli kulcs — ez kerül az exportba, ezért
   meglévő elem id-jét utólag NE írd át (a korábban mentett tervek rá hivatkoznak). */

window.SG = window.SG || {};

/** A "saját gyakorlat" opció szentinel értéke a legördülő listában. */
SG.EXERCISE_CUSTOM = '__CUSTOM__';

SG.Exercises = [
  // Mell
  { id: 'fekvenyomas',        name: 'Fekvőnyomás',            category: 'Mell' },
  { id: 'ferde_fekvenyomas',  name: 'Ferde fekvőnyomás',      category: 'Mell' },
  { id: 'mellpres_gep',       name: 'Mellprés gépben',        category: 'Mell' },
  { id: 'fekvotamasz',        name: 'Fekvőtámasz',            category: 'Mell' },

  // Hát
  { id: 'huzodzkodas',        name: 'Húzódzkodás',            category: 'Hát' },
  { id: 'lehuzas',            name: 'Lehúzás',                category: 'Hát' },
  { id: 'evezes',             name: 'Evezés',                 category: 'Hát' },
  { id: 'egykaros_evezes',    name: 'Egykaros evezés',        category: 'Hát' },

  // Láb
  { id: 'guggolas',           name: 'Guggolás',               category: 'Láb' },
  { id: 'labtolas',           name: 'Lábtolás',               category: 'Láb' },
  { id: 'kitores',            name: 'Kitörés',                category: 'Láb' },
  { id: 'combhajlito_gep',    name: 'Combhajlító gépben',     category: 'Láb' },
  { id: 'combfeszito_gep',    name: 'Combfeszítő gépben',     category: 'Láb' },
  { id: 'vadliemeles',        name: 'Vádliemelés',            category: 'Láb' },

  // Váll
  { id: 'vallbol_nyomas',     name: 'Vállból nyomás',         category: 'Váll' },
  { id: 'oldalemeles',        name: 'Oldalemelés',            category: 'Váll' },
  { id: 'hatso_vallemeles',   name: 'Hátsó vállemelés',       category: 'Váll' },

  // Kar
  { id: 'bicepsz_hajlitas',   name: 'Bicepsz-hajlítás',       category: 'Kar' },
  { id: 'tricepsz_nyomas',    name: 'Tricepsz-nyomás',        category: 'Kar' },
  { id: 'kotelhuzas_tricepsz', name: 'Kötélhúzás tricepszre', category: 'Kar' },

  // Törzs
  { id: 'plank',              name: 'Plank',                  category: 'Törzs' },
  { id: 'haspres',            name: 'Hasprés',                category: 'Törzs' },
  { id: 'orosz_csavaras',     name: 'Orosz csavarás',         category: 'Törzs' },

  // Egyéb / cardio
  { id: 'felhuzas',           name: 'Felhúzás (deadlift)',    category: 'Egyéb' },
  { id: 'futas',              name: 'Futás',                  category: 'Cardio' },
  { id: 'kotelugras',         name: 'Kötélugrás',             category: 'Cardio' },
  { id: 'evezogep',           name: 'Evezőgép',               category: 'Cardio' }
];

/** id -> gyakorlat objektum, vagy null ha nincs ilyen (pl. törölt id régi mentésben). */
SG.findExercise = function (id) {
  for (var i = 0; i < SG.Exercises.length; i++) {
    if (SG.Exercises[i].id === id) return SG.Exercises[i];
  }
  return null;
};

/**
 * Blockly FieldDropdown opciólista: [[megjelenített szöveg, érték], ...].
 * A lista végén mindig ott a "saját gyakorlat" szentinel.
 */
SG.exerciseDropdownOptions = function () {
  var options = SG.Exercises.map(function (ex) {
    return [ex.name + '  ·  ' + ex.category, ex.id];
  });
  options.push(['✏️ Saját gyakorlat…', SG.EXERCISE_CUSTOM]);
  return options;
};

/** A hét napjai. A `value` szándékosan angol: ez a stabil enum az exportban. */
SG.DAYS = [
  { value: 'monday',    label: 'Hétfő' },
  { value: 'tuesday',   label: 'Kedd' },
  { value: 'wednesday', label: 'Szerda' },
  { value: 'thursday',  label: 'Csütörtök' },
  { value: 'friday',    label: 'Péntek' },
  { value: 'saturday',  label: 'Szombat' },
  { value: 'sunday',    label: 'Vasárnap' }
];

SG.dayDropdownOptions = function () {
  return SG.DAYS.map(function (d) { return [d.label, d.value]; });
};

SG.dayLabel = function (value) {
  for (var i = 0; i < SG.DAYS.length; i++) {
    if (SG.DAYS[i].value === value) return SG.DAYS[i].label;
  }
  return value;
};
