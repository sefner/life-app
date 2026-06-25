/* modules/nutrition.js
 *
 * Daily calorie + macro targets that react to today's training session (read
 * from the Training module's plan via the shared store). Carbs cycle with load;
 * protein held high to preserve muscle in a deficit. Guidance, not a food diary —
 * the Body module's weight trend is the real feedback loop.
 *
 * Data:
 *   nutrition-profile -> { heightIn, age, sex, goalLb, activity, deficit, proteinPerLb, fatPerKg }
 * Reads: weight-log (current weight), training-plan (today's session type).
 */
(function () {
  const E = App.el;
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const PKEY = 'nutrition-profile';
  const DEFAULTS = { heightIn: 71, age: 47, sex: 'm', goalLb: 180,
    activity: 1.5, deficit: 500, proteinPerLb: 1.0, fatPerKg: 0.8 };

  function profile() { return { ...DEFAULTS, ...Store.get(PKEY, {}) }; }
  function currentLb() { const w = Store.get('weight-log', []); return w.length ? w[w.length - 1].lb : 202; }

  // Integration point: classify today's training to shape the targets.
  function classify() {
    const plan = Store.get('training-plan', null);
    const day = plan ? plan[DOW[new Date().getDay()]] : null;
    const type = day ? day.type : 'strength';
    const isLong = type === 'run' && /long/i.test(day ? day.title : '');
    const tier = type === 'rest' ? 'rest' : isLong ? 'long' : 'train';
    return { type, isLong, tier, title: day ? day.title : 'Training day' };
  }

  function targets() {
    const p = profile(), lb = currentLb();
    const kg = lb / 2.2046, cm = p.heightIn * 2.54;
    const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === 'm' ? 5 : -161);
    const maint = Math.round(bmr * p.activity);
    const c = classify();
    const offset = c.tier === 'rest' ? -150 : c.tier === 'long' ? +250 : 0;
    const cal = Math.round((maint - p.deficit + offset) / 10) * 10;
    const protein = Math.round(p.goalLb * p.proteinPerLb);
    const fat = Math.round(kg * p.fatPerKg);
    const carbs = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
    return { maint, cal, protein, fat, carbs, lb, ...c };
  }

  const TIMING = {
    rest: 'Lower-carb day. Spread protein across 3–4 meals; weight carbs toward dinner. Easy to undereat — keep protein up.',
    strength: 'Carbs around the lift: ~40 g carb + 20 g protein 60–90 min before, then 30–40 g protein + carbs within an hour after.',
    run: 'Easy run fuels fine fasted or with a little carb. Protein + carbs in the meal afterward.',
    long: 'Fuel it: carb-rich breakfast, 30–60 g carb/hr if over 90 min, then protein + carbs within 60 min after. Highest-carb day.',
  };

  // ---- Home tile -----------------------------------------------------------
  function tile(el) {
    const t = targets();
    el.append(E('div', null, `${t.cal} kcal`));
    el.append(E('div', { class: 'sub' }, `P${t.protein} · C${t.carbs} · F${t.fat} g`));
  }

  // ---- Detail view ---------------------------------------------------------
  function view(root, params) {
    if (params[0] === 'adjust') return adjustView(root);
    const t = targets();
    const tierLabel = t.tier === 'rest' ? 'Rest day' : t.tier === 'long' ? 'Long-run day' : 'Training day';

    const head = E('div', { class: 'section' });
    head.append(E('div', { class: 'row' },
      E('div', { class: 'grow' },
        E('div', null, tierLabel + ' · ' + t.title),
        E('div', { class: 'sub' }, `Based on ${t.lb} lb · maintenance ~${t.maint}`)),
      E('span', { class: 'pill' }, 'cut')));
    root.append(head);

    const sec = E('div', { class: 'section' });
    sec.append(E('div', { class: 'row' },
      E('div', { class: 'grow' }, E('div', { style: 'font-size:28px;font-weight:650' }, t.cal),
        E('div', { class: 'sub' }, 'calories today'))));
    sec.append(macroRow('Protein', t.protein, t.protein * 4, t.cal, '#fbbf24'));
    sec.append(macroRow('Carbs', t.carbs, t.carbs * 4, t.cal, '#4ade80'));
    sec.append(macroRow('Fat', t.fat, t.fat * 9, t.cal, '#60a5fa'));
    root.append(sec);

    const timeKey = t.tier === 'rest' ? 'rest' : t.tier === 'long' ? 'long' : (t.type === 'run' ? 'run' : 'strength');
    const tip = E('div', { class: 'section' });
    tip.append(E('h2', null, 'Timing'));
    tip.append(E('div', { class: 'row' }, E('div', { class: 'grow' }, TIMING[timeKey])));
    root.append(tip);

    const foot = E('div', { class: 'section' });
    foot.append(E('div', { class: 'sub', style: 'margin-bottom:8px' },
      'Protein is fixed; carbs cycle with training. Update your weight in Body to refresh these. ' +
      'No food logging — let the weight trend be the scoreboard.'));
    foot.append(E('button', { class: 'btn ghost', onclick: () => App.go('/m/nutrition/adjust') },
      'Adjust targets'));
    root.append(foot);
  }

  function macroRow(name, grams, kcal, total, color) {
    const pct = total ? Math.round((kcal / total) * 100) : 0;
    const bar = E('div', { class: 'progress', style: 'margin-top:6px' });
    bar.append(E('span', { style: `width:${pct}%;background:${color}` }));
    return E('div', { class: 'row' }, E('div', { class: 'grow' },
      E('div', null, `${name} — ${grams} g`),
      E('div', { class: 'sub' }, `${kcal} kcal · ${pct}%`), bar));
  }

  function adjustView(root) {
    document.getElementById('backBtn').onclick = () => App.go('/m/nutrition');
    const p = profile();
    const sec = E('div', { class: 'section' });
    sec.append(E('h2', null, 'Adjust targets'));
    const fields = {
      activity: num('Activity factor (1.4 sedentary–1.7 very active)', p.activity, '0.05'),
      deficit: num('Daily deficit (kcal) — 500 ≈ 1 lb/wk', p.deficit, '50'),
      goalLb: num('Goal weight (lb)', p.goalLb, '1'),
      proteinPerLb: num('Protein per lb of goal weight', p.proteinPerLb, '0.05'),
      fatPerKg: num('Fat per kg bodyweight', p.fatPerKg, '0.05'),
    };
    Object.values(fields).forEach((f) => sec.append(f.label, f.input));
    sec.append(E('button', { class: 'btn', onclick: () => {
      const next = {};
      for (const [k, f] of Object.entries(fields)) next[k] = parseFloat(f.input.value);
      Store.update(PKEY, (prev) => ({ ...prev, ...next }), {});
      App.go('/m/nutrition'); App.toast('Updated');
    } }, 'Save'));
    root.append(sec);
  }

  function num(labelText, value, step) {
    return { label: E('label', { class: 'sub' }, labelText),
      input: E('input', { class: 'field', type: 'number', step, inputmode: 'decimal', value }) };
  }

  App.register({ id: 'nutrition', title: 'Nutrition', icon: '🍽️', accent: '#f97316', tile, view });
})();
