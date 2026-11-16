/* Hustle CashBook — pixel art: 12×12 sprites drawn as crisp SVG rects, and the cat mascot. */
(function (global) {
  'use strict';

  // One letter per colour. '.' is transparent.
  const PAL = {
    k: '#0B0F2E', g: '#39FF70', G: '#17B84C', c: '#00E5FF', C: '#0098B8', p: '#713BFF', P: '#4B22C4',
    m: '#FF368B', y: '#FFD23F', Y: '#D99A12', w: '#F4F4FF', s: '#A9AED6', S: '#6B71A3', r: '#FF4D5E',
    o: '#FF9A3C', b: '#B5713A', B: '#3D7BFF', n: '#232A6B',
  };

  const SPR = {
    wallet: ['............', '...kkkkkk...', '..kgggwggk..', '.kkgGgggGkk.', 'kppppppppppk', 'kpPPPPPPPPpk',
      'kpppppkkkkkk', 'kppppkyyyyyk', 'kppppkyykyyk', 'kppppkyyyyyk', 'kPPPPPkkkkkk', '.kkkkkkkkkk.'],
    coin: ['....kkkk....', '..kkyyyykk..', '.kyywwyyyYk.', '.kywyyyyyYk.', 'kyyyykkyyyYk', 'kyyykyyyyyYk',
      'kyyykyyyyyYk', 'kyyyykkyyyYk', '.kyyyyyyyYk.', '.kYyyyyyYYk.', '..kkYYYYkk..', '....kkkk....'],
    cash: ['............', '............', 'kkkkkkkkkkkk', 'kggggggggggk', 'kgGggkkggGgk', 'kgggkggkgggk',
      'kgggkggkgggk', 'kgGggkkggGgk', 'kggggggggggk', 'kkkkkkkkkkkk', '............', '............'],
    trophy: ['..kkkkkkkk..', 'kkkywyyyYkkk', 'kykywyyyYkyk', 'kykyyyyyYkyk', '.kkyyyyyYkk.', '..kyyyyyYk..',
      '...kyyyYk...', '....kyYk....', '....kYYk....', '...kkkkkk...', '..kyyyyyYk..', '..kkkkkkkk..'],
    burger: ['............', '...kkkkkk...', '..kowooook..', '.kooooowook.', '.kkkkkkkkkk.', 'kggggggggggk',
      '.kyyyyyyyyk.', '.kbbbbbbbbk.', '.krrrrrrrrk.', '..kooooook..', '...kkkkkk...', '............'],
    house: ['............', '.....kk.....', '....kmmk....', '...kmmmmk...', '..kmmmmmmk..', '.kmmmmmmmmk.',
      'kkkkkkkkkkkk', '.kwwwwwwwwk.', '.kwcckwbbwk.', '.kwcckwbbwk.', '.kwwwwwbbwk.', '.kkkkkkkkkk.'],
    car: ['............', '............', '...kkkkkk...', '..krcccrrk..', '.krrcccrrrk.', 'kkrrrrrrrrkk',
      'krrrrrrrrrrk', 'kyrrrrrrrryk', 'kkkkkkkkkkkk', '.kssk..kssk.', '..kk....kk..', '............'],
    cart: ['kk..........', '.k..........', '.kkkkkkkkkkk', '..kgggggggk.', '..kgGgGgGgk.', '..kgggggggk.',
      '...kkkkkkk..', '...k.....k..', '...kkkkkkkk.', '............', '...kk...kk..', '...kk...kk..'],
    gamepad: ['............', '............', '..kkkkkkkk..', '.kppppppppk.', 'kpwppppppcpk', 'kwwwpppcpmpk',
      'kpwppppppgpk', 'kppppkkppppk', 'kpppk..kpppk', '.kkk....kkk.', '............', '............'],
    bolt: ['......kkkk..', '.....kyyyk..', '....kyyyk...', '...kyyyk....', '..kyyyykkk..', '.kyyyyyyyk..',
      '.kkkkyyyyk..', '....kyyyk...', '...kyyyk....', '..kyyyk.....', '..kyyk......', '..kkk.......'],
    heart: ['............', '..kk....kk..', '.krrk..krrk.', 'krwrrkkrrrrk', 'krrrrrrrrrrk', 'krrrrrrrrrrk',
      '.krrrrrrrrk.', '..krrrrrrk..', '...krrrrk...', '....krrk....', '.....kk.....', '............'],
    moneybag: ['....kkkk....', '.....kk.....', '....kkkk....', '...kyyyyk...', '..kyyyyyyk..', '.kyyykkkyyk.',
      '.kyyykyyyyk.', '.kyyyykkyyk.', '.kyyyyyyykk.', '.kyykkkyyyk.', '..kyyyyyyk..', '...kkkkkk...'],
    box: ['............', '.kkkkkkkkkk.', '.kbbbyybbbk.', '.kbbbyybbbk.', 'kkkkkkkkkkkk', 'kbbbbyybbbbk',
      'kboooyyooobk', 'kbbbbbbbbbbk', 'kbbbbbbbbbbk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', '............'],
    phone: ['..kkkkkkkk..', '..kSSSSSSk..', '..kcwcccck..', '..kcccccck..', '..kcccccck..', '..kcccccck..',
      '..kcccccck..', '..kcccccck..', '..kSSSSSSk..', '..kSSkkSSk..', '..kSSSSSSk..', '..kkkkkkkk..'],
    laptop: ['............', '............', '..kkkkkkkk..', '..kcwcccck..', '..kcccccck..', '..kcccccck..',
      '..kkkkkkkk..', '.kSSSSSSSSk.', 'kSSSkkkkSSSk', 'kkkkkkkkkkkk', '............', '............'],
    megaphone: ['.........kk.', '........kmk.', '..kkkkkkmmk.', 'kkwwwwwmmmk.', 'kwwwwwwmmmk.', 'kkwwwwwmmmk.',
      '..kkkkkkmmk.', '...kk...kmk.', '...kk....kk.', '............', '............', '............'],
    bank: ['............', '.....kk.....', '...kkSSkk...', '.kkSSSSSSkk.', 'kkkkkkkkkkkk', '.kwk.kwk.kwk',
      '.kwk.kwk.kwk', '.kwk.kwk.kwk', '.kwk.kwk.kwk', 'kkkkkkkkkkkk', 'kSSSSSSSSSSk', 'kkkkkkkkkkkk'],
    star: ['.....kk.....', '....kyyk....', '....kyyk....', 'kkkkkyykkkkk', 'kyyyyyyyyyyk', '.kyyyywyyyk.',
      '..kyyyyyyk..', '...kyyyyk...', '..kyyykyyk..', '..kyyk.kyyk.', '.kyyk...kyyk', '.kkk.....kkk'],
    flame: ['.....k......', '....kok.....', '....kook....', '...koook.k..', '...kooookok.', '..kooyoooook',
      '..koyyyooook', '.kooyyyyook.', '.kooyyyyook.', '.kooyywyook.', '..kooyyook..', '...kkkkkk...'],
    lock: ['............', '....kkkk....', '...kSSSSk...', '..kSk..kSk..', '..kSk..kSk..', '.kkkkkkkkkk.',
      '.kssssssssk.', '.kssskksssk.', '.kssskksssk.', '.kssssssssk.', '.kssssssssk.', '.kkkkkkkkkk.'],
    target: ['...kkkkkk...', '..krrrrrrk..', '.krwwwwwwrk.', 'krwrrrrrrwrk', 'krwrwwwwrwrk', 'krwrwrrwrwrk',
      'krwrwrrwrwrk', 'krwrwwwwrwrk', 'krwrrrrrrwrk', '.krwwwwwwrk.', '..krrrrrrk..', '...kkkkkk...'],
    plane: ['.....kk.....', '....kcck....', '....kcck....', '.kkkkcckkkk.', 'kcccccccccck', '.kkkkcckkkk.',
      '....kcck....', '....kcck....', '...kkcckk...', '..kcccccck..', '..kkkkkkkk..', '............'],
    shield: ['............', '.kkkkkkkkkk.', '.kccccccCCk.', '.kcwccccCCk.', '.kcccccCCCk.', '.kccccCCCCk.',
      '..kccCCCCk..', '..kcCCCCCk..', '...kCCCCk...', '....kCCk....', '.....kk.....', '............'],
    rocket: ['.....kk.....', '....kwwk....', '...kwwwwk...', '...kwccwk...', '...kwccwk...', '...kwwwwk...',
      '..kkwwwwkk..', '.kmkwwwwkmk.', '.kmkkkkkkmk.', '..k.koyk.k..', '....koyk....', '.....kk.....'],
    crown: ['............', '............', '............', '.k...kk...k.', '.kk.kyyk.kk.', '.kykyyyykyk.',
      '.kyyyyyyyyk.', '.kyywyycyyk.', '.kkkkkkkkkk.', '............', '............', '............'],
  };

  const cache = {};
  function rects(rows, ox = 0, oy = 0) {
    let out = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '.' || !PAL[ch]) { x++; continue; }
        let w = 1;
        while (row[x + w] === ch) w++; // merge runs: fewer rects, same picture
        out += `<rect x="${x + ox}" y="${y + oy}" width="${w}" height="1" fill="${PAL[ch]}"/>`;
        x += w;
      }
    });
    return out;
  }

  /** <svg> for a sprite name; unknown names fall back to the star. */
  function sprite(name, cls = '') {
    const key = name + '|' + cls;
    if (!cache[key]) {
      const rows = SPR[name] || SPR.star;
      cache[key] = `<svg class="px ${cls}" viewBox="0 0 12 12" aria-hidden="true" shape-rendering="crispEdges">${rects(rows)}</svg>`;
    }
    return cache[key];
  }

  /* ---------- category and goal sprites ---------- */
  const CAT = {
    Sales: 'cash', Services: 'star', 'Customer payment': 'coin', Commission: 'coin', 'Affiliate payout': 'moneybag',
    'Ad & sponsor revenue': 'megaphone', Tips: 'coin', 'Other income': 'moneybag',
    'Stock & materials': 'box', Packaging: 'box', 'Transport & fuel': 'car', 'Data & airtime': 'phone', 'Software & tools': 'laptop',
    Advertising: 'megaphone', 'Fees & bank charges': 'bank', Equipment: 'laptop', 'Other expense': 'cart',
    Food: 'burger', Rent: 'house', Shopping: 'cart', Entertainment: 'gamepad', Bills: 'bolt', Health: 'heart',
  };
  const catSprite = (cat, type) => CAT[cat] || (type === 'in' ? 'moneybag' : 'cart');
  const goalSprite = (name) => {
    const n = String(name).toLowerCase();
    if (/phone|iphone|samsung/.test(n)) return 'phone';
    if (/pc|laptop|computer|mac|gaming|console|playstation|xbox/.test(n)) return /gaming|console|playstation|xbox/.test(n) ? 'gamepad' : 'laptop';
    if (/holiday|travel|trip|bali|flight|vacation/.test(n)) return 'plane';
    if (/car|bike|scooter/.test(n)) return 'car';
    if (/emergency|rainy|safety|buffer/.test(n)) return 'shield';
    if (/house|home|rent|deposit|flat/.test(n)) return 'house';
    if (/business|stock|mixer|oven|tool|equipment/.test(n)) return 'box';
    return 'target';
  };

  /* ---------- the cat ---------- */
  // 18×16. E = eye area (drawn by the eye layers), tail lives in columns 15–17.
  const CAT_ROWS = ['..................', '..k.........k.....', '.kwk.......kwk....', '.kmwk.....kwmk....', '.kwwwkkkkkwwwk....',
    'kwwwwwwwwwwwwwk...', 'kwwEEwwwwwEEwwk...', 'kwwEEwwwwwEEwwk...', 'kswwwwwmwwwwwsk...', '.kwwwwkwkwwwwk....',
    '..kkwwwwwwwwkk..kk', '.kwwwwwwwwwwwk.kwk', 'kwswwwwwwwwwswkwk.', 'kwswwwwwwwwwswkk..', 'kwwwkwwwwwkwwwk...', '.kkkkkkkkkkkkkk...'];
  const body = CAT_ROWS.map((r) => r.replace(/E/g, 'w').split('').map((ch, x) => (x >= 15 ? '.' : ch)).join(''));
  const tail = CAT_ROWS.map((r) => r.split('').map((ch, x) => (x >= 15 ? ch : '.')).join(''));
  const EYES = [3, 10];
  const eyeOpen = EYES.map((c) => `<rect x="${c}" y="6" width="2" height="2" fill="${PAL.k}"/><rect x="${c}" y="6" width="1" height="1" fill="${PAL.w}"/>`).join('');
  const eyeShut = EYES.map((c) => `<rect x="${c}" y="7" width="2" height="1" fill="${PAL.k}"/>`).join('');
  const shades = `<rect x="2" y="6" width="11" height="1" fill="${PAL.k}"/><rect x="2" y="6" width="4" height="2" fill="${PAL.k}"/><rect x="9" y="6" width="4" height="2" fill="${PAL.k}"/><rect x="3" y="6" width="1" height="1" fill="${PAL.c}"/><rect x="10" y="6" width="1" height="1" fill="${PAL.c}"/>`;
  const crown = `<rect x="5" y="2" width="1" height="1" fill="${PAL.y}"/><rect x="7" y="2" width="1" height="1" fill="${PAL.y}"/><rect x="9" y="2" width="1" height="1" fill="${PAL.y}"/><rect x="5" y="3" width="5" height="1" fill="${PAL.y}"/><rect x="7" y="3" width="1" height="1" fill="${PAL.m}"/>`;
  const CAT_SVG = `<svg class="cat-svg" viewBox="0 0 18 16" shape-rendering="crispEdges" aria-hidden="true">
    <g class="cat-tail">${rects(tail)}</g><g class="cat-body">${rects(body)}${crown}</g>
    <g class="cat-eyes-open"><g class="cat-pupils">${eyeOpen}</g></g><g class="cat-eyes-shut">${eyeShut}</g><g class="cat-shades">${shades}</g></svg>`;

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /** The companion: sleeps when you are away, wakes when you do something, cheers your wins. */
  const Cat = (() => {
    let el = null, state = 'sleep', lastPoke = 0, timers = [];
    const SLEEP_AFTER = 30000;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const set = (s) => { state = s; if (el) el.dataset.state = s; };
    const flash = (cls, ms) => { if (!el) return; el.classList.add(cls); later(() => el && el.classList.remove(cls), ms); };

    function idleLoop() {
      if (!el || !el.isConnected || state !== 'idle') return;
      if (Date.now() - lastPoke > SLEEP_AFTER) { set('sleep'); return; }
      const roll = Math.random();
      if (roll < 0.55) flash('blink', 160);
      else if (roll < 0.8) flash(Math.random() < 0.5 ? 'look-l' : 'look-r', 1400);
      else flash('wag', 1200);
      later(idleLoop, rnd(2600, 5200));
    }
    function wake() {
      if (!el) return;
      clear();
      if (state === 'sleep') {
        set('waking'); // eyes flutter open
        later(() => { set('idle'); flash('blink', 160); later(idleLoop, 1800); }, reduce() ? 0 : 700);
      } else if (state !== 'cheer') { set('idle'); later(idleLoop, 2200); }
    }
    function poke() { lastPoke = Date.now(); if (state === 'sleep') wake(); }
    function say(text, ms = 3200) {
      if (!el) return;
      const b = el.querySelector('.cat-say');
      b.textContent = text;
      b.hidden = false;
      later(() => { if (b.textContent === text) b.hidden = true; }, ms);
    }
    function cheer(text) {
      if (!el) return;
      clear(); lastPoke = Date.now();
      set('cheer');
      if (text) say(text, 3600);
      if (!reduce()) for (let i = 0; i < 8; i++) {
        const s = document.createElement('i');
        s.className = 'cat-spark';
        s.style.setProperty('--dx', `${rnd(-46, 46)}px`);
        s.style.setProperty('--dy', `${rnd(-56, -18)}px`);
        s.style.background = ['#39FF70', '#00E5FF', '#FFD23F', '#FF368B'][i % 4];
        el.appendChild(s);
        s.addEventListener('animationend', () => s.remove());
      }
      later(() => { set('idle'); later(idleLoop, 1500); }, 2600);
    }
    function mount(host, { onClick } = {}) {
      clear();
      host.innerHTML = `<button type="button" class="cat" data-state="${state}" aria-label="Your CashBook cat. Tap for a tip.">
        ${CAT_SVG}<span class="cat-z" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span><span class="cat-say" role="status" hidden></span></button>`;
      el = host.querySelector('.cat');
      el.addEventListener('click', () => { const wasAsleep = state === 'sleep'; poke(); if (!wasAsleep) flash('wag', 1200); onClick && onClick(wasAsleep); });
      if (state !== 'sleep') { set('idle'); later(idleLoop, 1600); }
      return el;
    }
    // Any real interaction counts as you being here.
    ['pointerdown', 'keydown'].forEach((t) => addEventListener(t, () => poke(), { passive: true }));
    return { mount, poke, wake, cheer, say, get state() { return state; } };
  })();

  global.PX = { sprite, catSprite, goalSprite, Cat, CATS: Object.keys(CAT) };
})(window);
