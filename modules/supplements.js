/* modules/supplements.js
 *
 * Schedule supplements, log them in one tap, and generate the iOS Shortcuts
 * deep-links that let a time-based Automation do the nagging instead of the app.
 *
 * Data:
 *   supplements        -> [{ id, name, dose, times:['09:00',...], active }]
 *   supp-log:<YYYY-MM-DD> -> { '<id>@<time>': epochMs }   (one entry per dose slot)
 */
(function () {
  const E = App.el;
  const KEY = 'supplements';
  const logKey = (d) => 'supp-log:' + (d || Store.today());

  const seed = []; // user adds their own; nothing hardcoded

  function items() { return Store.get(KEY, seed); }
  function todayLog() { return Store.get(logKey(), {}); }
  function slotId(s, time) { return s.id + '@' + time; }

  // All dose-slots scheduled for today, flattened & time-sorted.
  function todaySlots() {
    const slots = [];
    items().filter((s) => s.active !== false).forEach((s) => {
      (s.times.length ? s.times : ['']).forEach((t) =>
        slots.push({ supp: s, time: t, id: slotId(s, t) }));
    });
    return slots.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  function taken(slot) { return !!todayLog()[slot.id]; }

  function toggle(slot) {
    Store.update(logKey(), (log) => {
      log = { ...log };
      if (log[slot.id]) delete log[slot.id];
      else log[slot.id] = Date.now();
      return log;
    }, {});
  }

  // ---- Home tile -----------------------------------------------------------
  function tile(el) {
    const slots = todaySlots();
    if (!slots.length) { el.textContent = 'Tap to add supplements'; return; }
    const done = slots.filter(taken).length;
    el.append(E('div', null, `${done} of ${slots.length} taken`));
    const bar = E('div', { class: 'progress' });
    bar.append(E('span', { style: `width:${(done / slots.length) * 100}%` }));
    el.append(bar);
  }

  // ---- Detail view ---------------------------------------------------------
  function view(root, params) {
    if (params[0] === 'manage') return manageView(root);

    const slots = todaySlots();
    const sec = E('div', { class: 'section' });
    sec.append(E('h2', null, 'Today'));

    if (!slots.length) {
      sec.append(E('p', { class: 'muted' }, 'Nothing scheduled. Add your stack below.'));
    } else {
      slots.forEach((slot) => {
        const isDone = taken(slot);
        const check = E('button', { class: 'check' + (isDone ? ' done' : '') }, '✓');
        const row = E('div', { class: 'row' }, check,
          E('div', { class: 'grow' },
            E('div', null, slot.supp.name),
            E('div', { class: 'sub' },
              [slot.supp.dose, slot.time && '· ' + fmt(slot.time)].filter(Boolean).join(' '))));
        check.onclick = () => { toggle(slot); view(root, []); };
        sec.append(row);
      });
    }
    root.append(sec);

    const actions = E('div', { class: 'section' });
    actions.append(E('button', { class: 'btn', onclick: () => App.go('/m/supplements/manage') },
      'Manage stack & reminders'));
    root.append(actions);
  }

  // ---- Manage / edit -------------------------------------------------------
  function manageView(root) {
    const back = document.getElementById('backBtn');
    back.onclick = () => App.go('/m/supplements');

    const list = E('div', { class: 'section' });
    list.append(E('h2', null, 'Your stack'));
    items().forEach((s) => {
      const row = E('div', { class: 'row' },
        E('div', { class: 'grow' },
          E('div', null, s.name),
          E('div', { class: 'sub' }, [s.dose, (s.times || []).map(fmt).join(', ')].filter(Boolean).join(' · '))),
        E('button', { class: 'btn ghost small', onclick: () => { editForm(row, s); } }, 'Edit'));
      list.append(row);
    });
    if (!items().length) list.append(E('p', { class: 'muted' }, 'No supplements yet.'));
    root.append(list);

    const add = E('div', { class: 'section' });
    add.append(E('button', { class: 'btn', onclick: () => editForm(add, null) }, '+ Add supplement'));
    root.append(add);

    shortcutsHelp(root);
  }

  function editForm(anchor, existing) {
    const s = existing || { id: Store.uid(), name: '', dose: '', times: [], active: true };
    const name = E('input', { class: 'field', placeholder: 'Name (e.g. Magnesium)', value: s.name });
    const dose = E('input', { class: 'field', placeholder: 'Dose (e.g. 400mg)', value: s.dose });
    const times = E('input', { class: 'field', placeholder: 'Times, comma-sep (e.g. 09:00, 21:00)',
      value: (s.times || []).join(', ') });

    const save = E('button', { class: 'btn', onclick: () => {
      s.name = name.value.trim();
      if (!s.name) return App.toast('Name required');
      s.dose = dose.value.trim();
      s.times = times.value.split(',').map((x) => x.trim()).filter(Boolean);
      Store.update(KEY, (arr) => {
        arr = (arr || []).slice();
        const i = arr.findIndex((x) => x.id === s.id);
        if (i >= 0) arr[i] = s; else arr.push(s);
        return arr;
      }, []);
      App.go('/m/supplements/manage');
      App.toast('Saved');
    } }, 'Save');

    const buttons = [save];
    if (existing) buttons.push(E('button', { class: 'btn ghost', onclick: () => {
      Store.update(KEY, (arr) => arr.filter((x) => x.id !== s.id), []);
      App.go('/m/supplements/manage');
    } }, 'Delete'));

    const form = E('div', { class: 'row', style: 'flex-direction:column;align-items:stretch' },
      name, dose, times, ...buttons);
    anchor.replaceWith(form);
  }

  // ---- iOS Shortcuts helper ------------------------------------------------
  function shortcutsHelp(root) {
    const base = location.href.split('#')[0];
    const sec = E('div', { class: 'section' });
    sec.append(E('h2', null, 'iOS Shortcuts reminders'));
    sec.append(E('p', { class: 'muted' },
      'In the Shortcuts app: Automation → time of day → action "Open URL" with the link below. ' +
      'When the notification fires, opening it logs the dose with one tap.'));
    items().forEach((s) => {
      (s.times.length ? s.times : ['']).forEach((t) => {
        sec.append(E('div', { class: 'sub', style: 'margin:10px 0 4px' },
          `${s.name}${t ? ' @ ' + fmt(t) : ''}`));
        sec.append(E('div', { class: 'codeblock' }, `${base}#/log/supplements/${slotId(s, t)}`));
      });
    });
    if (!items().length) sec.append(E('p', { class: 'muted' }, 'Add a supplement to get its reminder link.'));
    root.append(sec);
  }

  // ---- Deep link: #/log/supplements/<id>@<time> ---------------------------
  function onDeepLink(args) {
    const id = args.join('/'); // '<suppId>@<time>'
    Store.update(logKey(), (log) => ({ ...log, [id]: Date.now() }), {});
    const supp = items().find((s) => id.startsWith(s.id));
    App.toast((supp ? supp.name : 'Dose') + ' logged ✓');
  }

  function fmt(t) {
    if (!t || !t.includes(':')) return t || '';
    let [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')}${ap}`;
  }

  App.register({
    id: 'supplements', title: 'Supplements', icon: '💊', accent: '#fbbf24',
    tile, view, onDeepLink,
  });
})();
