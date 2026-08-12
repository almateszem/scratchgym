/* scratchgym — kereshető legördülő mező.
 *
 * Ez a projekt egyetlen olyan darabja, ami a Blockly *belső* DOM-struktúrájára
 * támaszkodik (a legördülő menü kirenderelt elemeire). Ezért:
 *   - minden DOM-műveletet try/catch véd,
 *   - hiba esetén a mező csendben visszaesik a sima FieldDropdown viselkedésre,
 *     tehát a szerkesztő ettől soha nem törik el, csak a keresés vész el.
 *
 * A SG.defineSearchableDropdown()-t a main.js hívja, miután a Blockly betöltődött.
 */

window.SG = window.SG || {};

/**
 * Ékezet-független, kisbetűs alak az illesztéshez ("fekvo" → "fekvonyomas").
 *
 * NFD-vel szétbontjuk az ékezetes betűket alapbetű + kombináló jel párra, majd
 * eldobjuk a kombináló jeleket. A kódpont-tartományt szándékosan számmal
 * hasonlítjuk (nem regex escape-pel), hogy a forrás tiszta ASCII maradjon.
 */
var COMBINING_FIRST = 0x0300;
var COMBINING_LAST = 0x036f;

SG.normalizeForSearch = function (text) {
  var s = String(text == null ? '' : text).toLowerCase();
  if (typeof s.normalize !== 'function') return s;

  s = s.normalize('NFD');
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var code = s.charCodeAt(i);
    if (code >= COMBINING_FIRST && code <= COMBINING_LAST) continue;
    out += s.charAt(i);
  }
  return out;
};

SG.defineSearchableDropdown = function () {
  if (SG.FieldSearchableDropdown) return SG.FieldSearchableDropdown;

  /** Hány elemtől kezdve van értelme keresőt mutatni. */
  var MIN_ITEMS_FOR_SEARCH = 8;

  function findMenuItems(root) {
    var items = root.querySelectorAll('.blocklyMenuItem');
    if (!items.length) items = root.querySelectorAll('[role="menuitem"]');
    return Array.prototype.slice.call(items);
  }

  var FieldSearchableDropdown = function (menuGenerator, validator, config) {
    Blockly.FieldDropdown.call(this, menuGenerator, validator, config);
  };

  FieldSearchableDropdown.prototype = Object.create(Blockly.FieldDropdown.prototype);
  FieldSearchableDropdown.prototype.constructor = FieldSearchableDropdown;

  FieldSearchableDropdown.prototype.showEditor_ = function (e) {
    Blockly.FieldDropdown.prototype.showEditor_.call(this, e);
    try {
      this.injectSearchBox_();
    } catch (err) {
      // Eltért a várt Blockly DOM — a menü sima dropdownként továbbra is működik.
      console.warn('[scratchgym] a kereső mező nem injektálható, sima dropdown marad:', err);
    }
  };

  FieldSearchableDropdown.prototype.injectSearchBox_ = function () {
    if (!Blockly.DropDownDiv || typeof Blockly.DropDownDiv.getContentDiv !== 'function') return;
    var content = Blockly.DropDownDiv.getContentDiv();
    if (!content) return;

    var items = findMenuItems(content);
    if (items.length < MIN_ITEMS_FOR_SEARCH) return;
    if (content.querySelector('.sg-dropdown-search')) return;

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'sg-dropdown-search';
    input.placeholder = 'Keresés…';
    input.setAttribute('autocomplete', 'off');

    var noResult = document.createElement('div');
    noResult.className = 'sg-dropdown-noresult';
    noResult.textContent = 'Nincs találat.';
    noResult.hidden = true;

    // Az elemek szövegét egyszer normalizáljuk, hogy gépelés közben csak illesztsünk.
    var haystack = items.map(function (el) {
      return SG.normalizeForSearch(el.textContent);
    });

    function applyFilter() {
      var needle = SG.normalizeForSearch(input.value).trim();
      var visible = 0;
      for (var i = 0; i < items.length; i++) {
        var match = !needle || haystack[i].indexOf(needle) !== -1;
        items[i].style.display = match ? '' : 'none';
        if (match) visible++;
      }
      noResult.hidden = visible > 0;
    }

    input.addEventListener('input', applyFilter);

    // A Blockly menüje maga is figyeli a billentyűket (nyilak, betűugrás), ezért a
    // gépelést nem engedjük tovább — kivéve a navigációs/kilépő billentyűket.
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' || ev.key === 'Enter' ||
          ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        return; // menjen a menühöz
      }
      ev.stopPropagation();
    });

    content.insertBefore(input, content.firstChild);
    content.appendChild(noResult);

    // A fókusz beállítása a következő tickben, mert a Blockly a menü megnyitása
    // után maga is fókuszt állít.
    setTimeout(function () {
      try { input.focus(); } catch (err) { /* nem kritikus */ }
    }, 0);
  };

  SG.FieldSearchableDropdown = FieldSearchableDropdown;
  return FieldSearchableDropdown;
};
