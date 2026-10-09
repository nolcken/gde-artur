/* «Наш дом» — правила игры: состояние, действия, задания, заказы, награды за календарь */
(function(){
"use strict";
var DD = DOM_DATA, ITEM = DD.ITEM, ROOM = DD.ROOM, CROP = DD.CROP, FRUITS = DD.FRUITS, FISHI = DD.FISHI, GOOD = DD.GOOD, RECIPE = DD.RECIPE;
var NAMES = { artur:"Артур", sasha:"Саша" };
var STYLE_PRICE = { floor:{ oak:0, walnut:90, herring:120, tiles:70, checker:110, pink:80, lilac:80, mint:70, stone:90, grass:0, deck:0 },
                    wall:{ cream:0, blush:60, lilac:60, mint:60, sky:60, sun:60, stripes:110, dots:110, panel:140, night:180 } };

function dk(ts){ return new Date(ts + 3 * 3600e3).toISOString().slice(0, 10); }               // минская дата
function hourOf(ts){ return new Date(ts + 3 * 3600e3).getUTCHours(); }
function addDays(iso, n){ var p = iso.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 864e5).toISOString().slice(0, 10); }
function monday(iso){ var p = iso.split("-"), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])), d = (t.getUTCDay() + 6) % 7; return addDays(iso, -d); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function rng(seed){ var s = ART.hash(seed) || 1; return function(){ s = (Math.imul(s, 1664525) + 1013904223) | 0; return ((s >>> 0) % 1e6) / 1e6; }; }

/* ---------- новый дом ---------- */
function newHome(ts, who){
  var h = {
    ver:1, created:ts, by:who, coins:300, hearts:3, seq:1, q:1, intro:0,
    rooms:{ living:{ open:1, floor:"oak", wall:"cream", items:[] } },
    inv:{ "floor_lamp:0":1, "plant_small:0":1, "calendar:0":1 },
    bag:{ "g:flour":1, "g:milk":1, "g:egg":1 },
    styles:{ "floor:oak":1, "wall:cream":1, "floor:grass":1, "floor:deck":1, "floor:tiles":1, "floor:pink":1, "floor:mint":1, "floor:stone":1, "floor:walnut":1, "wall:mint":1, "wall:lilac":1, "wall:sky":1, "wall:night":1, "wall:blush":1 },
    up:{ rod:0, can:0, pan:0 },
    stats:{ planted:0, water:0, harvest:0, fish:0, cooked:0, three:0, orders:0, hunts:0, huntPerfect:0, fruit:0, sold:0, gifts:0, crops:{}, fishSeen:{}, dishSeen:{} },
    claims:{}, notes:[], secret:{}, log:[], pl:{}, daily:null, orders:null, streak:{ n:0, best:0 }
  };
  h.rooms.living.items.push({ u:h.seq++, i:"window", c:0, wall:"y", x:3 });
  h.rooms.living.items.push({ u:h.seq++, i:"rug_round", c:0, x:3, y:3, r:0 });
  return h;
}

/* ---------- геометрия ---------- */
function roomAllowed(it, roomId){
  var at = it.at;
  if (typeof at === "string") return (DD.WHERE[at] || []).indexOf(roomId) >= 0;
  return at.indexOf(roomId) >= 0;
}
function foot(it, r){ return r ? [it.d, it.w] : [it.w, it.d]; }
function rectOf(p){ var it = ITEM[p.i], f = foot(it, p.r); return { x0:p.x, y0:p.y, x1:p.x + f[0], y1:p.y + f[1] }; }
function canPlace(h, roomId, itemId, pos, ignoreU){
  var it = ITEM[itemId], room = ROOM[roomId], R = h.rooms[roomId];
  if (!it || !room || !R || !R.open) return "Комната закрыта";
  if (!roomAllowed(it, roomId)) return "Сюда это не поставить";
  if (it.k === "wall"){
    if (room.outdoor) return "Здесь нет стен";
    var len = pos.wall === "y" ? room.w : room.d, p0 = pos.wall === "y" ? pos.x : pos.y;
    if (p0 < 0 || p0 + it.w > len || p0 !== Math.floor(p0)) return "Не помещается на стене";
    for (var i = 0; i < R.items.length; i++){ var q = R.items[i], qi = ITEM[q.i]; if (q.u === ignoreU || qi.k !== "wall" || q.wall !== pos.wall) continue;
      var a0 = pos.wall === "y" ? q.x : q.y; if (p0 < a0 + qi.w && a0 < p0 + it.w) return "Место на стене занято"; }
    return null;
  }
  var f = foot(it, pos.r);
  if (pos.x < 0 || pos.y < 0 || pos.x + f[0] > room.w || pos.y + f[1] > room.d) return "Не помещается";
  for (var j = 0; j < R.items.length; j++){ var o = R.items[j], oi = ITEM[o.i]; if (o.u === ignoreU || oi.k === "wall") continue;
    if ((oi.k === "rug") !== (it.k === "rug")) continue;
    var b = rectOf(o); if (pos.x < b.x1 && b.x0 < pos.x + f[0] && pos.y < b.y1 && b.y0 < pos.y + f[1]) return "Место занято"; }
  return null;
}
function countOf(h, id){ var n = 0; Object.keys(h.rooms).forEach(function(r){ h.rooms[r].items.forEach(function(p){ if (p.i === id) n++; }); }); Object.keys(h.inv).forEach(function(k){ if (k.split(":")[0] === id) n += h.inv[k]; }); return n; }
function placedOf(h, id, roomId){ var n = 0; Object.keys(h.rooms).forEach(function(r){ if (roomId && r !== roomId) return; h.rooms[r].items.forEach(function(p){ if (p.i === id) n++; }); }); return n; }
function findItem(h, u){ var out = null; Object.keys(h.rooms).forEach(function(r){ h.rooms[r].items.forEach(function(p, i){ if (p.u === u) out = { room:r, p:p, idx:i }; }); }); return out; }

