// 7Spot：状态、层级推进（脚本逐帧驱动）、连线（同帧同坐标）、漂浮、光点、滑动、返回箭头、关于页。
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var site = window.SITE || { wakes: [], items: [], dreaming: false, credits: [] };
  var params = new URLSearchParams(location.search);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;
  // Safari 的 backdrop-filter 不认 SVG 滤镜，Liquid Glass 退回普通毛玻璃
  var ua = navigator.userAgent;
  if (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/.test(ua)) root.classList.add('no-refract');

  // 调试：?theme=dark|light
  var theme = params.get('theme');
  if (theme === 'dark' || theme === 'light') root.dataset.theme = theme;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function easeIn(x) { return x * x; }
  function easeOutBack(x) { var c1 = 1.0, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function smooth(x) { return x * x * (3 - 2 * x); }

  // ---------- 日期 ----------
  function parseDate(s) { var p = String(s).split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); }
  function startOfToday() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function daysAgo(s) { return Math.round((startOfToday() - parseDate(s)) / 864e5); }
  function dayWord(n) { return n <= 0 ? '今天' : n === 1 ? '昨天' : n === 2 ? '前天' : n + ' 天前'; }
  function itemById(id) { for (var i = 0; i < site.items.length; i++) if (site.items[i].id === id) return site.items[i]; return null; }
  function fullTitle(it) { return it.title + (it.sub ? '：' + it.sub : ''); }   // 首页以外，名字都带上那句话：「同桌：你的桌面宠物」
  function sortedWakes() { return (site.wakes || []).slice().sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); }); }
  function latestWakeOf(id) { var ws = sortedWakes(); for (var i = 0; i < ws.length; i++) if (ws[i].item === id) return ws[i]; return null; }
  function developing() { for (var i = 0; i < site.items.length; i++) if (site.items[i].status === 'developing') return site.items[i]; return null; }

  // ---------- 状态：今天醒过 > 造梦 > N 天前醒过 > 还没醒过 ----------
  function siteState() {
    var w = sortedWakes()[0] || null, d = w ? daysAgo(w.date) : null;
    if (w && d <= 0) return { kind: 'today', wake: w, days: 0, item: itemById(w.item) };
    if (site.dreaming) return { kind: 'dreaming', item: developing() || site.items[0] || null };
    if (w) return { kind: 'ago', wake: w, days: d, item: itemById(w.item) };
    return { kind: 'never' };
  }
  // 预览：?state=today|ago3|dreaming|never，或右上角按钮
  function previewState(name) {
    function sample(n) { var d = new Date(); d.setDate(d.getDate() - n); return { date: d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(), item: (site.items[0] || {}).id, note: '示例：同桌 1.0 可以下载了' }; }
    if (name === 'today') return { kind: 'today', wake: sample(0), days: 0, item: site.items[0] || null, preview: true };
    if (name === 'ago3') return { kind: 'ago', wake: sample(3), days: 3, item: site.items[0] || null, preview: true };
    if (name === 'dreaming') return { kind: 'dreaming', item: developing() || site.items[0] || null, preview: true };
    if (name === 'never') return { kind: 'never', preview: true };
    return siteState();
  }
  var S = null;
  function applyState(next) {
    S = next;
    document.body.classList.remove('state-today', 'state-dreaming', 'state-ago', 'state-never');
    document.body.classList.add('state-' + S.kind);
    var h = document.getElementById('status-h'), p = document.getElementById('status-p');
    if (S.kind === 'today') { h.textContent = '今天醒过'; p.textContent = S.wake.note; }
    else if (S.kind === 'dreaming') { h.textContent = '在造梦'; p.textContent = '正在开发：「' + (S.item ? S.item.title : '小东西') + '」'; }
    else if (S.kind === 'ago') { h.textContent = dayWord(S.days) + '醒过'; p.textContent = '也许有可能大概现在睡着了'; }
    else { h.textContent = '还没醒过'; p.textContent = '也许有可能大概一直在睡'; }

    // 小东西徽标：造梦中 / 今天醒过 / 昨天醒过 / N 天前醒过；没有就不显示
    var badges = document.querySelectorAll('[data-item-status]');
    for (var b = 0; b < badges.length; b++) {
      var el = badges[b], it = itemById(el.getAttribute('data-item-status'));
      if (!it) continue;
      var label = '', days = null;
      var pw = S.preview && S.wake && S.wake.item === it.id ? S.wake : null;
      if (pw) days = S.days;
      else if (it.status === 'developing') label = '造梦中';
      else { var w = latestWakeOf(it.id); if (w) days = daysAgo(w.date); }
      if (days !== null) label = dayWord(days) + '醒过';
      el.textContent = label;
      el.hidden = !label;
      el.classList.toggle('is-today', days === 0);
      setPet(it.id, days === 0 ? 'sit' : 'lie');   // 详情卡里的它：今天醒过就坐着吐舌头，其他时候趴着打哈欠
    }
    var awake = S.kind === 'today';
    document.title = awake ? '7Spot' : '7Spot · zzz';
    var fav = document.getElementById('favicon');
    if (fav) fav.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='" + (awake ? '%230a84ff' : '%238e8e93') + "'/%3E%3C/svg%3E";
    var key = S.kind === 'ago' ? 'ago3' : S.kind;
    var sb = document.querySelectorAll('#statebar button');
    for (var i = 0; i < sb.length; i++) sb[i].classList.toggle('is-on', sb[i].getAttribute('data-state') === key);
    needMeasure = true;
  }

  // 详情卡里的小东西本人：assets/img/<id>/lie.webp / sit.webp（循环动图）和 lie-still / sit-still（静止一帧，减弱动态效果时用）。
  // 只加载当前要放的那一个；换姿势时给外层 .pet-stage 加 is-sit，高度跟着换
  function setPet(id, pose) {
    var img = document.querySelector('img[data-pet="' + id + '"]');
    if (!img) return;
    var src = 'assets/img/' + id + '/' + pose + (reduce ? '-still' : '') + '.webp';
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    var stage = img.closest('.pet-stage');
    if (stage) stage.classList.toggle('is-sit', pose === 'sit');
  }

  // ---------- 小东西气泡：从数据生成。字全在球里：图标、名字、那句话、种类和状态（球下面不挂字） ----------
  var itemsEl = document.getElementById('items');
  site.items.forEach(function (it) {
    var w = document.createElement('div');
    w.className = 'item';
    w.innerHTML =
      '<div class="float"><button class="bubble bubble-item" type="button" data-node="item:' + it.id + '" data-shape="circle" data-go="' + it.id + '" aria-label="' + esc(fullTitle(it)) + '">' +
        '<span class="app-icon" aria-hidden="true"><svg><use href="#paw"/></svg></span>' +
        '<span class="item-name">' + esc(it.title) + '</span>' +
        '<span class="item-sub">' + esc(it.sub) + '</span>' +
        '<span class="item-meta"><span>' + esc(it.kind || '应用') + '</span><span class="badge" data-item-status="' + it.id + '"></span></span>' +
      '</button></div>';
    itemsEl.appendChild(w);
  });
  // 最后一颗：更多小东西。和同桌同级、一样大，但没有下一层：按下只弹一下，不跳转，右边也没有线
  if (site.more) {
    var mw = document.createElement('div');
    mw.className = 'item';
    mw.innerHTML =
      '<div class="float"><div class="bubble bubble-item bubble-more" data-node="more" data-shape="circle">' +
        '<span class="app-icon-slot" aria-hidden="true"></span>' +
        '<span class="item-name">' + esc(site.more.title) + '</span>' +
        '<span class="item-sub">' + esc(site.more.sub) + '</span>' +
      '</div></div>';
    itemsEl.appendChild(mw);
  }

  // ---------- 层级：位置全在脚本手里 ----------
  var stage = document.getElementById('stage');
  var W = stage.clientWidth || window.innerWidth, H = window.innerHeight;
  var levels = {}, levelList = [];
  [].slice.call(document.querySelectorAll('.level')).forEach(function (el) {
    var L = { name: el.dataset.level, el: el, parent: el.dataset.parent || null, x: 1, y: 0, from: 1, to: 1, t0: 0, dur: 0, anim: false };
    levels[L.name] = L; levelList.push(L);
  });
  var current = null, needMeasure = true;

  // 流里的线：首页时整体渐隐，离开首页渐显
  var linesAlpha = { v: 1, from: 1, to: 1, t0: 0 };
  function setLinesTarget(to, instant) {
    if (instant) { linesAlpha.v = linesAlpha.from = linesAlpha.to = to; return; }
    if (linesAlpha.to === to) return;
    linesAlpha.from = linesAlpha.v; linesAlpha.to = to; linesAlpha.t0 = performance.now();
  }

  // iOS 那条推层曲线 cubic-bezier(.32,.72,0,1)
  function bezier(p1x, p1y, p2x, p2y) {
    function A(a1, a2) { return 1 - 3 * a2 + 3 * a1; } function B(a1, a2) { return 3 * a2 - 6 * a1; } function C(a1) { return 3 * a1; }
    function calc(t, a1, a2) { return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t; }
    function slope(t, a1, a2) { return 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) { var s = slope(t, p1x, p2x); if (s < 1e-6) break; t -= (calc(t, p1x, p2x) - x) / s; }
      return calc(t, p1y, p2y);
    };
  }
  var pushEase = bezier(0.32, 0.72, 0, 1);
  var PUSH_T = 900;

  // 松手后的曲线：起步速度 = 手速（s 是起步斜率），到终点速度为 0。s ≥ 1.5 时一路只减速；手很慢（s 小）时先轻轻加速再停，最快也只有平均速度的 1.5 倍。
  // （iOS 那条曲线点击时用：它在前 17% 的时间里会加速到平均速度的 4 倍，接在手后面就像被推了一把）
  function releaseEase(s) { return function (u) { return s * (u - 2 * u * u + u * u * u) + 3 * u * u - 2 * u * u * u; }; }
  // v：松手时手的速度（每秒几个屏宽）。有 v 就从手速接着走：不停顿、不突然加速
  function tween(L, to, v) {
    if (reduce) { L.x = to; L.anim = false; return; }
    if (!L.anim && L.x === to) return;
    if (L.anim && L.to === to && v === undefined) return;   // 已经在往同一个目标走，不重启缓动
    var dist = to - L.x;
    L.from = L.x; L.to = to; L.t0 = performance.now();
    L.dur = Math.max(260, PUSH_T * Math.min(1, Math.abs(dist)));
    L.ease = pushEase;
    if (v !== undefined && Math.abs(dist) > 1e-4) {
      var k = v / dist;   // 照手速，每秒能走完剩下这段几次
      if (k > 0) L.dur = Math.max(300, Math.min(PUSH_T, 2000 / k));   // 起步斜率 2：一路减速着到；手太慢就最长 900ms
      L.ease = releaseEase(Math.max(-1, Math.min(3, k * L.dur / 1000)));   // 手往反方向甩：先顺着走一点点再回来
    }
    L.anim = true;
  }
  function titleOf(name) { var it = itemById(name); return it ? fullTitle(it) : (levels[name] && levels[name].el.dataset.title) || name; }
  function pathOf(name) { var p = [], n = name; while (n && levels[n]) { p.unshift(n); n = levels[n].parent; } return p; }
  // 没去过的地方不提示：这次会话去过的层记在 visited 里（刷新即忘）。“下一层”只记每层最后一次进的那个子层（lastChild），线、底栏、往深处滑、键盘都从这里取
  var visited = {}, lastChild = {};
  function markVisited(name) { var p = pathOf(name); p.forEach(function (n, i) { visited[n] = true; if (i) lastChild[p[i - 1]] = n; }); }
  function nextOf(name) { var c = lastChild[name]; return c && visited[c] ? c : null; }
  // 底栏画的路：当前路径，再沿着每层最后一次进的子层往后接
  function knownPath() { var p = pathOf(current), n; while ((n = nextOf(p[p.length - 1]))) p.push(n); return p; }
  // 把每一层送到它该在的位置：目标层 0，祖先 -1，其他 +1
  function settle(target, instant, v) {
    var path = pathOf(target);
    levelList.forEach(function (L) {
      var to = L.name === target ? 0 : path.indexOf(L.name) >= 0 ? -1 : 1;
      if (instant) { L.x = to; L.anim = false; } else tween(L, to, v);
    });
  }
  function setLevel(target, instant, v) {
    if (!levels[target]) target = 'home';
    if (target === current) { settle(target, instant, v); return; }
    current = target; markVisited(target);
    levelList.forEach(function (L) {
      if (L.name === target) { L.el.removeAttribute('inert'); L.el.setAttribute('aria-hidden', 'false'); }
      else { L.el.setAttribute('inert', ''); L.el.setAttribute('aria-hidden', 'true'); }
    });
    document.body.dataset.level = target;
    settle(target, instant, v);
    setLinesTarget(target === 'home' ? 0 : 1, instant);
    if (!trailD.fromTrail) stopLinger();   // 不是从底栏回的首页，底栏照常隐去
    updateNav();
  }
  function hashOf(name) { return name === 'home' ? location.pathname + location.search : '#' + name; }
  function nameFromHash() { var h = location.hash.replace('#', ''); return levels[h] ? h : 'home'; }
  function go(name, v) {
    if (name === 'about') { openAbout(true); return; }
    if (!levels[name] || name === current) return;
    history.pushState({ level: name, from: current }, '', hashOf(name));   // from：从哪层推进来的，往回时用
    setLevel(name, false, v);
  }
  function back(v) {
    if (current === 'home') return;
    var parent = levels[current].parent || 'home';
    // 只有这条记录是网站自己从上一层推进来的，才用浏览器后退；直达链接（如 #deskmate）进来的，后退会退出网站，所以原地换成上一层
    if (history.state && history.state.level === current && history.state.from === parent) { setLevel(parent, false, v); history.back(); }
    else { history.replaceState({ level: parent }, '', hashOf(parent)); setLevel(parent, false, v); }
  }
  function forward(v) { var n = nextOf(current); if (n) go(n, v); }
  // 点底部圆点：往回是弹
  function jump(name) {
    if (name === current) return;
    if (pathOf(current).indexOf(name) >= 0) { history.replaceState({ level: name }, '', hashOf(name)); setLevel(name); }
    else go(name);
  }
  window.addEventListener('popstate', function () {
    if (location.hash === '#about') { openAbout(false); return; }
    closeAbout(false);
    setLevel(nameFromHash());
  });

  // ---------- 底部圆点：只画走过的路。换层不重建 DOM：多出来的段收起、缺的段长出，标题淡出淡入，整串位置连续 ----------
  var trail = document.getElementById('trail'), trailDots = document.getElementById('trail-dots'), trailLabel = document.getElementById('trail-label');
  var trailLive = [], trailDying = [];   // 每段 { name, el, dot, line }：在路上的 / 正在收起的（收完就拿掉）
  var trailD = { v: 0, vel: 0, lastV: 0, anim: false, held: false, grab: 0, fromTrail: false, lingerTimer: null, dirty: false };
  var labelSwap = 0;
  function makeSeg(nm, first) {
    var el = document.createElement('span');
    el.className = 'trail-seg is-out' + (first ? ' is-first' : '');
    el.innerHTML = (first ? '' : '<i class="trail-line"></i>') + '<button class="trail-dot" type="button" data-jump="' + nm + '" aria-label="' + esc(titleOf(nm)) + '"><i></i></button>';
    return { name: nm, el: el, dot: el.querySelector('.trail-dot'), line: el.querySelector('.trail-line') };
  }
  function dropDying(it) { var k = trailDying.indexOf(it); if (k >= 0) trailDying.splice(k, 1); if (it.el.parentNode) it.el.parentNode.removeChild(it.el); }
  function updateNav() {
    var names = knownPath(), keep = 0;
    while (keep < trailLive.length && keep < names.length && trailLive[keep].name === names[keep]) keep++;
    // 多出来的段收起
    trailLive.splice(keep).forEach(function (it) {
      it.el.classList.add('is-out'); it.dot.classList.remove('is-current');
      trailDying.push(it); it.timer = setTimeout(function () { dropDying(it); }, 650);
    });
    // 缺的段补上：刚收起的同名段直接复活（宽度从当前值反向走回来），否则新建；都排在收起中的段前面
    for (var j = keep; j < names.length; j++) {
      var it = null;
      for (var k = 0; k < trailDying.length; k++) if (trailDying[k].name === names[j]) { it = trailDying.splice(k, 1)[0]; clearTimeout(it.timer); break; }
      if (!it) it = makeSeg(names[j], j === 0);
      var ref = trailDying.length ? trailDying[0].el : null;
      if (it.el.parentNode !== trailDots || it.el.nextSibling !== ref) { trailDots.insertBefore(it.el, ref); void it.el.offsetWidth; }   // 先以收起的状态进 DOM，再展开，才有过渡
      it.el.classList.remove('is-out');
      trailLive.push(it);
    }
    trailLive.forEach(function (it) { it.dot.classList.toggle('is-current', it.name === current); });
    setTrailLabel(titleOf(current));
  }
  // 标题淡出、换字、淡入；再叫一次就作废上一次没换完的
  function setTrailLabel(title) {
    var my = ++labelSwap;
    if (trailLabel.textContent === title) { trailLabel.classList.remove('is-swap'); return; }
    if (!trailLabel.textContent || reduce) { trailLabel.textContent = title; return; }
    trailLabel.classList.add('is-swap');
    setTimeout(function () { if (my !== labelSwap) return; trailLabel.textContent = title; trailLabel.classList.remove('is-swap'); }, 250);
  }
  // 拖底栏时先把目标点亮起来、标题换成目标
  function trailPreview(name) {
    if (trailLive.some(function (it) { return it.name === name; })) trailLive.forEach(function (it) { it.dot.classList.toggle('is-current', it.name === name); });
    setTrailLabel(titleOf(name));
  }
  // 底栏每帧：拖着时 v 跟手，松手后弹簧回 0。领头的点跟得紧、拖尾的点慢半拍，线按两端的差拉长、拉细
  function trailTick(dt) {
    var d = trailD, hs = dt / 1000;
    if (d.held) { var inst = (d.v - d.lastV) / hs; d.vel = Math.max(-120, Math.min(120, d.vel * 0.5 + inst * 0.5)); }   // 记着一点手速，松手时带着走
    else if (d.anim) {
      var steps = Math.min(8, Math.ceil(dt / 6)), h = hs / steps;
      for (var i = 0; i < steps; i++) { d.vel += (-196 * d.v - 17.4 * d.vel) * h; d.v += d.vel * h; }   // ω=14 ζ=0.62：回去时稍微过一点
      if (Math.abs(d.v) < 0.05 && Math.abs(d.vel) < 2) { d.v = 0; d.vel = 0; d.anim = false; }
    }
    d.lastV = d.v;
    var v = d.v;
    if (v === 0 && !d.dirty) return;
    d.dirty = v !== 0;
    var items = trailLive.concat(trailDying), n = items.length, sgn = v < 0 ? -1 : 1;
    function wAt(i) { var k = n > 1 ? (sgn > 0 ? i / (n - 1) : (n - 1 - i) / (n - 1)) : 1; return 0.75 + 0.25 * k; }   // 朝着拖的方向那头 1，另一头 0.75：只差一点点，线最多拉长两成
    items.forEach(function (it, i) {
      var wi = wAt(i);
      it.dot.style.transform = v ? 'translate3d(' + (v * wi).toFixed(2) + 'px,0,0)' : '';
      if (it.line) {
        var wp = wAt(i - 1), st = 1 + v * (wi - wp) / 20;   // 线原长 20px，两端位移之差就是拉长的量
        it.line.style.transform = v ? 'translate3d(' + (v * wp).toFixed(2) + 'px,0,0) scale(' + st.toFixed(3) + ',' + (1 / Math.sqrt(st)).toFixed(3) + ')' : '';
      }
    });
    trailLabel.style.transform = v ? 'translate3d(' + (v * 0.87).toFixed(2) + 'px,0,0)' : '';
  }

  // 右上角的预览按钮平时藏着：网址带 ?preview 或 ?state= 才显示
  if (params.has('preview') || params.has('state')) document.body.classList.add('preview');
  applyState(previewState(params.get('state')));
  document.getElementById('statebar').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-state]');
    if (b) applyState(previewState(b.getAttribute('data-state')));
  });
  setLevel(nameFromHash(), true);

  // ---------- 点击：按下松手就是点击；只有真的滑动翻了层，才吞掉随后的那一次点击 ----------
  var suppressClick = false;
  document.addEventListener('click', function (e) {
    if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    if (about.target === 1) {   // 关于开着或正在开：只认落款翻面和空白处收回
      if (e.target.closest('#credit')) { flipCredit(); return; }
      if (e.target.closest('[data-about-close]')) closeAbout(true);
      if (e.target.closest('[data-go], [data-jump], [data-back]')) e.preventDefault();
      return;
    }
    var g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); go(g.getAttribute('data-go')); return; }
    var j = e.target.closest('[data-jump]');
    if (j) { viaTrail(function () { jump(j.getAttribute('data-jump')); }); return; }
    var bk = e.target.closest('[data-back]');
    if (bk) { e.preventDefault(); back(); }
  }, true);
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  // Safari 的双击放大：CSS 的 touch-action 它只认 manipulation / none，这里再兜一层：两次抬手间隔不到 300ms 就拦掉第二次的默认行为
  (function () {
    var last = 0;
    document.addEventListener('touchend', function (e) {
      var now = performance.now();
      if (now - last < 300) e.preventDefault();
      last = now;
    }, { passive: false });
  })();
  document.addEventListener('keydown', function (e) {
    if (about.target === 1) { if (e.key === 'Escape') closeAbout(true); return; }
    if (e.key === 'Escape' || e.key === 'ArrowLeft') back();
    else if (e.key === 'ArrowRight') forward();
  });

  // ---------- 滑动：触控板、手指、鼠标按住，三种输入共用一条路；可点的东西上也能滑 ----------
  var drag = null;
  function dragBegin(kind) {
    var par = levels[current].parent, nxt = nextOf(current), cx = levels[current].x, now = performance.now();   // 从这一层现在的位置接着拖：正在动的时候抓住也不跳
    drag = { kind: kind, base: cx, p: cx, cur: levels[current], par: par ? levels[par] : null, nxt: nxt ? levels[nxt] : null, hist: [[now, cx]] };
    [drag.cur, drag.par, drag.nxt].forEach(function (L) { if (L) L.anim = false; });
    stage.classList.add('is-dragging');
  }
  function dragUpdate(p) {
    if (!drag) return;
    p += drag.base;
    if (p > 0 && !drag.par) p *= 0.25;
    if (p < 0 && !drag.nxt) p *= 0.25;
    p = Math.max(-1, Math.min(1, p));
    var now = performance.now(), h = drag.hist;
    h.push([now, p]); while (h.length > 2 && now - h[0][0] > 120) h.shift();   // 只留最近 120ms，算松手速度用
    drag.p = p;
    drag.cur.x = p;
    if (drag.par) drag.par.x = -1 + Math.max(0, p);
    if (drag.nxt) drag.nxt.x = 1 + Math.min(0, p);
  }
  // 松手时的速度（每秒几个屏宽，正 = 往回）：最近 60ms 走了多远。at 之前 80ms 都没动（手停住了再松开）就是 0
  function dragVelocity(d, at) {
    var h = d.hist, last = h[h.length - 1], i = h.length - 1;
    if (at - last[0] > 80) return 0;
    while (i > 0 && last[0] - h[i - 1][0] <= 60) i--;
    if (i === h.length - 1 && i > 0) i--;
    var span = (last[0] - h[i][0]) / 1000;
    return span > 0.004 ? Math.max(-6, Math.min(6, (last[1] - h[i][1]) / span)) : 0;
  }
  // 返回 true 表示这次滑动翻了层。at：按哪个时刻算速度（触控板停了一会儿才判定时，按最后一个信号算）
  function dragEnd(at) {
    if (!drag) return false;
    var d = drag; drag = null;
    stage.classList.remove('is-dragging');
    var v = dragVelocity(d, at || performance.now());
    // 抓住正在动的层、几乎没动就松开：不改去向，从这里接着走完
    if (Math.abs(d.p - d.base) < 0.02 && Math.abs(v) < 0.3) { settle(current, false, v); return false; }
    // 这一下滑了多远，再照这个速度多滑 0.2 秒：过了 30% 就翻一层。慢慢拖过 30%、或者快速一甩都行。
    // 从抓住的地方算，不看层的绝对位置：翻层动画还没走完就接着滑，层可能还在半路上，连滑两下就是翻两层
    var proj = d.p - d.base + v * 0.2;
    if (proj > 0.3 && d.par) { back(v); return true; }
    if (proj < -0.3 && d.nxt) { forward(v); return true; }
    settle(current, false, v);
    return false;
  }

  // 手指 / 鼠标：从任何地方按下都能拖，包括球和胶囊上
  (function () {
    var pt = null;
    stage.addEventListener('pointerdown', function (e) {
      if (about.target === 1 || e.button !== 0) return;
      pt = { id: e.pointerId, x0: e.clientX, y0: e.clientY, axis: null, type: e.pointerType };
    });
    window.addEventListener('pointermove', function (e) {
      if (!pt || e.pointerId !== pt.id) return;
      var dx = e.clientX - pt.x0, dy = e.clientY - pt.y0;
      if (!pt.axis) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; pt.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; if (pt.axis === 'x') dragBegin(pt.type); }
      if (pt.axis !== 'x') return;
      dragUpdate(dx / W);
    });
    function up(e) {
      if (!pt || e.pointerId !== pt.id) return;
      var wasDrag = pt.axis === 'x'; pt = null;
      if (!wasDrag) return;
      var navigated = dragEnd();
      if (navigated) { suppressClick = true; setTimeout(function () { suppressClick = false; }, 0); }
    }
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  })();

  // 触控板两指：手指在动就跟手。手一离开，系统会接着发一串一帧比一帧小的信号（惯性）：认出这串信号就当手已经离开，
  // 马上按位置和速度判定，剩下的惯性只吞掉、不推页面；惯性里信号又变大或反向，就是手又放上来了，接着拖。
  // 方向在起手的 12px 里锁定：横的才拖层，竖的不管。翻层动画进行中也能接着拖（从层现在的位置接着走），没有冷却
  (function () {
    var LOCK = 12, GAP = 120;
    var mode = 'idle', sx = 0, sy = 0, acc = 0, peak = 0, prevD = 0, prevT = 0, dec = 0, decT = 0, lastT = 0, timer = null;
    function release(at) { clearTimeout(timer); if (drag && drag.kind === 'wheel') dragEnd(at); }
    window.addEventListener('wheel', function (e) {
      if (about.target === 1 || e.ctrlKey) return;   // 按着 ctrl / 双指捏合是缩放，不管
      var k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? W : 1;
      var dx = e.deltaX * k, dy = e.deltaY * k, ax = Math.abs(dx), now = performance.now();
      if (mode === 'drag' && !(drag && drag.kind === 'wheel')) mode = 'idle';
      if (mode !== 'idle' && now - lastT > GAP) mode = 'idle';   // 停了一会儿：上一个手势已经结束
      if (mode === 'tail') {
        var fresh = (ax > Math.abs(prevD) * 1.3 + 0.5 && ax >= 3) || (dx * prevD < 0 && ax >= 2) || Math.abs(dy) > ax * 1.5 + 2;
        if (!fresh) { e.preventDefault(); prevD = dx; lastT = now; return; }
        mode = 'idle';
      }
      if (mode === 'vertical') { lastT = now; return; }
      if (mode === 'idle') {
        if (drag) return;   // 手指 / 鼠标正在拖
        mode = 'pre'; sx = 0; sy = 0;
      }
      lastT = now;
      if (mode === 'pre') {
        sx += dx; sy += dy;
        if (Math.abs(sx) >= Math.abs(sy)) e.preventDefault();
        if (Math.abs(sx) + Math.abs(sy) < LOCK) return;
        if (Math.abs(sx) <= Math.abs(sy)) { mode = 'vertical'; return; }
        mode = 'drag'; acc = 0; peak = ax; prevD = dx; prevT = now; dec = 0;
        dragBegin('wheel');   // 从这里开始跟；防误触的那 12px 不补上，所以起步不会一下跳过去
      } else {
        e.preventDefault();
        acc += dx;
        dragUpdate(-acc / W);
        // 惯性：同一方向一帧比一帧小，每帧缩到上一帧的 80%–99.5%（人手停下来通常比这陡、而且不匀）；相等的不算也不打断。
        // 连着 3 次、跨过 24ms、并且已经比最快时慢了一截，就当手离开了
        var r = Math.abs(prevD) > 0.01 ? ax / Math.abs(prevD) : 1;
        if (dx * prevD > 0 && r < 0.995 && r >= 0.8) { if (!dec) decT = prevT; dec++; }
        else if (dx * prevD <= 0 || r < 0.8 || r > 1.005) dec = 0;
        peak = Math.max(peak, ax);
        prevD = dx; prevT = now;
        if (dec >= 3 && now - decT >= 24 && ax < peak * 0.85) { mode = 'tail'; release(now); return; }
      }
      clearTimeout(timer);
      timer = setTimeout(function () { if (mode === 'drag') { mode = 'idle'; release(lastT); } else if (mode === 'pre') mode = 'idle'; }, GAP);
    }, { passive: false });
    function abort() { clearTimeout(timer); if (mode === 'drag') release(performance.now()); mode = 'idle'; }
    window.addEventListener('blur', abort);
    document.addEventListener('visibilitychange', function () { if (document.hidden) abort(); });
  })();

  // ---------- 底栏：按住左右拖是定位，像拖滚动条。拖的时候页面不动，只有底栏跟手、线被拉长，目标点先亮、标题先换；松手才真的切层。从底栏回到首页，底栏留两秒再隐去 ----------
  var TRAIL_STEP = 48;   // 手指每走 48px 算一格：往左一格回上一层，再一格回首页；往右一格去去过的下一层
  function startLinger() { clearTimeout(trailD.lingerTimer); trail.classList.add('is-lingering'); trailD.lingerTimer = setTimeout(function () { trail.classList.remove('is-lingering'); }, 2000); }
  function stopLinger() { clearTimeout(trailD.lingerTimer); trail.classList.remove('is-lingering'); }
  function viaTrail(fn) { trailD.fromTrail = true; var r = fn(); trailD.fromTrail = false; if (current === 'home') startLinger(); else stopLinger(); return r; }
  (function () {
    var pt = null;
    trail.addEventListener('pointerdown', function (e) {
      if (about.target === 1 || e.button !== 0 || pt) return;
      pt = { id: e.pointerId, x0: e.clientX, moved: false, steps: 0, target: current };
      try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
      clearTimeout(trailD.lingerTimer); trail.classList.add('is-lingering');   // 按着的时候不隐去
      trailD.anim = false; trailD.held = true; trailD.grab = trailD.v;   // 正在弹回也能抓住，从当前位置接着拖
      trail.classList.add('is-held');
    });
    window.addEventListener('pointermove', function (e) {
      if (!pt || e.pointerId !== pt.id) return;
      var dx = e.clientX - pt.x0;
      if (!pt.moved) { if (Math.abs(dx) < 4) return; pt.moved = true; }
      trailD.v = reduce ? 0 : trailD.grab + 16 * Math.tanh(dx / 48);   // 底栏自己朝手指方向轻轻走一点，最多 16px
      // 定位：点从左到右越来越深，往右是往深处走、往左是往回走，只能走到去过的层；选上一格后要退 12px 才掉下来，不在临界点上抖
      var mag = Math.abs(dx), sgn = dx < 0 ? -1 : 1, bonus = pt.steps !== 0 && (pt.steps < 0) === (dx < 0) ? 12 : 0;
      var known = knownPath(), ci = known.indexOf(current), steps = sgn * Math.floor((mag + bonus) / TRAIL_STEP);
      steps = Math.max(-ci, Math.min(known.length - 1 - ci, steps));
      if (steps !== pt.steps) { pt.steps = steps; pt.target = known[ci + steps]; trailPreview(pt.target); }
    });
    function up(e) {
      if (!pt || e.pointerId !== pt.id) return;
      var moved = pt.moved, target = pt.target; pt = null;
      trailD.held = false; trailD.anim = true; trail.classList.remove('is-held');
      if (!moved) { if (current === 'home') startLinger(); return; }   // 没动过：随后的 click 会处理（点圆点跳层）
      if (target === current) { trailPreview(current); if (current === 'home') startLinger(); else stopLinger(); return; }   // 没拖够一格：点和标题复原，页面没动过
      viaTrail(function () { jump(target); });   // 松手才切层，直接跳到选中的那层
      suppressClick = true; setTimeout(function () { suppressClick = false; }, 0);
    }
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  })();

  // 动图到了也量一次（高度是写死的，正常不会动；保险）
  [].forEach.call(document.querySelectorAll('img[data-pet]'), function (im) { im.addEventListener('load', function () { needMeasure = true; }); });
  // 层内滚动、窗口变化、字体加载：重新量位置
  levelList.forEach(function (L) { L.el.addEventListener('scroll', function () { needMeasure = true; }, { passive: true }); });
  window.addEventListener('resize', function () { W = stage.clientWidth || window.innerWidth; H = window.innerHeight; needMeasure = true; about.needMeasure = true; fitFade(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { needMeasure = true; about.needMeasure = true; });

  // ---------- 背景光点 ----------
  var bg = document.getElementById('bg');
  (function () {
    var n = window.innerWidth < 600 ? 28 : window.innerWidth <= 1024 ? 40 : 52;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i');
      s.style.cssText = '--x:' + rnd(2, 98).toFixed(1) + '%;--y:' + rnd(2, 98).toFixed(1) + '%;--s:' + rnd(2.5, 6.5).toFixed(1) + 'px;--o:' + rnd(0.35, 0.9).toFixed(2) +
        ';--d:' + rnd(25, 60).toFixed(0) + 's;--delay:-' + rnd(0, 60).toFixed(0) + 's;--dx:' + rnd(-80, 80).toFixed(0) + 'px;--dy:' + rnd(-80, 80).toFixed(0) + 'px';
      frag.appendChild(s);
    }
    bg.appendChild(frag);
  })();
  var mouse = { x: 0, y: 0, tx: 0, ty: 0, has: false };
  window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; mouse.has = true; } }, { passive: true });

  // ---------- 漂浮：几个慢周期叠加 ----------
  var floats = [].slice.call(document.querySelectorAll('.float'));
  floats.forEach(function (f) {
    f._p = { a: [14, 7, 3], px: [rnd(10000, 16000), rnd(6000, 9000), rnd(3000, 5000)], py: [rnd(11000, 17000), rnd(6500, 9500), rnd(3200, 5200)], ph: [rnd(0, TAU), rnd(0, TAU), rnd(0, TAU)] };
    f._o = { x: 0, y: 0 };
  });
  function floatOffset(f, t) {
    var p = f._p, x = 0, y = 0;
    for (var i = 0; i < 3; i++) { x += Math.sin(t * TAU / p.px[i] + p.ph[i]) * p.a[i]; y += Math.cos(t * TAU / p.py[i] + p.ph[i] * 1.37) * p.a[i]; }
    return { x: x, y: y };
  }

  // ---------- 节点与连线：端点和气泡用同一组数字 ----------
  // 线靠屏幕左右边缘的一截淡出：渐变直接用在线条和端点上（以前用遮罩，遮罩每帧都要把一大块重画一遍）
  var svg = document.getElementById('lines'), linesG = document.getElementById('lines-g'), grad = document.getElementById('lineFade');
  function fitFade() { grad.setAttribute('x2', window.innerWidth); var k = Math.min(0.45, 180 / window.innerWidth); var st = grad.querySelectorAll('stop'); st[1].setAttribute('offset', k); st[2].setAttribute('offset', 1 - k); }
  fitFade();
  var nodes = [].slice.call(document.querySelectorAll('[data-node]')).map(function (el) {
    var lv = el.closest('.level');
    return { el: el, name: el.dataset.node, shape: el.dataset.shape || 'rect', level: lv ? levels[lv.dataset.level] : null, about: !lv, f: el.closest('.float'), burst: el.closest('.burst'), base: null };
  });
  var nodeByName = {}; nodes.forEach(function (n) { nodeByName[n.name] = n; });
  // 基准位置 = 量到的位置 − 当下的层位移 − 当下的漂浮偏移。只在布局可能变化时量，且只在背后没被缩放时量。
  function scaleOf(n) { return n.f && n.f._d ? n.f._d.s : 1; }
  function measureAll() {
    nodes.forEach(function (n) {
      if (n.about) return;
      var r = n.el.getBoundingClientRect(), o = n.f ? n.f._o : { x: 0, y: 0 }, s = scaleOf(n);
      var w = r.width / s, h = r.height / s;   // 首页的球可能正呼吸着（缩放），除回去
      n.base = { l: r.left - n.level.x * W - o.x - (w - r.width) / 2, t: r.top - n.level.y - o.y - (h - r.height) / 2, w: w, h: h };
    });
  }
  function rectNow(n) {
    var o = n.f ? n.f._o : { x: 0, y: 0 }, s = scaleOf(n), w = n.base.w * s, h = n.base.h * s;   // 缩放以球心为中心
    return { l: n.base.l + n.level.x * W + o.x + (n.base.w - w) / 2, t: n.base.t + n.level.y + o.y + (n.base.h - h) / 2, w: w, h: h };
  }
  function center(r) { return { x: r.l + r.w / 2, y: r.t + r.h / 2 }; }
  function edge(r, shape, to) {
    var c = center(r), dx = to.x - c.x, dy = to.y - c.y, len = Math.hypot(dx, dy) || 1, k;
    if (shape === 'circle') k = Math.min(r.w, r.h) / 2 / len;
    else k = Math.min(r.w / 2 / (Math.abs(dx) || 1e-6), r.h / 2 / (Math.abs(dy) || 1e-6));
    k = Math.min(k, 1);
    return { x: c.x + dx * k, y: c.y + dy * k };
  }
  // 每层的连线：父节点 → 本层每个节点；节点标了 data-link-from 就改从那个节点连过来。首页没有父节点，自然没有线。
  var linkDefs = [];
  levelList.forEach(function (L) {
    var sel = L.el.dataset.parentNode; if (!L.parent || !sel) return;
    var pn = document.querySelector(sel); if (!pn) return;
    var parentNode = nodeByName[pn.dataset.node];
    nodes.forEach(function (n) {
      if (n.level !== L) return;
      var from = n.el.dataset.linkFrom ? nodeByName[n.el.dataset.linkFrom] : parentNode;
      if (from) linkDefs.push({ level: L, a: from, b: n, path: null, dot: null });
    });
  });
  linkDefs.forEach(function (d) {
    d.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    d.dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); d.dot.setAttribute('r', '2.5');
    linesG.appendChild(d.path); linesG.appendChild(d.dot);
  });
  function drawLink(d, ra, rb) {
    var a = edge(ra, d.a.shape, center(rb)), b = edge(rb, d.b.shape, center(ra));
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len; if (ny < 0) { nx = -nx; ny = -ny; }
    var sag = Math.min(36, len * 0.07);
    d.path.setAttribute('d', 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' Q' + ((a.x + b.x) / 2 + nx * sag).toFixed(1) + ' ' + ((a.y + b.y) / 2 + ny * sag).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1));
    d.dot.setAttribute('cx', b.x.toFixed(1)); d.dot.setAttribute('cy', b.y.toFixed(1));
  }

  // ---------- 返回箭头：三个向左的箭头，贴着该层第一个节点的左边，从靠球的那个开始依次点亮 ----------
  var chevrons = [];
  levelList.forEach(function (L) {
    var el = L.el.querySelector('.back-chevrons'); if (!el) return;
    var node = null; for (var i = 0; i < nodes.length; i++) if (nodes[i].level === L) { node = nodes[i]; break; }
    if (!node) return;
    chevrons.push({ level: L, node: node, el: el, items: [].slice.call(el.querySelectorAll('svg')) });
  });
  var CHEV_T = 2400;
  function chevronTick(t) {
    chevrons.forEach(function (c) {
      if (!c.node.base || Math.abs(c.level.x) >= 1) return;
      var r = rectNow(c.node), lx = c.level.x * W, cx, cy;
      // 放哪按节点的静止位置定（层停在正中时的左边缘），不看此刻滑到哪：推层中途不换位，漂浮也不会让它来回切
      if (c.node.base.l >= 84) { cx = r.l - 46; cy = r.t + r.h / 2; }   // 球左边、来路的线上
      else { cx = r.l + 30; cy = r.t - 26; }                             // 窄屏放不下：卡片左上角上方
      var drift = reduce ? 0 : 6 * (0.5 - 0.5 * Math.cos((t % CHEV_T) / CHEV_T * TAU));
      c.el.style.transform = 'translate3d(' + (cx - lx - drift).toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-50%)';
      c.items.forEach(function (it, i) {
        var k = 2 - i, op;   // 最右边（靠球）的先亮
        if (reduce) op = [0.3, 0.55, 0.85][i];
        else {
          var local = ((((t - k * 300) % CHEV_T) + CHEV_T) % CHEV_T) / CHEV_T;
          var v = local < 0.2 ? easeInOut(local / 0.2) : local < 0.55 ? 1 - easeInOut((local - 0.2) / 0.35) : 0;
          op = 0.22 + 0.78 * v;
        }
        it.style.opacity = op.toFixed(2);
      });
    });
  }

  // ---------- 关于：一个 0→1 的进度值驱动全部，随时可打断 ----------
  var aboutPage = document.getElementById('about-page'), aboutVeil = aboutPage.querySelector('.about-veil'), sparksEl = document.getElementById('sparks');
  var aboutNodes = nodes.filter(function (n) { return n.about; });
  var about = { target: 0, p: 0, from: 0, to: 0, t0: 0, dur: 0, anim: false, shown: false, pendingBurst: false, needMeasure: false, lp: 0, veilV: 0, blurV: 0, lastT: 0 };
  var OPEN_T = 1300, CLOSE_T = 700;
  function aboutMeasure() {
    aboutNodes.forEach(function (n) {
      var r = n.el.getBoundingClientRect(), o = n.f ? n.f._o : { x: 0, y: 0 }, bo = n.burst && n.burst._o ? n.burst._o : { x: 0, y: 0 }, s = scaleOf(n);
      var w = r.width / s, h = r.height / s;   // 量的时候球可能正缩着，除回去
      n.base = { l: r.left - o.x - bo.x - (w - r.width) / 2, t: r.top - o.y - bo.y - (h - r.height) / 2, w: w, h: h };
    });
  }
  function rectAbout(n) {
    var o = n.f ? n.f._o : { x: 0, y: 0 }, bo = n.burst && n.burst._o ? n.burst._o : { x: 0, y: 0 }, s = scaleOf(n);
    var w = n.base.w * s, h = n.base.h * s;   // 缩放以球心为中心，线的端点落在缩放后的边上
    return { l: n.base.l + o.x + bo.x + (n.base.w - w) / 2, t: n.base.t + o.y + bo.y + (n.base.h - h) / 2, w: w, h: h };
  }
  function makeSparks() {
    sparksEl.innerHTML = '';
    if (reduce) return;
    var n = window.innerWidth < 600 ? 18 : 28, frag = document.createDocumentFragment();
    var maxD = Math.min(window.innerWidth, window.innerHeight) * 0.48;
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * TAU, dist = maxD * (0.35 + Math.random() * 0.65);
      var el = document.createElement('i');
      el.style.cssText = '--s:' + (3 + Math.random() * 4).toFixed(1) + 'px;--dx:' + (Math.cos(ang) * dist).toFixed(0) + 'px;--dy:' + (Math.sin(ang) * dist).toFixed(0) + 'px;--delay:' + (Math.random() * 90).toFixed(0) + 'ms';
      frag.appendChild(el);
    }
    sparksEl.appendChild(frag);
  }
  function startAboutTween() {
    about.from = about.p; about.to = about.target; about.t0 = performance.now();
    about.dur = reduce ? 1 : Math.max(160, (about.target ? OPEN_T : CLOSE_T) * Math.abs(about.to - about.from));
    about.anim = true;
  }
  function openAbout(push) {
    if (about.target === 1) return;
    if (push && !(history.state && history.state.about)) history.pushState({ about: true, level: current }, '', '#about');
    about.target = 1;
    stage.setAttribute('inert', '');
    aboutVeil.style.pointerEvents = '';
    aboutPage.classList.remove('is-settled');
    if (!about.shown) {   // 从完全关闭开始：显示出来、量位置、放烟花、落款复位
      about.shown = true; about.p = 0; about.veilV = 0; about.blurV = 0; about.lastT = 0;
      aboutPage.classList.add('is-open'); aboutPage.setAttribute('aria-hidden', 'false');
      document.body.classList.add('about-open');
      aboutNodes.forEach(function (n) { if (n.burst) { n.burst.style.transform = ''; n.burst.style.opacity = '0'; n.burst._o = { x: 0, y: 0 }; } });
      resetCredit(); resetBalls();
      makeSparks();
      about.pendingBurst = true;
    }
    startAboutTween();
  }
  function closeAbout(push) {
    if (about.target === 0) return;
    if (push) {
      if (history.state && history.state.about) history.back();
      else history.replaceState({ level: current }, '', hashOf(current));
    }
    about.target = 0;
    releaseBall(false);   // 正拖着球就放手，球自己弹回原位
    stage.removeAttribute('inert');
    aboutVeil.style.pointerEvents = 'none';
    aboutPage.classList.remove('is-settled');
    startAboutTween();
  }
  function aboutTick(t) {
    if (!about.shown) return;
    if (about.pendingBurst) {   // display 已生效，先量再放烟花
      about.pendingBurst = false;
      aboutMeasure(); measureCredit();
      aboutPage.classList.remove('is-bursting'); void aboutPage.offsetWidth; aboutPage.classList.add('is-bursting');
      about.t0 = t;
    }
    if (about.anim) {
      var k = clamp01((t - about.t0) / about.dur);
      var e = about.target ? k : easeInOut(k);   // 开：匀速（每个球自己有曲线）；关：缓入缓出一起收回
      about.p = about.from + (about.to - about.from) * e;
      if (k >= 1) { about.p = about.to; about.anim = false; }
    }
    var el = about.p * OPEN_T, cx = W / 2, cy = H / 2;
    aboutNodes.forEach(function (n, i) {
      var delay = n.el.dataset.burstDelay ? +n.el.dataset.burstDelay : i * 70;
      var pi = clamp01((el - delay) / 700), e2 = reduce ? pi : easeOutBack(pi);
      var c = center(n.base), ox = (cx - c.x) * (1 - e2), oy = (cy - c.y) * (1 - e2), sc = reduce ? 1 : 0.2 + 0.8 * e2;
      n.burst._o = { x: ox, y: oy };
      n.burst.style.transform = pi >= 1 ? '' : 'translate3d(' + ox.toFixed(2) + 'px,' + oy.toFixed(2) + 'px,0) scale(' + sc.toFixed(3) + ')';
      n.burst.style.opacity = clamp01(pi * 2.5).toFixed(2);
    });
    // 遮罩、模糊、背后缩放：开的时候先到位，关的时候跟着进度一起退；限速跟随，中途反向也不跳
    var vt = about.target ? clamp01(el / 450) : smooth(about.p);
    var bt = about.target ? clamp01(el / 600) : smooth(about.p);
    var dt = about.lastT ? Math.min(50, t - about.lastT) : 16; about.lastT = t;
    var step = dt / 220;
    about.veilV += Math.max(-step, Math.min(step, vt - about.veilV));
    about.blurV += Math.max(-step, Math.min(step, bt - about.blurV));
    aboutVeil.style.opacity = about.veilV.toFixed(3);
    var bf = 'blur(' + (16 * about.blurV).toFixed(1) + 'px) saturate(120%)';
    aboutVeil.style.webkitBackdropFilter = bf; aboutVeil.style.backdropFilter = bf;
    var sc2 = 1 - 0.03 * about.blurV;
    stage.style.transform = sc2 > 0.9995 ? '' : 'scale(' + sc2.toFixed(4) + ')';
    about.lp = clamp01((el - 760) / 500);
    if (!about.anim && about.p >= 1) {
      aboutPage.classList.add('is-settled');
      if (about.needMeasure) { about.needMeasure = false; aboutMeasure(); measureCredit(); }
    }
    if (!about.anim && about.p <= 0 && about.target === 0 && about.veilV <= 0.002) {
      about.shown = false; resetBalls();
      aboutPage.classList.remove('is-open', 'is-bursting'); aboutPage.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('about-open');
      stage.style.transform = '';
    }
  }
  // 关于的线：三个球之间，随进度画出 / 收回
  var linesAbout = document.getElementById('lines-about');
  var aboutLinks = [];
  nodes.forEach(function (n) {
    if (!n.about || !n.el.dataset.linkFrom) return;
    var from = nodeByName[n.el.dataset.linkFrom];
    if (from) aboutLinks.push({ a: from, b: n });
  });
  aboutLinks.forEach(function (d) {
    d.path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); d.path.setAttribute('pathLength', '1');
    d.dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); d.dot.setAttribute('r', '2.5');
    linesAbout.appendChild(d.path); linesAbout.appendChild(d.dot);
  });

  // 落款胶囊：两层文字交叉淡入淡出，尺寸从量好的旧尺寸过渡到新尺寸；每次重开都回到第一句
  var creditBtn = document.getElementById('credit'), layerA = document.getElementById('credit-a'), layerB = document.getElementById('credit-b');
  // 每个名字整个不拆（手机上折行只在 · 处折，不会把「Claude Opus」和「5.5」拆到两行）
  layerB.innerHTML = '开发伙伴：' + (site.credits || []).map(function (c) { return '<span class="credit-name">' + esc(c) + '</span>'; }).join(' · ');
  var creditState = 'a', creditSize = null;
  // 折成几行时，把这一层的宽度收到最长那一行：胶囊贴着字，不会左右空一截
  function fitLines(el) {
    el.style.width = '';
    var r = document.createRange(); r.selectNodeContents(el);
    var rects = [].slice.call(r.getClientRects()).sort(function (a, b) { return a.top - b.top; }), lines = [];
    rects.forEach(function (q) {
      var y = (q.top + q.bottom) / 2, L = lines[lines.length - 1];
      if (L && Math.abs(L.y - y) < 4) { L.l = Math.min(L.l, q.left); L.r = Math.max(L.r, q.right); }
      else lines.push({ y: y, l: q.left, r: q.right });
    });
    if (lines.length > 1) el.style.width = Math.ceil(Math.max.apply(null, lines.map(function (L) { return L.r - L.l; }))) + 1 + 'px';
  }
  function measureCredit() {
    creditBtn.style.transition = 'none'; creditBtn.style.width = ''; creditBtn.style.height = '';
    fitLines(layerA); fitLines(layerB);
    var cs = getComputedStyle(creditBtn);
    var px = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    var py = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    var ra = layerA.getBoundingClientRect(), rb = layerB.getBoundingClientRect();
    creditSize = { a: [ra.width + px, ra.height + py], b: [rb.width + px, rb.height + py] };
    applyCreditSize(false);
  }
  function applyCreditSize(animate) {
    if (!creditSize) return;
    var s = creditSize[creditState];
    if (!animate) creditBtn.style.transition = 'none';
    creditBtn.style.width = s[0].toFixed(1) + 'px'; creditBtn.style.height = s[1].toFixed(1) + 'px';
    if (!animate) { void creditBtn.offsetWidth; creditBtn.style.transition = ''; }
    layerA.classList.toggle('is-on', creditState === 'a'); layerB.classList.toggle('is-on', creditState === 'b');
    layerA.setAttribute('aria-hidden', creditState !== 'a'); layerB.setAttribute('aria-hidden', creditState !== 'b');
  }
  function flipCredit() { creditState = creditState === 'a' ? 'b' : 'a'; applyCreditSize(true); }
  function resetCredit() { creditState = 'a'; layerA.classList.add('is-on'); layerB.classList.remove('is-on'); if (creditSize) applyCreditSize(false); }

  // ---------- 球的弹簧：关于的三个球能点（缩一下再弹回来）、能拖（有限位，松手弹回原位）；首页的球能点（缩一下）并用它呼吸。位移和缩放都是弹簧，每帧算，线用同一组数字所以始终贴着。只整体缩放，球永远正圆（作者试过压扁拉长，手机上卡且怪，撤回了） ----------
  var ballPt = null, ballFloats = [];
  function freshSpring() { return { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, s: 1, vs: 0, ts: 1, hold: false }; }
  function resetBalls() { ballFloats.forEach(function (f) { f._d = freshSpring(); }); }
  aboutNodes.forEach(function (n) { if (n.f && n.el.classList.contains('bubble-about')) { n.f._d = freshSpring(); ballFloats.push(n.f); } });
  function spring(d, k, vk, target, w, z, h) { d[vk] += (-w * w * (d[k] - target) - 2 * z * w * d[vk]) * h; d[k] += d[vk] * h; }
  function ballStep(d, dt) {
    if (reduce) { d.x = d.tx; d.y = d.ty; d.s = d.ts; d.vx = d.vy = d.vs = 0; return; }
    var steps = Math.min(8, Math.ceil(dt / 6)), h = dt / steps / 1000;   // 小步积分，帧再长也不会抖
    var w = d.hold ? 30 : 10, z = d.hold ? 0.85 : 0.55;   // 拖着：硬弹簧紧跟手；松手：软一点，回去时略过冲
    for (var i = 0; i < steps; i++) {
      spring(d, 'x', 'vx', d.tx, w, z, h);
      spring(d, 'y', 'vy', d.ty, w, z, h);
      spring(d, 's', 'vs', d.ts, 22, 0.32, h);   // 整体缩放：阻尼小，弹几下
    }
    if (!d.hold && Math.abs(d.x) < 0.02 && Math.abs(d.y) < 0.02 && Math.abs(d.vx) < 0.3 && Math.abs(d.vy) < 0.3) { d.x = d.y = 0; d.vx = d.vy = 0; }
    if (Math.abs(d.s - d.ts) < 0.0004 && Math.abs(d.vs) < 0.004) { d.s = d.ts; d.vs = 0; }
  }
  function ballTransform(d) { return d.s === 1 ? '' : ' scale(' + d.s.toFixed(4) + ')'; }
  function releaseBall(tap) {
    if (!ballPt) return;
    var d = ballPt.n.f._d;
    ballPt.n.el.classList.remove('is-held');
    d.hold = false; d.tx = 0; d.ty = 0; d.ts = 1;
    if (tap) d.vs -= 1.6;   // 点一下：再往下按一点，弹回来就是 duang
    ballPt = null;
  }
  aboutNodes.forEach(function (n) {
    if (!n.f || !n.f._d) return;
    n.el.addEventListener('pointerdown', function (e) {
      if (about.target !== 1 || e.button !== 0 || ballPt) return;
      var d = n.f._d;
      ballPt = { id: e.pointerId, n: n, x0: e.clientX, y0: e.clientY, gx: d.x, gy: d.y, moved: false };   // 从它现在的位置接着拖，正在弹也不跳
      try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
      d.hold = true; d.ts = 0.96;   // 按下去：先缩一点
      n.el.classList.add('is-held');
    });
  });
  window.addEventListener('pointermove', function (e) {
    if (!ballPt || e.pointerId !== ballPt.id) return;
    var dx = e.clientX - ballPt.x0, dy = e.clientY - ballPt.y0, d = ballPt.n.f._d;
    if (!ballPt.moved) { if (Math.hypot(dx, dy) < 3) return; ballPt.moved = true; d.ts = 1.04; }   // 开始拖：抬起来一点
    // 限位：离原位越远越拉不动，最远不超过球直径的 0.45 倍
    var rx = ballPt.gx + dx, ry = ballPt.gy + dy, len = Math.hypot(rx, ry), max = (ballPt.n.base ? ballPt.n.base.w : 200) * 0.45;
    var k = len > 0.01 ? max * Math.tanh(len / max) / len : 0;
    d.tx = rx * k; d.ty = ry * k;
  });
  window.addEventListener('pointerup', function (e) { if (ballPt && e.pointerId === ballPt.id) releaseBall(!ballPt.moved); });
  window.addEventListener('pointercancel', function (e) { if (ballPt && e.pointerId === ballPt.id) releaseBall(false); });

  // 按一下会弹的球：按下缩到 0.96、松手弹回来（kick 是弹回来时多给的那一下）。
  // 首页的球（随后的 click 推到小东西层；呼吸 ±1.25%、8s 一轮也由弹簧目标做，不用 CSS 动画，两套缩放不打架）、「更多小东西」（不跳转，只弹一下）
  function pressable(ball, kick, breathe) {
    var f = ball && ball.closest('.float');
    if (!f) return;
    f._d = freshSpring(); f._d.breathe = !!breathe;
    var id = null;
    ball.addEventListener('pointerdown', function (e) { if (e.button !== 0 || id !== null) return; id = e.pointerId; f._d.hold = true; f._d.ts = 0.96; ball.classList.add('is-held'); });
    function up(e) { if (id === null || e.pointerId !== id) return; id = null; var d = f._d; d.hold = false; d.ts = 1; d.vs -= kick; ball.classList.remove('is-held'); }
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
  pressable(document.querySelector('.bubble-home'), 1.2, true);
  pressable(document.querySelector('.bubble-more'), 1.6, false);

  // ---------- 每一帧 ----------
  var tickLast = 0;
  function tick(t) {
    var dt = tickLast ? Math.min(48, t - tickLast) : 16; tickLast = t;   // 帧间隔，弹簧用；切回标签页时不让它一口气跳太远
    // 1. 层位移
    levelList.forEach(function (L) {
      if (L.anim) {
        var k = Math.min(1, (t - L.t0) / L.dur);
        L.x = L.from + (L.to - L.from) * (L.ease || pushEase)(k);
        if (k >= 1) { L.x = L.to; L.anim = false; }
      }
      L.el.style.transform = 'translate3d(' + (L.x * W).toFixed(2) + 'px,' + L.y.toFixed(2) + 'px,0)';
    });
    // 2. 漂浮
    floats.forEach(function (f) {
      var o = reduce ? { x: 0, y: 0 } : floatOffset(f, t), d = f._d, sc = '';
      if (d) {   // 带弹簧的球：加上拖动 / 弹簧的位移和整体缩放，线用的也是这个 _o
        if (d.breathe && !d.hold) d.ts = reduce ? 1 : 1 + 0.0125 * Math.sin(t * TAU / 8000);   // 首页的球呼吸
        ballStep(d, dt); o.x += d.x; o.y += d.y; sc = ballTransform(d);
      }
      f._o = o;
      f.style.transform = 'translate3d(' + o.x.toFixed(2) + 'px,' + o.y.toFixed(2) + 'px,0)' + sc;
    });
    if (mouse.has && !reduce) {
      mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
      bg.style.transform = 'translate3d(' + (mouse.x * -12).toFixed(2) + 'px,' + (mouse.y * -12).toFixed(2) + 'px,0)';
    }
    // 3. 需要时量一次布局（背后被关于缩小时不量，等它回来）
    if (needMeasure && !(about.shown && about.p > 0)) { measureAll(); needMeasure = false; }
    // 4. 流里的线：画看得见的层，以及下一层（在屏幕右边外面，线伸向右边）
    var nxt = nextOf(current);
    linkDefs.forEach(function (d) {
      var show = d.a.base && d.b.base && (Math.abs(d.level.x) < 0.995 || d.level.name === nxt);
      if (!show) { if (d.on) { d.on = false; d.path.style.display = 'none'; d.dot.style.display = 'none'; } return; }
      if (!d.on) { d.on = true; d.path.style.display = ''; d.dot.style.display = ''; }
      drawLink(d, rectNow(d.a), rectNow(d.b));
    });
    if (linesAlpha.v !== linesAlpha.to) {
      var ka = clamp01((t - linesAlpha.t0) / 900);
      linesAlpha.v = linesAlpha.from + (linesAlpha.to - linesAlpha.from) * pushEase(ka);
      if (ka >= 1) linesAlpha.v = linesAlpha.to;
    }
    svg.style.opacity = linesAlpha.v.toFixed(3);   // 透明度放在整张 svg 上，交给合成，不用重画线
    // 5. 返回箭头、底栏
    chevronTick(t);
    trailTick(dt);
    // 6. 关于
    aboutTick(t);
    var showAbout = about.shown && about.lp > 0;
    aboutLinks.forEach(function (d) {
      if (!showAbout || !d.a.base || !d.b.base) { d.path.style.display = 'none'; d.dot.style.display = 'none'; return; }
      d.path.style.display = ''; d.dot.style.display = '';
      drawLink(d, rectAbout(d.a), rectAbout(d.b));
      d.path.style.strokeDashoffset = (1 - about.lp).toFixed(3);
      d.dot.style.opacity = about.lp.toFixed(2);
    });
    requestAnimationFrame(tick);
  }
  setLinesTarget(current === 'home' ? 0 : 1, true);
  if (location.hash === '#about') openAbout(false);
  requestAnimationFrame(tick);

  // 调试出口：控制台里看各层位置和当前手势
  window.__7spot = { levels: levels, chevrons: chevrons, nodes: nodes, state: function () { return { current: current, drag: !!drag, about: { target: about.target, p: +about.p.toFixed(3), shown: about.shown }, credit: creditState, lines: linesAlpha.v.toFixed(2), trail: +trailD.v.toFixed(1), visited: Object.keys(visited), next: nextOf(current), x: levelList.map(function (L) { return L.name + ':' + L.x.toFixed(3) + (L.anim ? '*' : ''); }) }; } };
})();
