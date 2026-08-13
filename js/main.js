/* scratchgym — bootstrap.
 *
 * A Blockly-t futásidőben töltjük be, több CDN-forrásból, sorban próbálkozva.
 * Ezért nem hivatkozik egyik saját modulunk sem a Blockly-ra betöltéskor:
 * mindegyik csak adatot és gyárfüggvényeket akaszt a globális SG névtérre,
 * a tényleges inicializálás pedig itt történik, a könyvtár megérkezése után.
 *
 * OFFLINE HASZNÁLAT: töltsd le a Blockly-t, és írd át az alábbi listát helyi
 * útvonalakra, pl. { core: 'vendor/blockly_compressed.js', msg: 'vendor/msg/hu.js' }.
 */

window.SG = window.SG || {};

SG.BLOCKLY_SOURCES = [
  {
    core: 'https://unpkg.com/blockly@11.2.2/blockly_compressed.js',
    msg: 'https://unpkg.com/blockly@11.2.2/msg/hu.js'
  },
  {
    core: 'https://cdn.jsdelivr.net/npm/blockly@11.2.2/blockly_compressed.js',
    msg: 'https://cdn.jsdelivr.net/npm/blockly@11.2.2/msg/hu.js'
  },
  {
    core: 'https://unpkg.com/blockly/blockly_compressed.js',
    msg: 'https://unpkg.com/blockly/msg/hu.js'
  },
  {
    core: 'https://cdn.jsdelivr.net/npm/blockly/blockly_compressed.js',
    msg: 'https://cdn.jsdelivr.net/npm/blockly/msg/hu.js'
  }
];