/* ---------- уют и уровень ---------- */
function comfort(h){
  var seen = {}, c = 0;
  Object.keys(h.rooms).forEach(function(r){ var R = h.rooms[r]; if (!R.open) return;
    R.items.forEach(function(p){ var it = ITEM[p.i]; if (!it) return; seen[p.i] = (seen[p.i] || 0) + 1; c += it.c * Math.pow(.6, seen[p.i] - 1); });
    var room = ROOM[r]; if (room && R.floor !== room.floor) c += 4; if (room && R.wall && room.wall && R.wall !== room.wall) c += 4;
  });
  return Math.round(c);
}
function level(h){ return DD.levelOf(comfort(h)); }

/* ---------- огород ---------- */
function waterMs(h, roomId){ var base = [4, 6, 8][h.up.can || 0] * 3600e3; return roomId === "greenhouse" ? base * 2 : base; }
function growMul(roomId){ return roomId === "greenhouse" ? 1.5 : 1; }
function settle(crop, ts, roomId){
  if (!crop) return;
  var from = crop.upd || ts, to = Math.min(ts, crop.wet || 0);
  if (to > from) crop.prog = (crop.prog || 0) + (to - from) * growMul(roomId);
  crop.upd = ts;
}
function cropInfo(crop, ts, roomId){
  if (!crop) return null;
  var c = CROP[crop.id], need = c.hrs * 3600e3, prog = crop.prog || 0, from = crop.upd || ts, to = Math.min(ts, crop.wet || 0);
  if (to > from) prog += (to - from) * growMul(roomId);
  var f = Math.min(1, prog / need), wet = (crop.wet || 0) > ts;
  var left = Math.max(0, need - prog) / growMul(roomId);
  return { f:f, ripe:f >= 1, wet:wet, stage:f >= 1 ? 3 : f >= .5 ? 2 : f > 0.02 ? 1 : 0, left:left, wetLeft:Math.max(0, (crop.wet || 0) - ts) };
}

