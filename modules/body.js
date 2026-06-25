/* modules/body.js
 *
 * Measurements about your body: bodyweight (trend toward goal) and labs.
 * Weight here feeds the Nutrition module's targets. Labs hold your blood markers
 * with pending tests flagged.
 *
 * Data:
 *   weight-log -> [{ date, lb }]
 *   labs       -> [{ id, name, value, unit, date, note }]
 */
(function () {
  const E = App.el;
  const WKEY = 'weight-log';
  const LKEY = 'labs';
  const START = 202, GOAL = 180; // lb

  const SEED_LABS = [
    { name: 'HbA1c', value: '5.6', unit: '%', date: '2026-03-26', note: 'One tick under prediabetes — watch fueling' },
    { name: 'Hemoglobin', value: '14.4', unit: 'g/dL', date: '2026-03-26', note: 'Low-normal for endurance athlete' },
    { name: 'Hematocrit', value: '41.9', unit: '%', date: '2026-03-26', note: 'Low-normal' },
    { name: 'Ferritin', value: '', unit: 'ng/mL', date: '', note: 'NOT TESTED — add to next draw before any iron' },
    { name: '25-OH Vitamin D', value: '', unit: 'ng/mL', date: '', note: 'NOT TESTED — confirms D3 dose' },
  ];

  function labs() {
    let l = Store.get(LKEY, null);
    if (!l) { l = SEED_LABS.map((x) => ({ ...x, id: Store.uid() })); Store.set(LKEY, l); }
    return l;
  }
  function weights() { return Store.get(WKEY, []); }
  function latestLb() { const w = weights(); return w.length ? w[w.length - 1].lb : START; }

  // ---- Home tile -----------------------------------------------------------
  function tile(el) {
    const lb = latestLb();
    const toGo = Math.max(0, +(lb - GOAL).toFixed(1));
    el.append(E('div', null, `${lb} lb`));
    el.append(E('div', { class: 'sub' }, toGo ? `${toGo} lb to goal` : 'At goal 🎯'));
  }

  // ---- Detail view ---------------------------------------------------------
  function view(root) {
    weightSection(root);
    labsSection(root);
  }

  function weightSection(root) {
    const lb = latestLb();
    const lost = Math.max(0, +(START - lb).toFixed(1));
    const toGo = Math.max(0, +(lb - GOAL).toFixed(1));
    const pct = Math.max(0, Math.min(100, ((START - lb) / (START - GOAL)) * 100));

    const sec = E('div', { class: 'section' });
    sec.append(E('h2', null, 'Weight'));
    sec.append(E('div', { class: 'row' },
      E('div', { class: 'grow' },
        E('div', { style: 'font-size:28px;font-weight:650' }, lb + ' lb'),
        E('div', { class: 'sub' }, `${lost} lb down · ${toGo} lb to ${GOAL}`))));
    const bar = E('div', { class: 'progress', style: 'margin:4px 0 12px' });
    bar.append(E('span', { style: `width:${pct}%` }));
    sec.append(bar);

    const input = E('input', { class: 'field', type: 'number', step: '0.1',
      inputmode: 'decimal', placeholder: "Today's weight (lb)" });
    const log = E('button', { class: 'btn small', onclick: () => {
      const v = parseFloat(input.value);
      if (!v) return App.toast('Enter a number');
      Store.update(WKEY, (a) => {
        a = (a || []).filter((e) => e.date !== Store.today()); // one per day
        return [...a, { date: Store.today(), lb: v }].sort((x, y) => x.date.localeCompare(y.date));
      }, []);
      view(clear(root)); App.toast('Logged');
    } }, 'Log');
    sec.append(E('div', { class: 'row', style: 'gap:8px' }, E('div', { class: 'grow' }, input), log));

    const recent = weights().slice(-5).reverse();
    if (recent.length) {
      recent.forEach((w) => sec.append(E('div', { class: 'sub', style: 'padding:2px 4px' },
        `${w.date} — ${w.lb} lb`)));
    }
    root.append(sec);
  }

  function labsSection(root) {
    const pending = labs().filter((l) => !l.value);
    const sec = E('div', { class: 'section' });
    sec.append(E('h2', null, 'Labs'));
    if (pending.length) {
      sec.append(E('div', { class: 'row', style: 'border-color:var(--danger)' },
        E('div', { class: 'grow' },
          E('div', null, '⚠️ ' + pending.map((l) => l.name).join(' + ') + ' still untested'),
          E('div', { class: 'sub' }, 'Add to your next blood draw — confirms D3 dose & the iron decision'))));
    }
    labs().forEach((l) => {
      const row = E('div', { class: 'row' },
        E('div', { class: 'grow' },
          E('div', null, l.name + (l.value ? `: ${l.value} ${l.unit}` : '')),
          E('div', { class: 'sub' }, [l.value ? l.date : 'pending', l.note].filter(Boolean).join(' · '))),
        E('button', { class: 'btn ghost small', onclick: () => labForm(row, l) }, l.value ? 'Edit' : 'Add'));
      sec.append(row);
    });
    sec.append(E('button', { class: 'btn ghost', style: 'margin-top:8px',
      onclick: () => labForm(sec, null) }, '+ Add marker'));
    root.append(sec);
  }

  function labForm(anchor, existing) {
    const l = existing || { id: Store.uid(), name: '', value: '', unit: '', date: Store.today(), note: '' };
    const name = E('input', { class: 'field', placeholder: 'Marker', value: l.name });
    const value = E('input', { class: 'field', placeholder: 'Value', value: l.value });
    const unit = E('input', { class: 'field', placeholder: 'Unit', value: l.unit });
    const date = E('input', { class: 'field', type: 'date', value: l.date || Store.today() });
    const save = E('button', { class: 'btn', onclick: () => {
      Object.assign(l, { name: name.value.trim(), value: value.value.trim(),
        unit: unit.value.trim(), date: date.value });
      if (!l.name) return App.toast('Name required');
      Store.update(LKEY, (arr) => {
        arr = (arr || []).slice();
        const i = arr.findIndex((x) => x.id === l.id);
        if (i >= 0) arr[i] = l; else arr.push(l);
        return arr;
      }, []);
      view(clear(document.getElementById('root'))); App.toast('Saved');
    } }, 'Save');
    anchor.replaceWith(E('div', { class: 'row', style: 'flex-direction:column;align-items:stretch' },
      name, value, unit, date, save));
  }

  function clear(root) { root.innerHTML = ''; return root; }

  App.register({ id: 'body', title: 'Body', icon: '📊', accent: '#60a5fa', tile, view });
})();
