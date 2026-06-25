/* app.js — the dumb shell.
 *
 * It knows nothing about supplements or training. It keeps a registry of
 * modules and renders: a home grid of tiles, and a detail view per module.
 * Routing is hash-based so iOS Shortcuts can deep-link straight to an action,
 * e.g.  #/log/supplements/<id>  -> module.onDeepLink(['<id>']).
 */
(function () {
  const modules = [];
  const byId = {};

  const App = {
    register(mod) {
      // mod: { id, title, icon, accent?, tile(el), view(el, params?), onDeepLink?(args) }
      modules.push(mod);
      byId[mod.id] = mod;
    },

    start() {
      window.addEventListener('hashchange', render);
      renderDate();
      render();
    },

    go(hash) {
      location.hash = hash;
    },

    toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.hidden = false;
      clearTimeout(t._timer);
      t._timer = setTimeout(() => (t.hidden = true), 2200);
    },

    // tiny DOM helper
    el(tag, props, ...kids) {
      const n = document.createElement(tag);
      if (props) for (const [k, v] of Object.entries(props)) {
        if (k === 'class') n.className = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (v != null) n.setAttribute(k, v);
      }
      kids.flat().forEach((c) => n.append(c.nodeType ? c : document.createTextNode(c)));
      return n;
    },
  };

  function renderDate() {
    document.getElementById('appDate').textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  }

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    return h.split('/').filter(Boolean); // [] | ['m', id] | ['log', id, ...args]
  }

  function render() {
    const root = document.getElementById('root');
    const back = document.getElementById('backBtn');
    const title = document.getElementById('appTitle');
    const parts = parseHash();
    root.innerHTML = '';
    back.hidden = true;
    back.onclick = () => App.go('/');
    title.textContent = 'Life';

    // Deep link: #/log/<moduleId>/<args...>  — fire the action, then land in the module.
    if (parts[0] === 'log') {
      const mod = byId[parts[1]];
      if (mod && mod.onDeepLink) mod.onDeepLink(parts.slice(2));
      App.go('/m/' + parts[1]);
      return;
    }

    // Module detail: #/m/<id>
    if (parts[0] === 'm' && byId[parts[1]]) {
      const mod = byId[parts[1]];
      back.hidden = false;
      title.textContent = mod.title;
      mod.view(root, parts.slice(2));
      return;
    }

    // Home: grid of tiles.
    renderHome(root);
  }

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  // Home is a glanceable "Today" feed — each module reports one actionable line.
  // Tap a row to open the module. This is the daily-driver screen, not a CRUD grid.
  function renderHome(root) {
    if (modules.length === 0) {
      root.append(App.el('p', { class: 'empty' }, 'No modules yet. Drop one into /modules.'));
      return;
    }

    root.append(App.el('div', { class: 'hero' },
      App.el('div', { class: 'hero-greet' }, greeting()),
      App.el('div', { class: 'hero-date' }, new Date().toLocaleDateString(undefined,
        { weekday: 'long', month: 'long', day: 'numeric' }))));

    const feed = App.el('div', { class: 'section' });
    feed.append(App.el('h2', null, 'Today'));
    modules.forEach((mod) => {
      let s = null;
      try { s = mod.summary && mod.summary(); } catch (e) { s = null; }
      if (!s) s = { title: mod.title, detail: '', tone: 'none' };
      const tone = s.tone || 'none';
      feed.append(App.el('button', {
        class: 'feed-row', style: mod.accent ? `--accent:${mod.accent}` : '',
        onclick: () => App.go('/m/' + mod.id),
      },
        App.el('div', { class: 'feed-icon' }, mod.icon || '•'),
        App.el('div', { class: 'feed-body' },
          App.el('div', { class: 'feed-title' }, s.title || mod.title),
          s.detail ? App.el('div', { class: 'feed-detail' }, s.detail) : ''),
        App.el('span', { class: 'feed-status ' + tone }, tone === 'good' ? '✓' : '›')));
    });
    root.append(feed);
  }

  window.App = App;
})();