/* ---------- день: задания, заказы, серия ---------- */
var NEIGHBORS = ["Таракан Гоша", "Бабушка Тараканиха", "Таракан-студент Петя", "Соседка Люся", "Таракан-шеф Жорж", "Близнецы Усачи", "Тётушка Плюша", "Дедушка Шуршун"];
function hasFn(h, fn){ var ok = false; Object.keys(h.rooms).forEach(function(r){ h.rooms[r].items.forEach(function(p){ if (ITEM[p.i] && ITEM[p.i].fn === fn) ok = true; }); }); return ok; }
function goodsPool(h){
  var L = level(h), pool = [];
  DD.CROPS.forEach(function(c){ if (c.l <= L && (!c.only || (h.rooms[c.only] && h.rooms[c.only].open))) pool.push({ k:"c:" + c.id, v:c.sell, n:c.n, e:c.e, q:3 }); });
  Object.keys(FRUITS).forEach(function(f){ var tid = { apple:"tree_apple", cherry:"tree_cherry", lemon:"tree_lemon" }[f]; if (placedOf(h, tid)) pool.push({ k:"f:" + f, v:FRUITS[f].sell, n:FRUITS[f].n, e:FRUITS[f].e, q:3 }); });
  if (hasFn(h, "pond")) DD.FISH.forEach(function(f){ if (!f.junk && f.l <= L && f.id !== "goldfish") pool.push({ k:"x:" + f.id, v:f.sell, n:f.n, e:f.e, q:2 }); });
  if (hasFn(h, "stove")) DD.RECIPES.forEach(function(r){ if (!r.secret && r.l <= L) pool.push({ k:"d:" + r.id, v:r.sell, n:r.n, e:r.e, q:1, dish:true }); });
  return pool;
}
function makeOrders(h, date){
  var pool = goodsPool(h), list = [];
  for (var i = 0; i < 3; i++){
    var R = rng(date + ":o" + i + ":" + h.created), needs = {}, sum = 0, cnt = 1 + Math.floor(R() * Math.min(3, 1 + Math.floor(pool.length / 3)));
    for (var j = 0; j < cnt && pool.length; j++){ var g = pool[Math.floor(R() * pool.length)]; if (needs[g.k]) continue; var q = 1 + Math.floor(R() * g.q); needs[g.k] = q; sum += g.v * q; }
    list.push({ who:NEIGHBORS[Math.floor(R() * NEIGHBORS.length)], need:needs, coins:Math.max(20, Math.round(sum * 1.6 / 5) * 5), hearts:sum >= 250 ? 1 : 0, done:0 });
  }
  return { date:date, list:list };
}
function makeDaily(h, date){
  var R = rng(date + ":d:" + h.created), pool = DD.DAILY.filter(function(t){ return t.id !== "both" && (!t.req || hasFn(h, t.req)); }), pick = ["both"];
  if (!(h.rooms.garden && h.rooms.garden.open)) pool = pool.filter(function(t){ return t.id !== "water" && t.id !== "harvest"; });
  while (pick.length < 4 && pool.length){ var k = Math.floor(R() * pool.length); pick.push(pool[k].id); pool.splice(k, 1); }
  return { date:date, tasks:pick, cnt:{}, visits:{}, claimed:{} };
}
function ensureDay(h, ts){
  var d = dk(ts);
  if (!h.daily || h.daily.date !== d){
    if (h.daily){
      var both = h.daily.visits.artur && h.daily.visits.sasha;
      if (both && h.daily.date === addDays(d, -1)){ h.streak.n = (h.streak.n || 0) + 1; h.streak.best = Math.max(h.streak.best || 0, h.streak.n); }
      else if (h.daily.date !== addDays(d, -1) || !both) h.streak.n = 0;
    }
    h.daily = makeDaily(h, d);
  }
  if (!h.orders || h.orders.date !== d) h.orders = makeOrders(h, d);
  return h.daily;
}
function cnt(h, ts, k, n){ var d = ensureDay(h, ts); d.cnt[k] = (d.cnt[k] || 0) + (n || 1); }
function pl(h, who){ if (!h.pl[who]) h.pl[who] = {}; return h.pl[who]; }

/* ---------- мешок ---------- */
function bag(h, k){ return h.bag[k] || 0; }
function bagAdd(h, k, n){ h.bag[k] = (h.bag[k] || 0) + n; if (h.bag[k] <= 0) delete h.bag[k]; }
function goodInfo(k){
  var p = k.split(":"), t = p[0], id = p[1];
  if (t === "c"){ var c = CROP[id]; return c && { n:c.n, e:c.e, sell:c.sell, kind:"Урожай" }; }
  if (t === "s"){ var s = CROP[id]; return s && { n:"Семена: " + s.n.toLowerCase(), e:"🌱", sell:Math.floor(s.seed / 2), kind:"Семена" }; }
  if (t === "f"){ var f = FRUITS[id]; return f && { n:f.n, e:f.e, sell:f.sell, kind:"Фрукты" }; }
  if (t === "x"){ var x = FISHI[id]; return x && { n:x.n, e:x.e, sell:x.sell, kind:"Улов" }; }
  if (t === "g"){ var g = GOOD[id]; return g && { n:g.n, e:g.e, sell:Math.floor(g.p / 2), kind:"Продукты" }; }
  if (t === "d"){ var r = RECIPE[id], st = +p[2] || 1; return r && { n:r.n + " " + "★★★".slice(0, st), e:r.e, sell:Math.round(r.sell * [1, 1, 1.5, 2.2][st]), kind:"Блюда", stars:st }; }
  return null;
}
// сколько есть с учётом «любой рыбы» и блюд любого качества
function have(h, k){
  if (k === "fish"){ var n = 0; Object.keys(h.bag).forEach(function(b){ var p = b.split(":"); if (p[0] === "x" && FISHI[p[1]] && !FISHI[p[1]].junk && !FISHI[p[1]].notfish) n += h.bag[b]; }); return n; }
  if (k.indexOf("d:") === 0 && k.split(":").length === 2){ var m = 0; Object.keys(h.bag).forEach(function(b){ if (b.indexOf(k + ":") === 0) m += h.bag[b]; }); return m; }
  return bag(h, k);
}
function take(h, k, n){
  if (have(h, k) < n) return false;
  if (k === "fish" || (k.indexOf("d:") === 0 && k.split(":").length === 2)){
    var keys = Object.keys(h.bag).filter(function(b){
      var p = b.split(":");
      return k === "fish" ? p[0] === "x" && FISHI[p[1]] && !FISHI[p[1]].junk && !FISHI[p[1]].notfish : b.indexOf(k + ":") === 0;
    }).sort(function(a, b){ return (goodInfo(a).sell || 0) - (goodInfo(b).sell || 0); });
    keys.forEach(function(b){ while (n > 0 && h.bag[b]){ bagAdd(h, b, -1); n--; } });
    return true;
  }
  bagAdd(h, k, -n); return true;
}
// ключ ингредиента рецепта → ключ в мешке
function ingKey(id){ if (id === "fish") return "fish"; if (CROP[id]) return "c:" + id; if (FRUITS[id]) return "f:" + id; if (FISHI[id]) return "x:" + id; if (GOOD[id]) return "g:" + id; return id; }

