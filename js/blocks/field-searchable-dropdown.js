/* scratchgym — kereshető legördülő mező.
 *
 * Ez a projekt egyetlen olyan darabja, ami a Blockly *belső* DOM-struktúrájára
 * támaszkodik (a legördülő menü kirenderelt elemeire). Ezért:
 *   - a DOM-műveletek try/catch mögött futnak, hiba esetén a mező sima
 *     legördülőként működik tovább,
 *   - és magát a mezőt is a SG.createExerciseDropdown() gyáron át hozzuk létre,
 *     ami ha bármi baj van, sima Blockly.FieldDropdown-t ad vissza.
 *
 * FONTOS: a Blockly valódi ES6 osztályokra fordul, ezért az öröklés is valódi
 * `class ... extends` kell legyen. A régi ES5 prototípus-minta
 * (Base.call(this, ...)) TypeError-t dob: "Class constructor cannot be invoked
 * without 'new'".
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

  class FieldSearchableDropdown extends Blockly.FieldDropdown {

    showEditor_(e) {
      super.showEditor_(e);
      try {
        this.injectSearchBox_();
      } catch (err) {
        // Eltért a várt Blockly DOM — a menü sima legördülőként tovább működik.
        console.warn('[scratchgym] a kereső mező nem injektálható, ' +
          'sima legördülő marad:', err);
      }
    }

    injectSearchBox_() {
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

      // Az elemek szövegét egyszer normalizáljuk, hogy gépelés közben csak
      // illesztsünk.
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

      // A Blockly menüje maga is figyeli a billentyűket (nyilak, betűugrás),
      // ezért a gépelést nem engedjük tovább — kivéve a navigációs billentyűket.
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' || ev.key === 'Enter' ||
            ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          return; // menjen a menühöz
        }
        ev.stopPropagation();
      });

      content.insertBefore(input, content.firstChild);
      content.appendChild(noResult);

      // A fókusz a következő tickben, mert a Blockly a menü megnyitása után
      // maga is fókuszt állít.
      setTimeout(function () {
        try { input.focus(); } catch (err) { /* nem kritikus */ }
      }, 0);
    }
  }

  SG.FieldSearchableDropdown = FieldSearchableDropdown;
  return FieldSearchableDropdown;
};

/**
 * Kereshető legördülő mező létrehozása, biztonságos visszaeséssel.
 *
 * Ha a kereshető változat bármi miatt nem példányosítható, sima
 * Blockly.FieldDropdown jön helyette: a szerkesztő ilyenkor is teljesen
 * használható marad, csak a keresés vész el.
 */
SG.createExerciseDropdown = function (options, validator) {
  try {
    if (SG.FieldSearchableDropdown) {
      return new SG.FieldSearchableDropdown(options, validator);
    }
  } catch (err) {
    console.warn('[scratchgym] a kereshető legördülő nem hozható létre, ' +
      'sima legördülő lesz helyette:', err);
  }
  return new Blockly.FieldDropdown(options, validator);
};
