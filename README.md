# scratchgym

Scratch-szerű, blokkos edzésterv-szerkesztő. A gyakorlatokat, napokat és a
többhetes progressziót drag-and-drop blokkokból rakod össze, a jobb oldali panel
pedig élőben mutatja a kiszámolt heti tervet. A kész terv JSON-ként exportálható
egy külön fogyasztó alkalmazás („fő app") számára.

## Futtatás

Nincs build-lépés és nincs `npm install`. Nyisd meg az `index.html`-t a
böngészőben — közvetlenül `file://`-ról is működik.

A Blockly könyvtár CDN-ről töltődik be, tehát **az első betöltéshez internet
kell**. Ha egyik forrás sem érhető el, az app egy magyar nyelvű hibaüzenetet
mutat a további teendőkkel.

### Offline használat

Töltsd le a Blockly-t, és írd át a `js/main.js` tetején lévő
`SG.BLOCKLY_SOURCES` listát helyi útvonalakra:

```js
SG.BLOCKLY_SOURCES = [
  { core: 'vendor/blockly_compressed.js', msg: 'vendor/msg/hu.js' }
];
```

## Használat

| Blokk | Mit csinál |
|---|---|
| 🏋 **Gyakorlat** | Egy gyakorlat: név, sorozat × ismétlés, súly, pihenő. A név listából választható, vagy a „✏️ Saját gyakorlat…" opcióval szabadon beírható. |
| 📅 **Nap** | A hét egy napja. Ide kerülnek az aznapi gyakorlatok és körök. |
| 🔁 **Kör** | Szuperszett / köredzés: a benne lévő gyakorlatok N körben ismétlődnek. Kör a körbe is tehető, tetszőleges mélységben. |
| 🔁 **Ismételd N héten át** | A benne lévő heti sablon ennyi héten át ismétlődik. Ez a program gyökere. |

**Súly-módok** a gyakorlat-blokkban:

- **fix** — a súly minden héten ugyanaz.
- **progresszív** — a megadott érték az *1. heti kezdősúly*, és hetente a
  megadott növekménnyel változik. A növekmény lehet negatív is (deload); a súly
  ilyenkor 0-nál megáll, nem megy negatívba.
- **testsúly** — nincs súlyérték.

A progresszió **gyakorlatonként** külön állítható, tehát a guggolás mehet
+5 kg/hét ütemben, míg a fekvenyomás +2,5 kg/hét ütemben.

A terv **automatikusan mentődik** a böngésző localStorage-ába, minden
változtatás után. Egyszerre egy aktív terv van.

## JSON export — szerződés a fő app felé

A „⬇ JSON letöltése" és a „📋 Vágólapra" gomb ugyanazt az alakot adja.
A kulcsnevek angolul vannak; magyar szöveg csak a felhasználó által beírt
tartalomban és a kényelmi `dayLabelHu` mezőben szerepel.

Az export **kétféle úton is használható**:

- `template` + a gyakorlatonkénti progressziós szabály → a fogyasztó maga
  vezeti le a heti értékeket (így az exportált hetek számán túl is tud számolni),
- `resolvedWeeks` → már kiszámolt, konkrét heti súlyok. Egy egyszerű fogyasztó
  nyugodtan használhatja **csak ezt**, és figyelmen kívül hagyhatja a `template`-et.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-12T10:15:00.000Z",
  "weeksTotal": 8,
  "template": {
    "days": [
      { "dayOfWeek": "monday", "dayLabelHu": "Hétfő", "activities": [] }
    ]
  },
  "resolvedWeeks": [
    { "week": 1, "days": [
      { "dayOfWeek": "monday", "dayLabelHu": "Hétfő", "activities": [] }
    ] }
  ]
}
```

- `template.days` **mindig mind a 7 napot** tartalmazza, hétfőtől vasárnapig;
  a használatlan napoknál `activities` egy üres tömb.
- `dayOfWeek` stabil enum: `monday` … `sunday`.
- `resolvedWeeks` hossza mindig `weeksTotal`; a `week` mező 1-alapú.

### Aktivitás a `template`-ben

Gyakorlat:

```json
{
  "type": "exercise",
  "exerciseId": "fekvenyomas",
  "exerciseName": "Fekvőnyomás",
  "isCustomExercise": false,
  "sets": 4,
  "reps": "8-12",
  "restAfterSec": 90,
  "weight": { "mode": "progressive", "startKg": 60, "incrementKgPerWeek": 2.5 }
}
```

A `weight` a másik két módban:
`{ "mode": "fixed", "valueKg": 60 }`, illetve `{ "mode": "bodyweight" }`.

Kör (rekurzív — `activities` további gyakorlatokat és köröket tartalmazhat):

```json
{ "type": "circuit", "rounds": 3, "restBetweenRoundsSec": 60, "activities": [] }
```

### Aktivitás a `resolvedWeeks`-ben

Ugyanaz az alak, de a `weight` objektum helyett konkrét érték áll:

```json
{
  "type": "exercise",
  "exerciseId": "fekvenyomas",
  "exerciseName": "Fekvőnyomás",
  "isCustomExercise": false,
  "sets": 4,
  "reps": "8-12",
  "restAfterSec": 90,
  "weightMode": "progressive",
  "weightKg": 65,
  "isBodyweight": false
}
```

### Fogyasztói tudnivalók

- **`reps` string, nem szám.** Azért, hogy a „8-12" tartomány is elférjen.
  Ha számolni akarsz vele, a fogyasztó oldalán kell parse-olni.
- **`exerciseId` `null`**, ha `isCustomExercise: true` — ilyenkor csak az
  `exerciseName` szabad szöveg azonosít.
- **Ismeretlen `exerciseId`** előfordulhat régi mentésből; ilyenkor az
  `exerciseName` az id nyers értéke.
- **`weightKg` `null`**, ha `isBodyweight: true`.
- **Méret**: hosszú ciklusnál (pl. 104 hét) a `resolvedWeeks` nagyra nőhet.
  Ha ez gond, a fogyasztó használja a `template` + képlet utat.

### Progressziós képlet

Ez az egyetlen súlyszámítás a rendszerben. Ugyanez van implementálva a
`js/core/progression.js`-ben, és ezzel bármelyik hétre újraszámolható az érték —
akkor is, ha az az exportált `weeksTotal`-on túl van:

```
weightKg(week) = max(0, startKg + incrementKgPerWeek * (week - 1))
```

ahol `week` 1-alapú. A `max(0, …)` miatt negatív növekménynél a súly 0-nál
megáll. Az eredmény 2 tizedesre kerekítve tárolódik.

## Tesztek

```
node test/run-all.js
```

Nincs hozzá `npm install` — csak Node.js kell. A tesztek Blockly és böngésző
nélkül futnak: az interpretert mock blokkokkal, az előnézetet és az exportot egy
minimál DOM-shimmel, a CDN-fallback láncot pedig szimulált script-betöltéssel
ellenőrzik.

## Projektstruktúra

```
index.html                         belépési pont, script-betöltési sorrend
css/styles.css                     layout és előnézet stílusok
js/
  data/exercises.js                gyakorlat-adatbázis, napok
  blocks/
    field-searchable-dropdown.js   kereshető legördülő mező
    renderer-cards.js              "kártyás" blokk-renderer (zelos leszármazott)
    blocks-layout.js               gyakorlat, kör, nap, ciklus
    blocks-progress.js             hét lezárásakor futó szabályblokkok
    blocks-logic.js                elágazás, ismétlés, feltételek
    blocks-value.js                számok, állapotlekérdezés, számítások
    toolbox.js                     téma, toolbox, kezdő terv
  core/
    progression.js                 súlyszámítás
    interpreter.js                 workspace -> heti feloldott adat
  storage/storage.js               localStorage automentés
  preview/preview.js               élő előnézet panel
  export/export.js                 JSON export
  main.js                          bootstrap
test/                              Node-tesztek (nincs függőségük)
```

Minden modul a globális `SG` névtérre dolgozik, és egyik sem hivatkozik a
Blockly-ra betöltéskor — a Blockly-függő inicializálást a `main.js` végzi,
miután a könyvtár megérkezett. (ES modult azért nem használunk, mert `file://`
alól a böngészők blokkolják a modul-importokat.)

### Gyakorlatlista bővítése

Fűzz hozzá egy `{ id, name, category }` elemet a `js/data/exercises.js`
tömbjéhez. Meglévő elem `id`-jét **ne** írd át — a korábban mentett tervek és a
már exportált JSON-ok arra hivatkoznak.