(function () {

  var workspace = null;
  var isRestoring = false;

  /* ------------------------------------------------------------------ *
   * Betöltés
   * ------------------------------------------------------------------ */

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = function () { resolve(url); };
      script.onerror = function () { reject(new Error('Nem tölthető be: ' + url)); };
      document.head.appendChild(script);
    });
  }

  function loadBlockly() {
    var attempts = [];

    function trySource(index) {
      if (index >= SG.BLOCKLY_SOURCES.length) {
        return Promise.reject(new Error(attempts.join(' | ')));
      }
      var source = SG.BLOCKLY_SOURCES[index];

      return loadScript(source.core).then(function () {
        if (!window.Blockly) throw new Error('betöltődött, de nincs Blockly: ' + source.core);
        // A magyar nyelvi fájl hiánya nem végzetes — marad az angol felirat.
        return loadScript(source.msg).catch(function () {
          console.warn('[scratchgym] a magyar Blockly-nyelvifájl nem töltődött be, ' +
            'a beépített menük angolul jelennek meg.');
        });
      }).catch(function (err) {
        if (window.Blockly) throw err;
        attempts.push(err.message);
        return trySource(index + 1);
      });
    }

    return trySource(0);
  }

  // Kivezetve, hogy a fallback-lánc böngésző nélkül is tesztelhető legyen.
  SG.loadBlockly = loadBlockly;

  function showBootError(detail) {
    var box = document.getElementById('bootError');
    var detailEl = document.getElementById('bootErrorDetail');
    if (detailEl) detailEl.textContent = detail || '';
    if (box) box.hidden = false;
  }

  /* ------------------------------------------------------------------ *
   * Segédek
   * ------------------------------------------------------------------ */

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(self, args);
      }, wait);
    };
  }

  function setSaveStatus(text) {
    var el = document.getElementById('saveStatus');
    if (el) el.textContent = text;
  }

  function timeNow() {
    var now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' +
           String(now.getMinutes()).padStart(2, '0');
  }

  /* ------------------------------------------------------------------ *
   * Számolás / mentés
   * ------------------------------------------------------------------ */

  var lastProgram = null;

  function recompute() {
    try {
      lastProgram = SG.Interpreter.computeProgram(workspace);
      SG.Preview.update(lastProgram);
    } catch (err) {
      console.error('[scratchgym] a terv kiszámítása elhasalt:', err);
    }
  }

  var recomputeSoon = debounce(recompute, 250);

  var saveSoon = debounce(function () {
    if (SG.Storage.save(workspace)) setSaveStatus('Mentve ' + timeNow());
    else setSaveStatus('Mentés nem elérhető');
  }, 600);

  /**
   * Csak a valódi tartalmi változás érdekel. A tisztán vizuális események
   * (kijelölés, görgetés, nagyítás) és a húzás közbeni köztes állapotok
   * kiszűrve, hogy ne számoljunk és mentsünk feleslegesen.
   */
  function onWorkspaceChange(event) {
    if (isRestoring) return;
    if (event && event.isUiEvent) return;
    if (workspace.isDragging && workspace.isDragging()) return;

    recomputeSoon();
    saveSoon();
    setSaveStatus('Mentés…');
  }

  /* ------------------------------------------------------------------ *
   * Indítás
   * ------------------------------------------------------------------ */

  function start() {
    SG.defineSearchableDropdown();
    SG.defineRenderer();
    // A blokkdefiníciók négy fájlban, témakörönként. A sorrend csak annyiban
    // számít, hogy a progresszió adja a közös állapot-tulajdonságlistát.
    SG.defineLayoutBlocks();
    SG.defineProgressBlocks();
    SG.defineLogicBlocks();
    SG.defineValueBlocks();

    workspace = Blockly.inject('blocklyDiv', {
      toolbox: SG.buildToolbox(),
      theme: SG.buildTheme(),
      // A saját "kártyás" renderer, ha regisztrálható volt — különben zelos.
      renderer: SG.rendererName(),
      grid: { spacing: 26, length: 2, colour: '#1c2740', snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.85, minScale: 0.4, maxScale: 2 },
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: true }
    });

    SG.Preview.init();
    restore();

    workspace.addChangeListener(onWorkspaceChange);
    window.addEventListener('resize', function () { Blockly.svgResize(workspace); });

    wireButtons();
    recompute();
  }

  function restore() {
    isRestoring = true;
    try {
      var result = SG.Storage.load(workspace);
      if (result === 'loaded') {
        setSaveStatus('Betöltve');
      } else {
        // Első indítás (vagy sérült mentés után): induljunk egy példatervről,
        // hogy az előnézet és a hét-csúszka rögtön mutasson valamit.
        Blockly.serialization.workspaces.load(SG.starterWorkspace(), workspace);
        setSaveStatus(result === 'recovered' ? 'Új terv indult' : '');
      }
    } catch (err) {
      console.error('[scratchgym] a terv visszaállítása elhasalt:', err);
    } finally {
      isRestoring = false;
      workspace.clearUndo();
    }
  }

  function wireButtons() {
    document.getElementById('btnExportFile').addEventListener('click', function () {
      if (!lastProgram) return;
      SG.Export.downloadJsonFile(lastProgram);
    });

    var clipButton = document.getElementById('btnExportClip');
    clipButton.addEventListener('click', function () {
      if (!lastProgram) return;
      var original = clipButton.textContent;
      SG.Export.copyJsonToClipboard(lastProgram).then(function (ok) {
        clipButton.textContent = ok ? '✓ Kimásolva' : '✗ Nem sikerült';
        setTimeout(function () { clipButton.textContent = original; }, 1600);
      });
    });

    document.getElementById('btnClear').addEventListener('click', function () {
      if (!window.confirm('Biztosan törlöd a jelenlegi tervet, és újat kezdesz?')) return;
      isRestoring = true;
      try {
        workspace.clear();
        SG.Storage.clear();
        Blockly.serialization.workspaces.load(SG.starterWorkspace(), workspace);
      } finally {
        isRestoring = false;
        workspace.clearUndo();
      }
      recompute();
      SG.Storage.save(workspace);
      setSaveStatus('Új terv');
    });
  }

  /* ------------------------------------------------------------------ */

  function boot() {
    loadBlockly()
      .then(start)
      .catch(function (err) {
        console.error('[scratchgym] a Blockly egyik forrásból sem töltődött be:', err);
        showBootError(err && err.message ? err.message : String(err));
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
