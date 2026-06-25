/* modules/training.js
 *
 * A weekly training template you can edit, with one-tap session + per-exercise
 * logging. Seeded for a strength-focused trail runner: 3 lift days (single-leg,
 * posterior chain, power) alternating with 3 easy aerobic runs to hold the base.
 *
 * Data:
 *   training-plan       -> { Mon:{type,title,items:[{name,detail}]}, ... }
 *   training-log:<date> -> { done:bool, note:'', ex:{ '<name>':true } }
 */
(function () {
  const E = App.el;
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const PLAN_KEY = 'training-plan';
  const logKey = (d) => 'training-log:' + (d || Store.today());

  // ---- Seed plan (fully editable in-app) ----------------------------------
  const SEED = {
    Mon: { type: 'strength', title: 'Lower / Power', items: [
      { name: 'Trap-bar deadlift', detail: '4×5 heavy' },
      { name: 'Bulgarian split squat', detail: '3×8 / leg' },
      { name: 'Barbell hip thrust', detail: '3×8' },
      { name: 'Box jump', detail: '4×3 explosive' },
      { name: 'Standing calf raise', detail: '3×12' },
      { name: 'Hanging knee raise', detail: '3×12' },
    ]},
    Tue: { type: 'run', title: 'Easy aerobic', items: [
      { name: 'Easy run', detail: '45–55 min · Zone 2, nose-breathing' },
    ]},
    Wed: { type: 'strength', title: 'Upper / Pull', items: [
      { name: 'Weighted pull-up', detail: '4×5' },
      { name: 'Bench press', detail: '4×6' },
      { name: 'Single-arm DB row', detail: '3×10 / side' },
      { name: 'Overhead press', detail: '3×8' },
      { name: 'Face pull', detail: '3×15' },
      { name: 'Pallof press', detail: '3×10 / side' },
    ]},
    Thu: { type: 'run', title: 'Easy + strides', items: [
      { name: 'Easy run', detail: '40 min · Zone 2' },
      { name: 'Strides', detail: '6 × 20s relaxed fast' },
    ]},
    Fri: { type: 'strength', title: 'Posterior / Single-leg', items: [
      { name: 'Front squat', detail: '4×5' },
      { name: 'Romanian deadlift', detail: '3×8' },
      { name: 'Walking lunge', detail: '3×10 / leg' },
      { name: 'Nordic / hamstring curl', detail: '3×6' },
      { name: 'Seated calf raise', detail: '3×15' },
      { name: 'Side plank', detail: '3×40s / side' },
    ]},
    Sat: { type: 'run', title: 'Long easy', items: [
      { name: 'Long run', detail: '75–100 min · conversational, hills ok' },
    ]},
    Sun: { type: 'rest', title: 'Rest / mobility', items: [
      { name: 'Mobility + walk', detail: '20–30 min easy, optional' },
    ]},
  };

  function plan() { return Store.get(PLAN_KEY, SEED); }
  function dayKey(d) { return DOW[(d || new Date()).getDay()]; }
  function dayLog(d) { return Store.get(logKey(d), { done: false, note: '', ex: {} }); }

  const TYPE = {
    strength: { icon: '🏋️', label: 'Strength' },
    run: { icon: '🏃', label: 'Run' },
    rest: { icon: '🧘', label: 'Recovery' },
  };

  // ---- Home tile -----------------------------------------------------------
  function tile(el) {
    const d = plan()[dayKey()];
    const log = dayLog();
    el.append(E('div', null, `${TYPE[d.type].icon} ${d.title}`));
    el.append(E('div', { class: 'sub' }, log.done ? 'Done ✓' : (d.type === 'rest' ? 'Recover' : 'Not done')));
  }

  // ---- Detail view ---------------------------------------------------------
  function view(root, params) {
    if (params[0] === 'week') return weekView(root);
    if (params[0] === 'edit') return editDay(root, params[1]);
    sessionView(root, dayKey());
  }

  function sessionView(root, key) {
    const d = plan()[key];
    const today = key === dayKey();
    const dlog = dayLog(today ? null : undefined); // today only logs to today
    const log = today ? dayLog() : { done: false, note: '', ex: {} };

    const head = E('div', { class: 'section' });
    head.append(E('div', { class: 'row' },
      E('div', { class: 'grow' },
        E('div', null, d.title),
        E('div', { class: 'sub' }, key + ' · ' + TYPE[d.type].label)),
      E('span', { class: 'pill' }, TYPE[d.type].icon + ' ' + TYPE[d.type].label)));
    root.append(head);

    const sec = E('div', { class: 'section' });
    d.items.forEach((it) => {
      const done = !!log.ex[it.name];
      const check = E('button', { class: 'check' + (done ? ' done' : '') }, '✓');
      const row = E('div', { class: 'row' }, check,
        E('div', { class: 'grow' },
          E('div', null, it.name),
          it.detail ? E('div', { class: 'sub' }, it.detail) : ''));
      check.onclick = () => {
        Store.update(logKey(), (l) => {
          l = { ...l, ex: { ...l.ex } };
          if (l.ex[it.name]) delete l.ex[it.name]; else l.ex[it.name] = true;
          return l;
        }, { done: false, note: '', ex: {} });
        sessionView(clear(root), key);
      };
      sec.append(row);
    });
    root.append(sec);

    const note = E('textarea', { class: 'field', placeholder: 'Session notes (how it felt, weights, RPE)…' });
    note.value = log.note || '';
    note.addEventListener('change', () =>
      Store.update(logKey(), (l) => ({ ...l, note: note.value }), { done: false, note: '', ex: {} }));

    const doneBtn = E('button', { class: 'btn' + (log.done ? ' ghost' : ''),
      onclick: () => {
        Store.update(logKey(), (l) => ({ ...l, done: !l.done }), { done: false, note: '', ex: {} });
        sessionView(clear(root), key);
      } }, log.done ? 'Session complete ✓ — undo' : 'Mark session complete');

    const foot = E('div', { class: 'section' }, note, doneBtn,
      E('button', { class: 'btn ghost', style: 'margin-top:8px',
        onclick: () => App.go('/m/training/week') }, 'View / edit week'));
    root.append(foot);
  }

  function weekView(root) {
    document.getElementById('backBtn').onclick = () => App.go('/m/training');
    const sec = E('div', { class: 'section' });
    sec.append(E('h2', null, 'This week'));
    const p = plan();
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((k) => {
      const d = p[k];
      const isToday = k === dayKey();
      const row = E('div', { class: 'row', style: isToday ? 'border-color:var(--accent)' : '' },
        E('div', { class: 'grow' },
          E('div', null, `${TYPE[d.type].icon} ${d.title}`),
          E('div', { class: 'sub' }, k + (isToday ? ' · today' : '') + ' · ' + d.items.length + ' items')),
        E('button', { class: 'btn ghost small', onclick: () => App.go('/m/training/edit/' + k) }, 'Edit'));
      sec.append(row);
    });
    root.append(sec);
  }

  function editDay(root, key) {
    document.getElementById('backBtn').onclick = () => App.go('/m/training/week');
    const d = plan()[key];
    const sec = E('div', { class: 'section' });
    sec.append(E('h2', null, 'Edit ' + key));

    const title = E('input', { class: 'field', value: d.title, placeholder: 'Session title' });
    const type = E('select', { class: 'field' });
    Object.entries(TYPE).forEach(([v, m]) =>
      type.append(E('option', { value: v, ...(v === d.type ? { selected: '' } : {}) }, m.label)));

    const items = E('textarea', { class: 'field', style: 'min-height:160px',
      placeholder: 'One per line:  Exercise — sets×reps' });
    items.value = d.items.map((it) => it.detail ? `${it.name} — ${it.detail}` : it.name).join('\n');

    const save = E('button', { class: 'btn', onclick: () => {
      const parsed = items.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const m = l.split(/\s+[—-]\s+/);
        return { name: m[0].trim(), detail: (m[1] || '').trim() };
      });
      Store.update(PLAN_KEY, (pl) => ({ ...(pl || SEED),
        [key]: { type: type.value, title: title.value.trim() || key, items: parsed } }), SEED);
      App.go('/m/training/week');
      App.toast('Saved');
    } }, 'Save day');

    sec.append(E('label', { class: 'sub' }, 'Title'), title);
    sec.append(E('label', { class: 'sub' }, 'Type'), type);
    sec.append(E('label', { class: 'sub' }, 'Exercises'), items, save);
    root.append(sec);
  }

  function clear(root) { root.innerHTML = ''; return root; }

  App.register({ id: 'training', title: 'Training', icon: '🏋️', accent: '#4ade80', tile, view });
})();