function log(h, who, txt, ts){ h.log.unshift({ t:ts, w:who, s:txt }); if (h.log.length > 60) h.log.length = 60; }

/* ---------- действия ---------- */
function E(msg){ return { ok:false, err:msg }; }
function apply(h, op){
  var a = op.a || {}, ts = op.ts, who = op.who, nm = NAMES[who] || who;
  ensureDay(h, ts);
  switch (op.t){
    case "intro": h.intro = 1; return { ok:true };
    case "visit": {
      h.daily.visits[who] = 1; var P = pl(h, who); P.last = ts; return { ok:true };
    }
    case "buy": {
      var it = ITEM[a.id]; if (!it) return E("Нет такого предмета");
      if (level(h) < it.l) return E("Нужен " + it.l + "-й уровень дома");
      if (it.max && countOf(h, a.id) >= it.max) return E("Больше одного не нужно");
      var n = Math.max(1, Math.min(10, a.n || 1)), cost = (it.p || 0) * n, hc = (it.h || 0) * n;
      if (h.coins < cost) return E("Не хватает монет"); if (h.hearts < hc) return E("Не хватает сердечек");
      h.coins -= cost; h.hearts -= hc;
      var key = a.id + ":" + (a.c || 0); h.inv[key] = (h.inv[key] || 0) + n;
      cnt(h, ts, "decor"); log(h, who, nm + " " + (who === "sasha" ? "купила" : "купил") + " «" + it.n + "»" + (n > 1 ? " ×" + n : ""), ts);
      return { ok:true };
    }
    case "buyGood": {
      var k = a.k, n2 = Math.max(1, Math.min(50, a.n || 1)), price;
      if (k.indexOf("s:") === 0){ var cr = CROP[k.slice(2)]; if (!cr) return E("Нет таких семян"); if (level(h) < cr.l) return E("Нужен " + cr.l + "-й уровень"); price = cr.seed; }
      else if (k.indexOf("g:") === 0){ var g = GOOD[k.slice(2)]; if (!g) return E("Нет такого товара"); price = g.p; }
      else return E("Нельзя купить");
      if (h.coins < price * n2) return E("Не хватает монет");
      h.coins -= price * n2; bagAdd(h, k, n2); return { ok:true };
    }
    case "place": {
      var key2 = a.id + ":" + (a.c || 0); if (!h.inv[key2]) return E("Этого нет на складе");
      var it2 = ITEM[a.id], pos = it2.k === "wall" ? { wall:a.wall, x:a.wall === "y" ? a.x : 0, y:a.wall === "x" ? a.y : 0 } : { x:a.x, y:a.y, r:a.r ? 1 : 0 };
      var bad = canPlace(h, a.room, a.id, pos); if (bad) return E(bad);
      h.inv[key2]--; if (!h.inv[key2]) delete h.inv[key2];
      var p = { u:h.seq++, i:a.id, c:a.c || 0 }; Object.keys(pos).forEach(function(x){ p[x] = pos[x]; });
      if (it2.fn === "tree") p.ft = ts + FRUITS[it2.fruit].hrs * 3600e3;
      h.rooms[a.room].items.push(p); cnt(h, ts, "decor");
      return { ok:true, u:p.u };
    }
    case "move": {
      var f = findItem(h, a.u); if (!f) return E("Предмет не найден");
      var it3 = ITEM[f.p.i], pos3 = it3.k === "wall" ? { wall:a.wall, x:a.wall === "y" ? a.x : 0, y:a.wall === "x" ? a.y : 0 } : { x:a.x, y:a.y, r:a.r ? 1 : 0 };
      var room3 = a.room || f.room, bad3 = canPlace(h, room3, f.p.i, pos3, a.u); if (bad3) return E(bad3);
      if (room3 !== f.room){ h.rooms[f.room].items.splice(f.idx, 1); h.rooms[room3].items.push(f.p); }
      Object.keys(pos3).forEach(function(x){ f.p[x] = pos3[x]; }); if (it3.k === "wall"){ if (pos3.wall === "y") delete f.p.y; else delete f.p.x; delete f.p.r; }
      cnt(h, ts, "decor"); return { ok:true };
    }
    case "stash": {
      var f4 = findItem(h, a.u); if (!f4) return E("Предмет не найден");
      h.rooms[f4.room].items.splice(f4.idx, 1);
      var key4 = f4.p.i + ":" + (f4.p.c || 0); h.inv[key4] = (h.inv[key4] || 0) + 1;
      return { ok:true };
    }
    case "style": {
      var R5 = h.rooms[a.room]; if (!R5 || !R5.open) return E("Комната закрыта");
      var tbl = a.kind === "floor" ? ART.FLOORS : ART.WALLS; if (!tbl[a.id]) return E("Нет такой отделки");
      if (a.kind === "wall" && ROOM[a.room].outdoor && !ROOM[a.room].wallSide) return E("Здесь нет стен");
      var sk = a.kind + ":" + a.id, pr = (STYLE_PRICE[a.kind][a.id] || 80);
      if (!h.styles[sk]){ if (h.coins < pr) return E("Не хватает монет"); h.coins -= pr; h.styles[sk] = 1; }
      R5[a.kind] = a.id; cnt(h, ts, "decor"); return { ok:true };
    }
    case "unlock": {
      var room6 = ROOM[a.room]; if (!room6 || !room6.unlock) return E("Нет такой комнаты");
      if (h.rooms[a.room] && h.rooms[a.room].open) return E("Уже открыто");
      var u6 = room6.unlock;
      if (h.q < u6.quest) return E("Откроется по сюжету позже");
      if (level(h) < u6.lvl) return E("Нужен " + u6.lvl + "-й уровень дома");
      if (h.coins < u6.coins) return E("Не хватает монет"); if (h.hearts < u6.hearts) return E("Не хватает сердечек");
      h.coins -= u6.coins; h.hearts -= u6.hearts;
      h.rooms[a.room] = { open:1, floor:room6.floor, wall:room6.wall || "cream", items:[] };
      if (a.room === "garden"){ var s0 = 1; [[2,2],[3,2]].forEach(function(xy){ h.rooms.garden.items.push({ u:h.seq++, i:"garden_bed", c:0, x:xy[0], y:xy[1], r:0 }); s0++; }); }
      log(h, who, nm + " " + (who === "sasha" ? "открыла" : "открыл") + " комнату «" + room6.n + "»", ts);
      return { ok:true };
    }
    case "plant": {
      var f7 = findItem(h, a.u); if (!f7 || ITEM[f7.p.i].fn !== "plot") return E("Это не грядка");
      if (f7.p.crop) return E("Грядка занята");
      var c7 = CROP[a.crop]; if (!c7) return E("Нет таких семян");
      if (c7.only && f7.room !== c7.only) return E("Растёт только в теплице");
      if (!take(h, "s:" + a.crop, 1)) return E("Нет семян");
      f7.p.crop = { id:a.crop, prog:0, upd:ts, wet:0, by:who };
      h.stats.planted++; return { ok:true };
    }
    case "water": {
      var list = [];
      if (a.all){ var R8 = h.rooms[a.room]; if (!R8) return E("Нет комнаты"); R8.items.forEach(function(p){ if (p.crop) list.push({ p:p, room:a.room }); }); }
      else { var f8 = findItem(h, a.u); if (!f8 || !f8.p.crop) return E("Нечего поливать"); list.push(f8); }
      var nW = 0;
      list.forEach(function(x){ var info = cropInfo(x.p.crop, ts, x.room); if (info.ripe || info.wet && info.wetLeft > waterMs(h, x.room) * .5) return; settle(x.p.crop, ts, x.room); x.p.crop.wet = ts + waterMs(h, x.room); x.p.crop.wb = who; nW++; });
      if (!nW) return E(a.all ? "Всё уже полито" : "Уже полито");
      h.stats.water += nW; cnt(h, ts, "water", nW); return { ok:true, n:nW };
    }
    case "harvest": {
      var f9 = findItem(h, a.u); if (!f9 || !f9.p.crop) return E("Нечего собирать");
      var inf = cropInfo(f9.p.crop, ts, f9.room); if (!inf.ripe) return E("Ещё не созрело");
      var id9 = f9.p.crop.id, y9 = 1 + (f9.p.crop.wb && f9.p.crop.by && f9.p.crop.wb !== f9.p.crop.by ? 1 : 0);
      bagAdd(h, "c:" + id9, y9); f9.p.crop = null;
      h.stats.harvest += y9; h.stats.crops[id9] = (h.stats.crops[id9] || 0) + y9; cnt(h, ts, "harvest", y9);
      return { ok:true, n:y9, id:id9 };
    }
    case "pick": {
      var f10 = findItem(h, a.u); if (!f10 || ITEM[f10.p.i].fn !== "tree") return E("Это не дерево");
      if (ts < (f10.p.ft || 0)) return E("Плоды ещё не созрели");
      var fr = ITEM[f10.p.i].fruit, Fr = FRUITS[fr];
      bagAdd(h, "f:" + fr, Fr.yield); f10.p.ft = ts + Fr.hrs * 3600e3; h.stats.fruit += Fr.yield; cnt(h, ts, "harvest", Fr.yield);
      return { ok:true, n:Fr.yield, id:fr };
    }
    case "sell": {
      var gi = goodInfo(a.k); if (!gi) return E("Нельзя продать");
      var n11 = Math.max(1, Math.min(bag(h, a.k), a.n || 1)); if (!bag(h, a.k)) return E("Нечего продавать");
      bagAdd(h, a.k, -n11); h.coins += gi.sell * n11; h.stats.sold += n11; cnt(h, ts, "sell");
      return { ok:true, coins:gi.sell * n11 };
    }
    case "fish": {
      var P12 = pl(h, who), d12 = dk(ts); if (!P12.casts || P12.casts.d !== d12) P12.casts = { d:d12, n:0 };
      var max12 = [10, 13, 16][h.up.rod || 0]; if (P12.casts.n >= max12) return E("Удочка отдыхает до завтра");
      if (!hasFn(h, "pond")) return E("Нужен пруд");
      P12.casts.n++;
      if (!a.id) return { ok:true };
      var fi = FISHI[a.id]; if (!fi) return E("?");
      h.stats.fishSeen[a.id] = 1;
      if (fi.note){ h.hearts += 2; var ni = a.note | 0; h.notes.push(ni); if (ni === 4) h.secret.roach_pie = 1; log(h, who, nm + " " + (who === "sasha" ? "выловила" : "выловил") + " бутылку с запиской", ts); return { ok:true }; }
      bagAdd(h, "x:" + a.id, 1);
      if (!fi.junk){ h.stats.fish++; cnt(h, ts, "fish"); }
      if (a.id === "goldfish"){ h.hearts += 5; log(h, who, "✨ " + nm + " " + (who === "sasha" ? "поймала" : "поймал") + " золотую рыбку!", ts); }
      return { ok:true };
    }
    case "cook": {
      var r13 = RECIPE[a.rec]; if (!r13) return E("Нет рецепта");
      if (r13.secret && !h.secret[r13.id]) return E("Рецепт ещё не найден");
      if (level(h) < r13.l) return E("Нужен " + r13.l + "-й уровень");
      if (!hasFn(h, "stove")) return E("Нужна плита");
      var ks = Object.keys(r13.need);
      for (var i13 = 0; i13 < ks.length; i13++) if (have(h, ingKey(ks[i13])) < r13.need[ks[i13]]) return E("Не хватает: " + ks[i13]);
      ks.forEach(function(x){ take(h, ingKey(x), r13.need[x]); });
      var st = Math.max(1, Math.min(3, a.stars | 0));
      bagAdd(h, "d:" + r13.id + ":" + st, 1); h.stats.cooked++; h.stats.dishSeen[r13.id] = 1; if (st === 3) h.stats.three++; cnt(h, ts, "cook");
      log(h, who, nm + " " + (who === "sasha" ? "приготовила" : "приготовил") + " " + r13.e + " " + r13.n.toLowerCase() + " " + "★★★".slice(0, st), ts);
      return { ok:true };
    }
    case "gift": {
      var gi2 = goodInfo(a.k); if (!gi2 || !gi2.stars || !bag(h, a.k)) return E("Нечем угостить");
      bagAdd(h, a.k, -1); h.hearts += gi2.stars; h.stats.gifts++;
      var other = who === "artur" ? "Сашу" : "Артура";
      log(h, who, "💝 " + nm + " " + (who === "sasha" ? "угостила " : "угостил ") + other + ": " + gi2.n, ts);
      return { ok:true, hearts:gi2.stars };
    }
    case "order": {
      var o14 = h.orders.list[a.i]; if (!o14 || o14.done) return E("Заказ уже выполнен");
      var ks14 = Object.keys(o14.need);
      for (var j14 = 0; j14 < ks14.length; j14++) if (have(h, ks14[j14]) < o14.need[ks14[j14]]) return E("Не хватает продуктов");
      ks14.forEach(function(x){ take(h, x, o14.need[x]); });
      h.coins += o14.coins; h.hearts += o14.hearts; o14.done = who; h.stats.orders++; cnt(h, ts, "order");
      log(h, who, nm + " " + (who === "sasha" ? "выполнила" : "выполнил") + " заказ: " + o14.who, ts);
      return { ok:true };
    }
    case "hunt": {
      var P15 = pl(h, who), d15 = dk(ts); if (P15.hunt === d15) return E("Тараканы уже спрятались до завтра");
      P15.hunt = d15; var fnd = Math.max(0, Math.min(5, a.found | 0));
      h.coins += fnd * 12; if (fnd === 5){ h.hearts += 1; h.stats.huntPerfect++; }
      h.stats.hunts++; cnt(h, ts, "hunt"); return { ok:true, coins:fnd * 12 };
    }
    case "claimQ": {
      var q = DD.Q[h.q - 1]; if (!q || q.id !== a.q) return E("Задание уже получено");
      h.coins += q.r.coins || 0; h.hearts += q.r.hearts || 0;
      if (q.r.items) Object.keys(q.r.items).forEach(function(k){ bagAdd(h, k, q.r.items[k]); });
      h.q++; log(h, who, "📜 Задание «" + q.t + "» выполнено", ts); return { ok:true };
    }
    case "claimD": {
      var d17 = h.daily, t17 = DD.DAILY.filter(function(x){ return x.id === a.id; })[0];
      if (!t17 || d17.tasks.indexOf(a.id) < 0 || d17.claimed[a.id]) return E("Уже получено");
      d17.claimed[a.id] = who; h.coins += t17.r.coins || 0; h.hearts += t17.r.hearts || 0;
      if (Object.keys(d17.claimed).length === d17.tasks.length){ h.coins += 50; h.hearts += 1; }
      return { ok:true };
    }
    case "claimMail": {
      var got = 0;
      (a.list || []).forEach(function(m){
        if (m.n != null){ var old = h.claims[m.k] || 0; if (m.n > old){ h.coins += (m.n - old) * (m.per || 0); h.claims[m.k] = m.n; got++; } }
        else if (!h.claims[m.k]){ h.claims[m.k] = 1; h.coins += m.coins || 0; h.hearts += m.hearts || 0; got++; }
      });
      if (!got) return E("Новых наград нет"); return { ok:true };
    }
    case "upgrade": {
      var U = DD.UPGRADES.filter(function(x){ return x.id === a.id; })[0]; if (!U) return E("?");
      var cur = h.up[a.id] || 0, nx = U.lv[cur + 1]; if (!nx) return E("Уже максимум");
      if (level(h) < nx.l) return E("Нужен " + nx.l + "-й уровень"); if (h.coins < nx.p) return E("Не хватает монет");
      h.coins -= nx.p; h.up[a.id] = cur + 1; return { ok:true };
    }
  }
  return E("Неизвестное действие");
}

