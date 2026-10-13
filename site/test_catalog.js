'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(path.join(__dirname, 'catalog.html'), 'utf8');
const script = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(m => !/src=/.test(m[1]) && m[2].includes('catalogShowMore'))[2];

function boot(query = '', missingData = false) {
  const nodes = new Map();
  function element() {
    const attrs = {};
    return { value: '', textContent: '', hidden: true, options: [], listeners: {},
      addEventListener(event, fn) { this.listeners[event] = fn; },
      setAttribute(key, value) { attrs[key] = value; }, getAttribute(key) { return attrs[key]; },
      appendChild(option) { this.options.push(option); }, focus() {},
      querySelector() { return this.arrow || (this.arrow = element()); },
      get innerHTML() { return this.html !== undefined ? this.html : this.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
      set innerHTML(value) { this.html = value; },
    };
  }
  for (const id of ['themeIcon', 'themeToggle', 'catalogSearch', 'catalogPhase', 'catalogStatus', 'catalogBody', 'catalogCount', 'catalogTableWrap', 'catalogProgressiveActions', 'catalogProgressiveNote', 'catalogShowMore', 'catalogShowAll']) nodes.set(id, element());
  nodes.get('catalogPhase').options.push({ value: '' });
  nodes.get('catalogStatus').options = ['', 'complete', 'in-progress', 'planned'].map(value => ({ value }));
  const headers = ['phase', 'name', 'type', 'lang', 'status'].map(col => { const e = element(); e.setAttribute('data-sort', col); return e; });
  const events = {};
  const window = { location: { href: 'https://aieng-zh.cn/catalog.html' + query, search: query }, matchMedia: () => ({ matches: false }), addEventListener: (event, fn) => { events[event] = fn; } };
  const history = { pushState(_state, _unused, url) { const next = new URL(url, window.location.href); window.location.href = next.href; window.location.search = next.search; }, replaceState(...args) { this.pushState(...args); } };
  const document = { documentElement: element(), getElementById: id => source.includes('id="' + id + '"') ? nodes.get(id) : null, createElement: () => element(), addEventListener: (event, fn) => { events[event] = fn; }, querySelectorAll: selector => selector.endsWith('.sort-arrow') ? headers.map(e => e.querySelector()) : headers };
  const context = vm.createContext({ window, document, history, URL, URLSearchParams, localStorage: { getItem: () => null, setItem() { throw Error('unexpected storage write'); } } });
  if (!missingData) vm.runInContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8'), context);
  vm.runInContext(script, context);
  events.DOMContentLoaded();
  const phases = missingData ? [] : vm.runInContext('PHASES', context);
  return { nodes, events, headers, window, total: phases.reduce((n, p) => n + p.lessons.length, 0), phaseCount: id => phases.find(p => String(p.id) === id).lessons.length,
    rows: () => (nodes.get('catalogBody').innerHTML.match(/class="catalog-lesson-link"/g) || []).length,
    trigger(id, event) { nodes.get(id).listeners[event](); },
  };
}

test('catalog initializes, paginates 48 to 96, then shows all and hides exhausted controls', () => {
  const c = boot();
  assert.equal(c.rows(), 48);
  assert.equal(c.nodes.get('catalogProgressiveActions').hidden, false);
  assert.equal(c.nodes.get('catalogTableWrap').getAttribute('aria-busy'), 'false');
  c.trigger('catalogShowMore', 'click');
  assert.equal(c.rows(), 96);
  c.trigger('catalogShowAll', 'click');
  assert.equal(c.rows(), c.total);
  assert.equal(c.nodes.get('catalogProgressiveActions').hidden, true);
  assert.equal(c.nodes.get('catalogShowMore').hidden, true);
  assert.equal(c.nodes.get('catalogProgressiveNote').textContent, '');
});

test('catalog filters reset paging and zero matches hide controls', () => {
  const c = boot(); c.trigger('catalogShowAll', 'click');
  c.nodes.get('catalogSearch').value = 'no-such-course-9bfb'; c.trigger('catalogSearch', 'input');
  assert.equal(c.rows(), 0); assert.equal(c.nodes.get('catalogProgressiveActions').hidden, true);
  assert.ok(c.window.location.search.includes('q=no-such-course-9bfb'));
  c.nodes.get('catalogSearch').value = ''; c.trigger('catalogSearch', 'input'); assert.equal(c.rows(), 48);
  c.nodes.get('catalogPhase').value = '0'; c.trigger('catalogPhase', 'change');
  assert.equal(c.rows(), Math.min(48, c.phaseCount('0')));
  assert.equal(c.nodes.get('catalogProgressiveActions').hidden, c.phaseCount('0') <= 48);
});

test('catalog restores phase/status/sort without requiring q and responds to popstate', () => {
  const c = boot('?phase=0&status=complete&sort=name&dir=desc');
  assert.equal(c.nodes.get('catalogPhase').value, '0'); assert.equal(c.nodes.get('catalogStatus').value, 'complete');
  assert.equal(c.headers[1].getAttribute('aria-sort'), 'descending');
  c.window.location.href = 'https://aieng-zh.cn/catalog.html'; c.window.location.search = ''; c.events.popstate();
  assert.equal(c.rows(), 48); assert.equal(c.nodes.get('catalogPhase').value, '');
  c.headers[1].listeners.click(); assert.equal(c.headers[1].getAttribute('aria-sort'), 'ascending'); assert.ok(c.window.location.search.includes('sort=name'));
});

test('catalog handles missing data and CSS respects hidden progressive controls', () => {
  const c = boot('', true);
  assert.match(c.nodes.get('catalogCount').textContent, /加载失败/);
  assert.equal(c.nodes.get('catalogProgressiveActions').hidden, true);
  assert.match(source, /\.catalog-progressive-actions\[hidden\][\s\S]*?display:\s*none/);
});
