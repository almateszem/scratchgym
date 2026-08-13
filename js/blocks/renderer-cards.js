/* scratchgym — saját blokk-renderer ("kártyás" megjelenés).
 *
 * A zelos renderert örököljük, és csak a geometriai konstansokat hangoljuk:
 * nagyobb sarok-lekerekítés, laposabb kapcsolódási fül, sötét mező-pillek.
 * Semmilyen rajzoló metódust nem írunk felül, így ez a réteg a Blockly
 * belső rajz-logikájától független marad.
 *
 * FONTOS: a Blockly valódi ES6 osztályokra fordul, ezért itt is valódi
 * `class ... extends` kell (ugyanaz a szabály, mint a kereshető mezőnél).
 *
 * Ha a regisztráció bármi miatt elhasal (pl. egy jövőbeli Blockly-verzióban
 * elmozdul a renderer API), a SG.rendererName() a beépített 'zelos'-t adja
 * vissza, és a szerkesztő a megszokott alakkal, hibátlanul elindul.
 *
 * A SG.defineRenderer()-t a main.js hívja, a Blockly betöltése után.
 */

window.SG = window.SG || {};

SG.RENDERER_NAME = 'sgcards';

/** A ténylegesen használható renderer neve. Regisztráció után dől el. */
SG.rendererName = function () {
  return SG.RENDERER_READY ? SG.RENDERER_NAME : 'zelos';
};

SG.defineRenderer = function () {
  if (SG.RENDERER_READY) return true;

  try {
    /* A zelos minden méretet a GRID_UNIT (=4) többszöröseként számol,
       ezért mi is így írjuk — így a blokk arányai együtt maradnak. */
    class SGConstantProvider extends Blockly.zelos.ConstantProvider {
      constructor() {
        super();

        // Kártyás alak: nagyobb sarok, jóval laposabb kapcsolódási fül.
        this.CORNER_RADIUS = 3 * this.GRID_UNIT;
        this.NOTCH_WIDTH = 7 * this.GRID_UNIT;
        this.NOTCH_HEIGHT = 1.25 * this.GRID_UNIT;
        // A zelos ezt a saját NOTCH_HEIGHT-jából számolta a konstruktorában;
        // a fül átméretezése után újra kell képezni, különben rés marad a
        // beágyazott stack alján.
        this.STATEMENT_BOTTOM_SPACER = -this.NOTCH_HEIGHT;

        // Levegősebb belső margók — ettől lesz "kártya" a blokkból.
        this.MEDIUM_PADDING = 2.5 * this.GRID_UNIT;
        this.MEDIUM_LARGE_PADDING = 3.5 * this.GRID_UNIT;
        this.TOP_ROW_MIN_HEIGHT = this.MEDIUM_PADDING;
        this.BOTTOM_ROW_MIN_HEIGHT = this.MEDIUM_PADDING;

        // Mezők: sötét, erősen lekerekített pill.
        this.FIELD_BORDER_RECT_RADIUS = 2.5 * this.GRID_UNIT;
        this.FIELD_BORDER_RECT_COLOUR = '#0d1524';

        // A kijelölés sárga villanása helyett halvány kék derengés.
        this.SELECTED_GLOW_COLOUR = '#8ab4ff';
        this.SELECTED_GLOW_SIZE = 0.6;
        this.REPLACEMENT_GLOW_COLOUR = '#8ab4ff';
      }
    }

    class SGRenderer extends Blockly.zelos.Renderer {
      makeConstants_() {
        return new SGConstantProvider();
      }
    }

    Blockly.blockRendering.register(SG.RENDERER_NAME, SGRenderer);
    SG.RENDERER_READY = true;
    return true;

  } catch (err) {
    console.warn('[scratchgym] a saját renderer nem regisztrálható, ' +
      'marad a beépített zelos:', err);
    SG.RENDERER_READY = false;
    return false;
  }
};
