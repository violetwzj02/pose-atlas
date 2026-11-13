/* PoseAtlas · 纯静态前端（无构建、无依赖）。数据来自 data/*.js，prompt 来自 assets/js/prompts.js */
(function () {
  'use strict';
  var P = window.PA_POSES, C = window.PA_COSTUMES, R = window.PA_PORTRAITS, SH = window.PA_SHISEI, CH = window.PA_CHARA, META = window.PA_META, PR = window.PAPrompt, I18N = window.PA_I18N;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('pa_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('pa_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); };

  /* ---------- state ---------- */
  var S = {
    tab: 'poses', lang: LS.get('lang', 'zh'), adult: LS.get('adult', false),
    theme: LS.get('theme', 'light'),
    f: LS.get('filters', {}), favs: LS.get('favs', []), recipe: LS.get('recipe', { style: 'none' }), list: [], shown: 0
  };
  var UP = { list: [], urls: {} };
  ['poses', 'costumes', 'portraits', 'shisei', 'characters', 'anime', 'favs', 'uploads'].forEach(function (t) { S.f[t] = S.f[t] || {}; S.f[t].q = ''; });
  var fp = S.f.poses; fp.mode = fp.mode || 'line'; fp.angle = fp.angle || 'front';
  var fc = S.f.costumes; fc.set = 'real';
  var fshi = S.f.shisei; fshi.mode = fshi.mode || 'line';
  var fch = S.f.characters; fch.set = fch.set || 'hair'; fch.color = fch.color || 'brown';
  var t = function (k) { return (I18N[S.lang] || I18N.zh)[k] || I18N.zh[k] || k; };
  var L = function (o) { return o ? (o[S.lang] || o.zh || o.en || '') : ''; };
  var saveF = function () { var c = JSON.parse(JSON.stringify(S.f)); Object.keys(c).forEach(function (k) { delete c[k].q; }); LS.set('filters', c); };

  /* ---------- indexes ---------- */
  var seriesBy = {}, catBy = {}, angBy = {}, hairBy = {}, secBy = {}, ccatBy = {};
  P.series.forEach(function (s) { seriesBy[s.key] = s; });
  P.categories.forEach(function (c) { catBy[c.key] = c; });
  P.angles.forEach(function (a) { angBy[a.key] = a; });
  R.hairs.forEach(function (h) { hairBy[h.key] = h; });
  R.sections.forEach(function (s) { secBy[s.key] = s; });
  C.categories.forEach(function (c) { ccatBy[c.key] = c; });
  var norm = function (s) { return String(s).toLowerCase().normalize('NFKC'); };
  var poseBy = {}, cosBy = {}, porBy = {}, shiBy = {}, chaBy = {};
  var cardColors = {};
  var COS_SHORT = { spring: ['春', 'Spring'], summer: ['夏', 'Summer'], autumn: ['秋', 'Autumn'], winter: ['冬', 'Winter'], swimwear: ['泳装', 'Swim'], party: ['派对', 'Party'], lingerie: ['内衣', 'Lingerie'], sexy: ['性感', 'Sexy'] };
  var shortCat = function (key) { var x = COS_SHORT[key]; return x ? (S.lang === 'en' ? x[1] : x[0]) : L(ccatBy[key]); };
  P.items.forEach(function (p) {
    var c = catBy[p.c], s = seriesBy[p.s];
    p.k = 'pose:' + p.id; poseBy[p.id] = p;
    p.ix = norm([p.id, p.no, p.zh, p.en, p.ja, c.zh, c.en, c.ja, s.zh, s.en, s.ja].join(' '));
  });
  C.items.forEach(function (c) {
    var cat = ccatBy[c.c]; c.k = 'cos:' + c.set + ':' + c.id; cosBy[c.set + ':' + c.id] = c;
    c.ix = norm([c.id, c.zh, c.kw, c.t.join(' '), cat.zh, cat.en, cat.ja, c.col, c.set === 'anime' ? 'anime 二次元 アニメ' : ''].join(' '));
  });
  R.items.forEach(function (r) {
    var st = R.styles[r.st], h = hairBy[r.h], sec = secBy[r.sec]; r.k = 'por:' + r.id; porBy[r.id] = r;
    r.ix = norm([r.id, st.ja, st.zh, st.en, h.zh, h.en, h.ja, sec.zh, sec.en].join(' '));
  });
  SH.items.forEach(function (p) {
    p.k = 'shi:' + p.id; shiBy[p.id] = p;
    p.ix = norm([p.id, p.zh, p.en, p.ja, p.desc, p.c, p.s].join(' '));
  });
  CH.items.concat(CH.variants).forEach(function (it) {
    it.k = 'chara:' + it.id; chaBy[it.id] = it;
    it.ix = norm([it.id, it.zh, it.jp, it.tags, it.cat, it.catZh, it.sub || '', it.color || ''].join(' '));
  });
  var byKey = function (k) {
    if (!k) return;
    var a = k.split(':');
    if (a[0] === 'pose') return poseBy[a[1]];
    if (a[0] === 'cos') return cosBy[a[1] + ':' + a[2]];
    if (a[0] === 'por') return porBy[a[1]];
    if (a[0] === 'shi') return shiBy[a[1]];
    if (a[0] === 'chara') return chaBy[a[1]];
    if (a[0] === 'up') {
      for (var i = 0; i < UP.list.length; i++) if (UP.list[i].id === a[1] || UP.list[i].k === k) return UP.list[i];
    }
  };
  var kind = function (it) { return it && it.k ? it.k.split(':')[0] : ''; };
  var match = function (it, q) { if (!q) return true; var ts = norm(q).split(/\s+/); for (var i = 0; i < ts.length; i++) if (ts[i] && it.ix.indexOf(ts[i]) < 0) return false; return true; };
  var shiSeries = {}; SH.series.forEach(function (s) { shiSeries[s.key] = s; });
  var shiAng = {}; SH.angles.forEach(function (a) { shiAng[a.key] = a; });
  var charaColorOf = function (it) {
    if (it.color) return it.color;
    if (it.colors && it.colors.length) return cardColors[it.id] || (S.f.characters && S.f.characters.color) || 'brown';
    return '';
  };
  var charaImgId = function (it) {
    var c = charaColorOf(it);
    if (it.colors && c && c !== 'brown' && it.colors.indexOf(c) >= 0) return it.id + '-' + c;
    return it.id;
  };

  /* ---------- svg glyphs (示意图标，非原图) ---------- */
  var G = function (vb, d, w) { return '<svg class="fig" viewBox="' + vb + '"' + (w ? ' style="width:' + w + '"' : '') + '>' + d + '</svg>'; };
  var FIG = {
    stand: G('0 0 60 100', '<circle cx="30" cy="13" r="8"/><path d="M30 22v34M30 56 19 92M30 56l11 36M14 36l16-8 16 8M14 36l-4 20M46 36l4 20"/>'),
    sit: G('0 0 60 100', '<circle cx="22" cy="18" r="8"/><path d="M22 27v31h24v30M22 58l-2 0M14 40l8-6 12 12M10 92h44"/>'),
    kneel: G('0 0 60 100', '<circle cx="32" cy="14" r="8"/><path d="M32 23v33M32 56v22l-20 6M32 56l6 22-18 6M18 36l14-8 14 8M18 36l-4 18M46 36l4 18"/>'),
    lie: G('0 0 100 60', '<circle cx="14" cy="30" r="7.5"/><path d="M22 32h44M66 32l26 8M66 32l24-6M32 32l8-14M46 32l6 12M6 46h88"/>', '64%'),
    squat: G('0 0 60 100', '<circle cx="28" cy="24" r="8"/><path d="M28 33v26M28 59l18 4-4 25M28 59l-14 6 6 23M28 42l16 6M28 42l10 12"/>'),
    lean: G('0 0 60 100', '<circle cx="42" cy="18" r="8"/><path d="M38 26 28 58M28 58l-8 34M28 58l8 34M36 34l12 12M34 32l-14 10"/>'),
    special: G('0 0 60 100', '<circle cx="30" cy="13" r="8"/><path d="M30 22v34M30 56 16 90M30 56l18 30M12 26l18 6 18-6M12 26 8 10M48 26l4-16"/>'),
    upper: G('0 0 60 100', '<circle cx="30" cy="30" r="13"/><path d="M8 96c0-22 9-36 22-36s22 14 22 36"/>'),
    duo: G('0 0 90 100', '<circle cx="28" cy="13" r="7.5"/><path d="M28 21v32M28 53l-9 37M28 53l9 37M14 33l14-7 14 7"/><circle cx="62" cy="13" r="7.5"/><path d="M62 21v32M62 53l-9 37M62 53l9 37M48 33l14-7 14 7"/>', '62%'),
    face: G('0 0 60 100', '<path d="M14 52c-2-26 8-38 16-38s18 12 16 38"/><ellipse cx="30" cy="44" rx="12" ry="15"/><path d="M10 98c0-18 9-28 20-28s20 10 20 28"/>')
  };
  var CAT_FIG = { '站姿': 'stand', '扭身': 'stand', '坐姿': 'sit', '侧坐・女孩坐': 'sit', '跪立': 'kneel', '跪立・四肢着地': 'kneel', '趴卧': 'lie', '蹲姿': 'squat', '前倾': 'lean', '后仰・挺背': 'lean', '特殊': 'special' };
  var figFor = function (p) { return p.s === 'duo' ? FIG.duo : p.s === 'upper' ? FIG.upper : FIG[CAT_FIG[p.c] || 'stand']; };
  var COLORS = { black: '#1b1b1f', white: '#e9e9ec', ivory: '#ece3cf', cream: '#efe0bd', beige: '#cdb791', brown: '#7a5235', grey: '#8a8c93', red: '#c0392b', burgundy: '#6e1f33', pink: '#e98fb0', lavender: '#b6a3e0', purple: '#7b4bb3', blue: '#3f74c9', navy: '#1f2f5c', mint: '#8fd6bd', green: '#3f8f57', olive: '#6e7442', khaki: '#a39a6b', yellow: '#e8c547', orange: '#e7883a', gold: '#c9a646', silver: '#b9bcc4' };

  /* ---------- clipboard & toast ---------- */
  var toastT;
  function toast(msg) { var el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2600); }
  function copy(text, btn, msg) {
    var done = function (ok) {
      if (!ok) return toast(t('copyFail'));
      toast(msg || t('copiedToast'));
      if (btn) { var o = btn.innerHTML; btn.classList.add('ok'); btn.textContent = t('copied'); setTimeout(function () { btn.classList.remove('ok'); btn.innerHTML = o; }, 1400); }
    };
    var fallback = function () {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); done(ok);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback); else fallback();
  }

  /* ---------- prompt helpers ---------- */
  function posePrompt(p, mode, angle) {
    var a = p.a.indexOf(angle) >= 0 ? angle : p.a[0];
    var c = catBy[p.c];
    return PR.pose(p, { mode: mode === 'depth' ? 'depth' : 'line', angle: a, cat: { zh: c.zh, en: c.en } });
  }
  function itemPrompt(it, mode, angle) {
    var k = kind(it);
    if (k === 'pose') return posePrompt(it, mode || fp.mode, angle || fp.angle);
    if (k === 'cos') return PR.costume(it);
    if (k === 'shi') {
      var md = mode || (S.f.shisei && S.f.shisei.mode) || 'line';
      var ang = angle || (it.a && it.a[0]) || 'front';
      if (it.a && it.a.indexOf(ang) < 0) ang = it.a[0];
      return PR.shisei(it, { mode: md, angle: ang, cat: { zh: it.c, en: it.c } });
    }
    if (k === 'chara') {
      var useLine = mode === 'line' || (!mode && S.tab === 'characters' && S.f.characters && S.f.characters.line && it.line) || (M.k === it.k && M.mode === 'line' && it.line);
      return PR.character(it, { color: charaColorOf(it), line: !!useLine });
    }
    if (k === 'up') return { zh: it.promptZh || it.title || '', en: it.promptEn || it.titleEn || it.title || '', tip: { zh: '', en: '' } };
    return PR.portrait(it, R.styles[it.st], hairBy[it.h], secBy[it.sec]);
  }
  function itemLink(it, mode, angle) {
    var k = kind(it);
    if (k === 'pose') { var a = it.a.indexOf(angle || fp.angle) >= 0 ? (angle || fp.angle) : it.a[0]; return PR.links.pose((mode || fp.mode) === 'depth' ? 'depth' : 'line', it.id, a); }
    if (k === 'cos') return PR.links.costume(it.set, it.id);
    if (k === 'shi') {
      var md = mode || (S.f.shisei && S.f.shisei.mode) || 'line';
      var ang = angle || (it.a && it.a[0]) || 'front';
      if (it.a && it.a.indexOf(ang) < 0) ang = it.a[0];
      return PR.links.shisei(md, it, ang);
    }
    if (k === 'chara') return PR.links.character({ id: charaImgId(it) }, { line: mode === 'line' });
    if (k === 'up') { var u = UP.urls[it.id] || ''; return { home: '#uploads', image: u, thumb: u, search: it.id }; }
    return PR.links.portrait(it);
  }

  /* ---------- cards ---------- */
  function title(it) {
    var k = kind(it);
    if (k === 'pose' || k === 'shi') return S.lang === 'en' ? it.en : it.zh;
    if (k === 'cos') return S.lang === 'en' ? it.kw : (it.zh || it.kw);
    if (k === 'chara') {
      var name = S.lang === 'en' ? (it.tags.split(',')[0] || it.zh) : it.zh;
      var col = charaColorOf(it);
      if (it.sub === 'style' && col && col !== 'brown' && CH.colors[col]) name = (S.lang === 'en' ? it.tags : it.zh) + (S.lang === 'en' ? ' (' + CH.colors[col].en + ')' : '（' + CH.colors[col].zh + '）');
      return name;
    }
    if (k === 'up') return S.lang === 'en' ? (it.titleEn || it.title) : (it.title || it.titleEn);
    var st = R.styles[it.st]; return st.ja ? L(st) : L(hairBy[it.h]) + ' · ' + L(st);
  }
  function subtitle(it) {
    var k = kind(it);
    if (k === 'pose') return L(seriesBy[it.s]) + ' · ' + L(catBy[it.c]);
    if (k === 'shi') return L(shiSeries[it.s]) + ' · ' + it.c;
    if (k === 'cos') return (S.tab === 'anime' ? shortCat(it.c) : L(ccatBy[it.c])) + (it.set === 'anime' ? ' · 2D' : '');
    if (k === 'chara') return (S.lang === 'en' ? it.tags : it.catZh) + (S.lang === 'en' ? '' : ' · ' + it.tags);
    if (k === 'up') return (it.type || '') + (it.tags ? ' · ' + it.tags : '');
    var st = R.styles[it.st]; return L(hairBy[it.h]) + (st && st.ja ? ' · ' + L(st) : '');
  }
  function thumbImg(src, alt, cls) {
    return '<img class="thumb' + (cls ? ' ' + cls : '') + '" alt="' + esc(alt) + '" src="' + esc(src) + '" width="300" height="400" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
  }
  function cardVis(it) {
    var k = kind(it), b = it.adult ? '<span class="b18">18+</span>' : '', ttl = title(it);
    if (k === 'pose') {
      var m = fp.mode, ang = it.a.indexOf(fp.angle) >= 0 ? fp.angle : it.a[0];
      var cls = m === 'depth' ? 'depth' : m === 'compare' ? 'cmp' : 'line';
      var imgs = m === 'compare'
        ? thumbImg(PR.links.pose('line', it.id, ang).thumb, ttl, 'half') + thumbImg(PR.links.pose('depth', it.id, ang).thumb, ttl, 'half')
        : thumbImg(PR.links.pose(m === 'depth' ? 'depth' : 'line', it.id, ang).thumb, ttl);
      return '<div class="vis ' + cls + '">' + imgs + b + '<span class="badge">' + esc(it.no) + '</span></div>';
    }
    if (k === 'cos') {
      return '<div class="vis cos">' + thumbImg(PR.links.costume(it.set, it.id).thumb, ttl) + b + '<span class="badge">' + esc(it.id) + '</span></div>';
    }
    if (k === 'shi') {
      var md = (S.f.shisei && S.f.shisei.mode) || 'line';
      var ang = it.a[0];
      var cls = md === 'depth' ? 'depth shi' : 'line shi';
      return '<div class="vis ' + cls + '">' + thumbImg(PR.links.shisei(md, it, ang).thumb, ttl) + b + '<span class="badge">' + esc(it.no) + '</span></div>';
    }
    if (k === 'chara') {
      var line = S.tab === 'characters' && S.f.characters.line && it.line;
      return '<div class="vis chara">' + thumbImg(PR.links.character({ id: charaImgId(it) }, { line: line }).thumb, ttl) + b + '<span class="badge">' + esc(it.id) + '</span></div>';
    }
    if (k === 'up') {
      var src = UP.urls[it.id] || '';
      return '<div class="vis up">' + (src ? thumbImg(src, ttl) : '') + b + '<span class="badge">' + esc(it.id) + '</span></div>';
    }
    return '<div class="vis por">' + thumbImg(PR.links.portrait(it).thumb, ttl) + b + '<span class="badge">' + esc(it.id) + '</span></div>';
  }
  function angleStrip(it) {
    var k = kind(it);
    if (k === 'shi') {
      var md = (S.f.shisei && S.f.shisei.mode) || 'line';
      var cur = it.a[0];
      return '<div class="strip shi">' + SH.angles.map(function (a) {
        var ok = it.a.indexOf(a.key) >= 0;
        var src = ok ? PR.links.shisei(md, it, a.key).thumb : '';
        return '<button type="button" class="' + (a.key === cur ? 'on' : '') + (ok ? '' : ' x') + '" data-act="ang" data-v="' + a.key + '"' + (ok ? '' : ' disabled') + ' title="' + esc(L(a)) + '">' +
          (ok ? '<img alt="" src="' + esc(src) + '" width="80" height="107" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '</button>';
      }).join('') + '</div>';
    }
    if (k !== 'pose' || fp.mode === 'compare') return '';
    var cur = it.a.indexOf(fp.angle) >= 0 ? fp.angle : it.a[0];
    var m = fp.mode === 'depth' ? 'depth' : 'line';
    return '<div class="strip">' + P.angles.map(function (a) {
      var ok = it.a.indexOf(a.key) >= 0;
      var src = ok ? PR.links.pose(m, it.id, a.key).thumb : '';
      return '<button type="button" class="' + (a.key === cur ? 'on' : '') + (ok ? '' : ' x') + '" data-act="ang" data-v="' + a.key + '"' + (ok ? '' : ' disabled') + ' title="' + esc(L(a)) + '">' +
        (ok ? '<img alt="" src="' + esc(src) + '" width="80" height="107" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '</button>';
    }).join('') + '</div>';
  }
  function colorDots(it) {
    if (kind(it) !== 'chara' || !it.colors || !it.colors.length) return '';
    var cur = charaColorOf(it);
    return '<div class="dots">' + it.colors.map(function (c) {
      var hex = (CH.colors[c] && CH.colors[c].hex) || '#ccc';
      return '<button type="button" class="dot' + (c === cur ? ' on' : '') + '" data-act="col" data-v="' + c + '" title="' + esc((CH.colors[c] && (S.lang === 'en' ? CH.colors[c].en : CH.colors[c].zh)) || c) + '" style="background:' + hex + '"></button>';
    }).join('') + '</div>';
  }
  function cardActs(it) {
    var lang = S.lang === 'en' ? 'en' : 'zh';
    return '<div class="cacts"><button class="btn sm" type="button" data-act="copy" data-lang="' + lang + '">' + t('copyPrompt') + '</button></div>';
  }
  function cardMeta(it) {
    var k = kind(it), m = [];
    if (k === 'pose') { m.push(L(catBy[it.c]), it.id, fmt(t('angles'), { n: it.a.length })); }
    else if (k === 'cos') { m.push(it.set === 'anime' ? 'ANIME' : 'REAL'); if (it.col) m.push(it.col); }
    else { m.push(L(hairBy[it.h])); }
    return m.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
  }
  function card(it) {
    var extra = kind(it) === 'up' ? '<div class="row" style="padding:6px 4px 0"><button class="btn sm" type="button" data-act="udel" data-id="' + esc(it.id) + '">' + t('upDel') + '</button></div>' : '';
    return '<article class="card" data-k="' + esc(it.k) + '" tabindex="0">' + cardVis(it) +
      '<div class="info"><h3>' + esc(title(it)) + '</h3><div class="sub">' + esc(subtitle(it)) + '</div></div>' + colorDots(it) + angleStrip(it) + cardActs(it) + extra + '</article>';
  }

  /* ---------- filters ---------- */
  function chip(label, on, data, n, extra) {
    return '<button class="chip' + (on ? ' on' : '') + (extra || '') + '" type="button" ' + data + '>' + label + (n != null ? '<span class="n">' + n + '</span>' : '') + '</button>';
  }
  function adultOK(it) { return S.adult || !it.adult; }

  function buildFilters() {
    var h = '', f = S.f[S.tab];
    if (S.tab === 'poses') {
      h += '<div class="frow"><label>' + t('mode') + '</label><div class="seg" role="group">' + ['line', 'depth', 'compare'].map(function (m) {
        return '<button type="button" data-f="mode" data-v="' + m + '" class="' + (f.mode === m ? 'on' : '') + '">' + t(m === 'line' ? 'modeLine' : m === 'depth' ? 'modeDepth' : 'modeCompare') + '</button>'; }).join('') + '</div>';
      h += '<label style="margin-left:10px">' + t('angle') + '</label><div class="seg" role="group">' + P.angles.map(function (a) {
        return '<button type="button" data-f="angle" data-v="' + a.key + '" class="' + (f.angle === a.key ? 'on' : '') + '">' + esc(L(a)) + '</button>'; }).join('') + '</div></div>';
      var vis = P.items.filter(adultOK);
      h += '<div class="frow"><label>' + t('series') + '</label>' + chip(t('all'), !f.s, 'data-f="s" data-v=""', vis.length) + P.series.map(function (s) {
        var n = vis.filter(function (p) { return p.s === s.key; }).length;
        if (!S.adult && s.adult) return chip(esc(L(s)), false, 'data-need-adult="1" data-f="s" data-v="' + s.key + '"', '18+', ' adult');
        return chip(esc(L(s)), f.s === s.key, 'data-f="s" data-v="' + s.key + '"', n, s.adult ? ' adult' : ''); }).join('') + '</div>';
      var cats = {}; vis.forEach(function (p) { if (!f.s || p.s === f.s) cats[p.c] = (cats[p.c] || 0) + 1; });
      h += '<div class="frow"><label>' + t('category') + '</label>' + chip(t('all'), !f.c, 'data-f="c" data-v=""') + P.categories.filter(function (c) { return cats[c.key]; }).map(function (c) {
        return chip(esc(L(c)), f.c === c.key, 'data-f="c" data-v="' + esc(c.key) + '"', cats[c.key]); }).join('') + '</div>';
    } else if (S.tab === 'costumes') {
      var visC = C.items.filter(function (c) { return c.set === 'real' && adultOK(c); });
      h += '<div class="frow"><label>' + t('category') + '</label>' + chip(t('all'), !f.c, 'data-f="c" data-v=""', visC.length) + C.categories.map(function (c) {
        var n = visC.filter(function (x) { return x.c === c.key; }).length; if (!n) return '';
        if (!S.adult && (c.key === 'lingerie' || c.key === 'sexy')) return chip(esc(L(c)), false, 'data-need-adult="1" data-f="c" data-v="' + c.key + '"', '18+', ' adult');
        return chip(esc(L(c)), f.c === c.key, 'data-f="c" data-v="' + c.key + '"', n, (c.key === 'lingerie' || c.key === 'sexy') ? ' adult' : ''); }).join('') + '</div>';
      h += '<div class="frow"><label>' + t('color') + '</label>' + chip(t('all'), !f.col, 'data-f="col" data-v=""') + C.colors.map(function (k) {
        return chip('<span class="sw" style="background:' + COLORS[k] + '"></span>' + k, f.col === k, 'data-f="col" data-v="' + k + '"'); }).join('') + '</div>';
    } else if (S.tab === 'portraits') {
      h += '<div class="frow"><label>' + t('section') + '</label>' + chip(t('all'), !f.sec, 'data-f="sec" data-v=""', R.items.length) + R.sections.map(function (s) {
        return chip(esc(L(s)), f.sec === s.key, 'data-f="sec" data-v="' + s.key + '"', s.count); }).join('') +
        '<label style="margin-left:10px">' + t('hair') + '</label>' + chip(t('all'), !f.h, 'data-f="h" data-v=""') + R.hairs.map(function (x) {
        return chip(esc(L(x)), f.h === x.key, 'data-f="h" data-v="' + x.key + '"', x.count); }).join('') + '</div>';
      h += '<div class="frow"><label>' + t('style') + '</label><select class="sel" data-f="st"><option value="">' + t('all') + ' (' + R.styles.length + ')</option>' + R.styles.map(function (s, i) {
        return '<option value="' + i + '"' + (String(f.st) === String(i) ? ' selected' : '') + '>' + esc(s.ja ? L(s) : L(s)) + '</option>'; }).join('') + '</select></div>';
    } else if (S.tab === 'shisei') {
      h += '<div class="frow"><label>' + t('mode') + '</label><div class="seg" role="group">' + ['line', 'clay', 'depth'].map(function (m) {
        return '<button type="button" data-f="mode" data-v="' + m + '" class="' + (f.mode === m ? 'on' : '') + '">' + t(m === 'line' ? 'modeLine' : m === 'clay' ? 'modeClay' : 'modeDepth') + '</button>'; }).join('') + '</div></div>';
      var visS = SH.items.filter(adultOK);
      h += '<div class="frow"><label>' + t('series') + '</label>' + chip(t('all'), !f.s, 'data-f="s" data-v=""', visS.length) + SH.series.map(function (s) {
        var n = visS.filter(function (p) { return p.s === s.key; }).length;
        if (!S.adult && s.adult) return chip(esc(L(s)), false, 'data-need-adult="1" data-f="s" data-v="' + s.key + '"', '18+', ' adult');
        return chip(esc(L(s)), f.s === s.key, 'data-f="s" data-v="' + s.key + '"', n, s.adult ? ' adult' : ''); }).join('') + '</div>';
      var catsS = {}; visS.forEach(function (p) { if (!f.s || p.s === f.s) catsS[p.c] = (catsS[p.c] || 0) + 1; });
      h += '<div class="frow"><label>' + t('category') + '</label>' + chip(t('all'), !f.c, 'data-f="c" data-v=""') + SH.categories.filter(function (c) { return catsS[c.key]; }).map(function (c) {
        return chip(esc(L(c)), f.c === c.key, 'data-f="c" data-v="' + esc(c.key) + '"', catsS[c.key]); }).join('') + '</div>';
    } else if (S.tab === 'characters') {
      var visH = CH.items.filter(adultOK);
      h += '<div class="frow"><label></label><div class="seg" role="group">' + CH.sets.map(function (s) {
        var n = visH.filter(function (i) { return i.set === s.key; }).length;
        return '<button type="button" data-f="set" data-v="' + s.key + '" class="' + (f.set === s.key ? 'on' : '') + '">' + (S.lang === 'en' ? s.en : s.zh) + ' <span class="n">' + n + '</span></button>';
      }).join('') + '</div></div>';
      var inSet = visH.filter(function (i) { return i.set === (f.set || 'hair'); });
      if ((f.set || 'hair') === 'hair') {
        h += '<div class="frow"><label>' + t('category') + '</label>' + chip(t('all'), !f.sub, 'data-f="sub" data-v=""', inSet.length) + CH.subs.map(function (sub) {
          var n = inSet.filter(function (i) { return i.sub === sub.key; }).length;
          if (!n) return '';
          return chip(esc(S.lang === 'en' ? sub.en : sub.zh), f.sub === sub.key, 'data-f="sub" data-v="' + sub.key + '"', n);
        }).join('') + '</div>';
        h += '<div class="frow colorbar"><label>' + t('previewColor') + '</label><div class="seg">' + Object.keys(CH.colors).map(function (c) {
          var o = CH.colors[c];
          return '<button type="button" data-f="color" data-v="' + c + '" class="' + ((f.color || 'brown') === c ? 'on' : '') + '"><span class="sw" style="background:' + o.hex + '"></span>' + esc(S.lang === 'en' ? o.en : o.zh) + '</button>';
        }).join('') + '</div>' +
          chip(t('favOnly'), !!f.favs, 'data-f="favs" data-v="1"') + '</div>';
      } else {
        var catsC = {}; inSet.forEach(function (i) { catsC[i.cat] = (catsC[i.cat] || 0) + 1; });
        h += '<div class="frow"><label>' + t('category') + '</label>' + chip(t('all'), !f.c, 'data-f="c" data-v=""', inSet.length) + Object.keys(catsC).map(function (cat) {
          var lab = (inSet.filter(function (i) { return i.cat === cat; })[0] || {}).catZh || cat;
          var adultCat = inSet.some(function (i) { return i.cat === cat && i.adult; }) && !inSet.some(function (i) { return i.cat === cat && !i.adult; });
          if (!S.adult && adultCat) return chip(esc(S.lang === 'en' ? cat : lab), false, 'data-need-adult="1" data-f="c" data-v="' + esc(cat) + '"', '18+', ' adult');
          return chip(esc(S.lang === 'en' ? cat : lab), f.c === cat, 'data-f="c" data-v="' + esc(cat) + '"', catsC[cat]);
        }).join('') + '</div>';
        if ((f.set || '') === 'pose') {
          h += '<div class="frow"><label>' + t('mode') + '</label><div class="seg">' +
            '<button type="button" data-f="line" data-v="" class="' + (!f.line ? 'on' : '') + '">' + t('charaDraw') + '</button>' +
            '<button type="button" data-f="line" data-v="1" class="' + (f.line ? 'on' : '') + '">' + t('charaLine') + '</button></div></div>';
        }
      }
    } else if (S.tab === 'anime') {
      var visA = C.items.filter(function (c) { return c.set === 'anime' && adultOK(c); });
      h += '<div class="frow"><label>' + t('category') + '</label>' + chip(t('all'), !f.c, 'data-f="c" data-v=""', visA.length) + C.categories.map(function (c) {
        var n = visA.filter(function (x) { return x.c === c.key; }).length; if (!n) return '';
        var lab = shortCat(c.key);
        if (!S.adult && (c.key === 'lingerie' || c.key === 'sexy')) return chip(lab, false, 'data-need-adult="1" data-f="c" data-v="' + c.key + '"', '18+', ' adult');
        return chip(lab, f.c === c.key, 'data-f="c" data-v="' + c.key + '"', n, (c.key === 'lingerie' || c.key === 'sexy') ? ' adult' : ''); }).join('') + '</div>';
    }
    $('#filters').innerHTML = h;
  }

  function compute() {
    var f = S.f[S.tab] || {}, q = f.q, src, hidden = 0;
    if (S.tab === 'poses') src = P.items.filter(function (p) { return (!f.s || p.s === f.s) && (!f.c || p.c === f.c) && match(p, q); });
    else if (S.tab === 'costumes') src = C.items.filter(function (c) { return c.set === 'real' && (!f.c || c.c === f.c) && (!f.col || c.col === f.col) && match(c, q); });
    else if (S.tab === 'anime') src = C.items.filter(function (c) { return c.set === 'anime' && (!f.c || c.c === f.c) && match(c, q); });
    else if (S.tab === 'portraits') src = R.items.filter(function (r) { return (!f.sec || r.sec === f.sec) && (!f.h || r.h === f.h) && (f.st === '' || f.st == null || String(r.st) === String(f.st)) && match(r, q); });
    else if (S.tab === 'shisei') src = SH.items.filter(function (p) { return (!f.s || p.s === f.s) && (!f.c || p.c === f.c) && match(p, q); });
    else if (S.tab === 'characters') src = CH.items.filter(function (i) {
      return i.set === (f.set || 'hair') && (!f.sub || i.sub === f.sub) && (!f.c || i.cat === f.c) &&
        (!f.favs || S.favs.indexOf(i.k) >= 0) && match(i, q);
    });
    else if (S.tab === 'favs') src = S.favs.map(byKey).filter(Boolean).filter(function (x) { return match(x, q); });
    else if (S.tab === 'uploads') src = UP.list.filter(function (x) { return match(x, q); });
    else src = [];
    var out = src.filter(function (x) { if (adultOK(x)) return true; hidden++; return false; });
    S.list = out; S.hidden = hidden; S.total = src.length;
  }

  var PAGE = 60;
  function renderList(reset) {
    var v = $('#view');
    if (reset) {
      compute(); S.shown = 0;
      if (!S.list.length) {
        v.innerHTML = S.tab === 'favs' && !S.favs.length ? '<div class="empty"><b>☆</b>' + t('favEmpty') + '</div>' : '<div class="empty"><b>' + t('empty') + '</b>' + t('emptyHint') + '</div>';
      } else v.innerHTML = '<div class="grid" id="grid"></div>';
      $('#resultInfo').textContent = fmt(t('results'), { n: S.list.length.toLocaleString() }) + (S.hidden ? fmt(t('hidden18'), { n: S.hidden }) : '');
      $('#hint').textContent = t('noImgNote');
    }
    var g = $('#grid'); if (!g) return;
    var next = S.list.slice(S.shown, S.shown + PAGE);
    g.insertAdjacentHTML('beforeend', next.map(card).join(''));
    S.shown += next.length;
  }

  /* ---------- views ---------- */
  function setTab(tab) {
    S.tab = tab;
    document.querySelectorAll('#tabs a').forEach(function (a) { a.classList.toggle('on', a.dataset.tab === tab); a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : null); });
    var list = tab === 'poses' || tab === 'costumes' || tab === 'portraits' || tab === 'shisei' || tab === 'characters' || tab === 'anime' || tab === 'favs';
    $('#toolbar').hidden = !list;
    var mt = $('#modeToggle');
    if (mt) { mt.hidden = tab !== 'poses'; mt.setAttribute('aria-checked', fp.mode === 'depth' ? 'true' : 'false'); }
    renderHead();
    if (list) {
      S.f[tab] = S.f[tab] || { q: '' };
      var q = $('#q'); q.value = S.f[tab].q || '';
      var qKey = { poses: 'qPoses', costumes: 'qCostumes', portraits: 'qPortraits', shisei: 'qShisei', characters: 'qCharacters', anime: 'qAnime', favs: 'qFavs' }[tab] || 'qFavs';
      q.placeholder = t(qKey);
      if (tab === 'favs') $('#filters').innerHTML = ''; else buildFilters();
      renderList(true);
    } else if (tab === 'recipe') renderRecipe();
    else if (tab === 'uploads') renderUploads();
    else renderAbout();
    updateCounts();
  }
  function updateCounts() {
    $('#cnt-poses').textContent = P.items.filter(adultOK).length;
    $('#cnt-costumes').textContent = C.items.filter(function (c) { return c.set === 'real' && adultOK(c); }).length.toLocaleString();
    $('#cnt-anime').textContent = C.items.filter(function (c) { return c.set === 'anime' && adultOK(c); }).length.toLocaleString();
    $('#cnt-portraits').textContent = R.items.length.toLocaleString();
    var shiEl = $('#cnt-shisei'); if (shiEl) shiEl.textContent = SH.items.filter(adultOK).length;
    var chaEl = $('#cnt-characters'); if (chaEl) chaEl.textContent = CH.items.filter(adultOK).length;
    $('#cnt-favs').textContent = S.favs.length || '';
    var upEl = $('#cnt-uploads'); if (upEl) upEl.textContent = (S.adult ? UP.list.filter(adultOK).length : 0) || '';
    var r = S.recipe, n = (r.pose ? 1 : 0) + (r.costume ? 1 : 0) + (r.portrait ? 1 : 0);
    $('#cnt-recipe').textContent = n || '';
  }

  function renderHead() {
    var el = $('#phead'); if (!el) return;
    var c = META.counts, visP = P.items.filter(adultOK).length, visC = C.items.filter(function (x) { return x.set === 'real' && adultOK(x); }).length;
    var visA = C.items.filter(function (x) { return x.set === 'anime' && adultOK(x); }).length;
    var visS = SH.items.filter(adultOK).length, visH = CH.items.filter(adultOK).length;
    var visImgs = SH.items.filter(adultOK).reduce(function (n, p) { return n + p.a.length; }, 0);
    var h = '';
    if (S.tab === 'poses') {
      h = '<p class="eyebrow">' + t('posesEyebrow') + '</p><h1>' + t('posesTitle') + '</h1><p class="lead">' + t('posesLead') + '</p>' +
        '<ul class="stats"><li><b>' + visP + '</b><span>' + t('statPoses') + '</span></li><li><b>' + Number(c.poseImagesPerMode).toLocaleString() + '</b><span>' + t('statLine') + '</span></li><li><b>' + Number(c.poseImagesPerMode).toLocaleString() + '</b><span>' + t('statDepth') + '</span></li><li><b>5</b><span>' + t('statAngles') + '</span></li></ul>';
    } else if (S.tab === 'costumes') {
      h = '<p class="eyebrow">' + t('cosEyebrow') + '</p><h1>' + t('cosTitle') + '</h1><p class="lead">' + t('cosLead') + '</p>' +
        '<ul class="stats"><li><b>' + visC.toLocaleString() + '</b><span>' + t('statCosReal') + '</span></li></ul>';
    } else if (S.tab === 'anime') {
      h = '<p class="eyebrow">' + t('aniEyebrow') + '</p><h1>' + t('aniTitle') + '</h1><p class="lead">' + t('aniLead') + '</p>' +
        '<ul class="stats"><li><b>' + visA.toLocaleString() + '</b><span>' + t('statAniSets') + '</span></li><li><b>8</b><span>' + t('statAniCats') + '</span></li></ul>';
    } else if (S.tab === 'portraits') {
      h = '<p class="eyebrow">' + t('porEyebrow') + '</p><h1>' + t('porTitle') + '</h1><p class="lead">' + t('porLead') + '</p>' +
        '<ul class="stats"><li><b>' + Number(c.portraits).toLocaleString() + '</b><span>' + t('statPor') + '</span></li><li><b>' + c.portraitStyles + '</b><span>' + t('statStyles') + '</span></li></ul>';
    } else if (S.tab === 'shisei') {
      h = '<p class="eyebrow">' + t('shiEyebrow') + '</p><h1>' + t('shiTitle') + '</h1><p class="lead">' + t('shiLead') + '</p>' +
        '<ul class="stats"><li><b>' + visS + '</b><span>' + t('statShiPoses') + '</span></li><li><b>' + visImgs.toLocaleString() + '</b><span>' + t('statShiImgs') + '</span></li><li><b>CC0</b><span>CC0</span></li></ul>';
    } else if (S.tab === 'characters') {
      h = '<p class="eyebrow">' + t('chaEyebrow') + '</p><h1>' + t('chaTitle') + '</h1><p class="lead">' + t('chaLead') + '</p>' +
        '<ul class="stats"><li><b>' + CH.items.filter(function (i) { return i.set === 'hair' && adultOK(i); }).length + '</b><span>' + t('statChaHair') + '</span></li>' +
        '<li><b>' + CH.items.filter(function (i) { return i.set === 'outfit' && adultOK(i); }).length + '</b><span>' + t('statChaOutfit') + '</span></li>' +
        '<li><b>' + CH.items.filter(function (i) { return i.set === 'pose' && adultOK(i); }).length + '</b><span>' + t('statChaPose') + '</span></li>' +
        '<li><b>' + c.charaVariants + '</b><span>' + t('statChaColor') + '</span></li></ul>';
    } else if (S.tab === 'uploads') {
      h = '<p class="eyebrow">' + t('upEyebrow') + '</p><h1>' + t('upTitle') + '</h1><p class="lead">' + t('upLead') + '</p>';
    }
    el.innerHTML = h; el.hidden = !h;
  }

  /* ---------- detail modal ---------- */
  var M = { k: null, mode: 'line', angle: 'front' };
  var modal = $('#modal');
  function openDetail(k, push) {
    var it = byKey(k); if (!it) return;
    if (!adultOK(it)) { askAdult(function () { openDetail(k, push); }); return; }
    M.k = k;
    if (kind(it) === 'pose') { M.mode = fp.mode === 'depth' ? 'depth' : 'line'; M.angle = it.a.indexOf(fp.angle) >= 0 ? fp.angle : it.a[0]; }
    else if (kind(it) === 'shi') { M.mode = (S.f.shisei && S.f.shisei.mode) || 'line'; M.angle = it.a[0]; }
    else if (kind(it) === 'chara') { M.mode = (it.line && S.f.characters && S.f.characters.line) ? 'line' : 'draw'; }
    renderDetail();
    if (!modal.open) modal.showModal();
    if (push !== false) history.replaceState(null, '', '#' + S.tab + '/' + encodeURIComponent(k));
  }
  function closeDetail() { if (modal.open) modal.close(); }
  modal.addEventListener('close', function () { M.k = null; history.replaceState(null, '', '#' + S.tab); });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeDetail(); });

  function promptBlock(p) {
    return '<div class="prompts"><div class="prompt"><div class="ph"><span>' + t('promptZh') + '</span><button class="btn sm" type="button" data-act="mcopy" data-lang="zh">' + t('copyZh') + '</button></div><pre>' + esc(p.zh) + '</pre></div>' +
      '<div class="prompt"><div class="ph"><span>' + t('promptEn') + '</span><button class="btn sm" type="button" data-act="mcopy" data-lang="en">' + t('copyEn') + '</button></div><pre>' + esc(p.en) + '</pre></div></div>' +
      '<div class="tip">' + esc(L(p.tip)) + '</div>';
  }
  function srcBox(on, ttl, link, note, visCls, it) {
    var alt = it ? title(it) : ttl;
    var vis = '<div class="vis ' + (visCls || 'cos') + '">' +
      '<img class="preview" alt="' + esc(alt) + '" src="' + esc(link.image) + '" width="900" height="1200" loading="lazy" decoding="async" referrerpolicy="no-referrer">' +
      '<div class="preview-fail">' + t('previewFail') + '</div></div>';
    return '<div class="src' + (on ? ' on' : '') + '"><h4>' + ttl + '</h4>' + vis +
      '<p class="note">' + t('previewFrom') + '</p>' +
      '<code>' + esc(link.image) + '</code>' + (note ? '<div class="note">' + esc(note) + '</div>' : '') +
      '<div class="row"><a class="btn pri sm" href="' + esc(link.image) + '" target="_blank" rel="noopener">' + t('openImg') + '</a>' +
      '<button class="btn sm" type="button" data-act="home" data-home="' + esc(link.home) + '" data-id="' + esc(link.search) + '">' + t('openHome') + '</button></div></div>';
  }
  function renderDetail() {
    var it = byKey(M.k), k = kind(it), h = '', fav = S.favs.indexOf(it.k) >= 0, inR = inRecipe(it);
    var head = function (ttl, alt, chips) {
      return '<div class="mh"><div><h2 id="mTitle">' + esc(ttl) + '</h2><div class="alt">' + esc(alt) + '</div><div class="id">' + chips + '</div></div>' +
        '<button class="btn ghost sm x" type="button" data-act="close" aria-label="close">✕</button></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn sm" type="button" data-act="fav">' + (fav ? '★ ' + t('unfav') : '☆ ' + t('fav')) + '</button>' +
        (k === 'shi' || k === 'chara' ? '' : '<button class="btn sm' + (inR ? ' ok' : '') + '" type="button" data-act="recipe">' + (inR ? t('inRecipe') : '+ ' + t('addRecipe')) + '</button>') + '</div>';
    };
    var tag = function (s, cls) { return '<span class="chip' + (cls ? ' ' + cls : '') + '" style="cursor:default">' + esc(s) + '</span>'; };
    if (k === 'pose') {
      var s = seriesBy[it.s], c = catBy[it.c];
      h += head(S.lang === 'en' ? it.en : it.zh, (S.lang === 'en' ? it.zh : it.en) + ' · ' + it.ja,
        '<span>' + esc(it.id) + '</span>' + tag(L(s)) + tag(L(c) + ' / ' + c.ja) + (it.adult ? '<span class="b18" style="position:static">18+</span>' : ''));
      h += '<div class="msec"><h3>' + t('angle') + '</h3><div class="row"><div class="seg">' + P.angles.map(function (a) {
        var miss = it.a.indexOf(a.key) < 0;
        return '<button type="button" data-act="ang" data-v="' + a.key + '" class="' + (M.angle === a.key ? 'on' : '') + '"' + (miss ? ' disabled title="' + esc(t('missingAngle')) + '" style="opacity:.35;cursor:not-allowed"' : '') + '>' + esc(L(a)) + '</button>'; }).join('') +
        '</div><div class="seg" style="margin-left:auto">' + ['line', 'depth'].map(function (m) {
        return '<button type="button" data-act="mode" data-v="' + m + '" class="' + (M.mode === m ? 'on' : '') + '">' + t(m === 'line' ? 'modeLine' : 'modeDepth') + '</button>'; }).join('') + '</div></div></div>';
      var ll = PR.links.pose('line', it.id, M.angle), dl = PR.links.pose('depth', it.id, M.angle);
      h += '<div class="msec"><h3>' + t('openSrc') + ' · ' + esc(L(angBy[M.angle])) + '</h3><div class="cmp">' +
        srcBox(M.mode === 'line', t('lineSite'), ll, '', 'line', it) + srcBox(M.mode === 'depth', t('depthSite'), dl, t('depthNote'), 'depth', it) + '</div>' +
        '<div class="notice" style="margin-top:10px">' + t('noImgNote') + '</div></div>';
      h += '<div class="msec"><h3>Prompt · ' + t(M.mode === 'depth' ? 'modeDepth' : 'modeLine') + ' · ' + esc(L(angBy[M.angle])) + '</h3>' + promptBlock(posePrompt(it, M.mode, M.angle)) + '</div>';
      h += '<div class="keys">' + t('keys') + '</div>';
    } else if (k === 'cos') {
      var cc = ccatBy[it.c];
      h += head(it.zh || it.kw, it.kw, '<span>' + esc(it.id) + '</span>' + tag(it.set === 'anime' ? 'COSTUME-ANIME-DB' : 'COSTUME-DB-01') + tag(L(cc) + ' / ' + cc.ja) + (it.col ? tag(it.col) : '') + (it.adult ? '<span class="b18" style="position:static">18+</span>' : ''));
      if (it.t.length) h += '<div class="msec"><div class="row">' + it.t.map(function (x) { return tag(x); }).join('') + '</div></div>';
      h += '<div class="msec"><h3>' + t('openSrc') + '</h3>' + srcBox(true, it.set === 'anime' ? 'COSTUME-ANIME-DB · ギア' : 'COSTUME-DB-01 · ギア', PR.links.costume(it.set, it.id), '', 'cos', it) + '<div class="notice" style="margin-top:10px">' + t('noImgNote') + '</div></div>';
      h += '<div class="msec"><h3>Prompt</h3>' + promptBlock(PR.costume(it)) + '</div><div class="keys">↑ ↓ · Esc</div>';
    } else if (k === 'shi') {
      var ss = shiSeries[it.s];
      h += head(S.lang === 'en' ? it.en : it.zh, (S.lang === 'en' ? it.zh : it.en) + (it.ja ? ' · ' + it.ja : ''),
        '<span>' + esc(it.no) + '</span>' + tag(L(ss)) + tag(it.c) + tag('CC0 1.0') + (it.adult ? '<span class="b18" style="position:static">18+</span>' : ''));
      h += '<div class="msec"><h3>' + t('angle') + '</h3><div class="row"><div class="seg">' + SH.angles.map(function (a) {
        var miss = it.a.indexOf(a.key) < 0;
        return '<button type="button" data-act="ang" data-v="' + a.key + '" class="' + (M.angle === a.key ? 'on' : '') + '"' + (miss ? ' disabled title="' + esc(t('missingAngle')) + '" style="opacity:.35;cursor:not-allowed"' : '') + '>' + esc(L(a)) + '</button>'; }).join('') +
        '</div><div class="seg" style="margin-left:auto">' + ['line', 'clay', 'depth'].map(function (m) {
        return '<button type="button" data-act="mode" data-v="' + m + '" class="' + (M.mode === m ? 'on' : '') + '">' + t(m === 'line' ? 'modeLine' : m === 'clay' ? 'modeClay' : 'modeDepth') + '</button>'; }).join('') + '</div></div></div>';
      var sl = PR.links.shisei(M.mode, it, M.angle);
      h += '<div class="msec"><h3>' + t('openSrc') + ' · ' + esc(L(shiAng[M.angle] || {})) + '</h3>' +
        srcBox(true, 'Shisei · ' + t(M.mode === 'clay' ? 'modeClay' : M.mode === 'depth' ? 'modeDepth' : 'modeLine'), sl, '', M.mode === 'depth' ? 'depth shi' : 'line shi', it) +
        '<div class="notice" style="margin-top:10px">' + t('noImgNote') + '</div></div>';
      h += '<div class="msec"><h3>Prompt · ' + t(M.mode === 'clay' ? 'modeClay' : M.mode === 'depth' ? 'modeDepth' : 'modeLine') + ' · ' + esc(L(shiAng[M.angle] || {})) + '</h3>' + promptBlock(itemPrompt(it, M.mode, M.angle)) + '</div>';
      if (it.desc) h += '<div class="tip">' + esc(it.desc) + '</div>';
    } else if (k === 'chara') {
      var col = charaColorOf(it);
      h += head(title(it), (S.lang === 'en' ? it.zh : it.tags) + (it.jp ? ' · ' + it.jp : ''),
        '<span>' + esc(charaImgId(it)) + '</span>' + tag(it.catZh || it.cat) + (it.adult ? '<span class="b18" style="position:static">18+</span>' : ''));
      if (it.colors && it.colors.length) {
        h += '<div class="msec"><h3>' + t('previewColor') + '</h3><div class="dots">' + it.colors.map(function (c) {
          var hex = (CH.colors[c] && CH.colors[c].hex) || '#ccc';
          return '<button type="button" class="dot' + (c === col ? ' on' : '') + '" data-act="col" data-v="' + c + '" title="' + esc((CH.colors[c] && (S.lang === 'en' ? CH.colors[c].en : CH.colors[c].zh)) || c) + '" style="background:' + hex + '"></button>';
        }).join('') + '</div></div>';
      }
      if (it.line) {
        h += '<div class="msec"><div class="seg">' +
          '<button type="button" data-act="mode" data-v="draw" class="' + (M.mode !== 'line' ? 'on' : '') + '">' + t('charaDraw') + '</button>' +
          '<button type="button" data-act="mode" data-v="line" class="' + (M.mode === 'line' ? 'on' : '') + '">' + t('charaLine') + '</button></div></div>';
      }
      h += '<div class="msec"><h3>' + t('openSrc') + '</h3>' + srcBox(true, 'キャラ組み立てDB · たき AI', itemLink(it, M.mode === 'line' ? 'line' : 'draw'), '', 'chara', it) +
        '<div class="notice" style="margin-top:10px">' + t('noImgNote') + '</div></div>';
      h += '<div class="msec"><h3>Prompt</h3>' + promptBlock(itemPrompt(it, M.mode === 'line' ? 'line' : 'draw')) + '</div>';
    } else if (k === 'up') {
      h += head(title(it), subtitle(it), '<span>' + esc(it.id) + '</span>' + tag(it.type || '') + (it.adult ? '<span class="b18" style="position:static">18+</span>' : ''));
      h += '<div class="msec"><h3>' + t('openSrc') + '</h3>' + srcBox(true, title(it), itemLink(it), t('upLead'), 'up', it) + '</div>';
      h += '<div class="msec"><h3>Prompt</h3>' + promptBlock(itemPrompt(it)) + '</div>';
    } else {
      var st = R.styles[it.st], hr = hairBy[it.h], sec = secBy[it.sec];
      h += head(title(it), st.ja ? st.en + ' · ' + st.ja : hr.en, '<span>' + esc(it.id) + '</span>' + tag(L(sec)) + tag(L(hr) + ' / ' + hr.ja) + tag('CC0 1.0'));
      h += '<div class="msec"><div class="tip" style="margin-top:0">' + esc(L(sec.note)) + '</div></div>';
      h += '<div class="msec"><h3>' + t('openSrc') + '</h3>' + srcBox(true, 'AIモデル顔データベース · あぎ', PR.links.portrait(it), S.lang === 'en' ? 'The "open site" link opens the gallery pre-filtered to this section and hair length.' : '「打开原站」会直接筛到该分区与发长。', 'por', it) + '<div class="notice" style="margin-top:10px">' + t('noImgNote') + '</div></div>';
      h += '<div class="msec"><h3>Prompt</h3>' + promptBlock(PR.portrait(it, st, hr, sec)) + '</div><div class="keys">↑ ↓ · Esc</div>';
    }
    $('#modalIn').innerHTML = h;
    Array.prototype.forEach.call($('#modalIn').querySelectorAll('img.preview'), function (img) {
      img.addEventListener('error', function () {
        var box = img.closest('.vis');
        if (box) box.classList.add('is-fail');
      });
      if (img.complete && img.naturalWidth === 0) {
        var box = img.closest('.vis');
        if (box) box.classList.add('is-fail');
      }
    });
  }
  function stepDetail(d) {
    var i = S.list.findIndex(function (x) { return x.k === M.k; }); if (i < 0) return;
    var n = S.list[i + d]; if (!n) return;
    while (S.shown <= i + d) renderList(false);
    openDetail(n.k);
  }

  /* ---------- favourites / recipe ---------- */
  function toggleFav(it) {
    var i = S.favs.indexOf(it.k); if (i >= 0) S.favs.splice(i, 1); else S.favs.unshift(it.k);
    LS.set('favs', S.favs); updateCounts();
  }
  function inRecipe(it) {
    var r = S.recipe, k = kind(it);
    if (k === 'up' || k === 'shi' || k === 'chara') return false;
    return k === 'pose' ? r.pose && r.pose.id === it.id : k === 'cos' ? r.costume && r.costume.set + ':' + r.costume.id === it.set + ':' + it.id : r.portrait === it.id;
  }
  function addRecipe(it) {
    var k = kind(it);
    if (k === 'up' || k === 'shi' || k === 'chara') return;
    if (k === 'pose') S.recipe.pose = { id: it.id, mode: M.k === it.k ? M.mode : (fp.mode === 'depth' ? 'depth' : 'line'), angle: M.k === it.k ? M.angle : (it.a.indexOf(fp.angle) >= 0 ? fp.angle : it.a[0]) };
    else if (k === 'cos') S.recipe.costume = { set: it.set, id: it.id };
    else S.recipe.portrait = it.id;
    LS.set('recipe', S.recipe); updateCounts();
  }
  function recipeItems() {
    var r = S.recipe;
    return { pose: r.pose && poseBy[r.pose.id], costume: r.costume && cosBy[r.costume.set + ':' + r.costume.id], portrait: r.portrait && porBy[r.portrait] };
  }
  function renderRecipe() {
    var ri = recipeItems(), r = S.recipe, refs = [], n = 1;
    var slot = function (key, lbl, it, extra, tab) {
      if (!it) return '<div class="slot"><span class="lbl">' + lbl + '</span><span class="sp"></span><a class="btn sm" href="#' + tab + '">' + t('pick') + ' →</a></div>';
      return '<div class="slot full"><span class="lbl">' + lbl + '</span><b>' + esc(title(it)) + '</b><span class="sub">' + esc(it.id) + (extra || '') + '</span><span class="sp"></span>' +
        '<div class="row"><button class="btn sm" type="button" data-act="ropen" data-k="' + esc(it.k) + '">' + (S.lang === 'en' ? 'Details' : '详情') + '</button><button class="btn sm ghost" type="button" data-act="rdel" data-v="' + key + '">' + t('remove') + '</button></div></div>';
    };
    if (ri.portrait) refs.push({ n: n++, it: ri.portrait, l: PR.links.portrait(ri.portrait) });
    if (ri.costume) refs.push({ n: n++, it: ri.costume, l: PR.links.costume(ri.costume.set, ri.costume.id) });
    if (ri.pose) refs.push({ n: n++, it: ri.pose, l: PR.links.pose(r.pose.mode, ri.pose.id, r.pose.angle), x: ' · ' + t(r.pose.mode === 'depth' ? 'modeDepth' : 'modeLine') + ' · ' + L(angBy[r.pose.angle]) });
    var p = PR.recipe({ pose: ri.pose, poseMode: r.pose && r.pose.mode, poseAngle: r.pose && r.pose.angle, costume: ri.costume, portrait: ri.portrait }, r.style || 'none',
      { style: function (it) { return R.styles[it.st]; }, hair: function (it) { return hairBy[it.h]; } });
    var h = '<div class="panel"><h2>' + t('recipeTitle') + '</h2><p class="lead">' + t('recipeIntro') + '</p><div class="slots">' +
      slot('portrait', t('slotPortrait'), ri.portrait, '', 'portraits') + slot('costume', t('slotCostume'), ri.costume, '', 'costumes') +
      slot('pose', t('slotPose'), ri.pose, ri.pose ? ' · ' + t(r.pose.mode === 'depth' ? 'modeDepth' : 'modeLine') + ' · ' + L(angBy[r.pose.angle]) : '', 'poses') + '</div>' +
      '<div class="msec"><div class="row"><label style="color:var(--tx3);font-size:12px">' + t('stylePreset') + '</label><select class="sel" id="styleSel">' +
      PR.STYLES.map(function (s) { return '<option value="' + s.key + '"' + (s.key === (r.style || 'none') ? ' selected' : '') + '>' + esc(L(s)) + '</option>'; }).join('') +
      '</select><button class="btn sm ghost" type="button" data-act="rclear" style="margin-left:auto">' + t('clear') + '</button></div></div>';
    if (p) {
      h += '<div class="msec"><h3>' + t('refs') + '</h3><ol class="refs">' + refs.map(function (x) {
        return '<li>' + (S.lang === 'en' ? 'Image ' : '图') + x.n + ' — ' + esc(title(x.it)) + ' <code style="font-size:11px;color:var(--tx3)">' + esc(x.it.id + (x.x || '')) + '</code> · <a href="' + esc(x.l.image) + '" target="_blank" rel="noopener">' + t('openImg') + '</a></li>'; }).join('') + '</ol></div>';
      S.recipePrompt = p;
      h += '<div class="msec"><h3>Prompt</h3><div class="prompts"><div class="prompt"><div class="ph"><span>' + t('promptZh') + '</span><button class="btn sm" type="button" data-act="rcopy" data-lang="zh">' + t('copyZh') + '</button></div><pre>' + esc(p.zh) + '</pre></div>' +
        '<div class="prompt"><div class="ph"><span>' + t('promptEn') + '</span><button class="btn sm" type="button" data-act="rcopy" data-lang="en">' + t('copyEn') + '</button></div><pre>' + esc(p.en) + '</pre></div></div>' +
        '<div class="notice" style="margin-top:10px">' + t('noImgNote') + '</div></div>';
    } else h += '<div class="empty" style="padding:40px 10px">' + t('recipeEmpty') + '</div>';
    $('#view').innerHTML = h + '</div>';
  }

  /* ---------- about ---------- */
  function renderAbout() {
    var c = META.counts, zh = S.lang !== 'en';
    var stat = function (n, l) { return '<div class="stat"><b>' + Number(n).toLocaleString() + '</b><span>' + l + '</span></div>'; };
    var src = [
      ['POSE-DB-01（线稿）', 'https://ai-pose-gallery.pages.dev/', 'ギア @giaaibusi', zh ? '288 组 × 5 视角 = 1,439 张（full_sexy_P018 缺仰视）' : '288 poses × 5 angles = 1,439 (full_sexy_P018 has no low angle)'],
      ['POSE-DB-02（灰模/深度）', 'https://ai-pose-depth-gallery.pages.dev/', 'ギア @giaaibusi', zh ? '与线稿同一批 ID 一一对应，1,439 张；越白越近' : 'Same IDs as line art, 1,439 depth maps; whiter = closer'],
      ['COSTUME-DB-01（写实衣装）', 'https://ai-costume-gallery.pages.dev/', 'ギア @giaaibusi', '1,407'],
      ['COSTUME-ANIME-DB（二次元衣装）', 'https://ai-costume-anime-gallery.pages.dev/', 'ギア @giaaibusi', '1,320'],
      ['AIモデル顔データベース（人像）', 'https://ai-portrait-gallery.pages.dev/', 'あぎ @agi_aibusi', zh ? '1,499（CC0 1.0；作者请求勿再分发图片本身）' : '1,499 (CC0 1.0; the author asks not to redistribute the images)'],
      ['Shisei CC0 姿势线稿', 'https://shisei.indaloop.app/', 'wquguru', zh ? '280 个姿势、1,212 张线稿/白模/深度图；CC0 1.0，可商用、可再分发' : '280 poses, 1,212 line/clay/depth views; CC0 1.0, commercial use and redistribution allowed'],
      ['キャラ組み立てDB（二次元角色）', 'https://charadb-2fi.pages.dev/', 'たき AI @taki_auto', zh ? '843 条底图 + 184 个发色变体；允许作品商用，禁止再分发原图及加工图，禁止用于真实人物或未成年人' : '843 base + 184 hair-color variants; commercial works OK; no redistributing original or edited images; no real people or minors']
    ];
    var repos = [
      ['HRuiCcc/RuiC-PoseAtlas', 'MIT', zh ? '姿势中/英/日名与分类英文名、衣装颜色/类别、人像分区与发长' : 'Pose names (zh/en/ja), category EN names, outfit color/group, portrait sections & hair'],
      ['anhao/ai-pose-gallery-zh', zh ? 'MIT（仅代码）' : 'MIT (code only)', zh ? '衣装中文名与标签、人像发型中文名、prompt 句式与画风预设（代码部分）' : 'Outfit ZH names & tags, hairstyle ZH names, prompt wording & style presets (code)'],
      ['Brilliant666/ai-pose-depth-gallery-cn', 'MIT', zh ? '核对深度站元数据（288/1,439）' : 'Cross-check of depth metadata (288/1,439)'],
      ['fairyliuying/ai-pose-depth-gallery-zh', '—', zh ? '核对' : 'Cross-check'],
      ['GodAI-Master/ai-reference-atlas-zh', '—', zh ? '参考（未取数据）' : 'Reference (no data used)'],
      ['mugicha-AI/ComfyUI-PoseAtlas', '—', zh ? '参考（未取数据）' : 'Reference (no data used)']
    ];
    var h = '<div class="about"><div class="panel"><h2>' + (zh ? '来源与授权' : 'Sources & license') + '</h2><p class="lead">' + (zh ?
      '本站是一个<strong>文字索引 + prompt 工具</strong>：只收录姿势名、分类、视角、衣装关键词、发型等元数据，并据此生成可直接复制的生图 prompt。本站不托管、不转存原图。列表按滚动从原站加载官方缩略图，打开详情时再加载这一张原图预览。禁止批量下载或自动抓取。' :
      'This site is a <strong>text index + prompt tool</strong>: it only stores metadata (pose names, categories, angles, outfit keywords, hairstyles) and builds copy-ready prompts from it. Images are not re-hosted. The list lazily loads official thumbnails from the original sites; opening an item loads that one official preview. Bulk download and automated scraping are not allowed.') + '</p>' +
      '<div class="stats">' + stat(c.poses, zh ? '姿势组' : 'poses') + stat(c.angles, zh ? '视角' : 'angles') + stat(c.poseImagesPerMode * 2, zh ? '线稿+深度 图位' : 'line + depth images') +
      stat(c.costumesReal, zh ? '写实服装' : 'real outfits') + stat(c.costumesAnime, zh ? '二次元服装' : 'anime outfits') + stat(c.portraits, zh ? '人像' : 'portraits') +
      stat(c.shiseiPoses, zh ? 'CC0 线稿姿势' : 'CC0 poses') + stat(c.charaBase + c.charaVariants, zh ? '角色设定（含发色）' : 'character looks') +
      stat(c.poseImagesPerMode * 2 * 2 + (c.costumesReal + c.costumesAnime + c.portraits) * 2 + c.shiseiImages * 2 + (c.charaBase + c.charaVariants) * 2, zh ? '可复制 prompt（中+英）' : 'copyable prompts (zh+en)') + '</div></div>';
    h += '<div class="panel"><h3 style="margin-top:0">' + (zh ? '原站（图片版权方）' : 'Original sites (image rights holders)') + '</h3><table><tr><th>' + (zh ? '站点' : 'Site') + '</th><th>' + (zh ? '作者' : 'Author') + '</th><th>' + (zh ? '收录' : 'Coverage') + '</th></tr>' +
      src.map(function (r) { return '<tr><td><a href="' + r[1] + '" target="_blank" rel="noopener">' + r[0] + '</a></td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>'; }).join('') + '</table>' +
      '<h3>' + (zh ? '原站利用规约（摘要）' : 'Original terms (summary)') + '</h3><ul>' + (zh ? [
        '免费使用，<b>允许作为参考用于创作（含商用、编辑、参考）</b>；无需署名（可选）。',
        '<b>禁止</b>对图片数据本身（含原尺寸与加工后）<b>再分发、转载、转售</b>。',
        '<b>禁止批量下载</b>（含用工具自动抓取），以及对所取得图片的再分发、转载、销售；生成时逐张参考使用不受影响。（该条见于姿势线稿、深度、衣装各站；深度站在页首再次强调）',
        '不得用于表现真实人物或未成年人，或违反公序良俗的用途。图片为人台/AI 生成，非真实人物。',
        '人像库（あぎ）：CC0 1.0，可商用与编辑；作者请求勿再分发、转载图片本身；不得用于冒充真实人物。',
        'Shisei 线稿（wquguru）：CC0 1.0，图片可商用、可再分发；本站仍只热链接官方缩略图，不把原图打进仓库。',
        '角色库（たき AI）：允许用于作品制作与商用；<b>禁止再分发原图及加工图</b>；不得用于真实人物或未成年人。'
      ] : [
        'Free to use; <b>allowed as references for your own works (incl. commercial use and editing)</b>; credit optional.',
        '<b>No redistribution, reposting or resale</b> of the image data itself (original or edited).',
        '<b>No bulk downloading</b> (incl. automated scraping) and no redistribution or sale of images so obtained; using them one at a time for generation is fine (stated on the line-art, depth and costume sites).',
        'Do not use to depict real people or minors, or for anything offensive. Figures are mannequins / AI-generated.',
        'Portrait library (あぎ): CC0 1.0, commercial use and editing allowed; the author asks not to redistribute the images; no impersonation of real people.',
        'Shisei (wquguru): CC0 1.0; images may be used commercially and redistributed. This site still only hotlinks official thumbnails and does not vendor the originals.',
        'Character library (たき AI): commercial works allowed; <b>do not redistribute original or edited images</b>; do not use for real people or minors.'
      ]).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
    h += '<div class="panel"><h3 style="margin-top:0">' + (zh ? '元数据来源仓库' : 'Metadata repositories') + '</h3><table><tr><th>Repo</th><th>License</th><th>' + (zh ? '用途' : 'Used for') + '</th></tr>' +
      repos.map(function (r) { return '<tr><td><a href="https://github.com/' + r[0] + '" target="_blank" rel="noopener">' + r[0] + '</a></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') + '</table>' +
      '<p style="color:var(--tx2);font-size:13px">' + (zh ? '本站代码以 MIT 授权；图片版权归原作者，不随 MIT。姿势名称、分类及衣装关键词出自原站目录，按原作者署名使用。' : 'Site code is MIT. Image copyright stays with the original authors and is not covered by MIT. Pose names, categories and outfit keywords come from the original catalogs and are credited to their authors.') + '</p>' +
      '<h3>' + (zh ? '原站深链接说明' : 'About deep links') + '</h3><ul>' + (zh ? [
        '姿势线稿/深度、衣装原站都是单页图库，<b>没有逐条详情页 URL</b>。详情里的预览和「原站单图」都指向原站服务器上的那一张图（本站不转存），例如 <code>https://ai-pose-gallery.pages.dev/img/full_sexy_P001_front.png</code>、<code>https://ai-pose-depth-gallery.pages.dev/img/full_sexy_P001_front.png</code>。',
        '「打开原站并复制 ID」打开原站首页并把 ID 复制到剪贴板，在原站搜索框粘贴即可定位（原站搜索支持 ID）。',
        '人像原站支持 <code>#sec=styling&hair=ロング</code> 形式的筛选链接，本站直接链到对应分区与发长。'
      ] : [
        'The pose and costume originals are single-page galleries with <b>no per-item URL</b>. The in-detail preview and "Original image" both point at that single image on the original server (not re-hosted), e.g. <code>https://ai-pose-gallery.pages.dev/img/full_sexy_P001_front.png</code>.',
        '"Open site & copy ID" opens the gallery and copies the ID — paste it into the site\'s search box.',
        'The portrait site supports <code>#sec=styling&hair=ロング</code> filter links, which we use.'
      ]).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
      '<h3>' + (zh ? '已知缺口' : 'Known gaps') + '</h3><ul>' + (zh ? [
        '原站本身缺 1 张：' + META.missing.join(', ') + '（线稿与深度均缺）。',
        '人像英文发型名为本站翻译（中文名来自 anhao/ai-pose-gallery-zh）。',
        '部分双人 / 性感系列姿势在 18+ 关闭时隐藏。角色库发色变体按官方默认棕色图加色点切换。'
      ] : [
        'Missing on the source itself: ' + META.missing.join(', ') + ' (both line art and depth).',
        'English hairstyle names are our translations (Chinese from anhao/ai-pose-gallery-zh).',
        'Some pair / sexy series poses stay hidden until 18+ is on. Hair-color variants switch from the official brown default via the color dots.'
      ]).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><p style="color:var(--tx3);font-size:12px">' + (zh ? '数据生成日期：' : 'Data built: ') + META.built + '</p></div></div>';
    $('#view').innerHTML = h;
  }

  function renderFoot() {
    $('#foot').innerHTML = '<div><b>' + t('footSrc') + '</b><span>' + t('footRule') + '</span><span>' + t('footCode') + ' · <a href="#about">' + t('aboutLink') + '</a></span></div>';
  }


  /* ---------- 本地上传（IndexedDB，仅当前浏览器） ---------- */
  var UP_MAX = 8 * 1024 * 1024;
  function updb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('poseatlas-up', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('items', { keyPath: 'id' }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function upRevoke() {
    Object.keys(UP.urls).forEach(function (id) { try { URL.revokeObjectURL(UP.urls[id]); } catch (e) {} });
    UP.urls = {};
  }
  function upIndex(it) {
    it.k = 'up:' + it.id;
    it.ix = norm([it.id, it.title, it.titleEn, it.promptZh, it.promptEn, it.tags, it.type].join(' '));
    return it;
  }
  function upLoad() {
    return updb().then(function (db) {
      return new Promise(function (res, rej) {
        var q = db.transaction('items', 'readonly').objectStore('items').getAll();
        q.onsuccess = function () {
          UP.list = (q.result || []).map(upIndex);
          upRevoke();
          UP.list.forEach(function (it) { if (it.blob) UP.urls[it.id] = URL.createObjectURL(it.blob); });
          res(UP.list);
        };
        q.onerror = function () { rej(q.error); };
      });
    });
  }
  function upPut(item) {
    return updb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction('items', 'readwrite');
        tx.objectStore('items').put(item);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    }).then(upLoad);
  }
  function upDel(id) {
    return updb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction('items', 'readwrite');
        tx.objectStore('items').delete(id);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    }).then(upLoad);
  }
  function blobToDataURL(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsDataURL(blob);
    });
  }
  function dataURLToBlob(u) {
    var m = /^data:([^;]+);base64,(.+)$/.exec(u || '');
    if (!m) return null;
    var bin = atob(m[2]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: m[1] });
  }
  function upExport() {
    Promise.all(UP.list.map(function (it) {
      return blobToDataURL(it.blob).then(function (data) {
        return { id: it.id, type: it.type, title: it.title, titleEn: it.titleEn, promptZh: it.promptZh, promptEn: it.promptEn, tags: it.tags, adult: it.adult, created: it.created, mime: it.mime, data: data };
      });
    })).then(function (rows) {
      var blob = new Blob([JSON.stringify({ v: 1, items: rows }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'poseatlas-uploads.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      toast(t('upExportOk'));
    });
  }
  function upImport(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        try { res(JSON.parse(fr.result)); } catch (e) { rej(e); }
      };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsText(file);
    }).then(function (data) {
      var rows = (data && data.items) || [];
      return rows.reduce(function (p, row) {
        return p.then(function () {
          var blob = dataURLToBlob(row.data);
          if (!blob) return;
          var item = { id: row.id || ('up_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)), type: row.type || 'other', title: row.title || '', titleEn: row.titleEn || '', promptZh: row.promptZh || '', promptEn: row.promptEn || '', tags: row.tags || '', adult: row.adult !== false, created: row.created || Date.now(), mime: row.mime || blob.type, blob: blob };
          return upPut(item);
        });
      }, Promise.resolve()).then(function () { return rows.length; });
    });
  }
  function renderUploads() {
    renderHead();
    $('#toolbar').hidden = true;
    var v = $('#view');
    if (!S.adult) {
      v.innerHTML = '<div class="empty"><b>' + t('upTitle') + '</b>' + t('upNeedAdult') + '<br><button class="btn pri" type="button" data-act="uenter" style="margin-top:14px">' + t('upNeedAdultBtn') + '</button></div>';
      return;
    }
    var cards = UP.list.filter(adultOK);
    S.list = cards; S.shown = cards.length;
    var grid = cards.length ? '<div class="grid" id="grid">' + cards.map(card).join('') + '</div>' : '<div class="empty"><b>' + t('upEmpty') + '</b></div>';
    v.innerHTML = '<div class="panel"><p class="upnote">' + t('upNote') + '</p>' +
      '<div class="row" style="margin:0 0 14px"><button class="btn sm" type="button" id="upExportBtn">' + t('upExport') + '</button>' +
      '<label class="btn sm" for="upImportFile">' + t('upImport') + '</label><input id="upImportFile" type="file" accept="application/json" hidden></div>' +
      '<form class="upform" id="upForm">' +
      '<label>' + t('upType') + '<select name="type"><option value="pose">' + t('upTypePose') + '</option><option value="costume">' + t('upTypeCostume') + '</option><option value="portrait">' + t('upTypePortrait') + '</option><option value="other">' + t('upTypeOther') + '</option></select></label>' +
      '<div class="row"><label style="flex:1">' + t('upTitleZh') + '<input name="title" type="text" required></label><label style="flex:1">' + t('upTitleEn') + '<input name="titleEn" type="text"></label></div>' +
      '<label>' + t('upTags') + '<input name="tags" type="text"></label>' +
      '<label>' + t('upPromptZh') + '<textarea name="promptZh"></textarea></label>' +
      '<label>' + t('upPromptEn') + '<textarea name="promptEn"></textarea></label>' +
      '<label class="chip on" style="width:fit-content"><input name="adult" type="checkbox" checked> ' + t('upAdult') + '</label>' +
      '<label>' + t('upFile') + '<div class="updrop" id="upDrop">' + t('upDrop') + '<div class="upprev" id="upPrev"></div></div><input id="upFile" name="file" type="file" accept="image/*" hidden></label>' +
      '<div class="row"><button class="btn pri" type="submit">' + t('upSubmit') + '</button></div></form></div>' + grid;
    var form = $('#upForm'), fileInp = $('#upFile'), drop = $('#upDrop'), prev = $('#upPrev'), picked = { file: null };
    function showPrev(file) {
      picked.file = file;
      prev.innerHTML = '';
      if (!file) return;
      var url = URL.createObjectURL(file);
      prev.innerHTML = '<img alt="" src="' + url + '">';
    }
    drop.onclick = function () { fileInp.click(); };
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('drag'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('drag'); if (e.dataTransfer.files[0]) showPrev(e.dataTransfer.files[0]); });
    fileInp.onchange = function () { if (fileInp.files[0]) showPrev(fileInp.files[0]); };
    form.onsubmit = function (e) {
      e.preventDefault();
      var title = form.title.value.trim(), titleEn = form.titleEn.value.trim();
      if (!title && !titleEn) { toast(t('upErrTitle')); return; }
      var file = picked.file;
      if (!file || !/^image\//.test(file.type) || file.size > UP_MAX) { toast(t('upErrFile')); return; }
      var item = { id: 'up_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), type: form.type.value, title: title, titleEn: titleEn, promptZh: form.promptZh.value.trim(), promptEn: form.promptEn.value.trim(), tags: form.tags.value.trim(), adult: !!form.adult.checked, created: Date.now(), mime: file.type, blob: file };
      upPut(item).then(function () { toast(t('upOk')); renderUploads(); updateCounts(); });
    };
    $('#upExportBtn').onclick = function () { upExport(); };
    $('#upImportFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      upImport(f).then(function (n) { toast(fmt(t('upImportOk'), { n: n })); renderUploads(); updateCounts(); });
    };
  }

  /* ---------- 18+ ---------- */
  var gate = $('#gate'), gateCb = null;
  function askAdult(cb) { gateCb = cb || null; gate.showModal(); }
  $('#gateYes').onclick = function () { gate.close(); setAdult(true); if (gateCb) { var f = gateCb; gateCb = null; f(); } };
  $('#gateNo').onclick = function () { gateCb = null; gate.close(); };
  function setAdult(v) {
    S.adult = !!v; LS.set('adult', S.adult);
    if (!S.adult && S.tab === 'uploads') { history.replaceState(null, '', '#poses'); S.tab = 'poses'; }
    paintChrome(); setTab(S.tab);
  }
  function requestAdult() { if (S.adult) setAdult(false); else askAdult(); }
  $('#adultBtn').onclick = requestAdult;
  $('#modeAdult').onclick = function () { if (!S.adult) askAdult(); };
  $('#modeSafe').onclick = function () { if (S.adult) setAdult(false); };
  var modeOff = $('#modeOff'); if (modeOff) modeOff.onclick = function () { setAdult(false); };

  /* ---------- chrome / i18n ---------- */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.theme === 'dark' ? 'dark' : 'light');
    var meta = $('#themeColor'); if (meta) meta.setAttribute('content', S.theme === 'dark' ? '#111111' : '#ffffff');
  }
  function paintChrome() {
    document.documentElement.lang = S.lang === 'en' ? 'en' : 'zh-CN';
    document.documentElement.setAttribute('data-adult', S.adult ? '1' : '0');
    var bar = $('#modebar'); if (bar) bar.hidden = !S.adult;
    document.querySelectorAll('[data-i]').forEach(function (el) { el.textContent = t(el.dataset.i); });
    var b = $('#adultBtn');
    b.setAttribute('aria-checked', S.adult ? 'true' : 'false');
    b.title = S.adult ? t('adultShown') : t('adultHidden');
    $('#modeSafe').setAttribute('aria-pressed', S.adult ? 'false' : 'true');
    $('#modeAdult').setAttribute('aria-pressed', S.adult ? 'true' : 'false');
    var th = $('#themeBtn');
    th.setAttribute('aria-label', S.theme === 'dark' ? t('themeToLight') : t('themeToDark'));
    applyTheme();
    $('#langBtn').textContent = S.lang === 'en' ? '中文' : 'EN';
    renderFoot();
  }
  $('#langBtn').onclick = function () { S.lang = S.lang === 'en' ? 'zh' : 'en'; LS.set('lang', S.lang); paintChrome(); setTab(S.tab); if (M.k) renderDetail(); };

  /* ---------- events ---------- */
  var qT;
  $('#q').addEventListener('input', function (e) { clearTimeout(qT); var v = e.target.value; qT = setTimeout(function () { S.f[S.tab].q = v.trim(); renderList(true); }, 90); });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (modal.open && M.k) {
      var it = byKey(M.k);
      if (e.key === 'ArrowDown') { e.preventDefault(); stepDetail(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); stepDetail(-1); }
      else if (kind(it) === 'pose' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault(); var i = it.a.indexOf(M.angle) + (e.key === 'ArrowRight' ? 1 : -1); M.angle = it.a[(i + it.a.length) % it.a.length]; renderDetail();
      }
      return;
    }
    if (e.key === '/' && tag !== 'input' && tag !== 'select' && tag !== 'textarea' && !$('#toolbar').hidden) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('card')) openDetail(e.target.dataset.k);
  });
  $('#filters').addEventListener('click', function (e) {
    var need = e.target.closest('[data-need-adult]');
    if (need) {
      askAdult(function () {
        var f = S.f[S.tab]; f[need.dataset.f] = need.dataset.v; if (need.dataset.f === 's' || need.dataset.f === 'set') f.c = '';
        saveF(); buildFilters(); renderList(true);
      });
      return;
    }
    var b = e.target.closest('[data-f]'); if (!b || b.tagName === 'SELECT') return;
    var f = S.f[S.tab], k = b.dataset.f, v = b.dataset.v;
    if (k === 'mode' || k === 'angle' || k === 'set' || k === 'color' || k === 'line') f[k] = v;
    else if (k === 'favs') f[k] = f[k] ? '' : v;
    else f[k] = f[k] === v ? '' : v;
    if (k === 's' || k === 'set') { f.c = ''; f.sub = ''; }
    if (k === 'color') cardColors = {};
    saveF(); buildFilters();
    var mt = $('#modeToggle'); if (mt && k === 'mode') mt.setAttribute('aria-checked', fp.mode === 'depth' ? 'true' : 'false');
    renderList(true);
  });
  $('#filters').addEventListener('change', function (e) { if (e.target.dataset.f) { S.f[S.tab][e.target.dataset.f] = e.target.value; saveF(); renderList(true); } });

  function openHome(btn) { var id = btn.dataset.id; window.open(btn.dataset.home, '_blank', 'noopener'); copy(id, null, fmt(t('idCopied'), { id: id })); }
  $('#view').addEventListener('error', function (e) {
    var el = e.target;
    if (!el || !el.classList || !el.classList.contains('thumb')) return;
    el.classList.add('is-fail');
    var box = el.closest('.vis');
    if (box) box.classList.add('is-fail');
  }, true);
  $('#view').addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]');
    var cardEl = e.target.closest('.card');
    if (a) {
      var act = a.dataset.act;
      if (act === 'img') return; // 普通链接，新标签打开
      e.preventDefault();
      e.stopPropagation();
      if (act === 'ang' && cardEl) {
        var itA = byKey(cardEl.dataset.k), ang = a.dataset.v, vis = cardEl.querySelector('.vis'), img = vis && vis.querySelector('.thumb');
        if (itA && img && !vis.classList.contains('cmp')) {
          if (kind(itA) === 'shi') {
            var mdS = vis.classList.contains('depth') ? 'depth' : ((S.f.shisei && S.f.shisei.mode) || 'line');
            img.src = PR.links.shisei(mdS, itA, ang).thumb;
          } else {
            var md = vis.classList.contains('depth') ? 'depth' : 'line';
            img.src = PR.links.pose(md, itA.id, ang).thumb;
          }
        }
        cardEl.querySelectorAll('.strip button').forEach(function (x) { x.classList.toggle('on', x === a); });
        return;
      }
      if (act === 'col' && cardEl) {
        var itC = byKey(cardEl.dataset.k);
        if (itC) {
          cardColors[itC.id] = a.dataset.v;
          var imgC = cardEl.querySelector('.thumb'), h3 = cardEl.querySelector('h3'), badge = cardEl.querySelector('.badge');
          if (imgC) imgC.src = PR.links.character({ id: charaImgId(itC) }, { line: !!(S.f.characters && S.f.characters.line && itC.line) }).thumb;
          if (h3) h3.textContent = title(itC);
          if (badge) badge.textContent = charaImgId(itC);
          cardEl.querySelectorAll('.dot').forEach(function (x) { x.classList.toggle('on', x === a); });
        }
        return;
      }
      if (act === 'udel') { upDel(a.dataset.id).then(function () { toast(t('upDelOk')); renderUploads(); updateCounts(); }); return; }
      if (act === 'uenter') { askAdult(function () { history.replaceState(null, '', '#uploads'); setTab('uploads'); }); return; }
      if (cardEl && act === 'copy') { var it = byKey(cardEl.dataset.k); copy(itemPrompt(it)[a.dataset.lang], a); return; }
      if (act === 'rdel') { delete S.recipe[a.dataset.v]; LS.set('recipe', S.recipe); renderRecipe(); updateCounts(); return; }
      if (act === 'rclear') { S.recipe = { style: S.recipe.style }; LS.set('recipe', S.recipe); renderRecipe(); updateCounts(); return; }
      if (act === 'rcopy') { copy(S.recipePrompt[a.dataset.lang], a); return; }
      if (act === 'ropen') { openDetail(a.dataset.k, false); return; }
      return;
    }
    if (cardEl) openDetail(cardEl.dataset.k);
  });
  $('#view').addEventListener('change', function (e) { if (e.target.id === 'styleSel') { S.recipe.style = e.target.value; LS.set('recipe', S.recipe); renderRecipe(); } });
  $('#modalIn').addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]'); if (!a) return;
    var it = byKey(M.k), act = a.dataset.act;
    if (act === 'close') closeDetail();
    else if (act === 'ang') { M.angle = a.dataset.v; renderDetail(); }
    else if (act === 'mode') { M.mode = a.dataset.v; renderDetail(); }
    else if (act === 'mcopy') copy(itemPrompt(it, M.mode, M.angle)[a.dataset.lang], a);
    else if (act === 'col') { cardColors[it.id] = a.dataset.v; renderDetail(); }
    else if (act === 'home') openHome(a);
    else if (act === 'fav') { toggleFav(it); renderDetail(); if (S.tab === 'favs') renderList(true); }
    else if (act === 'recipe') { addRecipe(it); renderDetail(); toast(t('inRecipe')); if (S.tab === 'recipe') renderRecipe(); }
  });

  /* infinite scroll */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (ents) { if (ents[0].isIntersecting && S.shown < S.list.length && $('#grid')) renderList(false); }, { rootMargin: '900px' }).observe($('#sentinel'));
  } else window.addEventListener('scroll', function () { if (innerHeight + scrollY > document.body.offsetHeight - 900 && S.shown < S.list.length) renderList(false); });

  /* routing: #tab 或 #tab/<key> */
  var TABS = ['poses', 'costumes', 'portraits', 'shisei', 'characters', 'anime', 'recipe', 'favs', 'uploads', 'about'];
  function route() {
    var h = decodeURIComponent(location.hash.slice(1)), i = h.indexOf('/'), tab = i < 0 ? h : h.slice(0, i), key = i < 0 ? '' : h.slice(i + 1);
    if (TABS.indexOf(tab) < 0) tab = 'poses';
    if (tab !== S.tab || !$('#view').innerHTML) setTab(tab);
    if (key && key !== M.k) openDetail(key, false); else if (!key && modal.open) closeDetail();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', function () {
    var y = window.scrollY || 0;
    var top = $('#top'), tb = $('#toolbar');
    if (top) top.classList.toggle('stuck', y > 4);
    if (tb) tb.classList.toggle('stuck', y > 4);
  }, { passive: true });
  $('#themeBtn').onclick = function () { S.theme = S.theme === 'dark' ? 'light' : 'dark'; LS.set('theme', S.theme); applyTheme(); paintChrome(); };
  var mt = $('#modeToggle');
  if (mt) mt.onclick = function () {
    fp.mode = fp.mode === 'depth' ? 'line' : 'depth';
    saveF(); buildFilters(); mt.setAttribute('aria-checked', fp.mode === 'depth' ? 'true' : 'false');
    renderList(true);
  };
  applyTheme();
  upLoad().catch(function () { UP.list = []; }).then(function () { paintChrome(); route(); });
})();
