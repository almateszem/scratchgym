/* Minimál DOM shim a preview.js és export.js teszteléséhez. */

class ClassList {
  constructor(el) { this.el = el; this.set = new Set(); }
  add(...c) { c.forEach(x => this.set.add(x)); this._sync(); }
  remove(...c) { c.forEach(x => this.set.delete(x)); this._sync(); }
  contains(c) { return this.set.has(c); }
  _sync() { this.el._className = [...this.set].join(' '); }
}

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this._text = '';
    this._className = '';
    this.classList = new ClassList(this);
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
  }
  get className() { return this._className; }
  set className(v) {
    this._className = v;
    this.classList.set = new Set(String(v).split(/\s+/).filter(Boolean));
  }
  get textContent() {
    if (this.children.length) return this.children.map(c => c.textContent).join('');
    return this._text;
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    return child;
  }
  insertBefore(node, ref) {
    const i = ref ? this.children.indexOf(ref) : -1;
    node.parentNode = this;
    if (i < 0) this.children.push(node); else this.children.splice(i, 0, node);
    return node;
  }
  get firstChild() { return this.children[0] || null; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type) { (this.listeners[type] || []).forEach(fn => fn.call(this, { type })); }
  click() { this.dispatch('click'); }
  select() {}
  focus() {}
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const out = [];
    const want = sel.startsWith('.') ? sel.slice(1) : null;
    const walk = (n) => {
      n.children.forEach(c => {
        if (want) { if (c.classList && c.classList.contains(want)) out.push(c); }
        else if (c.tagName === sel.toUpperCase()) out.push(c);
        walk(c);
      });
    };
    walk(this);
    return out;
  }
  /* teszt segéd: rekurzív szöveges kiíratás */
  dump(indent = '') {
    const cls = this._className ? '.' + this._className.replace(/\s+/g, '.') : '';
    const own = this.children.length ? '' : (this._text ? ' "' + this._text + '"' : '');
    let s = indent + this.tagName.toLowerCase() + cls + (this.hidden ? ' [hidden]' : '') + own + '\n';
    this.children.forEach(c => { s += c.dump(indent + '  '); });
    return s;
  }
}

class TextNode {
  constructor(t) { this._text = String(t); this.children = []; this.tagName = '#text'; this._className = ''; this.hidden = false; }
  get textContent() { return this._text; }
  dump(indent = '') { return indent + '"' + this._text + '"\n'; }
}

function makeDocument(ids) {
  const registry = {};
  for (const id of ids) {
    const el = new El(id === 'weekSlider' ? 'input' : 'div');
    el.id = id;
    if (id === 'weekSlider') { el.value = '1'; el.max = '1'; el.min = '1'; }
    registry[id] = el;
  }
  const body = new El('body');
  return {
    body,
    _registry: registry,
    getElementById: (id) => registry[id] || null,
    createElement: (tag) => new El(tag),
    createTextNode: (t) => new TextNode(t),
  };
}

module.exports = { El, TextNode, makeDocument };
