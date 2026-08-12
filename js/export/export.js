/* scratchgym — JSON export a fő app számára.
 *
 * A séma szerződés: a mezőneveket a README dokumentálja. Angol kulcsnevek,
 * magyar csak a felhasználó által beírt tartalomban (gyakorlatnevek) és a
 * kényelmi `dayLabelHu` mezőben.
 *
 * Az export egyszerre tartalmazza:
 *   - `template` + gyakorlatonkénti progressziós szabály  -> újra-levezethető
 *   - `resolvedWeeks` konkrét heti súlyokkal              -> egyszerű lejátszás
 * Egy naiv fogyasztó nyugodtan használhatja csak a `resolvedWeeks`-et.
 */

window.SG = window.SG || {};

SG.Export = (function () {

  var SCHEMA_VERSION = 1;

  /** @param {object} program SG.Interpreter.computeProgram() eredménye */
  function buildExportJson(program) {
    return {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      weeksTotal: program.weeksTotal,
      template: program.template,
      resolvedWeeks: program.resolvedWeeks
    };
  }

  function toText(program) {
    return JSON.stringify(buildExportJson(program), null, 2);
  }

  function fileName() {
    // Helyi idő szerinti YYYY-MM-DD, hogy a fájlnév egyezzen azzal, amit a
    // felhasználó a naptárában lát.
    var now = new Date();
    var stamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    return 'edzesterv-' + stamp + '.json';
  }

  function downloadJsonFile(program) {
    var blob = new Blob([toText(program)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    var link = document.createElement('a');
    link.href = url;
    link.download = fileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // A revoke-ot a következő tickre halasztjuk, különben egyes böngészők
    // még a letöltés elindítása előtt érvénytelenítenék az URL-t.
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  /**
   * Vágólapra másolás.
   * A modern Clipboard API nem mindig érhető el (pl. file:// alól, régebbi
   * böngészőben), ezért van execCommand fallback.
   * @return {Promise<boolean>}
   */
  function copyJsonToClipboard(program) {
    var text = toText(program);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(function () { return true; })
        .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch (err) {
      console.warn('[scratchgym] vágólapra másolás sikertelen:', err);
      return false;
    }
  }

  return {
    buildExportJson: buildExportJson,
    toText: toText,
    downloadJsonFile: downloadJsonFile,
    copyJsonToClipboard: copyJsonToClipboard,
    SCHEMA_VERSION: SCHEMA_VERSION
  };
})();