/* ---------- прогресс сюжета ---------- */
function calFilled(cal, fromWeek){
  var n = 0; if (!cal || !cal.weeks) return 0;
  Object.keys(cal.weeks).forEach(function(w){ if (w < fromWeek) return; ["artur", "sasha"].forEach(function(p){ var P = cal.weeks[w][p]; if (!P) return; P.days.forEach(function(d){ d.slots.forEach(function(s){ if (s.busy !== null && s.busy !== undefined) n++; }); }); }); });
  return n;
}
function questProgress(h, cal, nowTs){
  var q = DD.Q[h.q - 1]; if (!q) return null;
  var L = level(h), S = h.stats, open = function(r){ return h.rooms[r] && h.rooms[r].open; }, wallN = 0;
  Object.keys(h.rooms).forEach(function(r){ h.rooms[r].items.forEach(function(p){ if (ITEM[p.i] && ITEM[p.i].k === "wall") wallN++; }); });
  var startW = monday(dk(h.created));
  var v = (function(){
    switch (q.id){
      case 1: return [Math.min(1, placedOf(h, "sofa") + placedOf(h, "sofa_corner")), 1];
      case 2: return [Math.min(1, placedOf(h, "floor_lamp") + placedOf(h, "heart_lamp") + placedOf(h, "nightstand")), 1];
      case 3: return [Math.min(2, wallN), 2];
      case 4: return [Math.min(2, L), 2];
      case 5: return [open("garden") ? Math.min(2, placedOf(h, "garden_bed", "garden")) : 0, 2];
      case 6: return [Math.min(1, S.planted), 1];
      case 7: return [Math.min(1, S.water), 1];
      case 8: return [Math.min(5, S.harvest), 5];
      case 9: return [Math.min(10, calFilled(cal, startW)), 10];
      case 10: return [open("kitchen") ? 1 : 0, 1];
      case 11: return [Math.min(1, placedOf(h, "stove")), 1];
      case 12: return [Math.min(1, S.cooked), 1];
      case 13: return [cal && (cal.bookings || []).some(function(b){ return b.status === "yes" && b.week >= startW; }) ? 1 : 0, 1];
      case 14: return [Math.min(1, placedOf(h, "pond")), 1];
      case 15: return [Math.min(5, S.fish), 5];
      case 16: return [Math.min(3, S.orders), 3];
      case 17: return [Math.min(1, S.huntPerfect), 1];
      case 18: return [open("balcony") ? Math.min(3, h.rooms.balcony.items.length) : 0, 3];
      case 19: return [open("bedroom") && (placedOf(h, "bed") + placedOf(h, "bed_canopy")) ? 1 : 0, 1];
      case 20: return [Math.min(5, L), 5];
      case 21: return [Math.min(8, Object.keys(S.fishSeen).filter(function(k){ return k !== "bottle"; }).length), 8];
      case 22: return [Math.min(6, Object.keys(S.dishSeen).length), 6];
      case 23: return [open("bathroom") ? 1 : 0, 1];
      case 24: return [Math.min(1, S.three), 1];
      case 25: return [Math.min(1, S.fruit), 1];
      case 26: return [Math.min(8, L), 8];
      case 27: return [open("greenhouse") ? 1 : 0, 1];
      case 28: return [Math.min(1, S.crops.watermelon || 0), 1];
      case 29: return [S.fishSeen.goldfish ? 1 : 0, 1];
      case 30: return [open("attic") && placedOf(h, "roach_throne") ? 1 : 0, 1];
    }
    return [0, 1];
  })();
  return { q:q, cur:v[0], need:v[1], done:v[0] >= v[1] };
}
function dailyProgress(h, id, cal, me, nowTs){
  var d = h.daily; if (!d) return [0, 1];
  if (id === "both") return [(d.visits.artur ? 1 : 0) + (d.visits.sasha ? 1 : 0), 2];
  if (id === "cal"){
    if (!cal || !cal.weeks) return [0, 1];
    var today = dk(nowTs), w = monday(today), di = Math.round((Date.parse(today) - Date.parse(w)) / 864e5), P = cal.weeks[w] && cal.weeks[w][me];
    var ok = P && P.days[di] && P.days[di].slots.every(function(s){ return s.busy !== null && s.busy !== undefined; });
    return [ok ? 1 : 0, 1];
  }
  var t = DD.DAILY.filter(function(x){ return x.id === id; })[0];
  return [Math.min(t.need || 1, d.cnt[id] || 0), t.need || 1];
}
/* ---------- почта: награды за календарь ---------- */
function mailFor(h, cal, nowTs){
  var out = []; if (!cal || !cal.weeks) return out;
  var startW = monday(dk(h.created));
  Object.keys(cal.weeks).forEach(function(w){ if (w < startW) return;
    ["artur", "sasha"].forEach(function(p){ var P = cal.weeks[w][p]; if (!P) return; var n = 0;
      P.days.forEach(function(d){ d.slots.forEach(function(s){ if (s.busy !== null && s.busy !== undefined) n++; }); });
      var k = "fill:" + w + ":" + p, old = h.claims[k] || 0;
      if (n > old) out.push({ k:k, n:n, per:4, e:"🗓", t:NAMES[p] + " " + (p === "sasha" ? "заполнила" : "заполнил") + " расписание (" + (n - old) + " слот.)", coins:(n - old) * 4 });
    });
  });
  (cal.bookings || []).forEach(function(b){
    if (b.status !== "yes" || b.week < startW) return;
    var id = b.id || b.ts;
    if (!h.claims["bk:" + id]) out.push({ k:"bk:" + id, e:"💌", t:"Встреча подтверждена: " + (b.intent || "встреча"), coins:40, hearts:2 });
    var p = b.week.split("-"), end = Date.UTC(+p[0], +p[1] - 1, +p[2]) + b.day * 864e5 + (8 + b.slot * 4 + 4 - 3) * 3600e3;
    if (end < nowTs && !h.claims["met:" + id]) out.push({ k:"met:" + id, e:"🥰", t:"Встреча состоялась: " + (b.intent || "встреча"), coins:60, hearts:3 });
  });
  return out;
}

window.CORE = {
  NAMES:NAMES, STYLE_PRICE:STYLE_PRICE, dk:dk, hourOf:hourOf, monday:monday, addDays:addDays, clone:clone, rng:rng,
  newHome:newHome, apply:apply, canPlace:canPlace, foot:foot, rectOf:rectOf, roomAllowed:roomAllowed, countOf:countOf, placedOf:placedOf, findItem:findItem,
  comfort:comfort, level:level, cropInfo:cropInfo, waterMs:waterMs, ensureDay:ensureDay, goodInfo:goodInfo, have:have, ingKey:ingKey, hasFn:hasFn,
  questProgress:questProgress, dailyProgress:dailyProgress, mailFor:mailFor, bag:bag
};
})();
