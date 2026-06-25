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

  // A menu to PICK from — not a plan to obey. Each option is pre-macro'd and
  // quick-prep; you tap what you'll actually eat and watch the totals fill.
  const MENU = {
    Breakfast: [
      { id: 'b1', name: 'Eggs scramble (3 whole + 6 whites)', p: 40, c: 3, f: 18 },
      { id: 'b2', name: 'Greek yogurt + granola + berries', p: 38, c: 45, f: 8 },
      { id: 'b3', name: 'Oatmeal + scoop whey + banana', p: 32, c: 70, f: 8 },
      { id: 'b4', name: '2 eggs + 2 toast + avocado', p: 18, c: 30, f: 22 },
      { id: 'b5', name: 'Protein smoothie (whey, banana, PB, milk)', p: 40, c: 45, f: 12 },
      { id: 'b6', name: 'Cottage cheese + pineapple + walnuts', p: 28, c: 25, f: 12 },
    ],
    Lunch: [
      { id: 'l1', name: 'Chicken & rice bowl + veg', p: 52, c: 50, f: 8 },
      { id: 'l2', name: 'Tuna + avocado on 2 toast', p: 40, c: 32, f: 18 },
      { id: 'l3', name: 'Turkey & cheese wrap + fruit', p: 38, c: 45, f: 15 },
      { id: 'l4', name: 'Chicken burrito bowl (beans, rice, salsa)', p: 45, c: 60, f: 12 },
      { id: 'l5', name: 'Salmon + potatoes + greens', p: 38, c: 40, f: 20 },
      { id: 'l6', name: 'Grilled chicken Caesar + roll', p: 48, c: 30, f: 18 },
    ],
    Dinner: [
      { id: 'd1', name: 'Lean beef taco bowl (rice, beans, salsa)', p: 55, c: 55, f: 22 },
      { id: 'd2', name: 'Salmon + sweet potato + asparagus', p: 42, c: 45, f: 24 },
      { id: 'd3', name: 'Sirloin + potato + veg', p: 50, c: 45, f: 18 },
      { id: 'd4', name: 'Chicken thighs + rice + broccoli', p: 45, c: 55, f: 20 },
      { id: 'd5', name: 'Shrimp stir-fry + rice', p: 40, c: 65, f: 12 },
      { id: 'd6', name: 'Turkey burgers + bun + salad', p: 48, c: 35, f: 22 },
    ],
    'Snacks / extras': [
      { id: 's1', name: 'Greek yogurt + honey', p: 23, c: 25, f: 0 },
      { id: 's2', name: 'Whey shake + banana', p: 28, c: 30, f: 2 },
      { id: 's3', name: 'Protein bar', p: 20, c: 25, f: 8 },
      { id: 's4', name: 'Cottage cheese + berries', p: 25, c: 12, f: 5 },
      { id: 's5', name: 'Apple + 2 tbsp peanut butter', p: 8, c: 30, f: 16 },
      { id: 's6', name: 'Beef jerky + fruit', p: 25, c: 25, f: 4 },
      { id: 's7', name: 'Rice cakes + tuna', p: 30, c: 25, f: 2 },
    ],
  };
  const MENU_ALL = Object.values(MENU).flat();
  const picksKey = () => 'meal-picks:' + Store.today();

  // ---- Home tile -----------------------------------------------------------
  function tile(el) {
    const t = targets();
    el.append(E('div', null, `${t.cal} kcal`));
    el.append(E('div', { class: 'sub' }, `P${t.protein} · C${t.carbs} · F${t.fat} g`));
  }

  // ---- Detail view ---------------------------------------------------------
  function view(root, params) {
    if (params[0] === 'adjust') return adjustView(root);
    if (params[0] === 'meals') return foodView(root);
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

    root.append(E('div', { class: 'section' },
      E('button', { class: 'btn', onclick: () => App.go('/m/nutrition/meals') }, "🍽️ Pick today's food")));

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

  function eaten() {
    const picks = Store.get(picksKey(), []);
    let P = 0, C = 0, F = 0;
    picks.forEach((id) => { const m = MENU_ALL.find((x) => x.id === id); if (m) { P += m.p; C += m.c; F += m.f; } });
    return { picks, P, C, F, K: P * 4 + C * 4 + F * 9 };
  }

  function prog(label, val, target, color) {
    const pct = target ? Math.min(100, Math.round((val / target) * 100)) : 0;
    const over = val > target;
    const bar = E('div', { class: 'progress' });
    bar.append(E('span', { style: `width:${pct}%;background:${color}` }));
    return E('div', null,
      E('div', { style: 'display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px' },
        E('span', null, label), E('span', { class: over ? '' : 'sub' }, `${val} / ${target} g`)),
      bar);
  }

  // Pick-from-a-list food picker with live totals. Choose freely; deviation is the point.
  function foodView(root) {
    document.getElementById('backBtn').onclick = () => App.go('/m/nutrition');
    const t = targets();
    const tierNote = t.tier === 'rest' ? 'Rest day — go lighter on carbs'
      : t.tier === 'long' ? 'Long-run day — load up carbs' : 'Training day';

    const render = () => {
      root.innerHTML = '';
      const e = eaten();

      const hero = E('div', { class: 'section' });
      hero.append(E('div', { class: 'row', style: 'flex-direction:column;align-items:stretch;gap:9px' },
        E('div', { style: 'display:flex;justify-content:space-between;align-items:center' },
          E('strong', null, `${e.K} / ${t.cal} kcal`), E('span', { class: 'pill' }, tierNote)),
        prog('Protein', e.P, t.protein, '#fbbf24'),
        prog('Carbs', e.C, t.carbs, '#4ade80'),
        prog('Fat', e.F, t.fat, '#60a5fa')));
      root.append(hero);

      if (e.picks.length) root.append(E('div', { class: 'section' },
        E('button', { class: 'btn ghost small', onclick: () => { Store.set(picksKey(), []); render(); } },
          'Clear today')));

      Object.entries(MENU).forEach(([slot, opts]) => {
        const sec = E('div', { class: 'section' });
        sec.append(E('h2', null, slot));
        opts.forEach((m) => {
          const on = e.picks.includes(m.id);
          const row = E('div', { class: 'row', style: 'cursor:pointer' + (on ? ';border-color:var(--accent)' : ''),
            onclick: () => {
              Store.update(picksKey(), (a) => {
                a = (a || []).slice();
                const i = a.indexOf(m.id);
                if (i >= 0) a.splice(i, 1); else a.push(m.id);
                return a;
              }, []);
              render();
            } },
            E('div', { class: 'check' + (on ? ' done' : '') }, '✓'),
            E('div', { class: 'grow' },
              E('div', null, m.name),
              E('div', { class: 'sub' }, `P${m.p} · C${m.c} · F${m.f} · ${m.p * 4 + m.c * 4 + m.f * 9} kcal`)));
          sec.append(row);
        });
        root.append(sec);
      });

      root.append(E('div', { class: 'section' }, E('div', { class: 'sub' },
        "Pick whatever you'll actually eat — fill protein first, let carbs flex with the day. " +
        'Over 100% just means you went past target. Tap again to remove.')));
    };
    render();
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

  function summary() {
    const t = targets(), e = eaten();
    if (!e.picks.length) return { title: `🍽️ ${t.cal} kcal target`,
      detail: `Pick today's food · ${t.protein}g protein`, tone: 'todo' };
    return { title: `🍽️ ${e.K} / ${t.cal} kcal`,
      detail: `${e.P}/${t.protein}g protein picked`, tone: e.P >= t.protein * 0.9 ? 'good' : 'todo' };
  }

  App.register({ id: 'nutrition', title: 'Nutrition', icon: '🍽️', accent: '#f97316', tile, view, summary });
})();
