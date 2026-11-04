/* Minimal runtime: renders the page template with its Component logic (holes, sc-if, sc-for, events). */
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) { Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch); render(); }
    forceUpdate() { render(); }
  }
  window.DCLogic = DCLogic;

  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  const WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^['"].*['"]$/.test(path)) return path.slice(1, -1);
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  }
  function interp(str, scope) {
    return str.replace(HOLE, (_, p) => { const v = lookup(p, scope); return v == null ? '' : String(v); });
  }

  function processChildren(parent, scope) {
    Array.from(parent.childNodes).forEach((n) => processNode(n, scope));
  }

  function processNode(node, scope) {
    if (node.nodeType === 3) {
      if (node.nodeValue.indexOf('{{') !== -1) node.nodeValue = interp(node.nodeValue, scope);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();

    if (tag === 'sc-if') {
      const v = lookup((node.getAttribute('value') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scope);
      if (v) {
        const frag = document.createDocumentFragment();
        while (node.firstChild) frag.appendChild(node.firstChild);
        const kids = Array.from(frag.childNodes);
        node.replaceWith(frag);
        kids.forEach((k) => processNode(k, scope));
      } else node.remove();
      return;
    }

    if (tag === 'sc-for') {
      const list = lookup((node.getAttribute('list') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scope) || [];
      const as = node.getAttribute('as') || 'item';
      const frag = document.createDocumentFragment();
      list.forEach((item, i) => {
        const sub = Object.assign({}, scope, { [as]: item, $index: i });
        const holder = document.createElement('div');
        Array.from(node.childNodes).forEach((c) => holder.appendChild(c.cloneNode(true)));
        processChildren(holder, sub);
        while (holder.firstChild) frag.appendChild(holder.firstChild);
      });
      node.replaceWith(frag);
      return;
    }

    Array.from(node.attributes).forEach((a) => {
      if (a.name.indexOf('hint-') === 0) { node.removeAttribute(a.name); return; }
      if (a.value.indexOf('{{') === -1) return;
      const m = a.value.match(WHOLE);
      if (a.name.indexOf('on') === 0 && m) {
        const fn = lookup(m[1], scope);
        node.removeAttribute(a.name);
        if (typeof fn === 'function') node.addEventListener(a.name.slice(2), fn);
        return;
      }
      node.setAttribute(a.name, interp(a.value, scope));
    });
    processChildren(node, scope);
  }

  let comp, tpl, root, rendered = false;
  const calm = document.createElement('style');
  calm.textContent = '#dc-root.rerender header+section>div>*,#dc-root.rerender header+section+section>div>*,#dc-root.rerender section h1,#dc-root.rerender section>div>p,#dc-root.rerender .up{animation:none!important}';
  document.head.appendChild(calm);
  function fieldKey(el, i) {
    return el.tagName + '|' + (el.id || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || i);
  }
  function render() {
    const saved = {};
    root.querySelectorAll('input,select,textarea').forEach((el, i) => {
      saved[fieldKey(el, i)] = el.type === 'checkbox' ? el.checked : el.value;
    });
    if (rendered) root.classList.add('rerender');
    rendered = true;
    const frag = tpl.content.cloneNode(true);
    const holder = document.createElement('div');
    holder.appendChild(frag);
    processChildren(holder, comp.renderVals() || {});
    root.replaceChildren(...holder.childNodes);
    root.querySelectorAll('input,select,textarea').forEach((el, i) => {
      const k = fieldKey(el, i);
      if (k in saved) { if (el.type === 'checkbox') el.checked = saved[k]; else el.value = saved[k]; }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    tpl = document.getElementById('dc-tpl');
    root = document.getElementById('dc-root');
    comp = new window.Component({});
    render();
    if (comp.componentDidMount) comp.componentDidMount();
  });
})();
