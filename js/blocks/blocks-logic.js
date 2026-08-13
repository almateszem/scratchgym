/* scratchgym — logikai blokkok: elágazás, ismétlés, feltételek.
 *
 * Az elágazások testébe 'GymRule' kapcsolatú progressziós utasítások mennek
 * (lásd blocks-progress.js), a feltételek 'Boolean' kimenetű értékblokkok.
 *
 * A gym_if és a gym_switch_week mutátoros: az ágak számát a blokk bal felső
 * sarkában lévő fogaskerékkel lehet állítani. A mutátor állapota a Blockly
 * JSON-szerializációjába kerül (saveExtraState / loadExtraState), ezért a
 * mentett terv visszatöltésekor az ágak megmaradnak.
 *
 * A SG.defineLogicBlocks()-t a main.js hívja, miután a Blockly betöltődött.
 */

window.SG = window.SG || {};

SG.defineLogicBlocks = function () {

  /* ------------------------------------------------------------------ *
   * Mutátor-segédek
   * ------------------------------------------------------------------ */

  /**
   * Regisztrálás egyszer. A gyárfüggvény elvileg csak egyszer fut, de ha
   * mégis kétszer hívnák, a Blockly hibát dobna a duplikált névre.
   */
  function registerMutatorOnce(name, mixin, helperFn, blockList) {
    try {
      if (Blockly.Extensions.isRegistered && Blockly.Extensions.isRegistered(name)) return;
      Blockly.Extensions.registerMutator(name, mixin, helperFn, blockList);
    } catch (err) {
      console.warn('[scratchgym] a(z) ' + name + ' mutátor nem regisztrálható:', err);
    }
  }

  /**
   * Mutátor rátétele egy blokkra. Ha bármi baj van, a blokk mutátor nélkül,
   * de használhatóan megmarad — ugyanaz a visszaesés-elv, mint a kereshető
   * legördülőnél.
   */
  function applyMutator(name, block) {
    try {
      Blockly.Extensions.apply(name, block, true);
      return true;
    } catch (err) {
      console.warn('[scratchgym] a(z) ' + name + ' nem alkalmazható, ' +
        'a blokk fix alakú marad:', err);
      return false;
    }
  }

  /** A húzás közbeni beszúrás-jelölőket át kell ugrani a mutátor-listában. */
  function isMarker(block) {
    return typeof block.isInsertionMarker === 'function' && block.isInsertionMarker();
  }

  /**
   * Gyerekblokk visszakötése egy inputra az alak újraépítése után.
   * Szándékosan nem a Blockly belső Mutator-segédjét hívjuk, hogy ne
   * függjünk a verziónként vándorló névtértől.
   */
  function reconnect(childConnection, block, inputName) {
    if (!childConnection) return false;
    var source = childConnection.getSourceBlock && childConnection.getSourceBlock();
    if (!source || !source.workspace) return false;

    var input = block.getInput(inputName);
    if (!input || !input.connection) return false;
    if (input.connection.targetConnection === childConnection) return true;

    try {
      if (input.connection.isConnected()) input.connection.disconnect();
      input.connection.connect(childConnection);
      return true;
    } catch (err) {
      // Nem illeszthető vissza (pl. típusütközés) — a blokk a munkaterületen marad.
      return false;
    }
  }

  /* ------------------------------------------------------------------ *
   * gym_if — elágazás, mutátorral bővíthető ágakkal
   * ------------------------------------------------------------------ */

  var IF_MUTATOR_MIXIN = {
    elseifCount_: 0,
    elseCount_: 0,

    saveExtraState: function () {
      if (!this.elseifCount_ && !this.elseCount_) return null;
      var state = {};
      if (this.elseifCount_) state.elseIfCount = this.elseifCount_;
      if (this.elseCount_) state.hasElse = true;
      return state;
    },

    loadExtraState: function (state) {
      this.elseifCount_ = (state && state.elseIfCount) || 0;
      this.elseCount_ = (state && state.hasElse) ? 1 : 0;
      this.rebuildShape_();
    },

    /** A fogaskerékre kattintva megjelenő minimunkaterület felépítése. */
    decompose: function (workspace) {
      var container = workspace.newBlock('gym_if_container');
      container.initSvg();
      var connection = container.getInput('STACK').connection;

      for (var i = 1; i <= this.elseifCount_; i++) {
        var elseif = workspace.newBlock('gym_if_elseif');
        elseif.initSvg();
        connection.connect(elseif.previousConnection);
        connection = elseif.nextConnection;
      }
      if (this.elseCount_) {
        var elseBlock = workspace.newBlock('gym_if_else');
        elseBlock.initSvg();
        connection.connect(elseBlock.previousConnection);
      }
      return container;
    },

    /** A minimunkaterület állapotának visszavezetése a valódi blokkra. */
    compose: function (container) {
      var clause = container.getInputTargetBlock('STACK');
      this.elseifCount_ = 0;
      this.elseCount_ = 0;

      // Az 1-es indextől használjuk, mert az IF0/DO0 ág mindig megvan.
      var valueConnections = [null];
      var statementConnections = [null];
      var elseStatementConnection = null;

      while (clause) {
        if (!isMarker(clause)) {
          if (clause.type === 'gym_if_elseif') {
            this.elseifCount_++;
            valueConnections.push(clause.valueConnection_ || null);
            statementConnections.push(clause.statementConnection_ || null);
          } else if (clause.type === 'gym_if_else') {
            this.elseCount_ = 1;
            elseStatementConnection = clause.statementConnection_ || null;
          }
        }
        clause = clause.getNextBlock();
      }

      this.updateShape_();
      this.reconnectChildBlocks_(valueConnections, statementConnections,
        elseStatementConnection);
    },

    /** A mutátor megnyitásakor eltesszük, melyik ághoz mi volt bekötve. */
    saveConnections: function (container) {
      var clause = container.getInputTargetBlock('STACK');
      var i = 1;

      while (clause) {
        if (!isMarker(clause)) {
          if (clause.type === 'gym_if_elseif') {
            var inputIf = this.getInput('IF' + i);
            var inputDo = this.getInput('DO' + i);
            clause.valueConnection_ = inputIf ? inputIf.connection.targetConnection : null;
            clause.statementConnection_ = inputDo ? inputDo.connection.targetConnection : null;
            i++;
          } else if (clause.type === 'gym_if_else') {
            var inputElse = this.getInput('ELSE');
            clause.statementConnection_ = inputElse ? inputElse.connection.targetConnection : null;
          }
        }
        clause = clause.getNextBlock();
      }
    },

    /** Alak újraépítése a már meglévő gyerekek megtartásával (betöltéskor). */
    rebuildShape_: function () {
      var valueConnections = [null];
      var statementConnections = [null];
      var elseInput = this.getInput('ELSE');
      var elseStatementConnection = elseInput ? elseInput.connection.targetConnection : null;

      for (var i = 1; this.getInput('IF' + i); i++) {
        valueConnections.push(this.getInput('IF' + i).connection.targetConnection);
        statementConnections.push(this.getInput('DO' + i).connection.targetConnection);
      }

      this.updateShape_();
      this.reconnectChildBlocks_(valueConnections, statementConnections,
        elseStatementConnection);
    },

    /** Az IF0/DO0 alapág marad, a többit mindig újraépítjük. */
    updateShape_: function () {
      if (this.getInput('ELSE')) this.removeInput('ELSE');
      for (var i = 1; this.getInput('IF' + i); i++) {
        this.removeInput('IF' + i);
        this.removeInput('DO' + i);
      }

      for (var j = 1; j <= this.elseifCount_; j++) {
        this.appendValueInput('IF' + j).setCheck('Boolean').appendField('különben ha');
        this.appendStatementInput('DO' + j).setCheck('GymRule');
      }
      if (this.elseCount_) {
        this.appendStatementInput('ELSE').setCheck('GymRule').appendField('egyébként');
      }
    },

    reconnectChildBlocks_: function (valueConnections, statementConnections,
                                     elseStatementConnection) {
      for (var i = 1; i <= this.elseifCount_; i++) {
        reconnect(valueConnections[i], this, 'IF' + i);
        reconnect(statementConnections[i], this, 'DO' + i);
      }
      reconnect(elseStatementConnection, this, 'ELSE');
    }
  };

  registerMutatorOnce('gym_if_mutator', IF_MUTATOR_MIXIN, null,
    ['gym_if_elseif', 'gym_if_else']);

  Blockly.Blocks['gym_if'] = {
    init: function () {
      this.appendValueInput('IF0').setCheck('Boolean').appendField('ha');
      this.appendStatementInput('DO0').setCheck('GymRule');

      this.setPreviousStatement(true, 'GymRule');
      this.setNextStatement(true, 'GymRule');
      this.setStyle('gym_logic_style');
      this.setTooltip('Ha a feltétel teljesül, lefutnak a benne lévő szabályok.\n' +
        'A fogaskerékkel "különben ha" és "egyébként" ágak adhatók hozzá.');

      applyMutator('gym_if_mutator', this);
    }
  };

  /* A mutátor kiszolgálóblokkjai. Csak a minimunkaterületen jelennek meg,
     a toolboxba nem kerülnek be. */

  Blockly.Blocks['gym_if_container'] = {
    init: function () {
      this.appendDummyInput().appendField('ha');
      this.appendStatementInput('STACK');
      this.setStyle('gym_logic_style');
      this.setTooltip('Húzz alá ágakat az elágazás bővítéséhez.');
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['gym_if_elseif'] = {
    init: function () {
      this.appendDummyInput().appendField('különben ha');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('gym_logic_style');
      this.setTooltip('További feltételes ág.');
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['gym_if_else'] = {
    init: function () {
      this.appendDummyInput().appendField('egyébként');
      this.setPreviousStatement(true);
      this.setStyle('gym_logic_style');
      this.setTooltip('Ág arra az esetre, ha egyik feltétel sem teljesül.');
      this.contextMenu = false;
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_switch_week — hét szerinti szétválasztás
   * ------------------------------------------------------------------ */

  var SWITCH_MUTATOR_MIXIN = {

    /**
     * Csak az alakot mentjük: hány eset van, és van-e "egyébként" ág.
     * A hétszámok sima mezők (WEEK0, WEEK1…), azokat a Blockly a `fields`
     * blokkban menti. Betöltéskor előbb az extraState fut le (így meglesznek
     * az inputok), és csak utána kapják meg a mezők a mentett értéküket.
     */
    saveExtraState: function () {
      return { caseCount: this.caseCount_, hasElse: !!this.elseCount_ };
    },

    loadExtraState: function (state) {
      this.caseCount_ = (state && typeof state.caseCount === 'number') ? state.caseCount : 0;
      this.elseCount_ = (state && state.hasElse) ? 1 : 0;
      this.rebuildShape_();
    },

    decompose: function (workspace) {
      var container = workspace.newBlock('gym_switch_week_container');
      container.initSvg();
      var connection = container.getInput('STACK').connection;

      for (var i = 0; i < this.caseCount_; i++) {
        var caseBlock = workspace.newBlock('gym_switch_week_case');
        caseBlock.initSvg();
        connection.connect(caseBlock.previousConnection);
        connection = caseBlock.nextConnection;
      }
      if (this.elseCount_) {
        var elseBlock = workspace.newBlock('gym_switch_week_else');
        elseBlock.initSvg();
        connection.connect(elseBlock.previousConnection);
      }
      return container;
    },

    compose: function (container) {
      var clause = container.getInputTargetBlock('STACK');
      this.caseCount_ = 0;
      this.elseCount_ = 0;

      var statementConnections = [];
      var weeks = [];
      var elseStatementConnection = null;

      while (clause) {
        if (!isMarker(clause)) {
          if (clause.type === 'gym_switch_week_case') {
            statementConnections.push(clause.statementConnection_ || null);
            // A hétszám az esettel együtt vándorol, ha átrendezik az ágakat.
            weeks.push(clause.week_ == null ? this.caseCount_ + 1 : clause.week_);
            this.caseCount_++;
          } else if (clause.type === 'gym_switch_week_else') {
            this.elseCount_ = 1;
            elseStatementConnection = clause.statementConnection_ || null;
          }
        }
        clause = clause.getNextBlock();
      }

      this.updateShape_(weeks);
      this.reconnectChildBlocks_(statementConnections, elseStatementConnection);
    },

    saveConnections: function (container) {
      var clause = container.getInputTargetBlock('STACK');
      var i = 0;

      while (clause) {
        if (!isMarker(clause)) {
          if (clause.type === 'gym_switch_week_case') {
            var input = this.getInput('DO' + i);
            clause.statementConnection_ = input ? input.connection.targetConnection : null;
            var week = this.getFieldValue('WEEK' + i);
            clause.week_ = (week == null) ? null : Number(week);
            i++;
          } else if (clause.type === 'gym_switch_week_else') {
            var elseInput = this.getInput('ELSE');
            clause.statementConnection_ = elseInput ? elseInput.connection.targetConnection : null;
          }
        }
        clause = clause.getNextBlock();
      }
    },

    rebuildShape_: function () {
      var statementConnections = [];
      var weeks = [];
      var elseInput = this.getInput('ELSE');
      var elseStatementConnection = elseInput ? elseInput.connection.targetConnection : null;

      for (var i = 0; this.getInput('DO' + i); i++) {
        statementConnections.push(this.getInput('DO' + i).connection.targetConnection);
        var week = this.getFieldValue('WEEK' + i);
        weeks.push(week == null ? null : Number(week));
      }

      this.updateShape_(weeks);
      this.reconnectChildBlocks_(statementConnections, elseStatementConnection);
    },

    /** @param {Array<number>=} weeks a megtartandó hétszámok, ágsorrendben. */
    updateShape_: function (weeks) {
      var previous = weeks || [];

      if (this.getInput('ELSE')) this.removeInput('ELSE');
      for (var i = 0; this.getInput('DO' + i); i++) this.removeInput('DO' + i);

      for (var j = 0; j < this.caseCount_; j++) {
        var week = (previous[j] == null) ? (j + 1) : previous[j];
        this.appendStatementInput('DO' + j)
          .setCheck('GymRule')
          .appendField('ciklus')
          .appendField(new Blockly.FieldNumber(week, 1, 104, 1), 'WEEK' + j)
          .appendField('. hetén');
      }
      if (this.elseCount_) {
        this.appendStatementInput('ELSE').setCheck('GymRule').appendField('egyébként');
      }
    },

    reconnectChildBlocks_: function (statementConnections, elseStatementConnection) {
      for (var i = 0; i < this.caseCount_; i++) {
        reconnect(statementConnections[i], this, 'DO' + i);
      }
      reconnect(elseStatementConnection, this, 'ELSE');
    }
  };

  /** Két esettel indul: egy kapcsoló egy ággal értelmetlen lenne. */
  function switchWeekMutatorHelper() {
    this.caseCount_ = 2;
    this.elseCount_ = 0;
    this.updateShape_();
  }

  registerMutatorOnce('gym_switch_week_mutator', SWITCH_MUTATOR_MIXIN,
    switchWeekMutatorHelper, ['gym_switch_week_case', 'gym_switch_week_else']);

  Blockly.Blocks['gym_switch_week'] = {
    init: function () {
      // Fejsor: enélkül a blokk üresen maradna nulla esetnél, és a mutátor
      // fogaskerekének sem lenne hol megjelennie.
      this.appendDummyInput('HEAD').appendField('🗓 hét szerint');

      this.setPreviousStatement(true, 'GymRule');
      this.setNextStatement(true, 'GymRule');
      this.setStyle('gym_logic_style');
      this.setTooltip('A ciklus adott hetén más-más szabályok futnak.\n' +
        'A fogaskerékkel adhatók hozzá további hetek és "egyébként" ág.');

      applyMutator('gym_switch_week_mutator', this);

      // Ha a mutátor bármi miatt nem jött létre, legyen legalább egy ág.
      if (!this.getInput('DO0')) {
        this.appendStatementInput('DO0')
          .setCheck('GymRule')
          .appendField('ciklus')
          .appendField(new Blockly.FieldNumber(1, 1, 104, 1), 'WEEK0')
          .appendField('. hetén');
      }
    }
  };

  Blockly.Blocks['gym_switch_week_container'] = {
    init: function () {
      this.appendDummyInput().appendField('hetek');
      this.appendStatementInput('STACK');
      this.setStyle('gym_logic_style');
      this.setTooltip('Húzz alá heteket a bővítéshez.');
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['gym_switch_week_case'] = {
    init: function () {
      this.appendDummyInput().appendField('hét');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setStyle('gym_logic_style');
      this.setTooltip('Egy hét-eset.');
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['gym_switch_week_else'] = {
    init: function () {
      this.appendDummyInput().appendField('egyébként');
      this.setPreviousStatement(true);
      this.setStyle('gym_logic_style');
      this.setTooltip('Ág a fel nem sorolt hetekre.');
      this.contextMenu = false;
    }
  };

  /* ------------------------------------------------------------------ *
   * gym_for_each — végigmenés a terv gyakorlatain
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_for_each'] = {
    init: function () {
      this.appendDummyInput().appendField('minden gyakorlatra a tervben');
      this.appendStatementInput('DO').setCheck('GymRule');

      this.setPreviousStatement(true, 'GymRule');
      this.setNextStatement(true, 'GymRule');
      this.setStyle('gym_logic_style');
      this.setTooltip('A benne lévő szabályok a terv minden gyakorlatára lefutnak.\n' +
        'Az éppen soron lévőre az "aktuális gyakorlat" blokkal lehet hivatkozni.');
    }
  };

  /* ------------------------------------------------------------------ *
   * Feltételek
   * ------------------------------------------------------------------ */

  Blockly.Blocks['gym_compare'] = {
    init: function () {
      this.appendValueInput('A').setCheck('Number');
      this.appendValueInput('B')
        .setCheck('Number')
        .appendField(new Blockly.FieldDropdown([
          ['=',  'eq'],
          ['≠',  'neq'],
          ['<',  'lt'],
          ['≤',  'lte'],
          ['>',  'gt'],
          ['≥',  'gte']
        ]), 'OP');

      this.setInputsInline(true);
      this.setOutput(true, 'Boolean');
      this.setStyle('gym_logic_style');
      this.setTooltip('Két szám összehasonlítása.');
    }
  };

  Blockly.Blocks['gym_and'] = {
    init: function () {
      this.appendValueInput('A').setCheck('Boolean');
      this.appendValueInput('B').setCheck('Boolean').appendField('és');

      this.setInputsInline(true);
      this.setOutput(true, 'Boolean');
      this.setStyle('gym_logic_style');
      this.setTooltip('Akkor igaz, ha mindkét feltétel igaz.');
    }
  };

  Blockly.Blocks['gym_or'] = {
    init: function () {
      this.appendValueInput('A').setCheck('Boolean');
      this.appendValueInput('B').setCheck('Boolean').appendField('vagy');

      this.setInputsInline(true);
      this.setOutput(true, 'Boolean');
      this.setStyle('gym_logic_style');
      this.setTooltip('Akkor igaz, ha legalább az egyik feltétel igaz.');
    }
  };

  Blockly.Blocks['gym_not'] = {
    init: function () {
      this.appendValueInput('A').setCheck('Boolean').appendField('nem');

      this.setInputsInline(true);
      this.setOutput(true, 'Boolean');
      this.setStyle('gym_logic_style');
      this.setTooltip('Megfordítja a feltételt.');
    }
  };

  Blockly.Blocks['gym_all_sets_done'] = {
    init: function () {
      this.appendValueInput('EXERCISE')
        .setCheck('Exercise')
        .appendField('🏋');
      this.appendDummyInput().appendField('minden szettje teljesült');

      this.setInputsInline(true);
      this.setOutput(true, 'Boolean');
      this.setStyle('gym_logic_style');
      this.setTooltip('Igaz, ha a gyakorlat összes előírt szettje sikerült ' +
        'a legutóbbi edzésen.');
    }
  };

  Blockly.Blocks['gym_week_multiple'] = {
    init: function () {
      this.appendValueInput('N')
        .setCheck('Number')
        .appendField('a hét osztható');
      this.appendDummyInput().appendField('-nel');

      this.setInputsInline(true);
      this.setOutput(true, 'Boolean');
      this.setStyle('gym_logic_style');
      this.setTooltip('Igaz minden N. héten — pl. 4-gyel minden negyedik héten ' +
        'egy deload-szabályhoz.');
    }
  };
};
