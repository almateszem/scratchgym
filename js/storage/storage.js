/* scratchgym — automatikus mentés localStorage-ba.
 *
 * A Blockly beépített strukturált szerializációját használjuk (nem a régi XML
 * API-t). Betöltés hibatűrő: ha a mentett állapot nem illeszkedik a jelenlegi
 * blokk-definíciókhoz, inkább üres workspace-szel indulunk, mint hogy az app
 * elszálljon.
 */

window.SG = window.SG || {};

SG.Storage = (function () {

  var WORKSPACE_KEY = 'scratchgym.workspace.v1';
  var META_KEY = 'scratchgym.meta.v1';
  var SCHEMA_VERSION = 1;

  /** Privát böngészőmódban a localStorage elérése dobhat. */
  function available() {
    try {
      var probe = '__sg_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  }

  function save(workspace) {
    if (!available()) return false;
    try {
      var state = Blockly.serialization.workspaces.save(workspace);
      window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state));
      window.localStorage.setItem(META_KEY, JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        lastSavedAt: new Date().toISOString()
      }));
      return true;
    } catch (err) {
      console.warn('[scratchgym] mentés sikertelen:', err);
      return false;
    }
  }

  /**
   * Mentett állapot betöltése.
   * @return {'loaded'|'empty'|'recovered'} mi történt
   */
  function load(workspace) {
    if (!available()) return 'empty';

    var raw = null;
    try {
      raw = window.localStorage.getItem(WORKSPACE_KEY);
    } catch (err) {
      return 'empty';
    }
    if (!raw) return 'empty';

    try {
      var state = JSON.parse(raw);
      Blockly.serialization.workspaces.load(state, workspace);
      return 'loaded';
    } catch (err) {
      // Sérült vagy elavult mentés (pl. időközben megváltozott blokk-definíciók).
      console.warn('[scratchgym] a mentett terv nem tölthető be, új terv indul:', err);
      clear();
      try { workspace.clear(); } catch (innerErr) { /* már üres */ }
      return 'recovered';
    }
  }

  function clear() {
    if (!available()) return;
    try {
      window.localStorage.removeItem(WORKSPACE_KEY);
      window.localStorage.removeItem(META_KEY);
    } catch (err) {
      console.warn('[scratchgym] a tárolt terv törlése sikertelen:', err);
    }
  }

  function lastSavedAt() {
    if (!available()) return null;
    try {
      var meta = JSON.parse(window.localStorage.getItem(META_KEY) || 'null');
      return meta && meta.lastSavedAt ? meta.lastSavedAt : null;
    } catch (err) {
      return null;
    }
  }

  return {
    save: save,
    load: load,
    clear: clear,
    lastSavedAt: lastSavedAt,
    available: available,
    SCHEMA_VERSION: SCHEMA_VERSION
  };
})();
