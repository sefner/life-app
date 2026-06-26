/* modules/reminders.js
 *
 * Wake-up reminders via iOS Shortcuts time automations — free, on-device, and
 * they fire even when the app is closed. iOS forbids apps from creating
 * automations programmatically, so this screen makes the one-time manual setup
 * trivial: curated defaults, exact copy, and copy-to-clipboard.
 *
 * Data: reminders -> [{ id, time, text, target }]
 */
(function () {
  const E = App.el;
  const KEY = 'reminders';
  const SCREENS = {
    today: 'Today', supplements: 'Supplements', body: 'Weigh-in',
    training: 'Training', food: 'Food picker',
  };

  function reminders() {
    let r = Store.get(KEY, null);
    if (!r) {
      r = [
        { id: Store.uid(), time: '07:00', target: 'today',
          text: '☀️ Morning check-in — weigh in + take your AM supplements' },
        { id: Store.uid(), time: '21:00', target: 'today',
          text: '🌙 Evening wind-down — PM supplements + check off your day' },
      ];
      Store.set(KEY, r);
    }
    return r;
  }

  let expanded = null;

  function fmt(t) {
    if (!t || !t.includes(':')) return t || '';
    let [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')}${ap}`;
  }

  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text)
      .then(() => App.toast('Copied'), () => App.toast('Copy failed'));
    else App.toast('Copy not supported');
  }

  function steps(arr) {
    const wrap = E('div', { style: 'margin:6px 0' });
    arr.forEach((s, i) => wrap.append(E('div', { class: 'sub', style: 'margin:5px 0;display:flex;gap:8px' },
      E('span', { style: 'color:var(--accent);font-weight:700;flex:none' }, (i + 1) + '.'),
      E('span', null, s))));
    return wrap;
  }

  function view(root) { expanded = null; render(root); }

  function render(root) {
    root.innerHTML = '';
    root.append(E('div', { class: 'section' }, E('div', { class: 'row',
      style: 'flex-direction:column;align-items:stretch;gap:6px' },
      E('strong', null, 'Wake-up reminders'),
      E('div', { class: 'sub' },
        'These run through iOS Shortcuts, so they fire even when the app is closed — ' +
        'free, no account. Set each up once (~1 min). Tap the notification or your Life ' +
        'icon to open and check things off.'))));

    const list = E('div', { class: 'section' });
    reminders().forEach((r) => {
      const open = expanded === r.id;
      const row = E('div', { class: 'row',
        style: 'flex-direction:column;align-items:stretch;gap:10px' + (open ? ';border-color:var(--accent)' : '') });
      row.append(E('div', { style: 'display:flex;align-items:center;gap:12px' },
        E('div', { style: 'font-size:18px;font-weight:650;flex:none;min-width:64px' }, fmt(r.time)),
        E('div', { class: 'grow' }, r.text),
        E('button', { class: 'btn ghost small', onclick: () => { expanded = open ? null : r.id; render(root); } },
          open ? 'Close' : 'Set up')));
      if (open) row.append(setupPanel(r, root));
      list.append(row);
    });
    root.append(list);

    const add = E('div', { class: 'section' });
    add.append(E('button', { class: 'btn', onclick: () => editForm(add, null, root) }, '+ Add reminder'));
    root.append(add);
  }

  function setupPanel(r, root) {
    return E('div', { style: 'border-top:1px solid var(--line);padding-top:10px' },
      E('div', { class: 'sub', style: 'font-weight:600;color:var(--text)' }, 'In the Shortcuts app:'),
      steps([
        'Automation tab → + → Create Personal Automation',
        `Time of Day → set ${fmt(r.time)} → Daily → Next`,
        'Add Action → search "Show Notification" → tap it',
        'Replace the text with the line below (Copy text)',
        'Optional: add another action "Open App" → Life, to jump straight in',
        'Next → turn OFF "Ask Before Running" → Done',
      ]),
      E('div', { class: 'codeblock' }, r.text),
      E('div', { style: 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap' },
        E('button', { class: 'btn small', onclick: () => copy(r.text) }, 'Copy text'),
        E('button', { class: 'btn ghost small', onclick: () => editForm(null, r, root) }, 'Edit'),
        E('button', { class: 'btn ghost small', onclick: () => {
          Store.update(KEY, (a) => a.filter((x) => x.id !== r.id), []);
          expanded = null; render(root);
        } }, 'Delete')));
  }

  function editForm(anchor, existing, root) {
    const r = existing || { id: Store.uid(), time: '08:00', text: '', target: 'today' };
    const time = E('input', { class: 'field', type: 'time', value: r.time });
    const text = E('input', { class: 'field', placeholder: 'Notification text', value: r.text });
    const target = E('select', { class: 'field' });
    Object.entries(SCREENS).forEach(([v, label]) =>
      target.append(E('option', { value: v, ...(v === r.target ? { selected: '' } : {}) }, 'Opens: ' + label)));
    const save = E('button', { class: 'btn', onclick: () => {
      Object.assign(r, { time: time.value, text: text.value.trim() || 'Reminder', target: target.value });
      Store.update(KEY, (arr) => {
        arr = (arr || []).slice();
        const i = arr.findIndex((x) => x.id === r.id);
        if (i >= 0) arr[i] = r; else arr.push(r);
        return arr.sort((a, b) => a.time.localeCompare(b.time));
      }, []);
      expanded = r.id; render(root); App.toast('Saved');
    } }, 'Save');
    const form = E('div', { class: 'row', style: 'flex-direction:column;align-items:stretch' },
      time, text, target, save);
    if (anchor) anchor.replaceWith(form); else { root.innerHTML = ''; root.append(form); }
  }

  function summary() {
    return { title: '🔔 Reminders', detail: `${reminders().length} set · tap to configure`, tone: 'none' };
  }

  App.register({ id: 'reminders', title: 'Reminders', icon: '🔔', accent: '#a78bfa', view, summary });
})();
