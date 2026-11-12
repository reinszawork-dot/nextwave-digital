/* Side Hustle CashBook — vanilla JS, data in localStorage. */
(() => {
  'use strict';

  const KEY = 'shcb.v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
  const r2 = (v) => Math.round(v * 100) / 100;

  /* ---------- dates ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const addMonths = (mk, n) => { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const monthEnd = (mk) => { const [y, m] = mk.split('-').map(Number); return iso(new Date(y, m, 0)); };
  const fmtD = (s, o = { day: 'numeric', month: 'short', year: 'numeric' }) => parse(s).toLocaleDateString('en-ZA', o);
  const mLabel = (mk, long) => parse(mk + '-01').toLocaleDateString('en-ZA', long ? { month: 'long', year: 'numeric' } : { month: 'short' });
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  // SA tax year runs 1 March to end of February; identified by its starting year.
  const taxYearOf = (s) => { const [y, m] = s.split('-').map(Number); return m >= 3 ? y : y - 1; };
  const tyRange = (y) => ({ from: `${y}-03-01`, to: iso(new Date(y + 1, 2, 0)) });
  const tyLabel = (y) => `Mar ${y} – Feb ${y + 1}`;
  const tyMonths = (y) => Array.from({ length: 12 }, (_, i) => addMonths(`${y}-03`, i));

  /* ---------- money ---------- */
  const nfMoney = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
  const nfNum = new Intl.NumberFormat('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v) => nfMoney.format(r2(v) || 0);
  const axisMoney = (v) => { const a = Math.abs(v); const s = a >= 1e6 ? (a / 1e6).toFixed(1) + 'm' : a >= 1e3 ? Math.round(a / 1e3) + 'k' : Math.round(a); return (v < 0 ? '-R' : 'R') + s; };
  const pct = (v) => `${Math.round(v)}%`;

  /* ---------- constants ---------- */
  const INCOME_CATS = ['Sales', 'Services', 'Customer payment', 'Commission', 'Affiliate payout', 'Ad & sponsor revenue', 'Tips', 'Other income'];
  const EXPENSE_CATS = ['Stock & materials', 'Packaging', 'Transport & fuel', 'Data & airtime', 'Software & tools', 'Advertising', 'Fees & bank charges', 'Equipment', 'Other expense'];
  const METHODS = ['Cash', 'EFT', 'Card', 'SnapScan', 'Zapper', 'PayPal', 'Other'];
  const TYPES = {
    affiliate: { label: 'Affiliate marketing', icon: 'link' },
    freelance: { label: 'Freelancing', icon: 'briefcase' },
    digital: { label: 'Digital products', icon: 'file' },
    store: { label: 'Online store', icon: 'bag' },
    content: { label: 'Content creation', icon: 'video' },
    business: { label: 'Small business', icon: 'store' },
    other: { label: 'Other side hustle', icon: 'spark' },
  };
  const COLORS = ['#A78BFA', '#F472B6', '#FB923C', '#38BDF8', '#34D399', '#FBBF24', '#F87171', '#2DD4BF'];
  const OLD_COLORS = ['#176B45', '#4FA36E', '#C9A24A', '#6F8F9C', '#A87C5C', '#7C6FA8', '#9BC9A7', '#B5524C']; // pre-redesign palette, remapped on load
  const C_IN = '#34D399', C_OUT = '#FB7185', C_PROFIT = '#FBBF24';

  /* ---------- icons ---------- */
  const IC = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6.5A2.5 2.5 0 0 0 4 20.5 1.5 1.5 0 0 0 5.5 22H20"/><path d="M8 7h8M8 11h5"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    'chev-down': '<path d="m6 9 6 6 6-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    ext: '<path d="M7 17 17 7M8 7h9v9"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 18v-6M9 15l3 3 3-3"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m22 8-6 4 6 4z"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  };
  const svgIc = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ''}</svg>`;
  const ic = (n, cls = '') => `<i data-i="${n}"${cls ? ` class="${cls}"` : ''}>${svgIc(n)}</i>`;
  const hydrateIcons = (root = document) => $$('i[data-i]:empty', root).forEach((el) => { el.innerHTML = svgIc(el.dataset.i); });

  /* ---------- state ---------- */
  const blank = () => ({ v: 1, profile: { name: '', business: '' }, settings: { taxRate: 18 }, streams: [], tx: [], owed: [], goals: [], taxSaved: [] });
  let S;
  let loadError = false, storageBlocked = false;

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { storageBlocked = true; }
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      return sanitize(d);
    } catch (e) {
      try { localStorage.setItem(KEY + '.corrupt', raw); } catch (_) { /* nothing more we can do */ }
      loadError = true;
      return null;
    }
  }

  // Trust boundary for imported/stored data: coerce every field into the shape the app expects.
  function sanitize(d) {
    if (!d || typeof d !== 'object') throw new Error('Not a CashBook backup');
    const str = (v, n = 120) => String(v ?? '').slice(0, n);
    const num = (v) => { const x = Number(v); return isFinite(x) ? r2(x) : 0; };
    const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    const arr = (v) => (Array.isArray(v) ? v : []);
    const out = blank();
    out.profile = { name: str(d.profile?.name, 40), business: str(d.profile?.business, 60) };
    out.settings = { taxRate: Math.min(45, Math.max(0, num(d.settings?.taxRate ?? 18))) };
    out.streams = arr(d.streams).filter((s) => s && s.id).map((s) => ({ id: str(s.id, 40), name: str(s.name, 40) || 'Untitled', type: TYPES[s.type] ? s.type : 'other', color: COLORS[OLD_COLORS.indexOf(String(s.color).toUpperCase())] || (/^#[0-9a-f]{6}$/i.test(s.color) ? s.color : COLORS[0]), sample: !!s.sample }));
    out.tx = arr(d.tx).filter((t) => t && t.id && date(t.date) && num(t.amount) > 0).map((t) => ({ id: str(t.id, 40), type: t.type === 'out' ? 'out' : 'in', amount: num(t.amount), date: t.date, streamId: str(t.streamId, 40), category: str(t.category, 40), method: str(t.method, 20), desc: str(t.desc), owedId: str(t.owedId, 40), sample: !!t.sample }));
    out.owed = arr(d.owed).filter((o) => o && o.id && num(o.amount) > 0).map((o) => ({ id: str(o.id, 40), customer: str(o.customer, 60), desc: str(o.desc), amount: num(o.amount), due: date(o.due) || today(), streamId: str(o.streamId, 40), status: o.status === 'paid' ? 'paid' : 'open', paidDate: date(o.paidDate), txId: str(o.txId, 40), sample: !!o.sample }));
    out.goals = arr(d.goals).filter((g) => g && g.id && num(g.target) > 0).map((g) => ({ id: str(g.id, 40), name: str(g.name, 50), target: num(g.target), saved: Math.max(0, num(g.saved)), deadline: date(g.deadline), sample: !!g.sample }));
    out.taxSaved = arr(d.taxSaved).filter((t) => t && t.id && date(t.date) && num(t.amount) > 0).map((t) => ({ id: str(t.id, 40), date: t.date, amount: num(t.amount), note: str(t.note, 80), sample: !!t.sample }));
    return out;
  }

  function save() {
    if (storageBlocked) return true; // already warned once at boot; keep working in memory
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) { toast("Couldn't save — your browser storage may be full.", { err: true }); return false; }
  }
  const hasSample = () => [S.streams, S.tx, S.owed, S.goals, S.taxSaved].some((a) => a.some((x) => x.sample));

  /* ---------- sample data (clearly flagged) ---------- */
  function makeSample() {
    let seed = 20261112;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const between = (a, b) => Math.round((a + rnd() * (b - a)) / 10) * 10;
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const st = [
      { id: uid(), name: 'Weekend Baking', type: 'business', color: COLORS[0] },
      { id: uid(), name: 'Freelance Design', type: 'freelance', color: COLORS[2] },
      { id: uid(), name: 'Online Store', type: 'store', color: COLORS[3] },
      { id: uid(), name: 'Affiliate Blog', type: 'affiliate', color: COLORS[1] },
    ].map((s) => ({ ...s, sample: true }));
    const [bake, design, shop, blog] = st;
    const tx = [];
    const add = (type, streamId, date, amount, category, method, desc) => tx.push({ id: uid(), type, streamId, date, amount, category, method, desc, owedId: '', sample: true });
    const end = today(), start = addDays(end, -395);
    for (let d = start, i = 0; d <= end; d = addDays(d, 1), i++) {
      const g = 0.6 + 0.55 * (i / 395);
      const dow = parse(d).getDay(), dom = parse(d).getDate();
      if ((dow === 6 || dow === 0) && rnd() < 0.85) add('in', bake.id, d, between(220, 700) * g, 'Sales', pick(['Cash', 'SnapScan', 'Zapper', 'Cash']), pick(['Market stall sales', 'Cupcake order', 'Rusks order', 'Koeksister tray']));
      if (rnd() < 0.05) add('in', bake.id, d, between(600, 1400) * g, 'Sales', 'EFT', pick(['Birthday cake order', 'Wedding cake order', 'Office tea order']));
      if (dow === 5 && rnd() < 0.8) add('out', bake.id, d, between(250, 650) * g, 'Stock & materials', 'Card', pick(['Flour, sugar & butter', 'Baking ingredients', 'Eggs & cream']));
      if (rnd() < 0.04) add('out', bake.id, d, between(80, 220), 'Packaging', 'Card', 'Cake boxes & labels');
      if (dom === 8 || dom === 22 || (dom === 15 && rnd() < 0.4)) add('in', design.id, d, between(1600, 3400) * g, 'Services', 'EFT', pick(['Logo design', 'Social media pack', 'Menu design', 'Brochure layout', 'Website mock-up']));
      if (dom === 3) add('out', design.id, d, 389, 'Software & tools', 'Card', 'Design software subscription');
      if (dom === 10) add('out', design.id, d, 299, 'Data & airtime', 'Card', 'Fibre & data');
      if (rnd() < 0.18) add('in', shop.id, d, between(140, 780) * g, 'Sales', pick(['EFT', 'Card', 'PayPal']), `Order #${1000 + i}`);
      if (dom === 2 || dom === 17) add('out', shop.id, d, between(500, 1100) * g, 'Stock & materials', 'EFT', 'Stock from supplier');
      if (rnd() < 0.06) add('out', shop.id, d, between(60, 180), 'Transport & fuel', 'Card', 'Courier drop-off');
      if (dom === 5) add('in', blog.id, d, between(250, 1500) * g * g, 'Affiliate payout', 'PayPal', 'Monthly affiliate payout');
      if (dom === 15 && rnd() < 0.3) add('in', blog.id, d, between(800, 2000), 'Ad & sponsor revenue', 'EFT', 'Sponsored post');
      if (dom === 1) add('out', blog.id, d, 129, 'Software & tools', 'Card', 'Web hosting');
      if (dom === 20 && rnd() < 0.5) add('out', blog.id, d, between(150, 400), 'Advertising', 'Card', 'Social media ads');
    }
    tx.forEach((t) => { t.amount = r2(t.amount); });
    const T = today();
    const owed = [
      { customer: 'Thandi M.', desc: 'Wedding cake balance', amount: 850, due: addDays(T, 5), streamId: bake.id },
      { customer: 'Karoo Coffee Co.', desc: 'Menu design', amount: 3200, due: addDays(T, -12), streamId: design.id },
      { customer: 'Sipho N.', desc: 'Bulk cupcake order', amount: 640, due: addDays(T, -41), streamId: bake.id },
      { customer: 'Bloom Florists', desc: 'Instagram content pack', amount: 2400, due: addDays(T, 18), streamId: design.id },
      { customer: 'Lerato K.', desc: 'Logo refresh', amount: 1500, due: addDays(T, -6), streamId: design.id, status: 'paid', paidDate: addDays(T, -3) },
    ].map((o) => ({ id: uid(), status: 'open', paidDate: '', txId: '', sample: true, ...o }));
    const goals = [
      { name: 'New stand mixer', target: 6500, saved: 4100, deadline: addDays(T, 60) },
      { name: 'Emergency fund', target: 20000, saved: 7350, deadline: '' },
      { name: 'Laptop upgrade', target: 15000, saved: 2200, deadline: addDays(T, 240) },
    ].map((g) => ({ id: uid(), sample: true, ...g }));
    const taxSaved = [];
    const ty = taxYearOf(T);
    tyMonths(ty).forEach((mk) => {
      if (monthEnd(mk) >= T) return;
      const s = sums(tx.filter((t) => t.date.startsWith(mk)));
      if (s.profit > 0) taxSaved.push({ id: uid(), date: addDays(monthEnd(mk), 1), amount: Math.round((s.profit * 0.14) / 50) * 50, note: `Set aside for ${mLabel(mk)}`, sample: true });
    });
    return { streams: st, tx, owed, goals, taxSaved };
  }

  function loadSample() {
    const smp = makeSample();
    S.streams.push(...smp.streams); S.tx.push(...smp.tx); S.owed.push(...smp.owed); S.goals.push(...smp.goals); S.taxSaved.push(...smp.taxSaved);
    save();
  }
  function clearSample() {
    const sampleStreams = new Set(S.streams.filter((s) => s.sample).map((s) => s.id));
    ['streams', 'tx', 'owed', 'goals', 'taxSaved'].forEach((k) => { S[k] = S[k].filter((x) => !x.sample); });
    // keep the user's own entries but unlink them from removed sample streams
    S.tx.forEach((t) => { if (sampleStreams.has(t.streamId)) t.streamId = ''; });
    S.owed.forEach((o) => { if (sampleStreams.has(o.streamId)) o.streamId = ''; });
    save();
  }

  /* ---------- aggregation ---------- */
  function sums(list) {
    let i = 0, o = 0;
    for (const t of list) { if (t.type === 'in') i += t.amount; else o += t.amount; }
    return { in: r2(i), out: r2(o), profit: r2(i - o) };
  }
  const txRange = (from, to, streamId) => S.tx.filter((t) => t.date >= from && t.date <= to && (!streamId || t.streamId === streamId));
  const monthSums = (mk, streamId) => sums(txRange(mk + '-01', monthEnd(mk), streamId));
  const taxOn = (profit) => r2(Math.max(0, profit) * S.settings.taxRate / 100);
  const streamById = (id) => S.streams.find((s) => s.id === id);
  const streamName = (id) => streamById(id)?.name || 'Unassigned';
  const thisMonth = () => today().slice(0, 7);
  // Month-to-date comparisons use the same days of last month, not the whole month.
  const sameDayLastMonth = () => { const pm = addMonths(thisMonth(), -1); return `${pm}-${pad(Math.min(parse(today()).getDate(), +monthEnd(pm).slice(8)))}`; };
  const change = (cur, prev) => (prev === 0 ? (cur === 0 ? 0 : null) : ((cur - prev) / Math.abs(prev)) * 100);
  const owedState = (o) => {
    if (o.status === 'paid') return { key: 'paid', label: 'Received', cls: 'green' };
    const d = daysBetween(today(), o.due);
    if (d < 0) return { key: 'overdue', label: `${-d} day${d === -1 ? '' : 's'} overdue`, cls: 'red', days: -d };
    if (d === 0) return { key: 'due', label: 'Due today', cls: 'amber', days: 0 };
    return { key: 'due', label: `Due in ${d} day${d === 1 ? '' : 's'}`, cls: d <= 7 ? 'amber' : 'grey', days: -d };
  };

  /* ---------- UI helpers ---------- */
  function toast(msg, { err = false, action, onAction, ms = 4500 } = {}) {
    const el = document.createElement('div');
    el.className = 'toast' + (err ? ' err' : '');
    el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
    if (action) el.querySelector('button').onclick = () => { onAction(); el.remove(); };
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = 0; setTimeout(() => el.remove(), 300); }, ms);
  }

  let modalClose = null;
  function openModal(html, { size = '', onMount } = {}) {
    const root = $('#modalRoot');
    const prevFocus = document.activeElement;
    root.className = 'modal-root';
    root.innerHTML = `<div class="modal-bg"></div><div class="modal ${size}" role="dialog" aria-modal="true">${html}</div>`;
    root.hidden = false;
    hydrateIcons(root);
    const close = () => {
      root.classList.add('closing');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { root.hidden = true; root.innerHTML = ''; prevFocus?.focus?.(); }, 170);
      modalClose = null;
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    $('.modal-bg', root).onclick = close;
    $$('[data-close]', root).forEach((b) => (b.onclick = close));
    modalClose = close;
    onMount?.($('.modal', root), close);
    setTimeout(() => $('.modal input:not([type=hidden]), .modal select, .modal button.btn-primary', root)?.focus(), 60);
    return close;
  }
  const modalHead = (title, icon) => `<div class="modal-h"><span class="card-ic">${ic(icon)}</span><h3>${esc(title)}</h3><button class="icon-btn sm" data-close aria-label="Close">${ic('x')}</button></div>`;

  function confirmBox({ title, text, ok = 'Delete', danger = true }) {
    return new Promise((res) => {
      let done = false;
      openModal(`${modalHead(title, danger ? 'alert' : 'info')}<p class="muted" style="margin:0">${text}</p>
        <div class="modal-f"><button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cOk">${esc(ok)}</button></div>`,
      { size: 'sm', onMount: (m, close) => { $('#cOk', m).onclick = () => { done = true; close(); res(true); }; $$('[data-close]', m).concat($('.modal-bg')).forEach((b) => b.addEventListener('click', () => !done && res(false))); } });
    });
  }

  // Form validation: rules map name -> fn(value, form) returning error message or ''.
  function validate(form, rules) {
    let ok = true;
    $$('.err-msg', form).forEach((e) => (e.textContent = ''));
    $$('.input.err', form).forEach((e) => e.classList.remove('err'));
    for (const [name, fn] of Object.entries(rules)) {
      const el = form.elements[name];
      const msg = fn(el.value.trim(), form);
      if (msg) {
        ok = false;
        el.classList.add('err');
        const box = el.closest('.field')?.querySelector('.err-msg');
        if (box) box.textContent = msg;
      }
    }
    if (!ok) $('.input.err', form)?.focus();
    return ok;
  }
  const vAmount = (v) => { const n = Number(v); if (v === '' || !isFinite(n)) return 'Enter an amount'; if (n <= 0) return 'Amount must be more than R0'; if (n > 100000000) return 'That amount looks too big'; return ''; };
  const vDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? '' : 'Pick a date');
  const vReq = (label) => (v) => (v ? '' : `${label} is required`);

  const field = (label, inner, cls = '') => `<div class="field ${cls}"><label>${label}</label>${inner}<div class="err-msg"></div></div>`;
  const moneyInput = (name, value = '') => `<div class="money-in"><span>R</span><input class="input num" name="${name}" type="number" inputmode="decimal" step="0.01" min="0" value="${value}" placeholder="0.00"></div>`;
  const opts = (list, sel) => list.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
  const streamOpts = (sel, blankLabel = 'Unassigned') => `<option value="">${blankLabel}</option>` + opts(S.streams.map((s) => [s.id, s.name]), sel);

  function download(name, text, type = 'text/csv') {
    const blob = new Blob([text], { type: type + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const csv = (rows) => '﻿' + rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\r\n');
  const txCsvRows = (list) => [['Date', 'Type', 'Amount (R)', 'Income stream', 'Category', 'Payment method', 'Description']]
    .concat(list.map((t) => [t.date, t.type === 'in' ? 'Money in' : 'Money out', t.amount.toFixed(2), streamName(t.streamId), t.category, t.method, t.desc]));

  /* count-up numbers */
  function countUp(root) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    $$('[data-count]', root).forEach((el) => {
      const to = +el.dataset.count, f = el.dataset.f === 'pct' ? pct : (v) => nfNum.format(v);
      if (reduce) { el.textContent = f(to); return; }
      const t0 = performance.now(), dur = 900;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = f(to * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  const bigMoney = (v) => `${v < 0 ? '−' : ''}<span class="cur">R</span><span class="num" data-count="${Math.abs(v)}">${nfNum.format(Math.abs(v))}</span>`;
  function chg(cur, prev, { invert = false, label = 'vs last month' } = {}) {
    const c = change(cur, prev);
    if (c === null) return `<span class="chg flat"><span class="arr">${ic('spark')}</span>New <small>${label}</small></span>`;
    const dir = Math.abs(c) < 0.5 ? 'flat' : c > 0 ? 'up' : 'down';
    const good = dir === 'flat' ? 'flat' : (dir === 'up') !== invert ? 'up' : 'down';
    return `<span class="chg ${good}"><span class="arr">${ic(dir === 'down' ? 'down' : 'up')}</span>${c > 0 ? '+' : ''}${Math.round(c)}% <small>${label}</small></span>`;
  }
  const emptyState = (icon, title, text, btn = '') => `<div class="empty"><div class="e-ic">${ic(icon)}</div><b>${title}</b><p>${text}</p>${btn}</div>`;
  const progress = (p, color, fat) => `<div class="bar${fat ? ' fat' : ''}"><div class="bar-fill"${color ? ` style="background:${color}"` : ''} data-w="${Math.max(0, Math.min(100, p)).toFixed(1)}%"></div></div>`;

  /* ---------- UI state ---------- */
  const UI = {
    dashPeriod: 'month',
    flow: 'monthly',
    flowOff: {},
    cb: { q: '', from: '', to: '', type: '', stream: '', cat: '', method: '' },
    cbLimit: 50,
    owedTab: 'open',
    rep: { mode: 'month', month: null, year: null },
    sumYear: null,
    streamRange: 'month',
  };

  /* ---------- transactions ---------- */
  function txModal(t = null, preset = {}) {
    const isEdit = !!t;
    const d = t || { type: preset.type || 'in', amount: '', date: today(), streamId: preset.streamId || (S.streams.length === 1 ? S.streams[0].id : ''), category: '', method: 'Cash', desc: '' };
    let type = d.type;
    const catOpts = (ty, sel) => opts(ty === 'in' ? INCOME_CATS : EXPENSE_CATS, sel);
    openModal(`${modalHead(isEdit ? 'Edit transaction' : 'Add transaction', 'book')}
      <form id="txForm" novalidate>
        <div class="type-toggle" role="radiogroup" aria-label="Type" style="margin-bottom:16px">
          <button type="button" class="in ${type === 'in' ? 'on' : ''}" data-ty="in">${ic('down')}Money in</button>
          <button type="button" class="out ${type === 'out' ? 'on' : ''}" data-ty="out">${ic('up')}Money out</button>
        </div>
        <div class="form-grid">
          ${field('Amount', moneyInput('amount', d.amount))}
          ${field('Date', `<input class="input" type="date" name="date" value="${d.date}">`)}
          ${field('Description', `<input class="input" name="desc" maxlength="120" value="${esc(d.desc)}" placeholder="e.g. Cupcake order for Thandi">`, 'full')}
          ${field('Income stream', `<select class="input" name="streamId">${streamOpts(d.streamId)}</select>`)}
          ${field('Category', `<select class="input" name="category">${catOpts(type, d.category)}</select>`)}
          ${field('Payment method', `<select class="input" name="method">${opts(METHODS, d.method)}</select>`, 'full')}
        </div>
        ${S.streams.length ? '' : `<p class="small muted" style="margin:12px 0 0">Tip: <a href="#/streams" data-close>create an income stream</a> to see which hustle earns the most.</p>`}
        <div class="modal-f">
          ${isEdit ? `<button type="button" class="btn btn-danger left" id="txDel">${ic('trash')}Delete</button>` : ''}
          <button type="button" class="btn" data-close>Cancel</button>
          <button class="btn btn-primary" type="submit">${ic('check')}${isEdit ? 'Save changes' : 'Add transaction'}</button>
        </div>
      </form>`, {
      onMount: (m, close) => {
        const f = $('#txForm', m);
        $$('[data-ty]', m).forEach((b) => (b.onclick = () => {
          type = b.dataset.ty;
          $$('[data-ty]', m).forEach((x) => x.classList.toggle('on', x === b));
          f.elements.category.innerHTML = catOpts(type);
        }));
        if (isEdit) $('#txDel', m).onclick = () => { close(); deleteTx(t.id); };
        f.onsubmit = (e) => {
          e.preventDefault();
          if (!validate(f, { amount: vAmount, date: vDate, desc: (v) => (v.length > 120 ? 'Keep it under 120 characters' : '') })) return;
          const rec = { type, amount: r2(+f.elements.amount.value), date: f.elements.date.value, streamId: f.elements.streamId.value, category: f.elements.category.value, method: f.elements.method.value, desc: f.elements.desc.value.trim() || f.elements.category.value };
          if (isEdit) Object.assign(t, rec); else S.tx.push({ id: uid(), owedId: '', ...rec });
          if (save()) { close(); toast(isEdit ? 'Transaction updated' : `${type === 'in' ? 'Money in' : 'Money out'} of ${money(rec.amount)} added`); render(); }
        };
      },
    });
  }
  function deleteTx(id) {
    const i = S.tx.findIndex((t) => t.id === id);
    if (i < 0) return;
    const [t] = S.tx.splice(i, 1);
    save(); render();
    toast('Transaction deleted', { action: 'Undo', onAction: () => { S.tx.splice(i, 0, t); save(); render(); } });
  }

  /* ---------- streams ---------- */
  function streamModal(s = null) {
    const d = s || { name: '', type: 'freelance', color: COLORS[S.streams.length % COLORS.length] };
    let color = d.color;
    openModal(`${modalHead(s ? 'Edit income stream' : 'New income stream', 'layers')}
      <form id="stForm" novalidate><div class="form-grid">
        ${field('Name', `<input class="input" name="name" maxlength="40" value="${esc(d.name)}" placeholder="e.g. Weekend baking">`, 'full')}
        ${field('Type', `<select class="input" name="type">${opts(Object.entries(TYPES).map(([k, v]) => [k, v.label]), d.type)}</select>`, 'full')}
        <div class="field full"><span class="lbl">Colour</span><div class="swatches">${COLORS.map((c) => `<button type="button" data-c="${c}" class="${c === color ? 'on' : ''}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('')}</div></div>
      </div>
      <div class="modal-f"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit">${ic('check')}${s ? 'Save' : 'Create stream'}</button></div></form>`, {
      size: 'sm',
      onMount: (m, close) => {
        const f = $('#stForm', m);
        $$('[data-c]', m).forEach((b) => (b.onclick = () => { color = b.dataset.c; $$('[data-c]', m).forEach((x) => x.classList.toggle('on', x === b)); }));
        f.onsubmit = (e) => {
          e.preventDefault();
          const name = f.elements.name.value.trim();
          if (!validate(f, { name: (v) => (!v ? 'Give your stream a name' : S.streams.some((x) => x !== s && x.name.toLowerCase() === v.toLowerCase()) ? 'You already have a stream with this name' : '') })) return;
          if (s) Object.assign(s, { name, type: f.elements.type.value, color });
          else S.streams.push({ id: uid(), name, type: f.elements.type.value, color });
          if (save()) { close(); toast(s ? 'Stream updated' : `“${name}” created`); render(); }
        };
      },
    });
  }
  async function deleteStream(id) {
    const s = streamById(id); if (!s) return;
    const n = S.tx.filter((t) => t.streamId === id).length;
    if (!(await confirmBox({ title: `Delete “${s.name}”?`, text: n ? `Its ${n} transaction${n === 1 ? '' : 's'} will stay in your Cash Book as “Unassigned”.` : 'This stream has no transactions.' }))) return;
    S.streams = S.streams.filter((x) => x.id !== id);
    S.tx.forEach((t) => { if (t.streamId === id) t.streamId = ''; });
    S.owed.forEach((o) => { if (o.streamId === id) o.streamId = ''; });
    save(); location.hash = '#/streams'; toast('Stream deleted');
  }

  /* ---------- who owes me ---------- */
  function owedModal(o = null) {
    const d = o || { customer: '', desc: '', amount: '', due: addDays(today(), 7), streamId: '' };
    openModal(`${modalHead(o ? 'Edit payment owed' : 'Someone owes me', 'users')}
      <form id="owForm" novalidate><div class="form-grid">
        ${field('Customer name', `<input class="input" name="customer" maxlength="60" value="${esc(d.customer)}" placeholder="e.g. Thandi M.">`, 'full')}
        ${field('Amount owed', moneyInput('amount', d.amount))}
        ${field('Due date', `<input class="input" type="date" name="due" value="${d.due}">`)}
        ${field('What it’s for', `<input class="input" name="desc" maxlength="120" value="${esc(d.desc)}" placeholder="e.g. Birthday cake">`, 'full')}
        ${field('Income stream', `<select class="input" name="streamId">${streamOpts(d.streamId)}</select>`, 'full')}
      </div>
      <div class="modal-f"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit">${ic('check')}${o ? 'Save' : 'Add'}</button></div></form>`, {
      onMount: (m, close) => {
        const f = $('#owForm', m);
        f.onsubmit = (e) => {
          e.preventDefault();
          if (!validate(f, { customer: vReq('Customer name'), amount: vAmount, due: vDate })) return;
          const rec = { customer: f.elements.customer.value.trim(), amount: r2(+f.elements.amount.value), due: f.elements.due.value, desc: f.elements.desc.value.trim(), streamId: f.elements.streamId.value };
          if (o) Object.assign(o, rec); else S.owed.push({ id: uid(), status: 'open', paidDate: '', txId: '', ...rec });
          if (save()) { close(); toast(o ? 'Updated' : `Added ${money(rec.amount)} owed by ${rec.customer}`); render(); }
        };
      },
    });
  }
  function receiveModal(o) {
    openModal(`${modalHead('Mark as received', 'check')}
      <form id="rcForm" novalidate>
        <p style="margin:0 0 16px"><b>${esc(o.customer)}</b> paid <b>${money(o.amount)}</b>${o.desc ? ` for ${esc(o.desc)}` : ''}.</p>
        <div class="form-grid">
          ${field('Date received', `<input class="input" type="date" name="date" value="${today()}">`)}
          ${field('Paid by', `<select class="input" name="method">${opts(METHODS, 'EFT')}</select>`)}
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:14px;cursor:pointer"><input type="checkbox" name="addTx" checked style="accent-color:var(--primary);width:16px;height:16px"> Add it to my Cash Book as money in</label>
        <div class="modal-f"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit">${ic('check')}Mark received</button></div>
      </form>`, {
      size: 'sm',
      onMount: (m, close) => {
        const f = $('#rcForm', m);
        f.onsubmit = (e) => {
          e.preventDefault();
          if (!validate(f, { date: vDate })) return;
          o.status = 'paid'; o.paidDate = f.elements.date.value;
          if (f.elements.addTx.checked) {
            const t = { id: uid(), type: 'in', amount: o.amount, date: o.paidDate, streamId: o.streamId, category: 'Customer payment', method: f.elements.method.value, desc: `Payment from ${o.customer}${o.desc ? ' – ' + o.desc : ''}`, owedId: o.id };
            S.tx.push(t); o.txId = t.id;
          }
          if (save()) { close(); toast(`${money(o.amount)} from ${o.customer} received`); render(); }
        };
      },
    });
  }
  async function reopenOwed(o) {
    const linked = S.tx.find((t) => t.id === o.txId);
    if (!(await confirmBox({ title: 'Mark as not paid?', text: linked ? 'The matching money-in entry will be removed from your Cash Book too.' : 'It will move back to outstanding.', ok: 'Mark unpaid', danger: false }))) return;
    o.status = 'open'; o.paidDate = '';
    if (linked) S.tx = S.tx.filter((t) => t.id !== linked.id);
    o.txId = '';
    save(); render();
  }

  /* ---------- goals ---------- */
  function goalModal(g = null) {
    const d = g || { name: '', target: '', saved: '', deadline: '' };
    openModal(`${modalHead(g ? 'Edit goal' : 'New savings goal', 'target')}
      <form id="glForm" novalidate><div class="form-grid">
        ${field('Goal name', `<input class="input" name="name" maxlength="50" value="${esc(d.name)}" placeholder="e.g. New laptop">`, 'full')}
        ${field('Target amount', moneyInput('target', d.target))}
        ${field('Saved so far', moneyInput('saved', d.saved))}
        ${field('Target date (optional)', `<input class="input" type="date" name="deadline" value="${d.deadline}">`, 'full')}
      </div>
      <div class="modal-f"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit">${ic('check')}${g ? 'Save' : 'Create goal'}</button></div></form>`, {
      size: 'sm',
      onMount: (m, close) => {
        const f = $('#glForm', m);
        f.onsubmit = (e) => {
          e.preventDefault();
          if (!validate(f, { name: vReq('Goal name'), target: vAmount, saved: (v) => (v === '' || (+v >= 0 && isFinite(+v)) ? '' : 'Enter R0 or more') })) return;
          const rec = { name: f.elements.name.value.trim(), target: r2(+f.elements.target.value), saved: r2(+f.elements.saved.value || 0), deadline: f.elements.deadline.value };
          if (g) Object.assign(g, rec); else S.goals.push({ id: uid(), ...rec });
          if (save()) { close(); toast(g ? 'Goal updated' : `Goal “${rec.name}” created`); render(); }
        };
      },
    });
  }
  function fundModal(g) {
    let dir = 1;
    openModal(`${modalHead(g.name, 'target')}
      <form id="fdForm" novalidate>
        <div class="type-toggle" style="margin-bottom:16px">
          <button type="button" class="in on" data-d="1">${ic('plus')}Add money</button>
          <button type="button" class="out" data-d="-1">${ic('minus')}Take out</button>
        </div>
        ${field('Amount', moneyInput('amount'))}
        <p class="small muted" style="margin:10px 0 0">Saved so far: ${money(g.saved)} of ${money(g.target)}</p>
        <div class="modal-f"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit">${ic('check')}Update goal</button></div>
      </form>`, {
      size: 'sm',
      onMount: (m, close) => {
        const f = $('#fdForm', m);
        $$('[data-d]', m).forEach((b) => (b.onclick = () => { dir = +b.dataset.d; $$('[data-d]', m).forEach((x) => x.classList.toggle('on', x === b)); }));
        f.onsubmit = (e) => {
          e.preventDefault();
          if (!validate(f, { amount: (v) => vAmount(v) || (dir < 0 && +v > g.saved ? `You only have ${money(g.saved)} saved` : '') })) return;
          const amt = r2(+f.elements.amount.value);
          g.saved = r2(g.saved + dir * amt);
          if (g.saved >= g.target && dir > 0) confetti();
          if (save()) { close(); toast(g.saved >= g.target ? `🎉 You reached “${g.name}”!` : `${dir > 0 ? 'Added' : 'Took out'} ${money(amt)}`); render(); }
        };
      },
    });
  }

  /* ---------- tax ---------- */
  function taxSaveModal(suggest = 0) {
    openModal(`${modalHead('Record money set aside', 'percent')}
      <form id="tsForm" novalidate><div class="form-grid">
        ${field('Amount', moneyInput('amount', suggest > 0 ? suggest.toFixed(2) : ''))}
        ${field('Date', `<input class="input" type="date" name="date" value="${today()}">`)}
        ${field('Note (optional)', `<input class="input" name="note" maxlength="80" placeholder="e.g. Moved to tax savings pocket">`, 'full')}
      </div>
      <div class="modal-f"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit">${ic('check')}Save</button></div></form>`, {
      size: 'sm',
      onMount: (m, close) => {
        const f = $('#tsForm', m);
        f.onsubmit = (e) => {
          e.preventDefault();
          if (!validate(f, { amount: vAmount, date: vDate })) return;
          S.taxSaved.push({ id: uid(), amount: r2(+f.elements.amount.value), date: f.elements.date.value, note: f.elements.note.value.trim() });
          if (save()) { close(); toast('Set-aside recorded'); render(); }
        };
      },
    });
  }

  /* ---------- generic delete with undo ---------- */
  function removeWithUndo(key, id, label) {
    const i = S[key].findIndex((x) => x.id === id);
    if (i < 0) return;
    const [item] = S[key].splice(i, 1);
    save(); render();
    toast(`${label} deleted`, { action: 'Undo', onAction: () => { S[key].splice(i, 0, item); save(); render(); } });
  }

  /* ---------- backup ---------- */
  function exportBackup() {
    download(`cashbook-backup-${today()}.json`, JSON.stringify(S, null, 2), 'application/json');
    toast('Backup downloaded');
  }
  function importBackup() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      if (file.size > 10e6) return toast('That file is too big to be a CashBook backup.', { err: true });
      try {
        const data = sanitize(JSON.parse(await file.text()));
        if (!(await confirmBox({ title: 'Replace all data?', text: `This backup has ${data.tx.length} transactions and ${data.streams.length} income streams. It will replace what is in this browser now.`, ok: 'Replace', danger: true }))) return;
        S = data; save(); render(); toast('Backup restored');
      } catch (e) { toast("That file isn't a valid CashBook backup.", { err: true }); }
    };
    inp.click();
  }

  /* ================================================================
     PAGES
     ================================================================ */
  const NAV = [
    ['Overview', [['dashboard', 'Dashboard', 'grid'], ['cashbook', 'Cash Book', 'book'], ['streams', 'My Income Streams', 'layers'], ['monthly', 'Monthly Summary', 'calendar']]],
    ['Money management', [['owed', 'Who Owes Me', 'users'], ['tax', 'Tax Set-Aside', 'percent'], ['goals', 'Savings Goals', 'target']]],
    ['Insights', [['reports', 'Reports', 'chart'], ['settings', 'Settings', 'settings']]],
  ];
  let charts = []; // re-render callbacks for resize

  function renderNav(route) {
    const overdue = S.owed.filter((o) => owedState(o).key === 'overdue').length;
    $('#nav').innerHTML = NAV.map(([g, items]) => `<div class="nav-group">${g}</div>` + items.map(([id, label, icon]) =>
      `<a class="nav-link${route === id ? ' active' : ''}" href="#/${id}"${route === id ? ' aria-current="page"' : ''}><span class="nav-ic">${ic(icon)}</span>${label}${id === 'owed' && overdue ? `<span class="nav-badge">${overdue}</span>` : ''}</a>`).join('')).join('');
  }

  function sampleBanner() {
    if (!hasSample()) return '';
    return `<div class="banner">${ic('info')}<p><b>You’re looking at sample data.</b> It’s here so you can explore. Clear it when you’re ready to add your own — anything you added yourself stays.</p><button class="btn btn-sm" data-action="clear-sample">Clear sample data</button></div>`;
  }

  /* ---------- Dashboard ---------- */
  function periodRange(p) {
    const T = today(), mk = thisMonth();
    if (p === 'month') return { from: mk + '-01', to: T, pFrom: addMonths(mk, -1) + '-01', pTo: sameDayLastMonth(), label: 'vs same days last month', name: 'This month' };
    if (p === 'last') { const lm = addMonths(mk, -1); return { from: lm + '-01', to: monthEnd(lm), pFrom: addMonths(lm, -1) + '-01', pTo: monthEnd(addMonths(lm, -1)), label: 'vs month before', name: 'Last month' }; }
    if (p === 'year') { const y = taxYearOf(T); const r = tyRange(y); return { from: r.from, to: T, pFrom: tyRange(y - 1).from, pTo: addDays(T, -365), label: 'vs last tax year', name: 'This tax year' }; }
    return { from: '0000-01-01', to: '9999-12-31', pFrom: null, label: '', name: 'All time' };
  }

  function pageDashboard() {
    const P = periodRange(UI.dashPeriod);
    const cur = sums(txRange(P.from, P.to));
    const prev = P.pFrom ? sums(txRange(P.pFrom, P.pTo)) : null;
    const months = Array.from({ length: 8 }, (_, i) => monthSums(addMonths(thisMonth(), i - 7)));
    const h = new Date().getHours();
    const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const name = S.profile.name ? `, ${esc(S.profile.name)}` : '';
    const kpi = (label, icon, link, href, val, prevVal, color, sparkVals, opt = {}) => `
      <div class="card kpi lift">
        <div class="kpi-top"><span class="card-ic">${ic(icon)}</span><span class="kpi-label">${label}</span><a class="kpi-link" href="${href}" aria-label="${link}"><span class="kl-t">${link}</span>${ic('ext')}</a></div>
        <div class="kpi-val ${opt.cls || ''}">${bigMoney(val)}</div>
        <div class="kpi-foot">${prev ? chg(val, prevVal, { invert: opt.invert, label: UI.dashPeriod === 'month' ? 'vs last month' : P.label }) : `<span class="chg flat"><small>${P.name}</small></span>`}${Charts.spark(sparkVals, color, 96, 34)}</div>
      </div>`;

    // streams breakdown for the donut
    const inPeriod = txRange(P.from, P.to).filter((t) => t.type === 'in');
    const byStream = new Map();
    inPeriod.forEach((t) => byStream.set(t.streamId, (byStream.get(t.streamId) || 0) + t.amount));
    const streamItems = [...byStream.entries()].map(([id, v]) => ({ label: streamName(id), value: r2(v), color: streamById(id)?.color || '#6E6890', id })).sort((a, b) => b.value - a.value);

    const recent = [...S.tx].sort((a, b) => b.date.localeCompare(a.date) || 0).slice(0, 6);
    const open = S.owed.filter((o) => o.status !== 'paid');
    const aged = { total: 0, notDue: 0, d30: 0, d60: 0, d60p: 0 };
    open.forEach((o) => { const st = owedState(o); aged.total += o.amount; if (st.key !== 'overdue') aged.notDue += o.amount; else if (st.days <= 30) aged.d30 += o.amount; else if (st.days <= 60) aged.d60 += o.amount; else aged.d60p += o.amount; });
    const goal = [...S.goals].filter((g) => g.saved < g.target).sort((a, b) => b.saved / b.target - a.saved / a.target)[0];
    const periodCount = txRange(P.from, P.to).length;
    const hc = prev ? change(cur.profit, prev.profit) : 0;
    const heroChg = !prev || hc === null || Math.abs(hc) < 0.5 ? '' : `<span class="hero-chip ${hc > 0 ? 'up' : 'down'}">${ic(hc > 0 ? 'up' : 'down')}${hc > 0 ? '+' : ''}${Math.round(hc)}% ${P.label}</span>`;

    return {
      title: 'Dashboard',
      html: `
      ${sampleBanner()}
      <section class="hero">
        <span class="hero-orb o1"></span><span class="hero-orb o2"></span><span class="hero-orb o3"></span>
        <div>
          <span class="hero-date">${ic('calendar')}${fmtD(today(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <h2>${hello}${name} <span class="wave" aria-hidden="true">👋</span></h2>
          <p class="hero-sub">${cur.profit >= 0 ? 'Your side hustles made you' : 'Your side hustles are down'} · ${P.name.toLowerCase()}</p>
          <div class="hero-fig">${bigMoney(cur.profit)}</div>
          <div class="hero-chips">
            ${heroChg}
            <span class="hero-chip">${ic('book')}${periodCount} transaction${periodCount === 1 ? '' : 's'}</span>
            <span class="hero-chip">${ic('layers')}${S.streams.length} income stream${S.streams.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div class="hero-side">
          <div class="row">
            <select class="input" id="dashPeriod" style="width:auto" aria-label="Period">${opts([['month', 'This month'], ['last', 'Last month'], ['year', 'This tax year'], ['all', 'All time']], UI.dashPeriod)}</select>
            <button class="btn" data-action="export-period">${ic('download')}Export</button>
          </div>
          <div class="row">
            <button class="btn" data-action="add-tx" data-type="out">${ic('up')}Money out</button>
            <button class="btn white" data-action="add-tx" data-type="in">${ic('plus')}Money in</button>
          </div>
        </div>
      </section>
      <div class="grid kpis stagger">
        ${kpi('Total Money In', 'wallet', 'Cash Book', '#/cashbook', cur.in, prev?.in, C_IN, months.map((m) => m.in))}
        ${kpi('Total Money Out', 'card', 'Expenses', '#/cashbook', cur.out, prev?.out, C_OUT, months.map((m) => m.out), { invert: true })}
        ${kpi('Net Profit', 'trend', 'Reports', '#/reports', cur.profit, prev?.profit, C_PROFIT, months.map((m) => m.profit), { cls: cur.profit >= 0 ? 'green' : 'red' })}
        ${kpi('Tax Set-Aside', 'percent', `${S.settings.taxRate}%`, '#/tax', taxOn(cur.profit), prev ? taxOn(prev.profit) : 0, '#A78BFA', months.map((m) => taxOn(m.profit)))}
      </div>

      <div class="grid dash-row">
        <div class="card">
          <div class="card-h"><span class="card-ic">${ic('chart')}</span><h3>Cash Flow Overview</h3>
            <div class="right"><div class="seg" role="tablist">${['daily', 'weekly', 'monthly'].map((m) => `<button role="tab" data-flow="${m}" class="${UI.flow === m ? 'on' : ''}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div></div>
          </div>
          <div id="flowHead"></div>
          <div class="chart-panel"><div class="chart-box" id="flowChart"></div></div>
        </div>
        <div class="card">
          <div class="card-h"><span class="card-ic">${ic('layers')}</span><h3>Income by Stream</h3><div class="right"><a class="kpi-link" href="#/streams">All streams${ic('ext')}</a></div></div>
          ${streamItems.length ? `<div id="streamDonut" style="margin-bottom:16px"></div>
          <div class="list">${streamItems.slice(0, 5).map((s, i) => `<a class="list-row" href="#/streams/${s.id}" data-si="${i}"><span class="lr-ic" style="background:${s.color}1f;color:${s.color}">${ic(TYPES[streamById(s.id)?.type]?.icon || 'spark')}</span><span class="lr-main"><b>${esc(s.label)}</b><small>${Math.round((s.value / cur.in) * 100)}% of money in${i === 0 ? ' · top earner' : ''}</small></span><span class="lr-val num">${money(s.value)}</span></a>`).join('')}</div>`
            : emptyState('layers', 'No income yet', `Nothing came in during “${P.name.toLowerCase()}”. Add money in to see which hustle earns most.`, `<button class="btn btn-primary btn-sm" data-action="add-tx" data-type="in">${ic('plus')}Add money in</button>`)}
        </div>
      </div>

      <div class="grid dash-row">
        <div class="card">
          <div class="card-h"><span class="card-ic">${ic('book')}</span><h3>Recent Transactions</h3><div class="right"><a class="kpi-link" href="#/cashbook">View all${ic('ext')}</a></div></div>
          ${recent.length ? `<div class="table-wrap"><table class="t t-first-pad"><thead><tr><th>Description</th><th class="hide-sm">Stream</th><th class="hide-sm">Date</th><th class="r">Amount</th></tr></thead><tbody>
            ${recent.map((t) => `<tr><td class="desc">${esc(t.desc)}<small>${esc(t.category)} · ${esc(t.method)}</small></td><td class="hide-sm">${streamTag(t.streamId)}</td><td class="hide-sm muted">${fmtD(t.date)}</td><td class="r num ${t.type === 'in' ? 'pos' : 'neg'}"><b>${t.type === 'in' ? '+' : '−'}${money(t.amount)}</b></td></tr>`).join('')}
          </tbody></table></div>` : emptyState('book', 'Your Cash Book is empty', 'Every rand in or out goes here. Start with your last sale.', `<button class="btn btn-primary btn-sm" data-action="add-tx">${ic('plus')}Add your first transaction</button>`)}
        </div>
        <div class="grid" style="align-content:start">
          <div class="card">
            <div class="card-h"><span class="card-ic">${ic('users')}</span><h3>Who Owes Me</h3><div class="right"><a class="kpi-link" href="#/owed">Manage${ic('ext')}</a></div></div>
            ${open.length ? `<div class="kv"><span>Total outstanding</span><b class="num">${money(aged.total)}</b></div>
              <div class="kv"><span>Not yet due</span><b class="num">${money(aged.notDue)}</b></div>
              <div class="kv"><span>1–30 days overdue</span><b class="num ${aged.d30 ? 'neg' : ''}">${money(aged.d30)}</b></div>
              <div class="kv"><span>31–60 days overdue</span><b class="num ${aged.d60 ? 'neg' : ''}">${money(aged.d60)}</b></div>
              <div class="kv"><span>60+ days overdue</span><b class="num ${aged.d60p ? 'neg' : ''}">${money(aged.d60p)}</b></div>`
            : `<p class="muted" style="margin:0">Nobody owes you anything right now. 🎉</p>`}
          </div>
          <div class="card">
            <div class="card-h"><span class="card-ic">${ic('target')}</span><h3>Savings Goal</h3><div class="right"><a class="kpi-link" href="#/goals">All goals${ic('ext')}</a></div></div>
            ${goal ? `<div class="goal"><div class="goal-fig"><b>${esc(goal.name)}</b><span class="muted num">${Math.round((goal.saved / goal.target) * 100)}%</span></div>${progress((goal.saved / goal.target) * 100)}<div class="goal-fig small"><span class="num">${money(goal.saved)}</span><span class="muted num">of ${money(goal.target)}</span></div></div>`
            : `<p class="muted" style="margin:0 0 12px">Set a goal to put your side-hustle money to work.</p><button class="btn btn-sm" data-action="add-goal">${ic('plus')}New goal</button>`}
          </div>
        </div>
      </div>`,
      after(root) {
        $('#dashPeriod', root).onchange = (e) => { UI.dashPeriod = e.target.value; render(); };
        $$('[data-flow]', root).forEach((b) => (b.onclick = () => { UI.flow = b.dataset.flow; $$('[data-flow]', root).forEach((x) => x.classList.toggle('on', x === b)); drawFlow(true); }));
        const drawFlow = (anim) => {
          const B = buckets(UI.flow);
          const data = B.map((b) => sums(txRange(b.from, b.to)));
          const prevB = buckets(UI.flow, B.length);
          const tot = sums(txRange(B[0].from, B[B.length - 1].to)), ptot = sums(txRange(prevB[0].from, prevB[prevB.length - 1].to));
          const c = change(tot.profit, ptot.profit);
          const series = [['in', 'Income', C_IN], ['out', 'Expenses', C_OUT], ['profit', 'Profit', C_PROFIT]];
          $('#flowHead', root).innerHTML = `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">
            <div class="big-figure"><span class="num ${tot.profit < 0 ? 'neg' : ''}">${money(tot.profit)}</span>${c === null ? '' : `<span class="tag ${c >= 0 ? 'green' : 'red'}">${c >= 0 ? '+' : ''}${Math.round(c)}%</span>`}</div>
            <span class="muted small">net profit · ${UI.flow === 'daily' ? 'last 30 days' : UI.flow === 'weekly' ? 'last 12 weeks' : 'last 12 months'}</span>
            <div class="legend-row" style="margin-left:auto">${series.map(([k, l, col]) => `<button class="chip${UI.flowOff[k] ? ' off' : ''}" data-ser="${k}" aria-pressed="${!UI.flowOff[k]}"><i class="sw" style="background:${col}"></i>${l}</button>`).join('')}</div></div>`;
          $$('[data-ser]', root).forEach((b) => (b.onclick = () => {
            const k = b.dataset.ser;
            if (!UI.flowOff[k] && series.filter(([s]) => !UI.flowOff[s]).length === 1) return; // keep one visible
            UI.flowOff[k] = !UI.flowOff[k]; drawFlow(true);
          }));
          const el = $('#flowChart', root);
          Charts.area(el, {
            labels: B.map((b) => b.label), tipLabels: B.map((b) => b.tip), height: 320, fmt: money, fmtAxis: axisMoney, aria: 'Cash flow chart', endDot: false,
            series: series.filter(([k]) => !UI.flowOff[k]).map(([k, name, color]) => ({ name, color, values: data.map((d) => d[k]), fill: k === 'in' })),
          });
          if (anim) Charts.animate(el);
        };
        drawFlow(false);
        charts.push(() => drawFlow(false));
        const dn = $('#streamDonut', root);
        if (dn) {
          Charts.donut(dn, { items: streamItems, fmt: money, size: 190, thickness: 24, centerLabel: 'Money in' });
          $$('[data-si]', root).forEach((r) => { r.onmouseenter = () => dn._focus(+r.dataset.si); r.onmouseleave = () => dn._reset(); });
        }
      },
    };
  }
  const streamTag = (id) => { const s = streamById(id); return s ? `<span class="tag grey"><i class="sw" style="background:${s.color}"></i>${esc(s.name)}</span>` : '<span class="muted small">Unassigned</span>'; };

  // Time buckets for the cash flow chart. shift = how many buckets back to start (for "previous period").
  function buckets(mode, shift = 0) {
    const T = today(), out = [];
    if (mode === 'daily') {
      for (let i = 29 + shift; i >= shift; i--) { const d = addDays(T, -i); out.push({ from: d, to: d, label: fmtD(d, { day: 'numeric', month: 'short' }), tip: fmtD(d, { weekday: 'short', day: 'numeric', month: 'short' }) }); }
    } else if (mode === 'weekly') {
      const dow = (parse(T).getDay() + 6) % 7, mon = addDays(T, -dow);
      for (let i = 11 + shift; i >= shift; i--) { const f = addDays(mon, -7 * i), t = addDays(f, 6); out.push({ from: f, to: t, label: fmtD(f, { day: 'numeric', month: 'short' }), tip: `Week of ${fmtD(f, { day: 'numeric', month: 'short' })}` }); }
    } else {
      for (let i = 11 + shift; i >= shift; i--) { const mk = addMonths(thisMonth(), -i); out.push({ from: mk + '-01', to: monthEnd(mk), label: mLabel(mk), tip: mLabel(mk, true) }); }
    }
    return out;
  }

  /* ---------- Cash Book ---------- */
  function filteredTx(f = UI.cb) {
    const q = f.q.toLowerCase();
    return S.tx.filter((t) => (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to) && (!f.type || t.type === f.type) && (!f.stream || (f.stream === '_none' ? !streamById(t.streamId) : t.streamId === f.stream)) && (!f.cat || t.category === f.cat) && (!f.method || t.method === f.method)
      && (!q || `${t.desc} ${t.category} ${streamName(t.streamId)} ${t.amount}`.toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  function txTable(list, limit, { showStream = true } = {}) {
    if (!list.length) return '';
    const shown = list.slice(0, limit);
    return `<div class="table-wrap"><table class="t t-first-pad"><thead><tr><th>Date</th><th>Description</th>${showStream ? '<th class="hide-sm">Stream</th>' : ''}<th class="hide-sm">Method</th><th class="r">Amount</th><th class="acts"><span class="sr" style="position:absolute;left:-9999px">Actions</span></th></tr></thead><tbody>
      ${shown.map((t) => `<tr><td class="muted" style="white-space:nowrap">${fmtD(t.date, { day: 'numeric', month: 'short' })}<small style="display:block;font-size:11.5px">${t.date.slice(0, 4)}</small></td>
        <td class="desc">${esc(t.desc)}<small>${esc(t.category)}${t.owedId ? ' · from Who Owes Me' : ''}</small></td>
        ${showStream ? `<td class="hide-sm">${streamTag(t.streamId)}</td>` : ''}<td class="hide-sm muted">${esc(t.method)}</td>
        <td class="r num ${t.type === 'in' ? 'pos' : 'neg'}" style="white-space:nowrap"><b>${t.type === 'in' ? '+' : '−'}${money(t.amount)}</b></td>
        <td class="acts"><button class="icon-btn sm" data-action="edit-tx" data-id="${t.id}" aria-label="Edit">${ic('edit')}</button><button class="icon-btn sm" data-action="del-tx" data-id="${t.id}" aria-label="Delete">${ic('trash')}</button></td></tr>`).join('')}
      </tbody></table></div>
      ${list.length > limit ? `<div style="text-align:center;padding:16px 0 0"><button class="btn btn-sm" data-action="more-tx">Show more (${list.length - limit} left)</button></div>` : ''}`;
  }
  function pageCashbook() {
    const f = UI.cb;
    const allCats = [...new Set([...INCOME_CATS, ...EXPENSE_CATS, ...S.tx.map((t) => t.category)])].filter(Boolean);
    return {
      title: 'Cash Book',
      html: `${sampleBanner()}
      <div class="greet"><div><h2>Cash Book</h2><p>Every rand in and out, in one place.</p></div>
        <div class="right"><button class="btn" data-action="export-cb">${ic('download')}Export CSV</button><button class="btn" data-action="add-tx" data-type="out">${ic('up')}Add expense</button><button class="btn btn-primary" data-action="add-tx" data-type="in">${ic('plus')}Add income</button></div></div>
      <div class="grid three stagger" id="cbSum" style="margin-bottom:18px"></div>
      <div class="card">
        <form class="filters" id="cbFilters" onsubmit="return false">
          <div class="field grow"><label for="fq">Search</label><input class="input" id="fq" name="q" value="${esc(f.q)}" placeholder="Search description, category, stream…"></div>
          <div class="field"><label>From</label><input class="input" type="date" name="from" value="${f.from}"></div>
          <div class="field"><label>To</label><input class="input" type="date" name="to" value="${f.to}"></div>
          <div class="field"><label>Type</label><select class="input" name="type">${opts([['', 'All'], ['in', 'Money in'], ['out', 'Money out']], f.type)}</select></div>
          <div class="field"><label>Stream</label><select class="input" name="stream"><option value="">All streams</option>${opts(S.streams.map((s) => [s.id, s.name]).concat([['_none', 'Unassigned']]), f.stream)}</select></div>
          <div class="field"><label>Category</label><select class="input" name="cat"><option value="">All categories</option>${opts(allCats, f.cat)}</select></div>
          <div class="field"><label>Method</label><select class="input" name="method"><option value="">All methods</option>${opts(METHODS, f.method)}</select></div>
          <button class="btn btn-ghost btn-sm" type="button" id="fReset" style="align-self:flex-end;margin-bottom:3px">${ic('undo')}Reset</button>
        </form>
        <div id="cbResults"></div>
      </div>`,
      after(root) {
        const draw = () => {
          const list = filteredTx();
          const s = sums(list);
          $('#cbSum', root).innerHTML = [['Money in', s.in, 'pos', 'wallet'], ['Money out', s.out, 'neg', 'card'], [`Profit · ${list.length} entr${list.length === 1 ? 'y' : 'ies'}`, s.profit, s.profit >= 0 ? 'pos' : 'neg', 'trend']]
            .map(([l, v, c, i]) => `<div class="card lift" style="display:flex;align-items:center;gap:12px;padding:16px"><span class="card-ic">${ic(i)}</span><div><div class="muted small">${l}</div><div class="num ${c}" style="font-size:20px;font-weight:750;letter-spacing:-.02em">${money(v)}</div></div></div>`).join('');
          const filtered = Object.values(UI.cb).some(Boolean);
          $('#cbResults', root).innerHTML = list.length ? txTable(list, UI.cbLimit)
            : S.tx.length ? emptyState('search', 'No matches', 'Nothing fits these filters. Try widening the dates or clearing the search.', `<button class="btn btn-sm" id="fReset2">${ic('undo')}Clear filters</button>`)
              : emptyState('book', 'No transactions yet', 'Add the money you made or spent on your side hustle. It only takes a few seconds.', `<button class="btn btn-primary btn-sm" data-action="add-tx" data-type="in">${ic('plus')}Add income</button>`);
          $('#fReset2', root)?.addEventListener('click', reset);
          $('#fReset', root).hidden = !filtered;
        };
        const reset = () => { Object.keys(UI.cb).forEach((k) => (UI.cb[k] = '')); UI.cbLimit = 50; render(); };
        const form = $('#cbFilters', root);
        form.addEventListener('input', (e) => { UI.cb[e.target.name] = e.target.value; UI.cbLimit = 50; draw(); });
        $('#fReset', root).onclick = reset;
        draw();
      },
    };
  }

  /* ---------- Streams ---------- */
  function streamStats(id, from, to) { return sums(txRange(from, to, id)); }
  function pageStreams() {
    const mk = thisMonth();
    const range = UI.streamRange === 'month' ? { from: mk + '-01', to: today(), name: 'this month' } : UI.streamRange === 'year' ? { from: tyRange(taxYearOf(today())).from, to: today(), name: 'this tax year' } : { from: '0000-01-01', to: '9999-12-31', name: 'all time' };
    const rows = S.streams.map((s) => ({ s, st: streamStats(s.id, range.from, range.to), m: streamStats(s.id, mk + '-01', today()), spark: Array.from({ length: 6 }, (_, i) => monthSums(addMonths(mk, i - 5), s.id).profit) }))
      .sort((a, b) => b.st.profit - a.st.profit);
    const best = rows.find((r) => r.st.profit > 0);
    const maxP = Math.max(1, ...rows.map((r) => Math.abs(r.st.profit)));
    const unassigned = S.tx.filter((t) => !streamById(t.streamId)).length;
    return {
      title: 'My Income Streams',
      html: `${sampleBanner()}
      <div class="greet"><div><h2>My Income Streams</h2><p>Track each side hustle on its own and see which one really pays.</p></div>
        <div class="right"><button class="btn btn-primary" data-action="add-stream">${ic('plus')}New income stream</button></div></div>
      ${rows.length ? `
      <div class="grid dash-row">
        <div class="card">
          <div class="card-h"><span class="card-ic">${ic('trend')}</span><h3>Which stream performs best?</h3>
            <div class="right"><div class="seg">${[['month', 'This month'], ['year', 'Tax year'], ['all', 'All time']].map(([k, l]) => `<button data-sr="${k}" class="${UI.streamRange === k ? 'on' : ''}">${l}</button>`).join('')}</div></div></div>
          ${rows.map((r, i) => `<div class="rank-row"><span class="n">${i + 1}.</span><div><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(r.s.name)}</b><span class="num ${r.st.profit >= 0 ? 'pos' : 'neg'}"><b>${money(r.st.profit)}</b></span></div>${progress((Math.abs(r.st.profit) / maxP) * 100, r.st.profit >= 0 ? r.s.color : C_OUT)}<div class="small muted" style="margin-top:4px">In ${money(r.st.in)} · Out ${money(r.st.out)}${r.st.in > 0 ? ` · ${Math.round((r.st.profit / r.st.in) * 100)}% margin` : ''}</div></div></div>`).join('')}
        </div>
        <div class="card">
          <div class="card-h"><span class="card-ic">${ic('spark')}</span><h3>Top performer</h3></div>
          ${best ? `<div class="stream-head" style="margin-bottom:14px"><span class="stream-dot" style="background:${best.s.color}">${ic(TYPES[best.s.type].icon)}</span><div><b>${esc(best.s.name)}</b><small>${TYPES[best.s.type].label}</small></div></div>
            <div class="kv"><span>Profit (${range.name})</span><b class="num pos">${money(best.st.profit)}</b></div>
            <div class="kv"><span>Share of all profit</span><b class="num">${pct(Math.max(0, (best.st.profit / Math.max(1, rows.reduce((a, r) => a + Math.max(0, r.st.profit), 0))) * 100))}</b></div>
            <div class="kv"><span>Profit margin</span><b class="num">${best.st.in ? pct((best.st.profit / best.st.in) * 100) : '—'}</b></div>
            <a class="btn btn-sm" href="#/streams/${best.s.id}" style="margin-top:12px">View details${ic('ext')}</a>`
          : `<p class="muted" style="margin:0">No stream made a profit ${range.name} yet.</p>`}
        </div>
      </div>
      <div class="grid three stagger">
        ${rows.map((r) => `<a class="card lift stream-card" href="#/streams/${r.s.id}">
          ${best && best.s.id === r.s.id ? '<span class="tag green best-badge">★ Best</span>' : ''}
          <div class="stream-head"><span class="stream-dot" style="background:${r.s.color}">${ic(TYPES[r.s.type].icon)}</span><div><b>${esc(r.s.name)}</b><small>${TYPES[r.s.type].label}</small></div></div>
          <div class="small muted">This month</div>
          <div class="stream-stats"><div><span>In</span><b class="num">${money(r.m.in)}</b></div><div><span>Out</span><b class="num">${money(r.m.out)}</b></div><div><span>Profit</span><b class="num ${r.m.profit >= 0 ? 'pos' : 'neg'}">${money(r.m.profit)}</b></div></div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span class="small muted">Profit, last 6 months</span>${Charts.spark(r.spark, r.s.color, 110, 32)}</div>
        </a>`).join('')}
      </div>
      ${unassigned ? `<p class="small muted" style="margin-top:16px">${unassigned} transaction${unassigned === 1 ? ' isn’t' : 's aren’t'} linked to a stream. <a href="#/cashbook" data-action="show-unassigned">Assign them in the Cash Book</a>.</p>` : ''}`
      : `<div class="card">${emptyState('layers', 'Add your first income stream', 'An income stream is one way you make money — baking, freelancing, an online store, affiliate links. Each one gets its own income, expenses and profit.', `<button class="btn btn-primary" data-action="add-stream">${ic('plus')}New income stream</button>`)}</div>`}`,
      after(root) {
        $$('[data-sr]', root).forEach((b) => (b.onclick = () => { UI.streamRange = b.dataset.sr; render(); }));
      },
    };
  }

  function pageStream(id) {
    const s = streamById(id);
    if (!s) return { title: 'Income stream', html: `<div class="card">${emptyState('layers', 'Stream not found', 'It may have been deleted.', '<a class="btn" href="#/streams">Back to streams</a>')}</div>` };
    const mk = thisMonth();
    const all = sums(txRange('0000-01-01', '9999-12-31', id));
    const m = monthSums(mk, id), pm = sums(txRange(addMonths(mk, -1) + '-01', sameDayLastMonth(), id));
    const list = S.tx.filter((t) => t.streamId === id).sort((a, b) => b.date.localeCompare(a.date));
    const months = Array.from({ length: 12 }, (_, i) => addMonths(mk, i - 11));
    return {
      title: s.name,
      html: `
      <div class="greet"><div><a href="#/streams" class="small" style="display:inline-flex;gap:6px;align-items:center;margin-bottom:8px">${ic('back')}All streams</a>
        <div class="stream-head"><span class="stream-dot" style="background:${s.color}">${ic(TYPES[s.type].icon)}</span><div><h2>${esc(s.name)}</h2><p style="margin:0">${TYPES[s.type].label}</p></div></div></div>
        <div class="right"><button class="btn" data-action="edit-stream" data-id="${id}">${ic('edit')}Edit</button><button class="btn btn-danger" data-action="del-stream" data-id="${id}">${ic('trash')}Delete</button><button class="btn btn-primary" data-action="add-tx" data-stream="${id}">${ic('plus')}Add transaction</button></div></div>
      <div class="grid kpis stagger">
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('wallet')}</span>Money in · this month</div><div class="kpi-val">${bigMoney(m.in)}</div><div class="kpi-foot">${chg(m.in, pm.in)}</div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('card')}</span>Money out · this month</div><div class="kpi-val">${bigMoney(m.out)}</div><div class="kpi-foot">${chg(m.out, pm.out, { invert: true })}</div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('trend')}</span>Profit · this month</div><div class="kpi-val ${m.profit >= 0 ? 'green' : 'red'}">${bigMoney(m.profit)}</div><div class="kpi-foot">${chg(m.profit, pm.profit)}</div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('spark')}</span>Profit · all time</div><div class="kpi-val">${bigMoney(all.profit)}</div><div class="kpi-foot"><span class="chg flat"><small>${money(all.in)} in · ${money(all.out)} out</small></span></div></div>
      </div>
      <div class="card" style="margin-bottom:18px"><div class="card-h"><span class="card-ic">${ic('chart')}</span><h3>Monthly performance</h3><div class="right legend-row"><span class="chip"><i class="sw" style="background:${C_IN}"></i>Income</span><span class="chip"><i class="sw" style="background:${C_OUT}"></i>Expenses</span></div></div>
        <div class="chart-panel"><div class="chart-box" id="stBars"></div></div></div>
      <div class="card"><div class="card-h"><span class="card-ic">${ic('book')}</span><h3>Transaction history</h3><span class="pill-badge">${list.length}</span></div>
        ${list.length ? txTable(list, UI.cbLimit, { showStream: false }) : emptyState('book', 'No transactions for this stream yet', 'Add money in or out and choose this stream.', `<button class="btn btn-primary btn-sm" data-action="add-tx" data-stream="${id}">${ic('plus')}Add transaction</button>`)}</div>`,
      after(root) {
        const draw = () => {
          const d = months.map((mm) => monthSums(mm, id));
          Charts.bars($('#stBars', root), { labels: months.map((mm) => mLabel(mm)), tipLabels: months.map((mm) => mLabel(mm, true)), height: 240, fmt: money, fmtAxis: axisMoney,
            series: [{ name: 'Income', color: C_IN, values: d.map((x) => x.in) }, { name: 'Expenses', color: C_OUT, values: d.map((x) => x.out) }],
            tipExtra: (i) => `<div class="tip-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px">Profit<b>${money(d[i].profit)}</b></div>` });
        };
        draw(); charts.push(draw);
      },
    };
  }

  /* ---------- Monthly Summary ---------- */
  function taxYearsWithData() {
    const ys = new Set([taxYearOf(today())]);
    S.tx.forEach((t) => ys.add(taxYearOf(t.date)));
    return [...ys].sort((a, b) => b - a);
  }
  function pageMonthly() {
    const years = taxYearsWithData();
    if (UI.sumYear == null || !years.includes(UI.sumYear)) UI.sumYear = years[0];
    const y = UI.sumYear, months = tyMonths(y);
    const rows = months.map((mk) => ({ mk, ...monthSums(mk), n: txRange(mk + '-01', monthEnd(mk)).length }));
    const tot = rows.reduce((a, r) => ({ in: a.in + r.in, out: a.out + r.out, profit: a.profit + r.profit }), { in: 0, out: 0, profit: 0 });
    const best = rows.reduce((a, r) => (r.profit > (a?.profit ?? -Infinity) && r.n ? r : a), null);
    return {
      title: 'Monthly Summary',
      html: `${sampleBanner()}
      <div class="greet"><div><h2>Monthly Summary</h2><p>Your SA tax year, month by month (1 March to end February).</p></div>
        <div class="right"><select class="input" id="sumYear" style="width:auto" aria-label="Tax year">${opts(years.map((v) => [String(v), `Tax year ${tyLabel(v)}`]), String(y))}</select></div></div>
      <div class="grid kpis stagger">
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('wallet')}</span>Money in</div><div class="kpi-val">${bigMoney(tot.in)}</div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('card')}</span>Money out</div><div class="kpi-val">${bigMoney(tot.out)}</div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('trend')}</span>Net profit</div><div class="kpi-val ${tot.profit >= 0 ? 'green' : 'red'}">${bigMoney(tot.profit)}</div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('spark')}</span>Best month</div><div class="kpi-val" style="font-size:24px">${best ? mLabel(best.mk, true) : '—'}</div><div class="kpi-foot">${best ? `<span class="chg up"><small>${money(best.profit)} profit</small></span>` : ''}</div></div>
      </div>
      <div class="card" style="margin-bottom:18px"><div class="card-h"><span class="card-ic">${ic('chart')}</span><h3>Income vs expenses</h3><div class="right legend-row"><span class="chip"><i class="sw" style="background:${C_IN}"></i>Income</span><span class="chip"><i class="sw" style="background:${C_OUT}"></i>Expenses</span></div></div>
        <div class="chart-panel"><div class="chart-box" id="sumBars"></div></div><p class="small muted" style="margin:10px 0 0">Tap a bar or a row to open that month in the Cash Book.</p></div>
      <div class="card"><div class="card-h"><span class="card-ic">${ic('calendar')}</span><h3>Month by month</h3></div>
        <div class="table-wrap"><table class="t t-first-pad"><thead><tr><th>Month</th><th class="r">Money in</th><th class="r">Money out</th><th class="r">Profit</th><th class="r hide-sm">Margin</th><th class="r hide-sm">Tax set-aside (${S.settings.taxRate}%)</th></tr></thead><tbody>
          ${rows.map((r) => `<tr style="cursor:pointer" data-month="${r.mk}"><td><b>${mLabel(r.mk, true)}</b>${r.mk === thisMonth() ? ' <span class="tag green">Now</span>' : ''}<small class="muted" style="display:block">${r.n} entries</small></td><td class="r num pos">${money(r.in)}</td><td class="r num neg">${money(r.out)}</td><td class="r num ${r.profit >= 0 ? '' : 'neg'}"><b>${money(r.profit)}</b></td><td class="r num hide-sm">${r.in ? pct((r.profit / r.in) * 100) : '—'}</td><td class="r num hide-sm">${money(taxOn(r.profit))}</td></tr>`).join('')}
        </tbody><tfoot><tr><td>Total</td><td class="r num">${money(tot.in)}</td><td class="r num">${money(tot.out)}</td><td class="r num">${money(tot.profit)}</td><td class="r num hide-sm">${tot.in ? pct((tot.profit / tot.in) * 100) : '—'}</td><td class="r num hide-sm">${money(taxOn(tot.profit))}</td></tr></tfoot></table></div></div>`,
      after(root) {
        $('#sumYear', root).onchange = (e) => { UI.sumYear = +e.target.value; render(); };
        const openMonth = (mk) => { Object.keys(UI.cb).forEach((k) => (UI.cb[k] = '')); UI.cb.from = mk + '-01'; UI.cb.to = monthEnd(mk); location.hash = '#/cashbook'; };
        $$('[data-month]', root).forEach((r) => (r.onclick = () => openMonth(r.dataset.month)));
        const draw = () => Charts.bars($('#sumBars', root), { labels: months.map((m) => mLabel(m)), tipLabels: months.map((m) => mLabel(m, true)), height: 240, fmt: money, fmtAxis: axisMoney,
          series: [{ name: 'Income', color: C_IN, values: rows.map((r) => r.in) }, { name: 'Expenses', color: C_OUT, values: rows.map((r) => r.out) }],
          tipExtra: (i) => `<div class="tip-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px">Profit<b>${money(rows[i].profit)}</b></div>`, onClick: (i) => openMonth(months[i]) });
        draw(); charts.push(draw);
      },
    };
  }

  /* ---------- Who Owes Me ---------- */
  function pageOwed() {
    const open = S.owed.filter((o) => o.status !== 'paid');
    const overdue = open.filter((o) => owedState(o).key === 'overdue');
    const recvMonth = S.owed.filter((o) => o.status === 'paid' && o.paidDate.startsWith(thisMonth()));
    const list = S.owed.filter((o) => UI.owedTab === 'all' || (UI.owedTab === 'paid' ? o.status === 'paid' : o.status !== 'paid'))
      .sort((a, b) => (UI.owedTab === 'paid' ? b.paidDate.localeCompare(a.paidDate) : a.due.localeCompare(b.due)));
    const total = (l) => l.reduce((a, o) => a + o.amount, 0);
    return {
      title: 'Who Owes Me',
      html: `${sampleBanner()}
      <div class="greet"><div><h2>Who Owes Me</h2><p>Keep track of money customers still need to pay you.</p></div>
        <div class="right"><button class="btn btn-primary" data-action="add-owed">${ic('plus')}Add someone who owes me</button></div></div>
      <div class="grid three stagger" style="margin-bottom:18px">
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('clock')}</span>Outstanding</div><div class="kpi-val">${bigMoney(total(open))}</div><div class="kpi-foot"><span class="chg flat"><small>${open.length} payment${open.length === 1 ? '' : 's'}</small></span></div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('alert')}</span>Overdue</div><div class="kpi-val ${overdue.length ? 'red' : ''}">${bigMoney(total(overdue))}</div><div class="kpi-foot"><span class="chg ${overdue.length ? 'down' : 'flat'}"><small>${overdue.length ? `${overdue.length} late — time to send a reminder` : 'Nothing late'}</small></span></div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('check')}</span>Received this month</div><div class="kpi-val green">${bigMoney(total(recvMonth))}</div></div>
      </div>
      <div class="card"><div class="card-h"><div class="seg">${[['open', 'Outstanding'], ['paid', 'Received'], ['all', 'All']].map(([k, l]) => `<button data-ot="${k}" class="${UI.owedTab === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        ${list.length ? `<div class="table-wrap"><table class="t t-first-pad"><thead><tr><th>Customer</th><th class="hide-sm">Stream</th><th>Due</th><th class="r">Amount</th><th>Status</th><th class="acts"></th></tr></thead><tbody>
          ${list.map((o) => { const st = owedState(o); return `<tr><td class="desc">${esc(o.customer)}<small>${esc(o.desc || '—')}</small></td><td class="hide-sm">${streamTag(o.streamId)}</td><td class="muted" style="white-space:nowrap">${fmtD(o.due)}</td><td class="r num"><b>${money(o.amount)}</b></td><td><span class="tag ${st.cls}">${st.label}${o.status === 'paid' && o.paidDate ? ` · ${fmtD(o.paidDate, { day: 'numeric', month: 'short' })}` : ''}</span></td>
            <td class="acts">${o.status === 'paid' ? `<button class="btn btn-xs" data-action="reopen-owed" data-id="${o.id}">${ic('undo')}Unpaid</button>` : `<button class="btn btn-xs btn-primary" data-action="recv-owed" data-id="${o.id}">${ic('check')}Received</button>`}<button class="icon-btn sm" data-action="edit-owed" data-id="${o.id}" aria-label="Edit">${ic('edit')}</button><button class="icon-btn sm" data-action="del-owed" data-id="${o.id}" aria-label="Delete">${ic('trash')}</button></td></tr>`; }).join('')}
          </tbody></table></div>`
        : emptyState('users', UI.owedTab === 'paid' ? 'No payments received yet' : 'Nobody owes you money', UI.owedTab === 'paid' ? 'When you mark a payment as received it shows up here.' : 'When a customer says “I’ll pay you Friday”, add it here so you don’t forget.', `<button class="btn btn-primary btn-sm" data-action="add-owed">${ic('plus')}Add someone who owes me</button>`)}
      </div>`,
      after(root) { $$('[data-ot]', root).forEach((b) => (b.onclick = () => { UI.owedTab = b.dataset.ot; render(); })); },
    };
  }

  /* ---------- Tax Set-Aside ---------- */
  function taxYearNumbers(y) {
    const r = tyRange(y), to = r.to < today() ? r.to : today();
    const s = sums(txRange(r.from, to));
    const est = taxOn(s.profit);
    const saved = r2(S.taxSaved.filter((t) => t.date >= r.from && t.date <= r.to).reduce((a, t) => a + t.amount, 0));
    return { ...s, est, saved, left: r2(Math.max(0, est - saved)), r };
  }
  function pageTax() {
    const y = taxYearOf(today());
    const N = taxYearNumbers(y);
    const p = N.est > 0 ? (N.saved / N.est) * 100 : N.saved > 0 ? 100 : 0;
    const months = tyMonths(y).filter((mk) => mk <= thisMonth());
    let cum = 0;
    const deposits = S.taxSaved.filter((t) => t.date >= N.r.from && t.date <= N.r.to).sort((a, b) => b.date.localeCompare(a.date));
    return {
      title: 'Tax Set-Aside',
      html: `${sampleBanner()}
      <div class="greet"><div><h2>Tax Set-Aside</h2><p>Put a slice of every profit aside so tax time doesn’t hurt. Tax year ${tyLabel(y)}.</p></div>
        <div class="right"><button class="btn btn-primary" data-action="add-taxsave" data-suggest="${N.left}">${ic('plus')}Record money set aside</button></div></div>
      <div class="banner">${ic('alert')}<p><b>This is a savings helper, not tax advice.</b> The figure is a simple percentage of your profit. It does not use SARS tax tables, rebates, the tax threshold, provisional tax (IRP6) rules or your other income, and it must not replace a proper South African tax calculation. Speak to a registered tax practitioner or SARS for what you actually owe.</p></div>
      <div class="grid dash-row">
        <div class="card">
          <div class="card-h"><span class="card-ic">${ic('target')}</span><h3>Tax savings progress</h3><span class="pill-badge">${pct(Math.min(100, p))}</span></div>
          <div class="goal-fig" style="margin-bottom:10px"><b class="num" style="font-size:28px">${money(N.saved)}</b><span class="muted num">of ${money(N.est)} suggested</span></div>
          ${progress(p, null, true)}
          <div class="grid three" style="margin-top:18px;gap:10px">
            <div class="stream-stats" style="grid-template-columns:1fr"><div><span>Profit so far</span><b class="num">${money(N.profit)}</b></div></div>
            <div class="stream-stats" style="grid-template-columns:1fr"><div><span>Suggested set-aside</span><b class="num">${money(N.est)}</b></div></div>
            <div class="stream-stats" style="grid-template-columns:1fr"><div><span>Still to set aside</span><b class="num ${N.left ? 'neg' : 'pos'}">${money(N.left)}</b></div></div>
          </div>
        </div>
        <div class="card">
          <div class="card-h"><span class="card-ic">${ic('percent')}</span><h3>Your set-aside rate</h3></div>
          <div style="display:flex;align-items:center;gap:12px"><input type="range" id="taxRange" min="0" max="45" step="1" value="${S.settings.taxRate}" aria-label="Tax percentage"><div class="money-in" style="width:92px;flex:none"><input class="input num" id="taxNum" type="number" min="0" max="45" step="1" value="${S.settings.taxRate}" aria-label="Tax percentage" style="padding-left:11px"></div><b>%</b></div>
          <div class="err-msg" id="taxErr"></div>
          <p class="small muted" style="margin:12px 0 0">Many people start with 15–25% of profit. Choose a higher number if you already earn a salary, because extra income is taxed at your top rate.</p>
        </div>
      </div>
      <div class="grid two">
        <div class="card"><div class="card-h"><span class="card-ic">${ic('calendar')}</span><h3>Monthly tax overview</h3></div>
          <div class="table-wrap"><table class="t t-first-pad"><thead><tr><th>Month</th><th class="r">Profit</th><th class="r">Set-aside</th><th class="r hide-sm">Running total</th></tr></thead><tbody>
          ${months.map((mk) => { const s = monthSums(mk), t = taxOn(s.profit); cum += t; return `<tr><td>${mLabel(mk, true)}</td><td class="r num ${s.profit < 0 ? 'neg' : ''}">${money(s.profit)}</td><td class="r num"><b>${money(t)}</b></td><td class="r num hide-sm muted">${money(cum)}</td></tr>`; }).join('')}
          </tbody></table></div></div>
        <div class="card"><div class="card-h"><span class="card-ic">${ic('wallet')}</span><h3>Money you’ve set aside</h3><span class="pill-badge">${deposits.length}</span></div>
          ${deposits.length ? `<div class="list">${deposits.map((t) => `<div class="list-row"><span class="lr-ic">${ic('check')}</span><span class="lr-main"><b>${esc(t.note || 'Set aside for tax')}</b><small>${fmtD(t.date)}</small></span><span class="lr-val num">${money(t.amount)}</span><button class="icon-btn sm" data-action="del-taxsave" data-id="${t.id}" aria-label="Delete">${ic('trash')}</button></div>`).join('')}</div>`
          : emptyState('wallet', 'Nothing set aside yet', 'Each time you move money into a separate savings pocket for tax, record it here.')}</div>
      </div>`,
      after(root) {
        const r = $('#taxRange', root), n = $('#taxNum', root);
        let t;
        const apply = (v, src) => {
          const x = Number(v);
          if (!isFinite(x) || x < 0 || x > 45 || v === '') { $('#taxErr', root).textContent = 'Use a number from 0 to 45'; return; }
          $('#taxErr', root).textContent = '';
          if (src !== r) r.value = x; if (src !== n) n.value = x;
          S.settings.taxRate = Math.round(x);
          clearTimeout(t); t = setTimeout(() => { save(); render(); }, 450);
        };
        r.oninput = () => apply(r.value, r);
        n.oninput = () => apply(n.value, n);
      },
    };
  }

  /* ---------- Savings Goals ---------- */
  function pageGoals() {
    const T = today();
    const totalSaved = S.goals.reduce((a, g) => a + g.saved, 0), totalTarget = S.goals.reduce((a, g) => a + g.target, 0);
    return {
      title: 'Savings Goals',
      html: `${sampleBanner()}
      <div class="greet"><div><h2>Savings Goals</h2><p>Give your side-hustle money a job.</p></div>
        <div class="right"><button class="btn btn-primary" data-action="add-goal">${ic('plus')}New goal</button></div></div>
      ${S.goals.length ? `
      <div class="card" style="margin-bottom:18px"><div class="goal-fig" style="margin-bottom:10px"><span><span class="muted">Saved across all goals</span><br><b class="num" style="font-size:26px">${money(totalSaved)}</b></span><span class="muted num">of ${money(totalTarget)}</span></div>${progress((totalSaved / totalTarget) * 100, null, true)}</div>
      <div class="grid three stagger">${S.goals.map((g) => {
        const p = (g.saved / g.target) * 100, done = g.saved >= g.target;
        const monthsLeft = g.deadline ? Math.max(0, (parse(g.deadline).getFullYear() - parse(T).getFullYear()) * 12 + parse(g.deadline).getMonth() - parse(T).getMonth()) : null;
        const need = !done && monthsLeft != null ? (g.target - g.saved) / Math.max(1, monthsLeft) : null;
        return `<div class="card lift goal">
          <div class="goal-top"><span class="card-ic">${ic('target')}</span><div style="min-width:0;flex:1"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.name)}</b><small class="muted">${g.deadline ? `By ${fmtD(g.deadline)}` : 'No deadline'}</small></div>${done ? '<span class="tag green">Reached ✓</span>' : `<span class="pill-badge">${Math.floor(p)}%</span>`}</div>
          <div class="goal-fig"><b class="num">${money(g.saved)}</b><span class="muted num small">of ${money(g.target)}</span></div>
          ${progress(p)}
          <div class="small muted">${done ? 'Well done — you hit your target.' : g.deadline && g.deadline < T ? `<span class="neg">Target date passed</span> · ${money(g.target - g.saved)} to go` : need != null ? `Save about <b class="num" style="color:var(--text)">${money(need)}</b> a month to get there` : `${money(g.target - g.saved)} to go`}</div>
          <div style="display:flex;gap:6px;margin-top:4px"><button class="btn btn-sm btn-primary" data-action="fund-goal" data-id="${g.id}">${ic('plus')}Add money</button><button class="icon-btn sm" data-action="edit-goal" data-id="${g.id}" aria-label="Edit">${ic('edit')}</button><button class="icon-btn sm" data-action="del-goal" data-id="${g.id}" aria-label="Delete">${ic('trash')}</button></div>
        </div>`; }).join('')}</div>`
      : `<div class="card">${emptyState('target', 'No savings goals yet', 'A new oven, a laptop, an emergency fund — set a target and watch it fill up.', `<button class="btn btn-primary" data-action="add-goal">${ic('plus')}Create a goal</button>`)}</div>`}`,
    };
  }

  /* ---------- Reports ---------- */
  function pageReports() {
    const mk = thisMonth();
    const years = taxYearsWithData();
    const monthsWithData = [...new Set([mk, ...S.tx.map((t) => t.date.slice(0, 7))])].sort().reverse();
    if (!UI.rep.month || !monthsWithData.includes(UI.rep.month)) UI.rep.month = mk;
    if (UI.rep.year == null || !years.includes(UI.rep.year)) UI.rep.year = years[0];
    const isM = UI.rep.mode === 'month';
    const from = isM ? UI.rep.month + '-01' : tyRange(UI.rep.year).from;
    const to = isM ? monthEnd(UI.rep.month) : tyRange(UI.rep.year).to;
    const pFrom = isM ? addMonths(UI.rep.month, -1) + '-01' : tyRange(UI.rep.year - 1).from;
    const mtd = isM && UI.rep.month === mk;
    const pTo = mtd ? sameDayLastMonth() : isM ? monthEnd(addMonths(UI.rep.month, -1)) : tyRange(UI.rep.year - 1).to;
    const name = isM ? mLabel(UI.rep.month, true) : `Tax year ${tyLabel(UI.rep.year)}`;
    const list = txRange(from, to);
    const cur = sums(list), prev = sums(txRange(pFrom, pTo));
    const months = isM ? Array.from({ length: 12 }, (_, i) => addMonths(UI.rep.month, i - 11)) : tyMonths(UI.rep.year);
    const mdata = months.map((m) => monthSums(m));
    const streamRows = [...S.streams.map((s) => ({ id: s.id, name: s.name, color: s.color })), { id: '', name: 'Unassigned', color: '#6E6890' }]
      .map((s) => ({ ...s, ...sums(list.filter((t) => (s.id ? t.streamId === s.id : !streamById(t.streamId)))) }))
      .filter((s) => s.in || s.out).sort((a, b) => b.profit - a.profit);
    const cats = {};
    list.filter((t) => t.type === 'out').forEach((t) => (cats[t.category] = (cats[t.category] || 0) + t.amount));
    const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const margin = cur.in ? (cur.profit / cur.in) * 100 : 0;
    const vs = mtd ? 'vs same days last month' : isM ? 'vs previous month' : 'vs previous tax year';
    UI._report = { name, from, to, cur, streamRows, catRows, months, mdata, list };
    return {
      title: 'Reports',
      html: `${sampleBanner()}
      <div class="greet"><div><h2>Reports</h2><p>${name} · ${fmtD(from)} – ${fmtD(to)}</p></div>
        <div class="right">
          <div class="seg">${[['month', 'Monthly'], ['year', 'Tax year']].map(([k, l]) => `<button data-rm="${k}" class="${UI.rep.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
          ${isM ? `<select class="input" id="repMonth" style="width:auto" aria-label="Month">${opts(monthsWithData.map((m) => [m, mLabel(m, true)]), UI.rep.month)}</select>`
            : `<select class="input" id="repYear" style="width:auto" aria-label="Tax year">${opts(years.map((v) => [String(v), tyLabel(v)]), String(UI.rep.year))}</select>`}
          <button class="btn" data-action="export-report">${ic('download')}Report CSV</button>
          <button class="btn" data-action="export-report-tx">${ic('download')}Transactions CSV</button>
        </div></div>
      <div class="grid kpis stagger">
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('wallet')}</span>Money in</div><div class="kpi-val">${bigMoney(cur.in)}</div><div class="kpi-foot">${chg(cur.in, prev.in, { label: vs })}</div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('card')}</span>Money out</div><div class="kpi-val">${bigMoney(cur.out)}</div><div class="kpi-foot">${chg(cur.out, prev.out, { invert: true, label: vs })}</div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('trend')}</span>Net profit</div><div class="kpi-val ${cur.profit >= 0 ? 'green' : 'red'}">${bigMoney(cur.profit)}</div><div class="kpi-foot">${chg(cur.profit, prev.profit, { label: vs })}</div></div>
        <div class="card kpi lift"><div class="kpi-top"><span class="card-ic">${ic('percent')}</span>Profit margin</div><div class="kpi-val"><span class="num" data-count="${Math.max(0, margin)}" data-f="pct">${pct(margin)}</span></div><div class="kpi-foot"><span class="chg flat"><small>of every R1 you earn, ${cur.in ? `${Math.round(margin)}c is profit` : 'no income yet'}</small></span></div></div>
      </div>
      <div class="grid two" style="margin-bottom:18px">
        <div class="card"><div class="card-h"><span class="card-ic">${ic('chart')}</span><h3>Income vs expenses</h3><div class="right legend-row"><span class="chip"><i class="sw" style="background:${C_IN}"></i>Income</span><span class="chip"><i class="sw" style="background:${C_OUT}"></i>Expenses</span></div></div><div class="chart-panel"><div class="chart-box" id="repBars"></div></div></div>
        <div class="card"><div class="card-h"><span class="card-ic">${ic('trend')}</span><h3>Profit trend</h3></div><div class="chart-panel"><div class="chart-box" id="repTrend"></div></div></div>
      </div>
      <div class="grid dash-row">
        <div class="card"><div class="card-h"><span class="card-ic">${ic('layers')}</span><h3>Income stream comparison</h3></div>
          ${streamRows.length ? `<div class="table-wrap"><table class="t t-first-pad"><thead><tr><th>Stream</th><th class="r">In</th><th class="r hide-sm">Out</th><th class="r">Profit</th><th class="r hide-sm">Share of income</th></tr></thead><tbody>
            ${streamRows.map((s) => `<tr><td><span class="tag grey"><i class="sw" style="background:${s.color}"></i>${esc(s.name)}</span></td><td class="r num">${money(s.in)}</td><td class="r num hide-sm">${money(s.out)}</td><td class="r num ${s.profit >= 0 ? 'pos' : 'neg'}"><b>${money(s.profit)}</b></td><td class="r num hide-sm">${cur.in ? pct((s.in / cur.in) * 100) : '—'}</td></tr>`).join('')}
          </tbody></table></div>` : emptyState('layers', 'No activity in this period', 'Pick another month or add transactions.')}</div>
        <div class="card"><div class="card-h"><span class="card-ic">${ic('card')}</span><h3>Where the money went</h3></div>
          ${catRows.length ? catRows.map(([c, v]) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:5px"><span>${esc(c)}</span><b class="num">${money(v)}</b></div>${progress((v / catRows[0][1]) * 100, C_OUT)}</div>`).join('') : '<p class="muted" style="margin:0">No expenses in this period.</p>'}</div>
      </div>`,
      after(root) {
        $$('[data-rm]', root).forEach((b) => (b.onclick = () => { UI.rep.mode = b.dataset.rm; render(); }));
        $('#repMonth', root)?.addEventListener('change', (e) => { UI.rep.month = e.target.value; render(); });
        $('#repYear', root)?.addEventListener('change', (e) => { UI.rep.year = +e.target.value; render(); });
        const active = isM ? months.length - 1 : null;
        const draw = () => {
          Charts.bars($('#repBars', root), { labels: months.map((m) => mLabel(m)), tipLabels: months.map((m) => mLabel(m, true)), height: 230, fmt: money, fmtAxis: axisMoney, active,
            series: [{ name: 'Income', color: C_IN, values: mdata.map((d) => d.in) }, { name: 'Expenses', color: C_OUT, values: mdata.map((d) => d.out) }] });
          Charts.area($('#repTrend', root), { labels: months.map((m) => mLabel(m)), tipLabels: months.map((m) => mLabel(m, true)), height: 230, fmt: money, fmtAxis: axisMoney, aria: 'Profit trend',
            series: [{ name: 'Profit', color: '#A78BFA', values: mdata.map((d) => d.profit) }] });
        };
        draw(); charts.push(draw);
      },
    };
  }
  function exportReport() {
    const R = UI._report; if (!R) return;
    const rows = [[`Side Hustle CashBook report – ${R.name}`], [`Period`, `${R.from} to ${R.to}`], [`Generated`, today()], [],
      ['Summary'], ['Money in', R.cur.in.toFixed(2)], ['Money out', R.cur.out.toFixed(2)], ['Net profit', R.cur.profit.toFixed(2)], [`Tax set-aside estimate (${S.settings.taxRate}%)`, taxOn(R.cur.profit).toFixed(2)], [],
      ['Income streams', 'In', 'Out', 'Profit'], ...R.streamRows.map((s) => [s.name, s.in.toFixed(2), s.out.toFixed(2), s.profit.toFixed(2)]), [],
      ['Expense categories', 'Amount'], ...R.catRows.map(([c, v]) => [c, v.toFixed(2)]), [],
      ['Month', 'In', 'Out', 'Profit'], ...R.months.map((m, i) => [mLabel(m, true), R.mdata[i].in.toFixed(2), R.mdata[i].out.toFixed(2), R.mdata[i].profit.toFixed(2)]),
      [], ['Tax figure is a savings estimate only, not tax advice.']];
    download(`cashbook-report-${R.from}-to-${R.to}.csv`, csv(rows));
    toast('Report downloaded');
  }

  /* ---------- Settings ---------- */
  function pageSettings() {
    return {
      title: 'Settings',
      html: `
      <div class="greet"><div><h2>Settings</h2><p>Your profile, your data and how the app works.</p></div></div>
      <div class="grid two">
        <div class="card"><div class="card-h"><span class="card-ic">${ic('user')}</span><h3>Profile</h3></div>
          <form id="profForm" novalidate><div class="form-grid">
            ${field('Your first name', `<input class="input" name="name" maxlength="40" value="${esc(S.profile.name)}" placeholder="Used in your greeting">`, 'full')}
            ${field('Business or brand name (optional)', `<input class="input" name="business" maxlength="60" value="${esc(S.profile.business)}">`, 'full')}
          </div><div class="modal-f"><button class="btn btn-primary" type="submit">${ic('check')}Save profile</button></div></form></div>
        <div class="card"><div class="card-h"><span class="card-ic">${ic('percent')}</span><h3>Tax set-aside</h3></div>
          <p class="muted" style="margin:0 0 12px">You’re setting aside <b style="color:var(--text)">${S.settings.taxRate}%</b> of profit.</p><a class="btn btn-sm" href="#/tax">Change rate${ic('ext')}</a></div>
        <div class="card"><div class="card-h"><span class="card-ic">${ic('shield')}</span><h3>Your data</h3></div>
          <p class="muted" style="margin:0 0 14px">Everything is stored in this browser on this device only — no account, nothing sent to a server. Download a backup now and then, and restore it on another device.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-action="export-backup">${ic('download')}Download backup</button><button class="btn" data-action="import-backup">${ic('upload')}Restore backup</button><button class="btn" data-action="export-all-tx">${ic('download')}All transactions (CSV)</button></div>
          <p class="small muted" style="margin:14px 0 0">${S.tx.length} transactions · ${S.streams.length} streams · ${S.owed.length} payments owed · ${S.goals.length} goals</p></div>
        <div class="card"><div class="card-h"><span class="card-ic">${ic('spark')}</span><h3>Sample data</h3></div>
          ${hasSample() ? `<p class="muted" style="margin:0 0 14px">Sample entries are loaded so you can explore. Clearing them keeps everything you added yourself.</p><button class="btn" data-action="clear-sample">${ic('trash')}Clear sample data</button>`
            : `<p class="muted" style="margin:0 0 14px">Want to see how the app looks with a year of activity? Load sample entries — you can clear them again any time.</p><button class="btn" data-action="load-sample">${ic('spark')}Load sample data</button>`}
          <div class="pop-sep" style="margin:18px 0"></div>
          <p class="muted" style="margin:0 0 12px">Start over completely. This removes all data in this browser.</p><button class="btn btn-danger" data-action="reset-all">${ic('trash')}Erase everything</button></div>
      </div>`,
      after(root) {
        const f = $('#profForm', root);
        f.onsubmit = (e) => {
          e.preventDefault();
          S.profile.name = f.elements.name.value.trim().slice(0, 40);
          S.profile.business = f.elements.business.value.trim().slice(0, 60);
          if (save()) { toast('Profile saved'); renderChrome(); }
        };
      },
    };
  }

  /* ---------- chrome: bell + profile ---------- */
  function notifications() {
    const n = [];
    S.owed.filter((o) => o.status !== 'paid').forEach((o) => {
      const st = owedState(o);
      if (st.key === 'overdue') n.push({ icon: 'alert', href: '#/owed', title: `${o.customer} is ${st.label}`, sub: `${money(o.amount)}${o.desc ? ' · ' + o.desc : ''}` });
      else if (daysBetween(today(), o.due) <= 3) n.push({ icon: 'clock', href: '#/owed', title: `${o.customer}: ${st.label.toLowerCase()}`, sub: money(o.amount) });
    });
    const N = taxYearNumbers(taxYearOf(today()));
    if (N.left >= 100) n.push({ icon: 'percent', href: '#/tax', title: `Set aside ${money(N.left)} for tax`, sub: `${S.settings.taxRate}% of this tax year’s profit` });
    S.goals.filter((g) => g.deadline && g.saved < g.target && daysBetween(today(), g.deadline) <= 30 && daysBetween(today(), g.deadline) >= 0).forEach((g) => n.push({ icon: 'target', href: '#/goals', title: `“${g.name}” is due soon`, sub: `${money(g.target - g.saved)} to go` }));
    return n;
  }
  function renderChrome() {
    const nm = S.profile.name || S.profile.business;
    $('#avatar').innerHTML = nm ? esc(nm.trim()[0].toUpperCase()) : ic('user');
    $('#bellDot').hidden = !notifications().length;
  }
  function togglePop(btn, pop, build) {
    const open = pop.hidden;
    closePops();
    if (!open) return;
    pop.innerHTML = build(); hydrateIcons(pop); pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
  }
  function closePops() { $$('.popover').forEach((p) => (p.hidden = true)); $$('[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false')); }

  /* ---------- router ---------- */
  const ROUTES = { dashboard: pageDashboard, cashbook: pageCashbook, streams: pageStreams, monthly: pageMonthly, owed: pageOwed, tax: pageTax, goals: pageGoals, reports: pageReports, settings: pageSettings };
  let lastRoute = '';
  function render() {
    const [route = 'dashboard', sub] = location.hash.replace(/^#\/?/, '').split('/');
    let page;
    try {
      page = route === 'streams' && sub ? pageStream(decodeURIComponent(sub)) : ROUTES[route] ? ROUTES[route]() : { title: 'Not found', html: `<div class="card">${emptyState('alert', 'Page not found', 'That page doesn’t exist.', '<a class="btn" href="#/dashboard">Go to dashboard</a>')}</div>` };
    } catch (e) {
      console.error(e);
      page = { title: 'Something went wrong', html: `<div class="card">${emptyState('alert', 'Something went wrong', 'This page couldn’t load. Your data is safe. Try going back to the dashboard, or download a backup from Settings.', '<a class="btn" href="#/dashboard">Go to dashboard</a>')}</div>` };
    }
    const key = route + '/' + (sub || '');
    const view = $('#view');
    Charts.hideTip();
    charts = [];
    view.innerHTML = `<div class="${key !== lastRoute ? 'page' : ''}">${page.html}</div>`;
    if (key !== lastRoute) { window.scrollTo({ top: 0 }); view.focus({ preventScroll: true }); }
    lastRoute = key;
    $('#pageTitle').textContent = page.title;
    document.title = `${page.title} · Side Hustle CashBook`;
    renderNav(route === 'streams' ? 'streams' : route);
    renderChrome();
    try { page.after?.(view); } catch (e) { console.error(e); toast('A chart failed to draw.', { err: true }); }
    hydrateIcons(view);
    Charts.animate(view);
    countUp(view);
    closeNav();
  }

  function skeleton() {
    const b = (h, w = '100%') => `<div class="sk" style="height:${h}px;width:${w}"></div>`;
    $('#view').innerHTML = `<div style="margin-bottom:22px">${b(30, '260px')}<div style="height:8px"></div>${b(16, '360px')}</div>
      <div class="grid kpis">${'<div class="card kpi">' + b(18, '60%') + b(34, '80%') + b(20, '50%') + '</div>'.repeat(1)}${('<div class="card kpi">' + b(18, '60%') + b(34, '80%') + b(20, '50%') + '</div>').repeat(3)}</div>
      <div class="grid dash-row"><div class="card">${b(300)}</div><div class="card">${b(300)}</div></div>`;
  }

  /* ---------- nav (mobile) ---------- */
  const openNav = () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('on'); };
  const closeNav = () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('on'); };

  /* ---------- flourishes ---------- */
  // Cards glow where the pointer is (CSS reads --mx / --my).
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest?.('.card');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - r.left}px`);
    c.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.className = 'confetti';
      p.style.background = COLORS[i % COLORS.length];
      document.body.appendChild(p);
      const x = innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.9, peak = innerHeight * (0.15 + Math.random() * 0.3);
      p.animate([{ transform: `translate(${innerWidth / 2}px, ${innerHeight}px) rotate(0)`, opacity: 1 }, { transform: `translate(${(innerWidth / 2 + x) / 2}px, ${peak}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.45 }, { transform: `translate(${x}px, ${innerHeight + 40}px) rotate(${Math.random() * 900}deg)`, opacity: 0.8 }],
        { duration: 1600 + Math.random() * 1200, easing: 'cubic-bezier(.2,.7,.4,1)', delay: Math.random() * 200 }).onfinish = () => p.remove();
    }
  }

  /* ---------- global events ---------- */
  document.addEventListener('click', async (e) => {
    if (!e.target.closest('.pop-wrap')) closePops();
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action, id = el.dataset.id;
    const find = (k) => S[k].find((x) => x.id === id);
    if (el.closest('.popover')) closePops();
    switch (a) {
      case 'add-tx': txModal(null, { type: el.dataset.type, streamId: el.dataset.stream }); break;
      case 'edit-tx': { const t = find('tx'); if (t) txModal(t); break; }
      case 'del-tx': deleteTx(id); break;
      case 'more-tx': UI.cbLimit += 100; render(); break;
      case 'export-cb': { const l = filteredTx(); if (!l.length) return toast('Nothing to export with these filters.'); download(`cashbook-transactions-${today()}.csv`, csv(txCsvRows(l))); toast(`Exported ${l.length} transactions`); break; }
      case 'export-all-tx': { if (!S.tx.length) return toast('No transactions yet.'); download(`cashbook-all-transactions-${today()}.csv`, csv(txCsvRows([...S.tx].sort((x, y) => x.date.localeCompare(y.date))))); break; }
      case 'export-period': { const P = periodRange(UI.dashPeriod); const l = txRange(P.from, P.to).sort((x, y) => x.date.localeCompare(y.date)); if (!l.length) return toast('No transactions in this period.'); download(`cashbook-${UI.dashPeriod}-${today()}.csv`, csv(txCsvRows(l))); toast(`Exported ${l.length} transactions`); break; }
      case 'export-report': exportReport(); break;
      case 'export-report-tx': { const l = UI._report?.list || []; if (!l.length) return toast('No transactions in this period.'); download(`cashbook-transactions-${UI._report.from}-to-${UI._report.to}.csv`, csv(txCsvRows([...l].sort((x, y) => x.date.localeCompare(y.date))))); break; }
      case 'show-unassigned': Object.keys(UI.cb).forEach((k) => (UI.cb[k] = '')); UI.cb.stream = '_none'; break;
      case 'add-stream': streamModal(); break;
      case 'edit-stream': streamModal(streamById(id)); break;
      case 'del-stream': deleteStream(id); break;
      case 'add-owed': owedModal(); break;
      case 'edit-owed': { const o = find('owed'); if (o) owedModal(o); break; }
      case 'del-owed': removeWithUndo('owed', id, 'Payment'); break;
      case 'recv-owed': { const o = find('owed'); if (o) receiveModal(o); break; }
      case 'reopen-owed': { const o = find('owed'); if (o) reopenOwed(o); break; }
      case 'add-goal': goalModal(); break;
      case 'edit-goal': { const g = find('goals'); if (g) goalModal(g); break; }
      case 'fund-goal': { const g = find('goals'); if (g) fundModal(g); break; }
      case 'del-goal': removeWithUndo('goals', id, 'Goal'); break;
      case 'add-taxsave': taxSaveModal(+el.dataset.suggest || 0); break;
      case 'del-taxsave': removeWithUndo('taxSaved', id, 'Set-aside'); break;
      case 'export-backup': exportBackup(); break;
      case 'import-backup': importBackup(); break;
      case 'clear-sample': if (await confirmBox({ title: 'Clear sample data?', text: 'All sample streams, transactions, payments and goals will be removed. Anything you added yourself stays.', ok: 'Clear sample data' })) { clearSample(); render(); toast('Sample data cleared — it’s all yours now'); } break;
      case 'load-sample': loadSample(); render(); toast('Sample data loaded'); break;
      case 'reset-all': if (await confirmBox({ title: 'Erase everything?', text: 'Every transaction, stream, payment, goal and setting in this browser will be deleted. This cannot be undone. Download a backup first if you might need it.', ok: 'Erase everything' })) { S = blank(); save(); location.hash = '#/dashboard'; render(); toast('All data erased'); } break;
      default: break;
    }
  });

  // theme: dark by default, light on request; kept outside the data so it applies before first paint
  const setTheme = (light) => {
    if (light) document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme;
    $('#themeBtn').innerHTML = ic(light ? 'moon' : 'sun');
    $('meta[name=theme-color]').content = light ? '#F6F3FF' : '#0B0914';
  };
  setTheme(document.documentElement.dataset.theme === 'light');
  $('#themeBtn').onclick = () => {
    const light = document.documentElement.dataset.theme !== 'light';
    setTheme(light);
    try { localStorage.setItem('shcb.theme', light ? 'light' : 'dark'); } catch (e) { /* storage blocked: theme lasts for this visit */ }
  };

  $('#navOpen').onclick = openNav;
  $('#navClose').onclick = closeNav;
  $('#scrim').onclick = closeNav;
  $('#bellBtn').onclick = (e) => {
    e.stopPropagation();
    togglePop(e.currentTarget, $('#bellPop'), () => {
      const n = notifications();
      return `<div class="pop-h">Notifications ${n.length ? `<span class="pill-badge">${n.length}</span>` : ''}</div>` + (n.length ? n.map((x) => `<a class="pop-item" href="${x.href}">${ic(x.icon)}<span>${esc(x.title)}<small>${esc(x.sub)}</small></span></a>`).join('') : '<div class="pop-empty">You’re all caught up ✓</div>');
    });
  };
  $('#profileBtn').onclick = (e) => {
    e.stopPropagation();
    togglePop(e.currentTarget, $('#profilePop'), () => `<div class="pop-h"><span>${esc(S.profile.name || 'Your profile')}<small class="muted" style="display:block;font-weight:400">${esc(S.profile.business || 'Side Hustle CashBook')}</small></span></div><div class="pop-sep"></div>
      <a class="pop-item" href="#/settings">${ic('user')}<span>Edit profile</span></a>
      <button class="pop-item" data-action="export-backup">${ic('download')}<span>Download backup</span></button>
      ${hasSample() ? `<button class="pop-item" data-action="clear-sample">${ic('trash')}<span>Clear sample data</span></button>` : ''}
      <a class="pop-item" href="#/settings">${ic('settings')}<span>Settings</span></a>`);
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePops(); closeNav(); } });
  window.addEventListener('hashchange', render);
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => charts.forEach((f) => f()), 180); });
  window.addEventListener('error', () => toast('Something went wrong. Your data is safe — try again.', { err: true }));
  window.addEventListener('storage', (e) => { if (e.key === KEY) { S = load() || blank(); render(); } });

  /* ---------- boot ---------- */
  hydrateIcons();
  skeleton();
  const stored = load();
  S = stored || blank();
  if (!stored && !loadError) loadSample(); // first visit: show the app full, clearly flagged as sample data
  const ready = Promise.race([document.fonts?.ready || Promise.resolve(), new Promise((r) => setTimeout(r, 700))]);
  ready.then(() => {
    render();
    if (storageBlocked) toast('This browser is blocking storage, so nothing you add will be kept after you close this page.', { err: true, ms: 9000 });
    if (loadError) toast("Your saved data couldn't be read, so the app started empty. A copy was kept in this browser.", { err: true, ms: 9000 });
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

  // Self-check for money and date maths (runs once, logs only on failure).
  console.assert(taxYearOf('2026-02-28') === 2025 && taxYearOf('2026-03-01') === 2026, 'tax year boundary');
  console.assert(sums([{ type: 'in', amount: 0.1 }, { type: 'in', amount: 0.2 }, { type: 'out', amount: 0.3 }]).profit === 0, 'sums rounding');
  console.assert(addMonths('2026-01', -1) === '2025-12' && monthEnd('2024-02') === '2024-02-29', 'month maths');
})();
