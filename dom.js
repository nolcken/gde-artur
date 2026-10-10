/* «Наш дом» — интерфейс: сцена, обстановка, магазин, огород, рыбалка, готовка, прятки, задания */
(function(){
"use strict";
var CFG = window.GDE_CONFIG || {}, API = CFG.api, DD = DOM_DATA, CO = CORE, A = ART, ITEM = DD.ITEM;
var app = document.getElementById("app"), layer = document.getElementById("layer");

/* ---------- утилиты ---------- */
function read(k){ try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e){ return null; } }
function store(k, v){ try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e){} }
function el(tag, attrs, kids){
  var e = document.createElement(tag);
  if (attrs) for (var k in attrs){ var v = attrs[k]; if (v == null || v === false) continue;
    if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k === "html") e.innerHTML = v;
    else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v); }
  (kids || []).forEach(function(c){ if (c == null || c === false) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
  return e;
}
function fmtDur(ms){ var m = Math.ceil(ms / 60000); if (m < 60) return m + " мин"; var h = Math.floor(m / 60); m = m % 60; return h + " ч" + (m ? " " + m + " мин" : ""); }
function hm(ts){ return new Date(ts).toLocaleTimeString("ru-RU", { timeZone:"Europe/Minsk", hour:"2-digit", minute:"2-digit" }); }
function when(ts){ var d = CO.dk(ts), t = CO.dk(now()); return d === t ? "сегодня в " + hm(ts) : d === CO.addDays(t, -1) ? "вчера в " + hm(ts) : new Date(ts).toLocaleDateString("ru-RU", { timeZone:"Europe/Minsk", day:"numeric", month:"long" }) + " в " + hm(ts); }
function plural(n, a, b, c){ var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }
var toastT;
function toast(msg){ var old = document.querySelector(".toast"); if (old) old.remove(); var t = el("div", { class:"toast", text:msg }); document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(function(){ t.remove(); }, 2600); }
function floatAt(x, y, txt, color){ var f = el("div", { class:"float", text:txt, style:"left:" + x + "px;top:" + y + "px" + (color ? ";color:" + color : "") }); document.body.appendChild(f); setTimeout(function(){ f.remove(); }, 1100); }

/* ---------- состояние и синхронизация ---------- */
var me = read("kto-gde-me");
var S = { committed:null, pending:[], local:null, cal:null, skew:0, inflight:false, dirty:false, room:read("dom-room") || "living", mode:"view", sel:null, place:null, ghost:null,
          zoom:1, pan:[0, 0], hunt:null, sync:"ok", sheet:null, lastPull:0 };
function now(){ return Date.now() + S.skew; }
function H(){ return S.local; }
function recompute(){ var h = CO.clone(S.committed); S.pending.forEach(function(op){ var t = CO.clone(h), r = CO.apply(t, op); if (r.ok) h = t; }); S.local = h; }
function devTag(){
  var u = navigator.userAgent || "", os = /iPhone/.test(u) ? "iPhone" : (/iPad/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) ? "iPad" : /Android/.test(u) ? "Android" : /Mac OS X/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : "другое";
  var br = /YaBrowser/.test(u) ? "Яндекс" : /Telegram/i.test(u) ? "Telegram" : /Instagram/.test(u) ? "Instagram" : /Edg/.test(u) ? "Edge" : /CriOS|Chrome\//.test(u) ? "Chrome" : /FxiOS|Firefox/.test(u) ? "Firefox" : /Safari/.test(u) ? "Safari" : "";
  var pwa = false; try { pwa = !!(navigator.standalone || matchMedia("(display-mode: standalone)").matches); } catch (e) {}
  return os + (br ? ", " + br : "") + (pwa ? ", ярлык на экране" : "");
}
var DEV = devTag();
function api(body){ return fetch(API, { method:"POST", body:JSON.stringify(Object.assign({ who:me.who, code:me.code, cv:APP_V, dev:DEV }, body)) }).then(function(r){ return r.json(); }); }
function act(t, a, quiet){
  var op = { t:t, a:a || {}, who:me.who, ts:now() }, test = CO.clone(S.local), before = { c:test.coins, h:test.hearts, l:CO.level(test) };
  var r = CO.apply(test, op);
  if (!r.ok){ if (!quiet) toast(r.err); return null; }
  var dc = test.coins - before.c, dh = test.hearts - before.h, nl = CO.level(test);
  try { op.d = describe(op, r, test); if (nl > before.l) op.d = (op.d ? op.d + " · " : "") + "🏡 дом вырос до " + nl + "-го уровня!"; } catch (e) {}
  S.local = test; S.pending.push(op); save();
  render();
  if (dc) bump("coins", (dc > 0 ? "+" : "") + dc + " 🪙", dc > 0 ? "#B58500" : "#6E5A80");
  if (dh) bump("hearts", (dh > 0 ? "+" : "") + dh + " 💗", "#FF2E74");
  if (nl > before.l) setTimeout(function(){ levelUp(nl); }, 300);
  if (S.sheet && S.sheet.refresh) S.sheet.refresh();
  return r;
}
// что сделал игрок — для уведомлений в Telegram второму
function describe(op, r, h){
  var a = op.a || {}, f = me.who === "sasha", g = function(m, w){ return f ? w : m; }, it = a.id && ITEM[a.id], room = a.room && DD.ROOM[a.room];
  var gi = function(k){ var x = CO.goodInfo(k); return x ? x.e + " " + x.n : k; };
  switch (op.t){
    case "buy": return g("купил", "купила") + " «" + it.n + "»" + ((a.n || 1) > 1 ? " ×" + a.n : "");
    case "buyGood": return g("купил", "купила") + " " + gi(a.k) + " ×" + (a.n || 1);
    case "place": return g("поставил", "поставила") + " «" + it.n + "» — " + (room ? room.n : "");
    case "style": return g("сменил", "сменила") + " " + (a.kind === "floor" ? "пол" : "стены") + " в «" + room.n + "»: " + (a.kind === "floor" ? A.FLOORS : A.WALLS)[a.id].name.toLowerCase();
    case "unlock": return "🎉 " + g("открыл", "открыла") + " комнату «" + room.n + "»";
    case "plant": return "🌱 " + g("посадил", "посадила") + " " + DD.CROP[a.crop].n.toLowerCase();
    case "water": return "💧 " + g("полил", "полила") + " грядки (" + (r.n || 1) + ")";
    case "harvest": return g("собрал", "собрала") + " урожай: " + DD.CROP[r.id].e + " " + DD.CROP[r.id].n.toLowerCase() + " ×" + r.n;
    case "pick": return g("собрал", "собрала") + " " + DD.FRUITS[r.id].e + " " + DD.FRUITS[r.id].n.toLowerCase() + " ×" + r.n;
    case "sell": return g("продал", "продала") + " " + gi(a.k) + " ×" + (a.n || 1) + " (+" + r.coins + " 🪙)";
    case "fish": if (!a.id) return null; var fi = DD.FISHI[a.id];
      return fi.note ? "🍾 " + g("выловил", "выловила") + " бутылку с запиской" : (a.id === "goldfish" ? "✨ " : "🎣 ") + g("поймал", "поймала") + " " + fi.n.toLowerCase();
    case "cook": var rc = DD.RECIPE[a.rec]; return "🍳 " + g("приготовил", "приготовила") + " " + rc.e + " " + rc.n.toLowerCase() + " " + "★★★".slice(0, a.stars || 1);
    case "gift": return "💝 " + g("угостил", "угостила") + " тебя: " + gi(a.k);
    case "order": return g("выполнил", "выполнила") + " заказ соседа";
    case "hunt": return "🧸 " + g("сыграл", "сыграла") + " в прятки: " + (a.found || 0) + " из 5";
    case "claimQ": var q = DD.Q.filter(function(x){ return x.id === a.q; })[0]; return "📜 " + g("выполнил", "выполнила") + " задание «" + (q ? q.t : a.q) + "»";
    case "claimD": return g("выполнил", "выполнила") + " ежедневное задание";
    case "claimMail": return g("забрал", "забрала") + " награды за календарь 📬";
    case "upgrade": var U = DD.UPGRADES.filter(function(x){ return x.id === a.id; })[0]; return g("улучшил", "улучшила") + " " + (U ? U.e + " " + U.n.toLowerCase() : a.id);
    case "unbox": return "📦 " + g("распаковал", "распаковала") + " коробку: " + r.gift.t.toLowerCase();
  }
  return null;
}
function bump(id, txt, color){ var c = document.getElementById("hud-" + id); if (!c) return; var b = c.getBoundingClientRect(); floatAt(b.left + 6, b.top + 4, txt, color); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
var saveTimer;
function save(){ clearTimeout(saveTimer); saveTimer = setTimeout(flush, 500); }
function flush(){
  if (S.inflight || (!S.pending.length && S.committed.v)) return;
  S.inflight = true; setSync("saving");
  var n = S.pending.length, snap = CO.clone(S.local); delete snap.v;
  var events = S.pending.slice(0, n).map(function(o){ return o.d; }).filter(Boolean);
  api({ action:"homeSave", base:S.committed.v || 0, home:snap, events:events }).then(function(j){
    S.inflight = false;
    if (j.ok){ snap.v = j.v; S.committed = snap; S.pending = S.pending.slice(n); recompute(); setSync("ok"); if (S.pending.length) save(); }
    else if (j.error === "conflict" && !j.home){ location.reload(); }
    else if (j.error === "conflict"){ S.committed = j.home || S.committed; recompute(); render(); setSync("saving"); flush(); }
    else { setSync("err"); setTimeout(flush, 4000); }
  }).catch(function(){ S.inflight = false; setSync("err"); setTimeout(flush, 4000); });
}
function pull(){
  if (S.inflight || document.hidden) return Promise.resolve();
  S.lastPull = Date.now();
  return api({ action:"homeGet", v:S.committed && S.committed.v || 0 }).then(function(j){
    if (!j.ok) return;
    if (j.now) S.skew = j.now - Date.now();
    if (j.cal) S.cal = j.cal;
    if (j.changed && !j.home && S.committed && S.committed.v){ location.reload(); return; }
    if (j.changed && j.home && !S.inflight){ S.committed = j.home; recompute(); if (!S.place) render(); if (S.sheet && S.sheet.refresh) S.sheet.refresh(); }
    else renderDock();
  }).catch(function(){});
}
function setSync(s){ S.sync = s; var x = document.getElementById("sync"); if (x) x.textContent = syncTxt(); }
function syncTxt(){ return S.sync === "saving" ? "сохраняю…" : S.sync === "err" ? "нет связи, повторю" : "всё сохранено ✓"; }

/* ---------- время суток ---------- */
function dayPhase(){ if (S.forcePhase) return S.forcePhase; var hr = CO.hourOf(now()); return hr >= 21 || hr < 6 ? "night" : hr >= 18 || hr < 8 ? "evening" : "day"; }
function itemCtx(p){
  var t = new Date(now() + 3 * 3600e3), ph = dayPhase(), ctx = { night:ph === "night", h:t.getUTCHours(), m:t.getUTCMinutes(), day:t.getUTCDate(), mon:["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"][t.getUTCMonth()] };
  if (p && p.crop){ var info = CO.cropInfo(p.crop, now(), S.room); ctx.wet = info.wet; ctx.stage = info.stage; ctx.ripe = info.ripe; }
  if (p && ITEM[p.i] && ITEM[p.i].fn === "tree") ctx.ripe = now() >= (p.ft || 0);
  return ctx;
}

/* ---------- сцена ---------- */
function itemPrims(p, ctx){
  var it = ITEM[p.i], fn = A.D[it.draw || it.id]; if (!fn) return [];
  var col = it.cols ? it.cols[(p.c || 0) % it.cols.length] : undefined;
  var extra = { crop:p.crop, fruit:it.fruit ? DD.FRUITS[it.fruit].color : null };
  return fn(col, (p.u || 1) * 7 + 3, ctx || itemCtx(p), extra);
}
function placement(p){ var it = ITEM[p.i]; if (it.k === "wall") return p.wall === "y" ? [p.x, 0, 0] : [0, p.y, 1]; return [p.x, p.y, p.r ? 1 : 0]; }
function depthSort(list){
  var n = list.length, before = list.map(function(){ return []; }), indeg = list.map(function(){ return 0; });
  for (var i = 0; i < n; i++) for (var j = 0; j < n; j++){ if (i === j) continue; var A1 = list[i].rect, B1 = list[j].rect;
    if ((A1.x1 <= B1.x0 && A1.y0 < B1.y1) || (A1.y1 <= B1.y0 && A1.x0 < B1.x1)){ before[i].push(j); indeg[j]++; } }
  var out = [], q = [], used = list.map(function(){ return false; });
  for (var k = 0; k < n; k++) if (!indeg[k]) q.push(k);
  while (out.length < n){
    if (!q.length){ var best = -1; for (var m = 0; m < n; m++) if (!used[m] && (best < 0 || list[m].rect.x0 + list[m].rect.y0 < list[best].rect.x0 + list[best].rect.y0)) best = m; q.push(best); }
    q.sort(function(a, b){ return (list[a].rect.x0 + list[a].rect.y0) - (list[b].rect.x0 + list[b].rect.y0); });
    var c = q.shift(); if (used[c]) continue; used[c] = true; out.push(list[c]);
    before[c].forEach(function(d){ indeg[d]--; if (!indeg[d] && !used[d]) q.push(d); });
  }
  return out;
}
function tilePoly(x, y, w, d, fill, op){ return A.poly([A.P(x,y,0),A.P(x+w,y,0),A.P(x+w,y+d,0),A.P(x,y+d,0)], fill, { stroke:"rgba(255,255,255,.8)", sw:1, op:op }); }
function sceneSVG(){
  var h = H(), room = DD.ROOM[S.room], R = h.rooms[S.room], body = "", glow = "", ctx0 = itemCtx(null);
  var rr = Object.assign({}, room, { floor:R.floor, wall:R.wall });
  body += A.roomSVG(rr);
  if (S.mode === "edit"){ var g = ""; for (var y = 0; y < room.d; y++) for (var x = 0; x < room.w; x++) g += tilePoly(x, y, 1, 1, "transparent", 1); body += '<g opacity=".55">' + g + '</g>'; }
  var walls = [], rugs = [], floors = [];
  R.items.forEach(function(p){ var it = ITEM[p.i]; if (!it) return; (it.k === "wall" ? walls : it.k === "rug" ? rugs : floors).push({ p:p, rect:it.k === "wall" ? null : CO.rectOf(p) }); });
  var gh = S.ghost && S.place ? S.ghost : null, ghIt = gh ? ITEM[gh.id] : null;
  if (gh){ var gp = { u:-1, i:gh.id, c:gh.c, x:gh.x, y:gh.y, r:gh.r, wall:gh.wall }, gk = ghIt.k, gx = { p:gp, ghost:true, ok:gh.ok, rect:gk === "wall" ? null : CO.rectOf(gp) };
    (gk === "wall" ? walls : gk === "rug" ? rugs : floors).push(gx);
    if (gk !== "wall"){ var f = CO.foot(ghIt, gh.r); body += tilePoly(gh.x, gh.y, f[0], f[1], gh.ok ? "#2FAE60" : "#FF2E74", .45); } }
  if (S.mode === "edit" && S.sel){ var fs = CO.findItem(h, S.sel); if (fs && ITEM[fs.p.i].k !== "wall"){ var rc = CO.rectOf(fs.p); body += tilePoly(rc.x0, rc.y0, rc.x1 - rc.x0, rc.y1 - rc.y0, "#FF2E74", .25); } }
  if (S.hunt) S.hunt.roaches.forEach(function(r, i){ if (!r.found) floors.push({ roach:i, rect:{ x0:r.x, y0:r.y, x1:r.x + .3, y1:r.y + .3 }, r:r }); });
  var N = S.npc && S.npc.room === S.room && !S.hunt ? S.npc : null;
  if (N && !npcFree(N.x, N.y)){ S.npc = null; npcInit(); N = S.npc && S.npc.room === S.room ? S.npc : null; }
  if (N) floors.push({ npc:N, rect:{ x0:N.x + .2, y0:N.y + .2, x1:N.x + .8, y1:N.y + .8 } });
  function drawOne(o){
    if (o.npc){ var n = o.npc, a0 = A.P(n.px + .5, n.py + .5, 0), a1 = A.P(n.x + .5, n.y + .5, 0), moved = n.px !== n.x || n.py !== n.y;
      var bp = A.renderPrims(A.bear(n.x + .5, n.y + .5, 0, 2.3, { crown:n.main, c:n.c, bow:n.main ? "#FF2E74" : n.bow }), 0, 0, 0);
      var sh = '<ellipse cx="' + a1[0].toFixed(1) + '" cy="' + (a1[1] + 1).toFixed(1) + '" rx="13" ry="5" fill="rgba(36,16,58,.18)"/>';
      return '<g class="npc' + (moved ? " moving" : "") + '" data-npc="1" style="--dx:' + (a0[0] - a1[0]).toFixed(1) + 'px;--dy:' + (a0[1] - a1[1]).toFixed(1) + 'px">' + sh + '<g class="npcb">' + bp.body + '</g></g>'; }
    if (o.roach != null){ var rp = A.renderPrims(A.bear(o.r.x + .15, o.r.y + .15, o.r.z || 0, 1, { c:["#C68A5A", "#FFB3CF", "#C9B6FF", "#9BE3D6", "#FFE08A"][o.roach % 5], bow:o.roach % 2 ? "#FF4F8B" : null }), 0, 0, 0); return '<g class="roach-hit" data-roach="' + o.roach + '">' + rp.body + '</g>'; }
    var p = o.p, pl = placement(p), res = A.renderPrims(itemPrims(p, o.ghost ? ctx0 : null), pl[0], pl[1], pl[2]);
    if (!o.ghost) glow += res.glow;
    var extra = "";
    if (!o.ghost && p.crop){ var info = CO.cropInfo(p.crop, now(), S.room), c = A.P(p.x + .5, p.y + .5, 1.0);
      if (!info.ripe && !info.wet) extra += '<text class="wet-ico" x="' + c[0].toFixed(1) + '" y="' + c[1].toFixed(1) + '" font-size="15" text-anchor="middle">💧</text>';
      if (info.ripe) extra += '<text class="wet-ico" x="' + c[0].toFixed(1) + '" y="' + (c[1] - 6).toFixed(1) + '" font-size="15" text-anchor="middle">✨</text>'; }
    if (!o.ghost && ITEM[p.i].fn === "tree" && now() >= (p.ft || 0)){ var c2 = A.P(p.x + .5, p.y + .5, 2.3); extra += '<text class="wet-ico" x="' + c2[0].toFixed(1) + '" y="' + c2[1].toFixed(1) + '" font-size="15" text-anchor="middle">' + DD.FRUITS[ITEM[p.i].fruit].e + '</text>'; }
    var cls = o.ghost ? "ghost" : "it" + (S.sel === p.u && S.mode === "edit" ? " sel" : "");
    return '<g class="' + cls + '"' + (o.ghost ? (o.ok ? "" : ' style="filter:grayscale(1) sepia(1) hue-rotate(-50deg) saturate(4)"') : ' data-u="' + p.u + '"') + ">" + res.body + extra + "</g>";
  }
  walls.forEach(function(o){ body += drawOne(o); });
  rugs.forEach(function(o){ body += drawOne(o); });
  depthSort(floors).forEach(function(o){ body += drawOne(o); });
  var defs = '<defs>' + [["warm","#FFD27A"],["pink","#FF6FA3"],["fire","#FF8A3D"],["candle","#FFC23D"]].map(function(g){ return '<radialGradient id="glow-' + g[0] + '"><stop offset="0" stop-color="' + g[1] + '" stop-opacity=".55"/><stop offset=".55" stop-color="' + g[1] + '" stop-opacity=".18"/><stop offset="1" stop-color="' + g[1] + '" stop-opacity="0"/></radialGradient>'; }).join("") + '</defs>';
  var bub = "";
  if (N && N.say && Date.now() < N.until && N.px === N.x && N.py === N.y){
    var bpt = A.P(N.x + .5, N.y + .5, 1.55), w = Math.min(230, N.say.length * 6.4 + 22);
    bub = '<g class="bubble"><rect x="' + (bpt[0] - w / 2).toFixed(1) + '" y="' + (bpt[1] - 26).toFixed(1) + '" width="' + w.toFixed(1) + '" height="24" rx="12" fill="#fff" stroke="#F1D9E6"/><path d="M' + (bpt[0] - 5).toFixed(1) + " " + (bpt[1] - 3).toFixed(1) + " l5 7 l5 -7z" + '" fill="#fff"/><text x="' + bpt[0].toFixed(1) + '" y="' + (bpt[1] - 10).toFixed(1) + '" text-anchor="middle" font-size="11.5" font-weight="800" font-family="Manrope, sans-serif" fill="#24103A">' + N.say.replace(/[<&>]/g, "") + '</text></g>';
  }
  return defs + '<g id="scene">' + body + '</g><g class="glowlayer">' + glow + '</g>' + bub;
}
function viewBox(){
  var room = DD.ROOM[S.room], W = room.w, Dp = room.d;
  var x0 = -Dp * 32 - 16, x1 = W * 32 + 16, y0 = -(room.outdoor ? 2.4 : 2.75) * 36 - 18, y1 = (W + Dp) * 16 + .45 * 36 + 18;
  var w = (x1 - x0) / S.zoom, hh = (y1 - y0) / S.zoom, cx = (x0 + x1) / 2 + S.pan[0], cy = (y0 + y1) / 2 + S.pan[1];
  return [cx - w / 2, cy - hh / 2, w, hh];
}
function renderStage(){
  var st = document.getElementById("stage"); if (!st) return;
  var svg = st.querySelector("svg"), vb = viewBox();
  svg.setAttribute("viewBox", vb.map(function(v){ return v.toFixed(1); }).join(" "));
  svg.innerHTML = sceneSVG();
  var ph = dayPhase(); st.className = "stage" + (DD.ROOM[S.room].outdoor ? " out" : "") + (ph !== "day" ? " " + ph : "");
  var eb = document.getElementById("editbar"); if (eb) eb.replaceWith(editBar());
  if (S.hunt) { var hb = document.getElementById("huntbar"); if (hb) hb.replaceWith(huntBar()); }
}

/* ---------- ввод на сцене ---------- */
function svgPoint(svg, cx, cy){ var vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect(); var s = Math.max(vb.width / r.width, vb.height / r.height); var ox = (r.width * s - vb.width) / 2, oy = (r.height * s - vb.height) / 2; return [vb.x + (cx - r.left) * s - ox, vb.y + (cy - r.top) * s - oy, s]; }
function floorAt(sx, sy){ return [(sx / 32 + sy / 16) / 2, (sy / 16 - sx / 32) / 2]; }
function ghostFrom(sx, sy){
  var pl = S.place, it = ITEM[pl.id], room = DD.ROOM[S.room], g = { id:pl.id, c:pl.c, r:pl.r || 0 };
  if (it.k === "wall"){
    if (sx >= 0){ g.wall = "y"; g.x = Math.max(0, Math.min(room.w - it.w, Math.round(sx / 32 - it.w / 2))); }
    else { g.wall = "x"; g.y = Math.max(0, Math.min(room.d - it.w, Math.round(-sx / 32 - it.w / 2))); }
  } else {
    var f = CO.foot(it, g.r), w = floorAt(sx, sy);
    g.x = Math.max(0, Math.min(room.w - f[0], Math.round(w[0] - f[0] / 2))); g.y = Math.max(0, Math.min(room.d - f[1], Math.round(w[1] - f[1] / 2)));
  }
  g.ok = !CO.canPlace(H(), S.room, pl.id, it.k === "wall" ? { wall:g.wall, x:g.x || 0, y:g.y || 0 } : { x:g.x, y:g.y, r:g.r }, pl.move);
  return g;
}
function bindStage(svg){
  var st = null, raf = 0;
  svg.addEventListener("pointerdown", function(e){ S.down = true; st = { x:e.clientX, y:e.clientY, pan:S.pan.slice(), moved:false, id:e.pointerId, target:e.target }; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener("pointermove", function(e){
    if (st){ var dx = e.clientX - st.x, dy = e.clientY - st.y; if (!st.moved && Math.hypot(dx, dy) > 7) st.moved = true;
      if (st.moved && S.zoom > 1.01){ var s = svgPoint(svg, 0, 0)[2]; S.pan = [st.pan[0] - dx * s, st.pan[1] - dy * s]; clampPan(); svg.setAttribute("viewBox", viewBox().join(" ")); } }
    if (S.place && e.pointerType === "mouse" && !raf){ raf = requestAnimationFrame(function(){ raf = 0; if (!S.place) return; var p = svgPoint(svg, e.clientX, e.clientY); var g = ghostFrom(p[0], p[1]); if (!S.ghost || g.x !== S.ghost.x || g.y !== S.ghost.y || g.wall !== S.ghost.wall || g.r !== S.ghost.r){ S.ghost = g; renderStage(); } }); }
  });
  svg.addEventListener("pointerup", function(e){ S.down = false; var s0 = st; st = null; if (!s0 || s0.moved) return; tap(e, svg, s0.target); });
  svg.addEventListener("pointercancel", function(){ S.down = false; st = null; });
  svg.addEventListener("wheel", function(e){ if (!e.ctrlKey) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive:false });
}
function clampPan(){ var room = DD.ROOM[S.room], lim = (room.w + room.d) * 16 * (1 - 1 / S.zoom) + 10; S.pan[0] = Math.max(-lim * 2, Math.min(lim * 2, S.pan[0])); S.pan[1] = Math.max(-lim, Math.min(lim, S.pan[1])); }
function zoomBy(k){ S.zoom = Math.max(.9, Math.min(2.8, S.zoom * k)); if (S.zoom <= 1) S.pan = [0, 0]; clampPan(); renderStage(); }
function tap(e, svg, t0){
  var t = t0 || e.target, gU = t.closest && t.closest("[data-u]"), gR = t.closest && t.closest("[data-roach]"), pt = svgPoint(svg, e.clientX, e.clientY);
  if (S.hunt){ if (gR) foundRoach(+gR.getAttribute("data-roach"), e); return; }
  if (S.place){
    var g = ghostFrom(pt[0], pt[1]), pl = S.place, it = ITEM[pl.id];
    var a = it.k === "wall" ? { wall:g.wall, x:g.x, y:g.y } : { x:g.x, y:g.y, r:g.r };
    var r = pl.move ? act("move", Object.assign({ u:pl.move, room:S.room }, a)) : act("place", Object.assign({ id:pl.id, c:pl.c, room:S.room }, a));
    if (r){ var u = pl.move || r.u; S.place = null; S.ghost = null; S.sel = u; if (S.mode !== "edit") S.mode = "edit"; render(); }
    else { S.ghost = g; renderStage(); }
    return;
  }
  var gN = t.closest && t.closest("[data-npc]");
  if (gN && S.mode !== "edit"){ npcClick(e); return; }
  var u = gU ? +gU.getAttribute("data-u") : null;
  if (S.mode === "edit"){ S.sel = u; renderStage(); return; }
  if (u) interact(u, e);
}
function interact(u, e){
  var f = CO.findItem(H(), u); if (!f) return; var it = ITEM[f.p.i];
  switch (it.fn){
    case "plot": return openPlot(u);
    case "tree":
      if (now() >= (f.p.ft || 0)){ var r = act("pick", { u:u }); if (r) floatAt(e.clientX, e.clientY - 20, "+" + r.n + " " + DD.FRUITS[r.id].e); }
      else toast(it.n + ": плоды созреют через " + fmtDur(f.p.ft - now()));
      return;
    case "stove": case "fridge": return openCook();
    case "pond": return openFish();
    case "well": { var w = act("water", { room:S.room, all:true }); if (w) toast("💦 Полито грядок: " + w.n); return; }
    case "mail": return openMail();
    case "box": { var rb = act("unbox", { u:u }); if (rb){ var g = rb.gift, parts = [];
      Object.keys(g.inv || {}).forEach(function(k){ parts.push(ITEM[k.split(":")[0]].n.toLowerCase()); });
      if (g.bag) parts.push("продукты для чая"); if (g.coins) parts.push(g.coins + " 🪙"); if (g.hearts) parts.push(g.hearts + " 💗");
      floatAt(e.clientX - 10, e.clientY - 30, "🎁", "#FF2E74"); npcSay("Ого! " + g.t + "!");
      toast("📦 В коробке: " + parts.join(", ") + (g.inv ? " · вещи — на складе" : "")); } return; }
  }
  floatAt(e.clientX - 10, e.clientY - 24, "💗", "#FF2E74");
  toast(it.n + (it.c ? " · уют +" + it.c : ""));
}

/* ---------- мишка-жилец: гуляет по комнате ---------- */
var NPC_SAY = ["Как тут уютно!", "Обнимашки?", "Где мой мёд?", "Ура, мы дома!", "Хочу блинчиков!", "Люблю этот дом", "Саша скоро придёт?", "Тут бы ещё кресло…", "Тш-ш, я считаю звёзды", "Потрогай меня!", "Я самый плюшевый", "Пахнет пирогами?"];
var NPC_COLS = ["#FFB3CF", "#C9B6FF", "#9BE3D6", "#FFE08A", "#A9CBFF"];
function npcFree(x, y){
  var room = DD.ROOM[S.room], R = H().rooms[S.room]; if (x < 0 || y < 0 || x >= room.w || y >= room.d) return false;
  return !R.items.some(function(p){ var it = ITEM[p.i]; if (it.k !== "floor") return false; var r = CO.rectOf(p); return x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1; });
}
function npcInit(){
  if (S.npc && S.npc.room === S.room) return;
  var room = DD.ROOM[S.room], cx = room.w / 2, cy = room.d / 2, best = null;
  for (var y = 0; y < room.d; y++) for (var x = 0; x < room.w; x++) if (npcFree(x, y)){ var d = Math.abs(x + .5 - cx) + Math.abs(y + .5 - cy) + Math.random(); if (!best || d < best.d) best = { x:x, y:y, d:d }; }
  if (!best){ S.npc = null; return; }
  var main = S.room === "living";
  S.npc = { room:S.room, x:best.x, y:best.y, px:best.x, py:best.y, main:main, c:main ? "#C68A5A" : NPC_COLS[ART.hash(S.room) % NPC_COLS.length], bow:"#9B7BFF", say:null, until:0 };
}
function npcPhrase(){
  var h = H(), ph = dayPhase(), qp = CO.questProgress(h, S.cal, now()), list = NPC_SAY.slice();
  if (ph === "night") list.push("Пора спать…", "Включите лампу, темно", "Спокойной ночи!");
  if (qp && !qp.done) list.push("Задание: " + qp.q.g.toLowerCase());
  if (qp && qp.done) list.push("Задание готово! Жми «Задания»");
  if (h.rooms.living.items.some(function(p){ return p.i === "box"; })) list.push("Распакуем коробки?", "Что в коробках?..");
  return list[Math.floor(Math.random() * list.length)];
}
function npcSay(txt){ if (!S.npc) return; S.npc.px = S.npc.x; S.npc.py = S.npc.y; S.npc.say = txt; S.npc.until = Date.now() + 3600; renderStage(); }
function npcClick(e){
  floatAt(e.clientX - 8, e.clientY - 30, "💗", "#FF2E74");
  var r = act("npcGift", {}, true);
  if (r){ floatAt(e.clientX + 10, e.clientY - 10, "+15 🪙", "#B58500"); npcSay("Нашёл монетку — держи!"); }
  else npcSay(npcPhrase());
}
function npcTick(){
  if (document.hidden || S.mode !== "view" || S.place || S.hunt || S.down || document.querySelector(".game")) return;
  npcInit(); var n = S.npc; if (!n) return;
  n.px = n.x; n.py = n.y;
  if (Date.now() < n.until) return;
  if (n.say){ n.say = null; renderStage(); return; }
  if (Math.random() < .12){ npcSay(npcPhrase()); return; }
  if (Math.random() < .7){
    var dirs = [[1,0],[-1,0],[0,1],[0,-1]].sort(function(){ return Math.random() - .5; });
    for (var i = 0; i < 4; i++){ var nx = n.x + dirs[i][0], ny = n.y + dirs[i][1]; if (npcFree(nx, ny)){ n.x = nx; n.y = ny; break; } }
  }
  renderStage();
}

/* ---------- присутствие и обновления ---------- */
var APP_V = "15";
function bye(){ try { if (navigator.sendBeacon) navigator.sendBeacon(API, JSON.stringify({ action:"bye", who:me.who, code:me.code })); } catch (e) {} }
function checkVersion(){
  fetch("version.txt?t=" + Date.now(), { cache:"no-store" }).then(function(r){ return r.ok ? r.text() : ""; }).then(function(v){
    v = (v || "").trim();
    if (v && v !== APP_V && !S.sheet && !S.place && !S.hunt && !S.inflight && !S.pending.length && !document.querySelector(".game")) location.reload();
  }).catch(function(){});
}

/* ---------- сердечки на фоне ---------- */
function heartSVG(fill, stroke){ return '<svg viewBox="0 0 32 30"><path d="M16 28.5C7 22 1.5 16.6 1.5 9.8 1.5 5.2 5 1.5 9.4 1.5c2.8 0 5.1 1.4 6.6 3.7 1.5-2.3 3.8-3.7 6.6-3.7 4.4 0 7.9 3.7 7.9 8.3 0 6.8-5.5 12.2-14.5 18.7z" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="1.5"' : "") + '/><ellipse cx="9" cy="8" rx="3.2" ry="2" fill="#fff" opacity=".45" transform="rotate(-30 9 8)"/></svg>'; }
function bgHearts(){
  var box = document.getElementById("bghearts"); if (!box || box.childNodes.length) return;
  var cols = ["#FF6FA3", "#FF9DBD", "#FFB3CF", "#C9B6FF", "#FFD84D", "#FF2E74"];
  for (var i = 0; i < 18; i++){
    var sz = 12 + Math.random() * 24, dur = 22 + Math.random() * 20;
    var b = el("span", { class:"bh", style:"left:" + (Math.random() * 100).toFixed(1) + "%;width:" + sz.toFixed(0) + "px;height:" + sz.toFixed(0) + "px;opacity:" + (.14 + Math.random() * .2).toFixed(2) + ";animation-duration:" + dur.toFixed(1) + "s;animation-delay:-" + (Math.random() * dur).toFixed(1) + "s" },
      [el("i", { style:"width:100%;height:100%;animation-duration:" + (2.5 + Math.random() * 3).toFixed(1) + "s", html:heartSVG(cols[i % cols.length]) })]);
    box.appendChild(b);
  }
}
// иногда пролетает «живое» сердечко — его можно поймать
function catchHeart(){
  if (!document.hidden && !document.querySelector(".game") && H()){
    var x = Math.random() < .5 ? 2 + Math.random() * 12 : 86 + Math.random() * 10;
    if (window.innerWidth < 700) x = 6 + Math.random() * 80;
    var btn = el("button", { class:"catch", title:"Поймай сердечко!", "aria-label":"Поймать сердечко", style:"left:" + x.toFixed(1) + "vw", html:"<i>" + heartSVG("#FF2E74", "#fff") + "</i>" });
    btn.addEventListener("click", function(e){
      if (btn.classList.contains("pop")) return;
      var r = act("catchHeart", {}, true); btn.classList.add("pop");
      floatAt(e.clientX - 10, e.clientY - 20, r ? (r.n === 6 ? "+5 🪙 +1 💗" : "+5 🪙") : "💗", "#FF2E74");
      setTimeout(function(){ btn.remove(); }, 500);
    });
    btn.addEventListener("animationend", function(ev){ if (ev.animationName === "rise") btn.remove(); });
    document.body.appendChild(btn);
  }
  setTimeout(catchHeart, 40000 + Math.random() * 50000);
}

/* ---------- боковая панель ---------- */
function panel(title, kids, extra){ return el("section", { class:"panel" }, [el("h4", null, [title, extra || null])].concat(kids)); }
function aside(qp){
  var h = H(), out = [];
  if (qp){
    out.push(el("section", { class:"panel quest" }, [
      el("div", { class:"qrow" }, [el("span", { class:"face", html:mascotSVG(48) }), el("div", null, [el("small", { text:"Задание " + qp.q.id + " из " + DD.Q.length }), el("b", { text:qp.q.t })])]),
      el("p", { class:"goal", text:"🎯 " + qp.q.g + " · " + qp.cur + "/" + qp.need }),
      el("div", { class:"prog" }, [el("i", { style:"width:" + Math.round(qp.cur / qp.need * 100) + "%" })]),
      el("div", { class:"prow" }, [el("span", { text:"Награда: " + money(qp.q.r.coins, qp.q.r.hearts) }), qp.done ? el("button", { class:"btn yellow", text:"Забрать", onclick:function(){ if (act("claimQ", { q:qp.q.id })) toast("Задание выполнено! 🎉"); } }) : el("button", { class:"btn soft", text:"Подробнее", onclick:openQuests })])
    ]));
  }
  var boxes = h.rooms.living.items.filter(function(p){ return p.i === "box"; }).length;
  if (boxes) out.push(panel("📦 Коробки с переезда", [el("p", { class:"ptxt", text:"В гостиной стоит " + boxes + " " + plural(boxes, "коробка", "коробки", "коробок") + ". Нажми на коробку — внутри сюрприз от мишек." }),
    S.room !== "living" ? el("button", { class:"btn soft", text:"В гостиную", onclick:function(){ switchRoom("living"); } }) : null]));
  var d = h.daily;
  if (d) out.push(panel("☀️ Сегодня", d.tasks.map(function(id){
    var t = DD.DAILY.filter(function(x){ return x.id === id; })[0], p = CO.dailyProgress(h, id, S.cal, me.who, now()), got = d.claimed[id], ok = p[0] >= p[1];
    return el("div", { class:"mrow" + (got ? " done" : "") }, [el("span", { class:"mt", text:(got ? "✅ " : "") + t.t }), got ? el("span", { class:"mm", text:"готово" }) : ok ? el("button", { class:"btn small", text:"Забрать", onclick:function(){ act("claimD", { id:id }); } }) : el("span", { class:"mm", text:p[0] + "/" + p[1] })]);
  }), el("span", { class:"mm", text:"🔥 " + (h.streak.n || 0) })));
  var plots = [];
  Object.keys(h.rooms).forEach(function(r){ if (!h.rooms[r].open) return; h.rooms[r].items.forEach(function(p){ if (p.crop) plots.push({ p:p, room:r, info:CO.cropInfo(p.crop, now(), r) }); }); });
  if (h.rooms.garden && h.rooms.garden.open){
    plots.sort(function(a, b){ return (b.info.ripe - a.info.ripe) || (a.info.wet - b.info.wet) || (a.info.left - b.info.left); });
    var beds = 0; Object.keys(h.rooms).forEach(function(r){ h.rooms[r].items.forEach(function(p){ if (p.i === "garden_bed" && !p.crop) beds++; }); });
    var rows = plots.slice(0, 5).map(function(x){ var c = DD.CROP[x.p.crop.id];
      return el("div", { class:"mrow" }, [el("span", { class:"mt", text:c.e + " " + c.n + (x.room === "greenhouse" ? " · теплица" : "") }), el("span", { class:"mm" + (x.info.ripe ? " hot" : !x.info.wet ? " warn" : ""), text:x.info.ripe ? "✨ созрело" : !x.info.wet ? "💧 сохнет" : fmtDur(x.info.left) })]); });
    if (!plots.length) rows.push(el("p", { class:"ptxt", text:beds ? "Грядки пустуют: " + beds + ". Посадите что-нибудь!" : "Поставьте грядки в саду." }));
    else if (plots.length > 5) rows.push(el("p", { class:"ptxt", text:"и ещё " + (plots.length - 5) }));
    out.push(panel("🌱 Огород", rows.concat([el("button", { class:"btn soft", text:S.room === "garden" ? "Я в саду" : "В сад", disabled:S.room === "garden", onclick:function(){ switchRoom("garden"); } })])));
  }
  if (h.orders) out.push(panel("🧸 Заказы соседей", h.orders.list.map(function(o, i){
    var ok = !o.done && Object.keys(o.need).every(function(k){ return CO.have(h, k) >= o.need[k]; });
    var need = Object.keys(o.need).map(function(k){ var g = CO.goodInfo(k.split(":").length === 2 && k.indexOf("d:") === 0 ? k + ":1" : k) || { e:"?" }; return g.e + "×" + o.need[k]; }).join(" ");
    return el("div", { class:"mrow" + (o.done ? " done" : "") }, [el("span", { class:"mt", text:(o.done ? "✅ " : "") + o.who + " · " + need }), o.done ? null : el("button", { class:"btn small", text:"🪙 " + o.coins, disabled:!ok, title:ok ? "Отдать" : "Пока не хватает", onclick:function(){ if (act("order", { i:i })) toast(o.who + ": «Спасибо!» 🧸💗"); } })]);
  })));
  if (h.log.length) out.push(panel("📰 Недавно", h.log.slice(0, 4).map(function(l){ return el("div", { class:"mrow" }, [el("span", { class:"mt", text:l.s }), el("span", { class:"mm", text:hm(l.t) })]); })));
  return el("aside", { class:"aside" }, out);
}

/* ---------- каркас страницы ---------- */
function mascotSVG(size, crown){
  var r = A.renderPrims(A.bear(.5, .5, 0, 1.7, { crown:crown !== false, bow:"#FF2E74" }), 0, 0, 0);
  return '<svg width="' + size + '" height="' + size + '" viewBox="-15 -21 30 42">' + r.body + "</svg>";
}
function render(){
  var h = H(); if (!h) return;
  var cf = CO.comfort(h), L = DD.levelOf(cf), n0 = DD.levelNeed(L), n1 = DD.levelNeed(L + 1), pr = Math.max(0, Math.min(1, (cf - n0) / (n1 - n0)));
  var top = el("div", { class:"top" }, [
    el("a", { class:"back", href:"index.html", text:"← Календарь" }),
    el("h1", { class:"title", html:'<small>Артур × Саша · общий дом</small>Наш дом' }),
    el("div", { class:"hud" }, [
      el("span", { class:"chip lvl", id:"hud-level", title:"Уют " + cf + " / " + n1 }, ["🏡 " + L, el("span", { class:"lvlbar" }, [el("i", { style:"width:" + Math.round(pr * 100) + "%" })]), el("small", { text:cf + "/" + n1, style:"font-family:var(--f-mono);font-size:11px;opacity:.8" })]),
      el("span", { class:"chip", id:"hud-coins", text:"🪙 " + h.coins }),
      el("span", { class:"chip", id:"hud-hearts", text:"💗 " + h.hearts })
    ])
  ]);
  var tabs = el("div", { class:"rooms" }, DD.ROOMS.map(function(r){
    var open = h.rooms[r.id] && h.rooms[r.id].open, visible = open || (r.unlock && h.q >= r.unlock.quest - 3);
    if (!visible) return null;
    return el("button", { class:"rtab" + (S.room === r.id ? " on" : "") + (open ? "" : " locked"), onclick:function(){ if (!open) return openShop("rooms"); switchRoom(r.id); } }, [r.e + " " + r.n + (open ? "" : " 🔒")]);
  }));
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  var qp = CO.questProgress(h, S.cal, now());
  var stage = el("div", { class:"stage", id:"stage" }, [svg, el("div", { class:"tint" }),
    el("div", { class:"zoom" }, [el("button", { text:"+", title:"Приблизить", onclick:function(){ zoomBy(1.3); } }), el("button", { text:"−", title:"Отдалить", onclick:function(){ zoomBy(1 / 1.3); } })]),
    S.mode === "edit" || S.place ? editBar() : null,
    S.hunt ? huntBar() : null,
  ]);
  var foot = el("p", { class:"tip center", style:"margin-top:10px" }, [el("span", { id:"sync", text:syncTxt() }), " · дом общий: всё, что делает один, видит и второй"]);
  var main = el("div", { class:"main" }, [el("div", { class:"left" }, [stage, foot]), aside(qp)]);
  var sy = window.scrollY; app.style.minHeight = app.offsetHeight + "px";
  app.innerHTML = ""; [top, tabs, main].forEach(function(x){ app.appendChild(x); });
  app.style.minHeight = ""; if (window.scrollY !== sy) window.scrollTo(0, sy);
  renderStage(); bindStage(svg);
  renderDock();
}
function renderDock(){
  var h = H(), old = document.getElementById("dock"); if (old) old.remove();
  var mail = CO.mailFor(h, S.cal, now()).length, qd = questBadge();
  var b = function(ico, txt, fn, badge, on){ return el("button", { class:on ? "on" : "", onclick:fn }, [el("i", { text:ico }), txt, badge ? el("span", { class:"badge", text:String(badge) }) : null]); };
  var dock = el("nav", { class:"dock", id:"dock" }, [
    b("🛒", "Магазин", function(){ openShop(); }),
    b("🎒", "Склад", function(){ openBag(); }, Object.keys(h.inv).length ? null : null),
    b(S.mode === "edit" ? "✅" : "✏️", S.mode === "edit" ? "Готово" : "Обставить", toggleEdit, null, S.mode === "edit"),
    b("📜", "Задания", openQuests, qd),
    b("📬", "Почта", openMail, mail),
    CO.hasFn(h, "pond") ? b("🎣", "Рыбалка", openFish) : null,
    CO.hasFn(h, "stove") ? b("🍳", "Кухня", openCook) : null,
    b("🧸", "Прятки", startHunt),
    b("📰", "Лента", openLog)
  ]);
  document.body.appendChild(dock);
}
function questBadge(){
  var h = H(), n = 0, qp = CO.questProgress(h, S.cal, now()); if (qp && qp.done) n++;
  (h.daily ? h.daily.tasks : []).forEach(function(id){ var p = CO.dailyProgress(h, id, S.cal, me.who, now()); if (p[0] >= p[1] && !h.daily.claimed[id]) n++; });
  (h.orders ? h.orders.list : []).forEach(function(o){ if (!o.done && Object.keys(o.need).every(function(k){ return CO.have(h, k) >= o.need[k]; })) n++; });
  return n;
}
function baseZoom(){ return window.innerWidth < 600 ? 1.3 : 1; }
function switchRoom(id){ S.room = id; store("dom-room", id); S.sel = null; S.place = null; S.ghost = null; S.zoom = baseZoom(); S.pan = [0, 0]; if (S.hunt) endHunt(true); render(); }
function toggleEdit(){ S.mode = S.mode === "edit" ? "view" : "edit"; S.sel = null; S.place = null; S.ghost = null; render(); }
function editBar(){
  var h = H(), kids;
  if (S.place){
    var it = ITEM[S.place.id];
    kids = [el("span", { text:(S.place.move ? "Куда переставить «" : "Куда поставить «") + it.n + "»?" }),
      it.k !== "wall" && (it.w !== it.d) ? el("button", { text:"↻", title:"Повернуть", onclick:function(){ S.place.r = S.place.r ? 0 : 1; if (S.ghost){ S.ghost.r = S.place.r; S.ghost.ok = !CO.canPlace(H(), S.room, S.place.id, { x:S.ghost.x, y:S.ghost.y, r:S.ghost.r }, S.place.move); } renderStage(); } }) : null,
      el("button", { text:"Отмена", onclick:function(){ S.place = null; S.ghost = null; renderStage(); } })];
  } else if (S.sel){
    var f = CO.findItem(h, S.sel); if (!f){ S.sel = null; return editBar(); }
    var it2 = ITEM[f.p.i];
    kids = [el("span", { text:it2.n }),
      el("button", { text:"↻ Повернуть", onclick:function(){ var p = f.p; if (it2.k === "wall"){ var room = DD.ROOM[S.room], nw = p.wall === "y" ? "x" : "y", pos = p.wall === "y" ? p.x : p.y; pos = Math.min(pos, (nw === "y" ? room.w : room.d) - it2.w); act("move", { u:p.u, wall:nw, x:nw === "y" ? pos : 0, y:nw === "x" ? pos : 0 }); } else act("move", { u:p.u, x:p.x, y:p.y, r:p.r ? 0 : 1 }); } }),
      el("button", { text:"✋ Переставить", onclick:function(){ S.place = { id:f.p.i, c:f.p.c, r:f.p.r || 0, move:f.p.u }; renderStage(); } }),
      el("button", { text:"📦 На склад", onclick:function(){ if (f.p.crop && !confirm("На грядке растёт урожай — он пропадёт. Убрать грядку?")) return; act("stash", { u:f.p.u }); S.sel = null; renderStage(); } }),
      el("button", { class:"ok", text:"Готово", onclick:toggleEdit })];
  } else kids = [el("span", { text:"Нажми на вещь, чтобы её двигать" }), el("button", { text:"🎒 Склад", onclick:function(){ openBag("furn"); } }), el("button", { class:"ok", text:"Готово", onclick:toggleEdit })];
  return el("div", { class:"editbar", id:"editbar" }, kids);
}
function levelUp(L){ sheet("🎉 Уровень " + L + "!", function(box){ box.appendChild(el("div", { class:"qcard" }, [el("span", { class:"face", html:mascotSVG(66) }), el("div", null, [el("h3", { text:"Дом подрос до " + L + "-го уровня" }), el("p", { text:"Теперь в магазине больше вещей. Мишки аплодируют плюшевыми лапками!" })])])); box.appendChild(el("button", { class:"btn full", style:"margin-top:12px", text:"Ура!", onclick:closeSheet })); }); }

/* ---------- листы ---------- */
function sheet(title, build){
  closeSheet();
  var box = el("div", { class:"sheet" }), bg = el("div", { class:"sheet-bg", onclick:function(e){ if (e.target === bg) closeSheet(); } }, [box]);
  S.sheet = { el:bg, refresh:function(){ var y = box.scrollTop; box.innerHTML = ""; head(); build(box); fitThumbs(box); box.scrollTop = y; } };
  function head(){ box.appendChild(el("h2", null, [title, el("button", { class:"x", text:"✕", onclick:closeSheet })])); }
  head(); build(box); layer.appendChild(bg); fitThumbs(box);
}
function closeSheet(){ if (S.sheet){ S.sheet.el.remove(); S.sheet = null; } }
function thumb(id, c, ctx){
  var it = ITEM[id], col = it.cols ? it.cols[(c || 0) % it.cols.length] : undefined, fn = A.D[it.draw || id];
  var r = A.renderPrims(fn(col, 11, ctx || { night:false, h:10, m:10, day:9, mon:"окт", stage:3, ripe:true }, { fruit:it.fruit ? DD.FRUITS[it.fruit].color : null }), 0, 0, 0);
  var fl = it.k === "wall" ? "" : A.poly([A.P(0,0,0),A.P(it.w,0,0),A.P(it.w,it.d,0),A.P(0,it.d,0)], "#F1E2EE", { stroke:"#E3CFE0", sw:.6 });
  return el("div", { class:"th", html:'<svg class="fit"><g>' + fl + r.body + "</g></svg>" });
}
function fitThumbs(box){ requestAnimationFrame(function(){ box.querySelectorAll("svg.fit").forEach(function(s){ try { var b = s.querySelector("g").getBBox(), p = 6; s.setAttribute("viewBox", (b.x - p) + " " + (b.y - p) + " " + (b.width + 2 * p) + " " + (b.height + 2 * p)); } catch (e){} }); }); }
function tabs(list, cur, onPick){ return el("div", { class:"tabs" }, list.map(function(t){ return el("button", { class:cur === t[0] ? "on" : "", text:t[1], onclick:function(){ onPick(t[0]); } }); })); }
function money(p, hh){ return (p ? "🪙 " + p : "") + (p && hh ? " + " : "") + (hh ? "💗 " + hh : "") || "бесплатно"; }

/* — магазин — */
var shopState = { tab:"furn", cat:"here", col:{} };
function openShop(tab){
  if (tab) shopState.tab = tab;
  sheet("🛒 Магазин", function(box){
    var h = H(), L = CO.level(h);
    box.appendChild(tabs([["furn","Мебель"],["garden","Сад и семена"],["goods","Лавка"],["style","Отделка"],["rooms","Комнаты"],["up","Улучшения"]], shopState.tab, function(t){ shopState.tab = t; S.sheet.refresh(); }));
    if (shopState.tab === "furn" || shopState.tab === "garden"){
      var isG = shopState.tab === "garden";
      if (!isG) box.appendChild(tabs([["here","Для этой комнаты"]].concat(DD.CATS.filter(function(c){ return c.id !== "farm" && c.id !== "yard"; }).map(function(c){ return [c.id, c.n]; })), shopState.cat, function(c){ shopState.cat = c; S.sheet.refresh(); }));
      if (isG){
        box.appendChild(el("div", { class:"sec", text:"Семена" }));
        box.appendChild(el("div", { class:"list" }, DD.CROPS.map(function(c){
          var lock = L < c.l, gh = c.only && !(h.rooms[c.only] && h.rooms[c.only].open);
          return el("div", { class:"li" + (lock ? " done" : "") }, [el("span", { class:"em", text:c.e }), el("div", { class:"bd" }, [el("b", { text:c.n + (CO.bag(h, "s:" + c.id) ? " · есть " + CO.bag(h, "s:" + c.id) : "") }), el("small", { text:"растёт " + fmtDur(c.hrs * 3600e3) + " · продажа 🪙 " + c.sell + (c.only ? " · только в теплице" : "") + (lock ? " · с " + c.l + "-го уровня" : "") })]),
            el("button", { class:"btn soft", text:"🪙 " + c.seed, disabled:lock || gh, onclick:function(){ act("buyGood", { k:"s:" + c.id, n:1 }); } }),
            el("button", { class:"btn", text:"×5", disabled:lock || gh, onclick:function(){ act("buyGood", { k:"s:" + c.id, n:5 }); } })]);
        })));
        box.appendChild(el("div", { class:"sec", text:"Хозяйство и двор" }));
      }
      var items = DD.ITEMS.filter(function(it){
        if (it.hidden) return false;
        if (isG) return it.cat === "farm" || it.cat === "yard";
        if (it.cat === "farm" || it.cat === "yard") return false;
        return shopState.cat === "here" ? CO.roomAllowed(it, S.room) : it.cat === shopState.cat;
      }).sort(function(a, b){ return a.l - b.l || a.p - b.p; });
      if (!items.length) box.appendChild(el("div", { class:"empty", text:DD.ROOM[S.room].outdoor ? "Для двора — вкладка «Сад и семена»" : "Здесь пока нечего купить" }));
      box.appendChild(el("div", { class:"grid" }, items.map(function(it){ return itemCard(it, h, L); })));
    }
    if (shopState.tab === "goods"){
      box.appendChild(el("p", { class:"tip", text:"Продукты для готовки. Свежее — со своего огорода, остальное — тут." }));
      box.appendChild(el("div", { class:"list" }, DD.GOODS.map(function(g){ return el("div", { class:"li" }, [el("span", { class:"em", text:g.e }), el("div", { class:"bd" }, [el("b", { text:g.n }), el("small", { text:"на складе: " + CO.bag(h, "g:" + g.id) })]),
        el("button", { class:"btn soft", text:"🪙 " + g.p, onclick:function(){ act("buyGood", { k:"g:" + g.id, n:1 }); } }), el("button", { class:"btn", text:"×5", onclick:function(){ act("buyGood", { k:"g:" + g.id, n:5 }); } })]); })));
    }
    if (shopState.tab === "style"){
      var room = DD.ROOM[S.room], R = h.rooms[S.room];
      box.appendChild(el("p", { class:"tip", text:"Отделка для комнаты «" + room.n + "». Купленная отделка остаётся навсегда. Каждая смена пола/стен на нестандартные даёт +4 уюта." }));
      [["floor","Пол", A.FLOORS], ["wall","Стены", A.WALLS]].forEach(function(k){
        if (k[0] === "wall" && room.outdoor && !room.wallSide) return;
        box.appendChild(el("div", { class:"sec", text:k[1] }));
        box.appendChild(el("div", { class:"grid" }, Object.keys(k[2]).filter(function(id){ return !(k[0] === "floor" && (id === "grass") && !room.outdoor); }).map(function(id){
          var s = k[2][id], own = h.styles[k[0] + ":" + id], price = CO.STYLE_PRICE[k[0]][id] || 80, on = R[k[0]] === id;
          var sw = el("div", { class:"th", style:"background:" + (s.kind === "stripes" ? "repeating-linear-gradient(90deg," + s.a + " 0 10px," + s.b + " 10px 20px)" : s.kind === "checker" ? "repeating-conic-gradient(" + s.a + " 0 25%," + s.b + " 0 50%) 0 0/24px 24px" : s.kind === "dots" ? "radial-gradient(" + s.b + " 3px,transparent 4px) 0 0/16px 16px," + s.a : s.kind === "stars" ? "radial-gradient(" + s.b + " 1.5px,transparent 2px) 0 0/18px 22px," + s.a : s.kind === "panel" ? "linear-gradient(180deg," + s.a + " 55%," + s.b + " 55%)" : "linear-gradient(135deg," + s.a + "," + (s.b || s.a) + ")") });
          return el("div", { class:"card" }, [sw, el("div", { class:"nm", text:s.name }), el("div", { class:"meta", text:on ? "сейчас" : own ? "куплено" : "🪙 " + price }),
            el("button", { class:"btn" + (on ? " soft" : ""), text:on ? "✓ Выбрано" : own ? "Поставить" : "Купить", disabled:on, onclick:function(){ act("style", { room:S.room, kind:k[0], id:id }); } })]);
        })));
      });
    }
    if (shopState.tab === "rooms"){
      box.appendChild(el("div", { class:"list" }, DD.ROOMS.map(function(r){
        var open = h.rooms[r.id] && h.rooms[r.id].open, u = r.unlock;
        if (!u) return el("div", { class:"li" }, [el("span", { class:"em", text:r.e }), el("div", { class:"bd" }, [el("b", { text:r.n }), el("small", { text:"открыта с начала · " + r.w + "×" + r.d })])]);
        var storyOk = h.q >= u.quest, need = [];
        if (!storyOk) need.push("откроется по сюжету"); if (L < u.lvl) need.push(u.lvl + "-й уровень дома");
        return el("div", { class:"li" + (open ? " done" : "") }, [el("span", { class:"em", text:r.e }), el("div", { class:"bd" }, [el("b", { text:r.n + (open ? " · открыта" : "") }), el("small", { text:r.w + "×" + r.d + " клеток · " + money(u.coins, u.hearts) + (need.length ? " · нужно: " + need.join(", ") : "") })]),
          open ? el("button", { class:"btn soft", text:"Перейти", onclick:function(){ closeSheet(); switchRoom(r.id); } }) : el("button", { class:"btn", text:"Открыть", disabled:!storyOk || L < u.lvl, onclick:function(){ if (act("unlock", { room:r.id })){ closeSheet(); switchRoom(r.id); toast("Открыто: " + r.n + " 🎉"); } } })]);
      })));
    }
    if (shopState.tab === "up"){
      box.appendChild(el("div", { class:"list" }, DD.UPGRADES.map(function(U){
        var cur = h.up[U.id] || 0, nx = U.lv[cur + 1];
        return el("div", { class:"li" }, [el("span", { class:"em", text:U.e }), el("div", { class:"bd" }, [el("b", { text:U.n + " · ур. " + (cur + 1) + "/" + U.lv.length }), el("small", { text:"Сейчас: " + U.d[cur] + (nx ? " → " + U.d[cur + 1] : "") + (nx && L < nx.l ? " · 🔒 нужен " + nx.l + "-й уровень дома" : nx && h.coins < nx.p ? " · не хватает 🪙 " + (nx.p - h.coins) : "") })]),
          nx ? el("button", { class:"btn", text:"🪙 " + nx.p, disabled:L < nx.l || h.coins < nx.p, title:L < nx.l ? "Нужен " + nx.l + "-й уровень" : "", onclick:function(){ act("upgrade", { id:U.id }); } }) : el("span", { class:"chip", text:"макс." })]);
      })));
    }
  });
}
function itemCard(it, h, L){
  var lock = L < it.l, ci = shopState.col[it.id] || 0, own = CO.countOf(h, it.id), maxed = it.max && own >= it.max;
  var why = lock ? "🔒 Нужен " + it.l + "-й уровень дома, у вас " + L + "-й" : maxed ? "Такая вещь бывает только одна" : (it.p || 0) > h.coins ? "Не хватает 🪙 " + (it.p - h.coins) : (it.h || 0) > h.hearts ? "Не хватает 💗 " + (it.h - h.hearts) + ". Сердечки — за задания, заказы и встречи" : "";
  var where = typeof it.at === "string" ? { in:"в доме", out:"на улице", plot:"сад, теплица" }[it.at] : it.at.map(function(r){ return DD.ROOM[r].n.toLowerCase(); }).join(", ");
  return el("div", { class:"card" + (lock ? " locked" : ""), title:lock ? why + ". Уровень растёт от уюта — ставьте вещи и украшайте комнаты" : why || null }, [
    thumb(it.id, ci),
    el("div", { class:"nm", text:it.n }),
    el("div", { class:"meta", text:money(it.p, it.h) + " · уют +" + it.c + (own ? " · есть " + own : "") }),
    el("div", { class:"meta", text:where + " · " + it.w + "×" + it.d }),
    why ? el("div", { class:"why", text:why }) : null,
    it.cols && it.cols.length > 1 ? el("div", { class:"cols" }, it.cols.map(function(c, i){ return el("button", { class:i === ci ? "on" : "", style:"background:" + c, title:"Цвет", onclick:function(){ shopState.col[it.id] = i; S.sheet.refresh(); } }); })) : null,
    el("button", { class:"btn", text:maxed ? "Уже есть" : lock ? "🔒 С " + it.l + "-го уровня" : why ? "Не хватает" : "Купить", disabled:!!why, onclick:function(){
      if (!act("buy", { id:it.id, c:ci })) return;
      if (CO.roomAllowed(it, S.room)){ closeSheet(); S.mode = "edit"; S.sel = null; S.place = { id:it.id, c:ci, r:0 }; S.ghost = null; render(); toast("Нажми на место в комнате"); }
      else toast("Куплено! Лежит на складе — поставить можно: " + where);
    } })
  ]);
}

/* — склад — */
var bagTab = "furn";
function openBag(tab){
  if (tab) bagTab = tab;
  sheet("🎒 Склад", function(box){
    var h = H();
    box.appendChild(tabs([["furn","Мебель"],["crop","Урожай"],["fish","Улов"],["food","Продукты"],["dish","Блюда"]], bagTab, function(t){ bagTab = t; S.sheet.refresh(); }));
    if (bagTab === "furn"){
      var keys = Object.keys(h.inv).filter(function(k){ return h.inv[k] > 0; });
      if (!keys.length) return box.appendChild(el("div", { class:"empty", text:"Склад пуст. Вещи из магазина и убранные из комнат лежат тут." }));
      box.appendChild(el("div", { class:"grid" }, keys.map(function(k){
        var p = k.split(":"), it = ITEM[p[0]], c = +p[1], ok = CO.roomAllowed(it, S.room);
        var where = typeof it.at === "string" ? { in:"любая комната дома", out:"сад, балкон, теплица", plot:"сад, теплица" }[it.at] : it.at.map(function(r){ return DD.ROOM[r].n; }).join(", ");
        return el("div", { class:"card" }, [thumb(it.id, c), el("div", { class:"nm", text:it.n + (h.inv[k] > 1 ? " ×" + h.inv[k] : "") }), el("div", { class:"meta", text:ok ? "уют +" + it.c : "ставится: " + where }),
          el("button", { class:"btn", text:ok ? "Поставить" : "Не сюда", disabled:!ok, onclick:function(){ closeSheet(); S.mode = "edit"; S.sel = null; S.place = { id:it.id, c:c, r:0 }; S.ghost = null; render(); toast("Нажми на место в комнате"); } })]);
      })));
      return;
    }
    var pref = { crop:["c:","f:","s:"], fish:["x:"], food:["g:"], dish:["d:"] }[bagTab];
    var ks = Object.keys(h.bag).filter(function(k){ return h.bag[k] > 0 && pref.some(function(p){ return k.indexOf(p) === 0; }); });
    if (!ks.length) return box.appendChild(el("div", { class:"empty", text:{ crop:"Пока пусто. Сажайте и поливайте!", fish:"Пока пусто. Нужен пруд и удочка.", food:"Продукты — в магазине, во вкладке «Лавка».", dish:"Блюда готовятся на плите на кухне." }[bagTab] }));
    box.appendChild(el("div", { class:"list" }, ks.map(function(k){
      var g = CO.goodInfo(k); if (!g) return null;
      return el("div", { class:"li" }, [el("span", { class:"em", text:g.e }), el("div", { class:"bd" }, [el("b", { text:g.n + " ×" + h.bag[k] }), el("small", { text:g.kind + (g.sell ? " · продажа 🪙 " + g.sell : "") })]),
        g.stars ? el("button", { class:"btn yellow", text:"💝 Угостить", title:"Угостить вторую половинку: +" + g.stars + " 💗", onclick:function(){ var r = act("gift", { k:k }); if (r) toast("Мишки растроганы: +" + r.hearts + " 💗"); } }) : null,
        g.sell ? el("button", { class:"btn soft", text:"Продать", onclick:function(){ act("sell", { k:k, n:1 }); } }) : null,
        g.sell && h.bag[k] > 1 ? el("button", { class:"btn soft", text:"Все", onclick:function(){ act("sell", { k:k, n:h.bag[k] }); } }) : null]);
    })));
  });
}

/* — огород — */
function openPlot(u){
  sheet("🌱 Грядка", function(box){
    var h = H(), f = CO.findItem(h, u); if (!f){ closeSheet(); return; }
    var crop = f.p.crop, L = CO.level(h);
    if (crop){
      var c = DD.CROP[crop.id], info = CO.cropInfo(crop, now(), f.room);
      box.appendChild(el("div", { class:"li" }, [el("span", { class:"em", text:c.e }), el("div", { class:"bd" }, [el("b", { text:c.n + (info.ripe ? " — созрел!" : "") }),
        el("small", { text:info.ripe ? "Можно собирать" : info.wet ? "Полито ещё " + fmtDur(info.wetLeft) + " · созреет через " + fmtDur(info.left) : "Сохнет и не растёт! Осталось расти " + fmtDur(info.left) + " (при поливе)" }),
        el("div", { class:"prog green" }, [el("i", { style:"width:" + Math.round(info.f * 100) + "%" })]),
        !info.ripe ? el("div", { class:"prog blue" }, [el("i", { style:"width:" + Math.round(Math.min(1, info.wetLeft / CO.waterMs(h, f.room)) * 100) + "%" })]) : null])]));
      box.appendChild(el("p", { class:"tip", text:"Растения растут, только пока политы. Если поливает не тот, кто сажал, урожай двойной 💞" }));
      box.appendChild(el("div", { class:"row", style:"display:flex;gap:8px;margin-top:10px" }, [
        info.ripe ? el("button", { class:"btn full", text:"Собрать " + c.e, onclick:function(){ var r = act("harvest", { u:u }); if (r){ closeSheet(); toast("+" + r.n + " " + c.e + " " + c.n.toLowerCase()); } } })
                  : el("button", { class:"btn full", text:"💧 Полить", disabled:info.wet && info.wetLeft > CO.waterMs(h, f.room) * .5, onclick:function(){ act("water", { u:u }); } })
      ]));
      return;
    }
    box.appendChild(el("p", { class:"tip", text:"Что посадим? Семена — в магазине, вкладка «Сад и семена»." }));
    box.appendChild(el("div", { class:"list" }, DD.CROPS.filter(function(c){ return c.l <= L && (!c.only || c.only === f.room); }).map(function(c){
      var n = CO.bag(h, "s:" + c.id);
      return el("div", { class:"li" }, [el("span", { class:"em", text:c.e }), el("div", { class:"bd" }, [el("b", { text:c.n + (n ? " · семян: " + n : "") }), el("small", { text:"растёт " + fmtDur(c.hrs * 3600e3 / (f.room === "greenhouse" ? 1.5 : 1)) + " · продажа 🪙 " + c.sell })]),
        n ? el("button", { class:"btn", text:"Посадить", onclick:function(){ if (act("plant", { u:u, crop:c.id })){ act("water", { u:u }, true); closeSheet(); toast("Посажено и полито 🌱"); } } })
          : el("button", { class:"btn soft", text:"Купить 🪙 " + c.seed, onclick:function(){ if (act("buyGood", { k:"s:" + c.id, n:1 }) && act("plant", { u:u, crop:c.id })){ act("water", { u:u }, true); closeSheet(); toast("Посажено и полито 🌱"); } } })]);
    })));
  });
}

/* — задания — */
function openQuests(){
  sheet("📜 Задания", function(box){
    var h = H(), qp = CO.questProgress(h, S.cal, now());
    if (qp){
      box.appendChild(el("div", { class:"qcard" }, [el("span", { class:"face", html:mascotSVG(68) }), el("div", null, [
        el("h3", { text:qp.q.id + ". " + qp.q.t }), el("p", { text:"«" + qp.q.s + "»" }), el("div", { class:"goal", text:"🎯 " + qp.q.g + " — " + qp.cur + "/" + qp.need }),
        el("div", { class:"prog" }, [el("i", { style:"width:" + Math.round(qp.cur / qp.need * 100) + "%" })]),
        el("div", { class:"row", style:"display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap" }, [el("span", { style:"font-weight:800;font-size:13px", text:"Награда: " + money(qp.q.r.coins, qp.q.r.hearts) + (qp.q.r.items ? " + семена" : "") }),
          el("button", { class:"btn yellow", text:"Забрать", disabled:!qp.done, onclick:function(){ if (act("claimQ", { q:qp.q.id })) toast("Задание выполнено! 🎉"); } })])
      ])]));
    } else box.appendChild(el("div", { class:"qcard" }, [el("span", { class:"face", html:mascotSVG(68) }), el("div", null, [el("h3", { text:"Все задания пройдены!" }), el("p", { text:"«Штаб построен, дом готов. Операция „Навсегда вместе“ — в процессе. Продолжайте дружить и обустраиваться»" })])]));
    var d = h.daily;
    box.appendChild(el("div", { class:"sec", text:"На сегодня · серия дней вместе: " + (h.streak.n || 0) + " 🔥" }));
    box.appendChild(el("div", { class:"list" }, d.tasks.map(function(id){
      var t = DD.DAILY.filter(function(x){ return x.id === id; })[0], p = CO.dailyProgress(h, id, S.cal, me.who, now()), got = d.claimed[id];
      return el("div", { class:"li" + (got ? " done" : "") }, [el("span", { class:"em", text:got ? "✅" : "☀️" }), el("div", { class:"bd" }, [el("b", { text:t.t }), el("small", { text:p[0] + "/" + p[1] + " · " + money(t.r.coins, t.r.hearts) }), el("div", { class:"prog" }, [el("i", { style:"width:" + Math.round(p[0] / p[1] * 100) + "%" })])]),
        got ? null : el("button", { class:"btn", text:"Забрать", disabled:p[0] < p[1], onclick:function(){ act("claimD", { id:id }); } })]);
    })));
    box.appendChild(el("p", { class:"tip", text:"Выполните все четыре — бонус 🪙 50 и 💗 1." }));
    box.appendChild(el("div", { class:"sec", text:"Заказы соседей · обновятся завтра" }));
    box.appendChild(el("div", { class:"list" }, h.orders.list.map(function(o, i){
      var ok = Object.keys(o.need).every(function(k){ return CO.have(h, k) >= o.need[k]; });
      var needTxt = Object.keys(o.need).map(function(k){ var g = k === "fish" ? { e:"🐟", n:"рыба" } : CO.goodInfo(k.split(":").length === 2 && k.indexOf("d:") === 0 ? k + ":1" : k) || { e:"?", n:k }; return (g.e || "") + " " + g.n.replace(/ ★+$/, "") + " " + CO.have(h, k) + "/" + o.need[k]; }).join(" · ");
      return el("div", { class:"li" + (o.done ? " done" : "") }, [el("span", { class:"em", text:o.done ? "✅" : "🧸" }), el("div", { class:"bd" }, [el("b", { text:o.who }), el("small", { text:needTxt + " → " + money(o.coins, o.hearts) })]),
        o.done ? null : el("button", { class:"btn", text:"Отдать", disabled:!ok, onclick:function(){ if (act("order", { i:i })) toast(o.who + ": «Спасибо!» 🧸💗"); } })]);
    })));
  });
}
/* — почта — */
function openMail(){
  sheet("📬 Почта из календаря", function(box){
    var h = H(), list = CO.mailFor(h, S.cal, now());
    box.appendChild(el("p", { class:"tip", text:"Дом награждает за то, что вы делаете на сайте: заполненное расписание, принятые встречи и состоявшиеся свидания." }));
    if (!list.length) return box.appendChild(el("div", { class:"empty", text:"Новых писем нет. Заполняйте календарь и встречайтесь 💌" }));
    box.appendChild(el("div", { class:"list" }, list.map(function(m){ return el("div", { class:"li" }, [el("span", { class:"em", text:m.e }), el("div", { class:"bd" }, [el("b", { text:m.t }), el("small", { text:money(m.coins, m.hearts) })])]); })));
    box.appendChild(el("button", { class:"btn full", style:"margin-top:12px", text:"Забрать всё", onclick:function(){ if (act("claimMail", { list:list.map(function(m){ return { k:m.k, n:m.n, per:m.per, coins:m.coins, hearts:m.hearts }; }) })) toast("Награды получены 💌"); } }));
  });
}
/* — лента — */
function openLog(){
  sheet("📰 Что нового дома", function(box){
    var h = H();
    if (!h.log.length) return box.appendChild(el("div", { class:"empty", text:"Пока тихо. Тут будет видно, что делали вы оба." }));
    box.appendChild(el("div", { class:"list" }, h.log.map(function(l){ return el("div", { class:"li" }, [el("span", { class:"em", text:l.w === "sasha" ? "👩" : "🧑" }), el("div", { class:"bd" }, [el("b", { text:l.s }), el("small", { text:when(l.t) })])]); })));
    if (h.notes.length){ box.appendChild(el("div", { class:"sec", text:"Найденные записки" })); h.notes.forEach(function(i){ box.appendChild(el("div", { class:"note", style:"margin-bottom:10px", text:DD.NOTES[i % DD.NOTES.length] })); }); }
  });
}

/* ---------- мини-игры ---------- */
function game(title, build){
  var box = el("div", { class:"gbox" }), bg = el("div", { class:"game" }, [box]);
  var close = function(){ bg.remove(); if (bg._stop) bg._stop(); render(); };
  box.appendChild(el("h2", null, [title, el("button", { class:"x", text:"✕", onclick:close })]));
  layer.appendChild(bg); build(box, close, bg);
}
// бегунок: игрок нажимает, когда стрелка в зелёной зоне
function timing(box, opts, done){
  var meter = el("div", { class:"meter" }), zw = opts.zone, z0 = 10 + Math.random() * (80 - zw), zone = el("div", { class:"zone", style:"left:" + z0 + "%;width:" + zw + "%" }), pz = el("div", { class:"zone perfect", style:"left:" + (z0 + zw * .35) + "%;width:" + (zw * .3) + "%" }), needle = el("div", { class:"needle" });
  meter.appendChild(zone); meter.appendChild(pz); meter.appendChild(needle); box.appendChild(meter);
  var t0 = performance.now(), sp = opts.speed || 1, x = 0, stop = false;
  function tick(t){ if (stop) return; var ph = ((t - t0) / 1000 * sp * .9) % 2; x = ph < 1 ? ph : 2 - ph; needle.style.left = (x * 100) + "%"; requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  var btn = el("button", { class:"btn full", text:opts.label || "Жми!", onclick:function(){ if (stop) return; stop = true; var p = x * 100, hit = p >= z0 && p <= z0 + zw, perfect = p >= z0 + zw * .35 && p <= z0 + zw * .65; done(hit, perfect); } });
  box.appendChild(btn);
  return function(){ stop = true; };
}
/* — рыбалка — */
function pickFish(h){
  var L = CO.level(h), bonus = [0, .5, 1][h.up.rod || 0], pool = DD.FISH.filter(function(f){ return f.l <= L; }), sum = 0;
  var w = pool.map(function(f){ var x = f.w * (f.w <= 10 ? 1 + bonus : 1); sum += x; return x; }), r = Math.random() * sum;
  for (var i = 0; i < pool.length; i++){ r -= w[i]; if (r <= 0) return pool[i]; } return pool[0];
}
function openFish(){
  var h = H(); if (!CO.hasFn(h, "pond")) return toast("Сначала постройте пруд в саду");
  game("🎣 Рыбалка", function(box, close, bg){
    var stopFn = null, timers = [];
    bg._stop = function(){ if (stopFn) stopFn(); timers.forEach(clearTimeout); };
    function castsLeft(){ var P = (H().pl[me.who] || {}), c = P.casts && P.casts.d === CO.dk(now()) ? P.casts.n : 0; return [10, 13, 16][H().up.rod || 0] - c; }
    function scene(state){ return el("div", { class:"pondview" }, [el("div", { class:"line" }), el("div", { class:"ripple" }), el("div", { class:"bobber " + state })]); }
    function idle(){
      box.querySelectorAll(":scope > :not(h2)").forEach(function(x){ x.remove(); });
      var left = castsLeft();
      box.appendChild(scene("idle"));
      box.appendChild(el("p", { class:"center tip", text:"Забросов на сегодня: " + left + " · поймано всего: " + H().stats.fish }));
      box.appendChild(el("button", { class:"btn full", text:left > 0 ? "Закинуть удочку" : "Удочка отдыхает до завтра", disabled:left <= 0, onclick:cast }));
    }
    function cast(){
      box.querySelectorAll(":scope > :not(h2)").forEach(function(x){ x.remove(); });
      var sc = scene("idle"); box.appendChild(sc); var msg = el("p", { class:"big", text:"Ждём поклёвку…" }); box.appendChild(msg);
      var early = el("button", { class:"btn soft full", text:"Подсечь", onclick:function(){ timers.forEach(clearTimeout); act("fish", { id:null }, true); msg.textContent = "Рано! Рыба испугалась 🐟💨"; early.remove(); timers.push(setTimeout(idle, 1200)); } });
      box.appendChild(early);
      timers.push(setTimeout(function(){
        sc.querySelector(".bobber").className = "bobber bite"; msg.textContent = "Клюёт! Жми!";
        var biteT = setTimeout(function(){ act("fish", { id:null }, true); msg.textContent = "Сорвалась…"; early.remove(); timers.push(setTimeout(idle, 1200)); }, 950);
        timers.push(biteT);
        early.onclick = function(){ clearTimeout(biteT); reel(); };
      }, 1500 + Math.random() * 3500));
    }
    function reel(){
      var fish = pickFish(H()), hits = 0, miss = 0, perf = 0;
      box.querySelectorAll(":scope > :not(h2)").forEach(function(x){ x.remove(); });
      box.appendChild(el("p", { class:"big", text:"Тяни! Попади в зелёное 3 раза" }));
      var dots = el("div", { class:"dots" }, [el("i"), el("i"), el("i"), el("i"), el("i")]); box.appendChild(dots);
      var holder = el("div"); box.appendChild(holder);
      var zone = fish.z * ([1, 1.1, 1.2][H().up.rod || 0]);
      function round(){
        holder.innerHTML = "";
        stopFn = timing(holder, { zone:zone, speed:.9 + (40 - fish.z) / 40 + hits * .15, label:"Тянуть!" }, function(hit, p){
          var d = dots.children[hits + miss]; if (d) d.className = hit ? "ok" : "no";
          if (hit){ hits++; if (p) perf++; } else miss++;
          if (hits >= 3) return win();
          if (miss >= 2) return lose();
          setTimeout(round, 350);
        });
      }
      function win(){
        var a = { id:fish.id }; if (fish.note) a.note = Math.floor(Math.random() * DD.NOTES.length);
        act("fish", a, true);
        holder.innerHTML = "";
        box.appendChild(el("div", { class:"center", style:"font-size:60px", text:fish.e }));
        box.appendChild(el("p", { class:"big", text:fish.junk ? (fish.note ? "Бутылка с запиской! +2 💗" : "Это… " + fish.n.toLowerCase() + " 😅") : "Поймано: " + fish.n + "!" + (fish.id === "goldfish" ? " Загадайте желание вдвоём ✨ +5 💗" : "") }));
        if (fish.note) box.appendChild(el("div", { class:"note", text:DD.NOTES[a.note] }));
        if (!fish.junk) box.appendChild(el("p", { class:"center tip", text:"Продаётся за 🪙 " + fish.sell + " · пригодится в рецептах и заказах" }));
        box.appendChild(el("button", { class:"btn full", text:"Ещё заброс", onclick:idle }));
      }
      function lose(){ act("fish", { id:null }, true); holder.innerHTML = ""; box.appendChild(el("p", { class:"big", text:"Ушла! Это была " + (fish.w <= 4 ? "очень крупная рыба 😱" : "рыбка") })); box.appendChild(el("button", { class:"btn full", text:"Ещё заброс", onclick:idle })); }
      round();
    }
    idle();
  });
}
/* — готовка — */
function openCook(){
  var h = H(); if (!CO.hasFn(h, "stove")) return toast("Нужна плита на кухне");
  game("🍳 Кухня", function(box, close, bg){
    var stopFn = null; bg._stop = function(){ if (stopFn) stopFn(); };
    function list(){
      box.querySelectorAll(":scope > :not(h2)").forEach(function(x){ x.remove(); });
      var h = H(), L = CO.level(h);
      var recs = DD.RECIPES.filter(function(r){ return !r.secret || h.secret[r.id]; });
      var wrap = el("div", { class:"list", style:"max-height:60vh;overflow:auto" }, recs.map(function(r){
        var lock = L < r.l, ok = !lock && Object.keys(r.need).every(function(k){ return CO.have(h, CO.ingKey(k)) >= r.need[k]; });
        var ing = Object.keys(r.need).map(function(k){ var key = CO.ingKey(k), g = k === "fish" ? { e:"🐟", n:"любая рыба" } : CO.goodInfo(key) || { e:"", n:k }; return g.e + " " + g.n + " " + CO.have(h, key) + "/" + r.need[k]; }).join(" · ");
        return el("div", { class:"li" + (lock ? " done" : "") }, [el("span", { class:"em", text:r.e }), el("div", { class:"bd" }, [el("b", { text:r.n + (h.stats.dishSeen[r.id] ? "" : " · новое") }), el("small", { text:(lock ? "🔒 с " + r.l + "-го уровня · " : "") + ing })]),
          el("button", { class:"btn", text:"Готовить", disabled:!ok, onclick:function(){ cook(r); } })]);
      }));
      box.appendChild(el("p", { class:"tip", text:"Попадайте в зелёную зону — будет больше звёзд. Блюдо можно продать, отдать соседям или угостить вторую половинку 💝" }));
      box.appendChild(wrap);
    }
    function cook(r){
      box.querySelectorAll(":scope > :not(h2)").forEach(function(x){ x.remove(); });
      var steps = ["Нарезать", "Помешать", "Подать"], i = 0, score = 0;
      box.appendChild(el("div", { class:"center", style:"font-size:56px", text:r.e }));
      var t = el("p", { class:"big" }); box.appendChild(t);
      var dots = el("div", { class:"dots" }, [el("i"), el("i"), el("i")]); box.appendChild(dots);
      var holder = el("div"); box.appendChild(holder);
      var zone = 26 * [1, 1.25, 1.5][H().up.pan || 0];
      function step(){
        t.textContent = steps[i] + "!"; holder.innerHTML = "";
        stopFn = timing(holder, { zone:zone - i * 3, speed:1 + i * .25, label:steps[i] }, function(hit, perfect){
          dots.children[i].className = hit ? "ok" : "no"; if (hit) score += perfect ? 1.2 : 1; i++;
          if (i < 3) return setTimeout(step, 300);
          var stars = Math.max(1, Math.min(3, Math.round(score)));
          act("cook", { rec:r.id, stars:stars }, true);
          holder.innerHTML = ""; t.textContent = r.n + " " + "★★★".slice(0, stars) + "☆☆☆".slice(0, 3 - stars);
          box.appendChild(el("p", { class:"center tip", text:stars === 3 ? "Идеально! Мишки в полном восторге" : stars === 2 ? "Очень вкусно!" : "Съедобно. В следующий раз получится лучше" }));
          box.appendChild(el("div", { style:"display:flex;gap:8px" }, [el("button", { class:"btn soft full", text:"К рецептам", onclick:list }), el("button", { class:"btn full", text:"Готово", onclick:close })]));
        });
      }
      step();
    }
    list();
  });
}
/* — прятки с мишками — */
function startHunt(){
  var h = H(), P = h.pl[me.who] || {};
  if (P.hunt === CO.dk(now())) return toast("Мишки уже спрятались до завтра 🧸");
  if (S.mode === "edit") toggleEdit();
  var room = DD.ROOM[S.room], R = h.rooms[S.room], spots = [];
  // прячутся у вещей: рядом и под ними
  R.items.forEach(function(p){ var it = ITEM[p.i]; if (it.k === "wall") return; var rc = CO.rectOf(p); spots.push({ x:rc.x0 + Math.random() * (rc.x1 - rc.x0 - .3), y:rc.y0 + Math.random() * (rc.y1 - rc.y0 - .3), z:0 }); spots.push({ x:Math.min(room.w - .3, rc.x1 + .05), y:rc.y0 + Math.random() * .5, z:0 }); });
  for (var i = 0; i < 12; i++) spots.push({ x:Math.random() * (room.w - .4), y:Math.random() * (room.d - .4), z:0 });
  spots.sort(function(){ return Math.random() - .5; });
  S.hunt = { roaches:spots.slice(0, 5).map(function(s){ return { x:s.x, y:s.y, z:s.z, rot:Math.random() < .5 ? 1 : 0, found:false }; }), end:Date.now() + 40000, room:S.room };
  S.huntTimer = setInterval(function(){ if (!S.hunt) return clearInterval(S.huntTimer); var hb = document.getElementById("huntbar"); if (hb) hb.replaceWith(huntBar()); if (Date.now() > S.hunt.end) endHunt(); }, 250);
  render(); toast("Найди 5 мишек за 40 секунд! 🧸");
}
function huntBar(){ var hu = S.hunt, f = hu.roaches.filter(function(r){ return r.found; }).length, left = Math.max(0, hu.end - Date.now());
  return el("div", { class:"huntbar", id:"huntbar" }, ["🧸 " + f + "/5", el("div", { class:"prog" }, [el("i", { style:"width:" + (left / 400) + "%" })]), Math.ceil(left / 1000) + " с", el("button", { class:"btn soft", style:"padding:4px 10px", text:"Сдаюсь", onclick:function(){ endHunt(); } })]); }
function foundRoach(i, e){ var r = S.hunt.roaches[i]; if (!r || r.found) return; r.found = true; floatAt(e.clientX, e.clientY - 20, "+12 🪙", "#B58500"); renderStage(); if (S.hunt.roaches.every(function(x){ return x.found; })) endHunt(); }
function endHunt(silent){
  if (!S.hunt) return; var f = S.hunt.roaches.filter(function(r){ return r.found; }).length; S.hunt = null; clearInterval(S.huntTimer);
  if (silent){ render(); return; }
  var r = act("hunt", { found:f }, true); render();
  toast(f === 5 ? "Все пятеро найдены! +60 🪙 +1 💗" : "Найдено " + f + " из 5 · +" + (f * 12) + " 🪙");
}

/* ---------- вход ---------- */
function gate(msg, sub){ app.innerHTML = ""; app.appendChild(el("div", { class:"gate" }, [el("div", null, [el("h1", { text:"🏡 Наш дом" }), el("p", { style:"font-weight:700", text:msg }), sub ? el("p", { class:"tip", text:sub }) : null, el("a", { class:"back", href:"index.html", text:"← На сайт" })])])); }
function intro(){
  sheet("🏡 Добро пожаловать домой", function(box){
    box.appendChild(el("div", { class:"qcard" }, [el("span", { class:"face", html:mascotSVG(68) }), el("div", null, [el("h3", { text:"Главный мишка" }), el("p", { text:"«" + DD.Q[0].s + "»" })])]));
    box.appendChild(el("div", { class:"list", style:"margin-top:12px" }, [
      ["🛒", "Покупайте мебель и ставьте её куда хотите", "кнопка «Обставить» — двигать, вращать, убирать"],
      ["🌱", "Сад, грядки, деревья, пруд", "растения растут только политыми — поливайте по очереди"],
      ["🍳", "Кухня, рецепты, рыбалка", "мини-игры на точность и редкие находки"],
      ["📬", "Календарь тоже помогает", "за заполненное расписание и встречи приходят награды"],
      ["📜", "30 сюжетных заданий + ежедневные", "и заказы соседей-мишек каждый день"]
    ].map(function(r){ return el("div", { class:"li" }, [el("span", { class:"em", text:r[0] }), el("div", { class:"bd" }, [el("b", { text:r[1] }), el("small", { text:r[2] })])]); })));
    box.appendChild(el("button", { class:"btn full", style:"margin-top:14px", text:"Поехали!", onclick:function(){ act("intro", {}, true); closeSheet(); } }));
  });
}
function boot(){
  if (!me || !me.code) return gate("Сначала войди на сайте", "Дом открывается из календаря «Кто где?»");
  if (!API) return gate("Нет адреса сервера в config.js");
  api({ action:"homeGet" }).then(function(j){
    if (!j.ok) return gate(j.error === "locked" ? "Дом пока закрыт 🔒" : "Не получилось загрузить дом", j.error === "locked" ? "Скоро откроется" : "Попробуй обновить страницу");
    if (j.now) S.skew = j.now - Date.now();
    S.cal = j.cal || null;
    if (j.home){ S.committed = j.home; }
    else { S.committed = CO.newHome(now(), me.who); S.committed.v = 0; }
    recompute(); S.zoom = baseZoom();
    if (!S.local.rooms[S.room] || !S.local.rooms[S.room].open) S.room = "living";
    render();
    if (!S.committed.v) flush();
    var vk = "dom-visit-" + me.who + "-" + CO.dk(now()) + "-" + S.local.created; if (!read(vk)){ store(vk, 1); act("visit", {}, true); }
    if (!S.local.intro) intro();
    if (!S.local.boxes) act("boxes", {}, true);
    setInterval(npcTick, 1300);
    bgHearts(); setTimeout(catchHeart, 12000);
    setInterval(function(){ if (!document.hidden && Date.now() - S.lastPull > 14000) pull(); }, 5000);
    setInterval(function(){ if (!S.place) renderStage(); }, 30000);
    setInterval(checkVersion, 5 * 60000);
    window.addEventListener("pagehide", bye);
    document.addEventListener("visibilitychange", function(){ if (document.hidden) bye(); else checkVersion(); });
    document.addEventListener("visibilitychange", function(){ if (!document.hidden){ pull(); var vk2 = "dom-visit-" + me.who + "-" + CO.dk(now()) + "-" + S.local.created; if (!read(vk2)){ store(vk2, 1); act("visit", {}, true); } } });
  }).catch(function(){ gate("Нет связи с сервером", "Проверь интернет и обнови страницу"); });
}
window.addEventListener("keydown", function(e){ if (e.key === "Escape"){ if (S.place){ S.place = null; S.ghost = null; renderStage(); } else closeSheet(); } if ((e.key === "r" || e.key === "к") && S.place){ var it = ITEM[S.place.id]; if (it.k !== "wall"){ S.place.r = S.place.r ? 0 : 1; if (S.ghost){ S.ghost.r = S.place.r; } renderStage(); } } });
window.DOMDBG = { catchHeart:catchHeart, S:S, act:act, render:render, switchRoom:switchRoom, openShop:openShop, openBag:openBag, openQuests:openQuests, openFish:openFish, openCook:openCook, startHunt:startHunt, openPlot:openPlot };
boot();
})();
