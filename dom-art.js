/* «Наш дом» — изометрический движок и рисунки всех предметов (всё нарисовано кодом, без картинок) */
(function(){
"use strict";
var TW = 64, TH = 32, ZH = 36, RX = TW / Math.SQRT2, RY = TH / Math.SQRT2;

/* ---------- цвета ---------- */
function hx(c){ c = c.replace("#",""); if (c.length === 3) c = c.split("").map(function(x){ return x + x; }).join(""); var n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t){ var A = hx(a), B = hx(b); return "#" + [0,1,2].map(function(i){ var v = Math.round(A[i] + (B[i] - A[i]) * t); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
function lt(c, k){ return mix(c, "#ffffff", k == null ? .18 : k); }
function dk(c, k){ return mix(c, "#1b0f2e", k == null ? .2 : k); }
function rnd(seed){ var s = (seed | 0) || 1; return function(){ s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 100000) / 100000; }; }
function hash(str){ var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------- проекция ---------- */
function P(x, y, z){ return [(x - y) * TW / 2, (x + y) * TH / 2 - (z || 0) * ZH]; }
function pts(a){ return a.map(function(p){ return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
function poly(a, fill, o){
  o = o || {};
  var s = '<polygon points="' + pts(a) + '" fill="' + fill + '"';
  if (o.stroke !== false) s += ' stroke="' + (o.stroke || dk(fill, .45)) + '" stroke-width="' + (o.sw || .7) + '" stroke-linejoin="round"';
  if (o.op != null) s += ' opacity="' + o.op + '"';
  if (o.cls) s += ' class="' + o.cls + '"';
  return s + "/>";
}

/* ---------- примитивы в локальных координатах предмета ----------
   u — вдоль ширины, v — вглубь (v=0 — задняя сторона, у стены), z — высота */
function B(u, v, z, w, d, h, c, o){ return { t:"b", u:u, v:v, z:z, w:w, d:d, h:h, c:c, o:o || {} }; }
function Cy(u, v, z, r, h, c, r2, o){ return { t:"c", u:u, v:v, z:z, r:r, h:h, c:c, r2:r2 == null ? r : r2, o:o || {} }; }
function Sp(u, v, z, r, c, o){ return { t:"s", u:u, v:v, z:z, r:r, c:c, o:o || {} }; }
function Fl(u, v, z, w, d, c, o){ return { t:"f", u:u, v:v, z:z, w:w, d:d, c:c, o:o || {} }; }
function El(u, v, z, ru, rv, c, o){ return { t:"e", u:u, v:v, z:z, ru:ru, rv:rv == null ? ru : rv, c:c, o:o || {} }; }
function Pl(p, c, o){ return { t:"p", p:p, c:c, o:o || {} }; }                  // p: [[u,v,z],...]
function Ve(u, v, z, ru, rz, c, o){ return { t:"v", u:u, v:v, z:z, ru:ru, rz:rz == null ? ru : rz, c:c, o:o || {} }; } // эллипс в вертикальной плоскости (лицом к зрителю)
function Ln(a, b, c, w, o){ return { t:"l", a:a, b:b, c:c, w:w || 1.2, o:o || {} }; }
function Tx(u, v, z, s, size, c, o){ return { t:"x", u:u, v:v, z:z, s:s, size:size, c:c, o:o || {} }; }
function Gl(u, v, z, r, c, o){ return { t:"g", u:u, v:v, z:z, r:r, c:c, o:o || {} }; }   // свечение (видно ночью)

function vertRect(u0, u1, v, z0, z1, c, o){ return Pl([[u0,v,z0],[u1,v,z0],[u1,v,z1],[u0,v,z1]], c, o); }
function sideRect(u, v0, v1, z0, z1, c, o){ return Pl([[u,v0,z0],[u,v1,z0],[u,v1,z1],[u,v0,z1]], c, o); }

/* ---------- отрисовка ---------- */
function mk(X, Y, r){ return function(u, v){ return r ? [X + v, Y + u] : [X + u, Y + v]; }; }
function W(T, u, v, z){ var q = T(u, v); return P(q[0], q[1], z); }

function drawBox(T, p, r){
  var a = T(p.u, p.v), b = T(p.u + p.w, p.v + p.d);
  var x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  var z0 = p.z, z1 = p.z + p.h, c = p.c, o = p.o, s = "";
  var sw = o.sw, st = o.stroke;
  var cy = r ? dk(c, .2) : c, cx = r ? c : dk(c, .2);
  if (p.h > 0.001){
    if (!o.noY) s += poly([P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)], o.cy || (r ? dk(c,.2) : c), { op:o.op, sw:sw, stroke:st });
    if (!o.noX) s += poly([P(x1,y0,z0),P(x1,y1,z0),P(x1,y1,z1),P(x1,y0,z1)], o.cx || (r ? c : dk(c,.2)), { op:o.op, sw:sw, stroke:st });
  }
  if (!o.noTop) s += poly([P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)], o.top || lt(c, .14), { op:o.op, sw:sw, stroke:st });
  return { s:s, k:(x0 + x1 + y0 + y1) / 2, z:z0 };
}
function ellipsePts(cx, cy, rx, ry, n, a0, a1){
  var out = []; n = n || 24; a0 = a0 || 0; a1 = a1 == null ? Math.PI * 2 : a1;
  for (var i = 0; i <= n; i++){ var t = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); }
  return out;
}
function drawCyl(T, p){
  var q = T(p.u, p.v), b = P(q[0], q[1], p.z), t = P(q[0], q[1], p.z + p.h), o = p.o;
  var r0x = p.r * RX, r0y = p.r * RY, r1x = p.r2 * RX, r1y = p.r2 * RY, s = "";
  if (p.h > 0.001){
    var side = ellipsePts(b[0], b[1], r0x, r0y, 18, 0, Math.PI).concat(ellipsePts(t[0], t[1], r1x, r1y, 18, Math.PI, 0));
    s += poly(side, o.side || p.c, { op:o.op, sw:o.sw });
    // лёгкий объём
    if (!o.flat) s += '<polygon points="' + pts(ellipsePts(b[0], b[1], r0x, r0y, 9, 0, Math.PI / 2).concat(ellipsePts(t[0], t[1], r1x, r1y, 9, Math.PI / 2, 0))) + '" fill="' + dk(p.c, .25) + '" opacity="' + (o.op != null ? o.op * .6 : .6) + '"/>';
  }
  if (!o.noTop) s += '<ellipse cx="' + t[0].toFixed(1) + '" cy="' + t[1].toFixed(1) + '" rx="' + r1x.toFixed(1) + '" ry="' + r1y.toFixed(1) + '" fill="' + (o.top || lt(p.c, .16)) + '" stroke="' + dk(p.c, .45) + '" stroke-width=".7"' + (o.op != null ? ' opacity="' + o.op + '"' : "") + '/>';
  return { s:s, k:q[0] + q[1], z:p.z };
}
function drawSphere(T, p){
  var q = T(p.u, p.v), c = P(q[0], q[1], p.z), R = p.r * 44, o = p.o;
  var s = '<circle cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="' + R.toFixed(1) + '" fill="' + p.c + '" stroke="' + dk(p.c, .45) + '" stroke-width=".7"' + (o.op != null ? ' opacity="' + o.op + '"' : "") + (o.cls ? ' class="' + o.cls + '"' : "") + '/>';
  if (!o.flat && R > 3) s += '<circle cx="' + (c[0] - R * .32).toFixed(1) + '" cy="' + (c[1] - R * .35).toFixed(1) + '" r="' + (R * .32).toFixed(1) + '" fill="' + lt(p.c, .35) + '" opacity=".55"/>';
  return { s:s, k:q[0] + q[1] + (p.o.k || 0), z:p.z };
}
function drawFlat(T, p){
  var a = T(p.u, p.v), b = T(p.u + p.w, p.v + p.d);
  var x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  return { s:poly([P(x0,y0,p.z),P(x1,y0,p.z),P(x1,y1,p.z),P(x0,y1,p.z)], p.c, { op:p.o.op, stroke:p.o.stroke, sw:p.o.sw }), k:p.o.k != null ? p.o.k : -100, z:p.z };
}
function drawEll(T, p){
  var out = [];
  for (var i = 0; i < 28; i++){ var t = i / 28 * Math.PI * 2, q = T(p.u + Math.cos(t) * p.ru, p.v + Math.sin(t) * p.rv); out.push(P(q[0], q[1], p.z)); }
  var c = T(p.u, p.v);
  return { s:poly(out, p.c, { op:p.o.op, stroke:p.o.stroke, sw:p.o.sw, cls:p.o.cls }), k:p.o.k != null ? p.o.k : c[0] + c[1] - 50, z:p.z };
}
function drawPoly(T, p){
  var sk = 0;
  var a = p.p.map(function(x){ var q = T(x[0], x[1]); sk += q[0] + q[1]; return P(q[0], q[1], x[2]); });
  var zmin = Math.min.apply(null, p.p.map(function(x){ return x[2]; }));
  return { s:poly(a, p.c, { op:p.o.op, stroke:p.o.stroke, sw:p.o.sw, cls:p.o.cls }), k:p.o.k != null ? p.o.k : sk / p.p.length + .02, z:zmin };
}
function drawVert(T, p){
  var out = [];
  for (var i = 0; i < 26; i++){ var t = i / 26 * Math.PI * 2, q = T(p.u + Math.cos(t) * p.ru, p.v); out.push(P(q[0], q[1], p.z + Math.sin(t) * p.rz)); }
  var c = T(p.u, p.v);
  return { s:poly(out, p.c, { op:p.o.op, stroke:p.o.stroke, sw:p.o.sw, cls:p.o.cls }), k:p.o.k != null ? p.o.k : c[0] + c[1] + .03, z:p.z - p.rz };
}
function drawLine(T, p){
  var a = T(p.a[0], p.a[1]), b = T(p.b[0], p.b[1]), A = P(a[0], a[1], p.a[2]), Bp = P(b[0], b[1], p.b[2]);
  return { s:'<line x1="' + A[0].toFixed(1) + '" y1="' + A[1].toFixed(1) + '" x2="' + Bp[0].toFixed(1) + '" y2="' + Bp[1].toFixed(1) + '" stroke="' + p.c + '" stroke-width="' + p.w + '" stroke-linecap="round"' + (p.o.cls ? ' class="' + p.o.cls + '"' : "") + '/>',
           k:p.o.k != null ? p.o.k : (a[0] + a[1] + b[0] + b[1]) / 2 + .01, z:Math.min(p.a[2], p.b[2]) };
}
function drawText(T, p, r){
  var q = T(p.u, p.v), c = P(q[0], q[1], p.z), o = p.o, tr = "translate(" + c[0].toFixed(1) + " " + c[1].toFixed(1) + ")";
  if (o.plane === "wall") tr += r ? " skewY(-26.565)" : " skewY(26.565)";
  return { s:'<text transform="' + tr + '" font-size="' + p.size + '" fill="' + p.c + '" text-anchor="' + (o.anchor || "middle") + '" font-family="' + (o.font || "Unbounded, sans-serif") + '" font-weight="' + (o.weight || 800) + '"' + (o.cls ? ' class="' + o.cls + '"' : "") + '>' + String(p.s).replace(/[<&>]/g, "") + '</text>',
           k:o.k != null ? o.k : q[0] + q[1] + .05, z:p.z };
}
function drawGlow(T, p){
  var q = T(p.u, p.v), c = P(q[0], q[1], p.z);
  return { s:'<circle class="glow" cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="' + (p.r * 44).toFixed(1) + '" fill="url(#glow-' + (p.c || "warm") + ')"/>', k:1e6, z:p.z, glow:true };
}
function renderPrims(prims, X, Y, r){
  var T = mk(X, Y, r), out = [];
  prims.forEach(function(p, i){
    if (!p) return;
    var d;
    switch (p.t){
      case "b": d = drawBox(T, p, r); break;
      case "c": d = drawCyl(T, p); break;
      case "s": d = drawSphere(T, p); break;
      case "f": d = drawFlat(T, p); break;
      case "e": d = drawEll(T, p); break;
      case "p": d = drawPoly(T, p); break;
      case "v": d = drawVert(T, p); break;
      case "l": d = drawLine(T, p); break;
      case "x": d = drawText(T, p, r); break;
      case "g": d = drawGlow(T, p); break;
    }
    // порядок отрисовки = порядок в описании предмета (сзади-наперёд), k — сдвиг
    d.k = i + (p.o && p.o.k ? p.o.k : 0); d.i = i; out.push(d);
  });
  out.sort(function(a, b){ return a.k - b.k || a.i - b.i; });
  var body = "", glow = "";
  out.forEach(function(d){ if (d.glow) glow += d.s; else body += d.s; });
  return { body:body, glow:glow };
}

/* ---------- маленькие персонажи ---------- */
function roach(u, v, z, s, o){
  o = o || {}; s = s || 1;
  var c = o.c || "#7a4a2b", out = [
    Ln([u - .12 * s, v - .02 * s, z + .02], [u - .2 * s, v - .12 * s, z], "#3b2416", 1.1 * s),
    Ln([u + .12 * s, v - .02 * s, z + .02], [u + .2 * s, v - .12 * s, z], "#3b2416", 1.1 * s),
    Ln([u - .12 * s, v + .06 * s, z + .02], [u - .2 * s, v + .14 * s, z], "#3b2416", 1.1 * s),
    Ln([u + .12 * s, v + .06 * s, z + .02], [u + .2 * s, v + .14 * s, z], "#3b2416", 1.1 * s),
    El(u, v + .02 * s, z + .06 * s, .13 * s, .17 * s, c, { k:o.k }),
    El(u, v + .02 * s, z + .1 * s, .1 * s, .14 * s, lt(c, .12), { stroke:false, k:o.k != null ? o.k + .001 : undefined }),
    Sp(u, v - .16 * s, z + .1 * s, .07 * s, dk(c, .1), { k:o.k != null ? o.k + .002 : undefined }),
    Sp(u - .035 * s, v - .2 * s, z + .14 * s, .025 * s, "#fff", { flat:true, k:o.k != null ? o.k + .003 : undefined }),
    Sp(u + .035 * s, v - .2 * s, z + .14 * s, .025 * s, "#fff", { flat:true, k:o.k != null ? o.k + .003 : undefined }),
    Ln([u - .03 * s, v - .2 * s, z + .17 * s], [u - .12 * s, v - .34 * s, z + .32 * s], "#3b2416", .9 * s, { k:o.k != null ? o.k + .004 : undefined }),
    Ln([u + .03 * s, v - .2 * s, z + .17 * s], [u + .12 * s, v - .34 * s, z + .32 * s], "#3b2416", .9 * s, { k:o.k != null ? o.k + .004 : undefined })
  ];
  if (o.crown) out.push(Pl([[u - .06 * s, v - .17 * s, z + .17 * s],[u + .06 * s, v - .17 * s, z + .17 * s],[u + .07 * s, v - .17 * s, z + .27 * s],[u + .02 * s, v - .17 * s, z + .21 * s],[u, v - .17 * s, z + .29 * s],[u - .02 * s, v - .17 * s, z + .21 * s],[u - .07 * s, v - .17 * s, z + .27 * s]], "#FFD84D", { k:o.k != null ? o.k + .005 : undefined }));
  if (o.bow) out.push(Pl([[u - .07 * s, v - .1 * s, z + .1 * s],[u, v - .1 * s, z + .07 * s],[u + .07 * s, v - .1 * s, z + .1 * s],[u + .07 * s, v - .1 * s, z + .02 * s],[u, v - .1 * s, z + .05 * s],[u - .07 * s, v - .1 * s, z + .02 * s]], o.bow));
  return out;
}
function heartPts(u, v, z, s, plane){
  var out = [];
  for (var i = 0; i < 30; i++){
    var t = i / 30 * Math.PI * 2, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    out.push(plane === "floor" ? [u + x / 17 * s, v - y / 17 * s, z] : [u + x / 17 * s, v, z + y / 17 * s]);
  }
  return out;
}

/* ---------- палитры ---------- */
var WOOD = "#C8925E", WOOD_D = "#8A5A3B", WOOD_L = "#E3B886", METAL = "#5B5670", WHITE = "#FBF7F2", INK = "#24103A";
var COLS = {
  soft:  ["#FF6FA3", "#9B7BFF", "#FFC23D", "#3FC7B4", "#6EA8FF", "#F2EADF"],
  wood:  ["#C8925E", "#8A5A3B", "#E7CFA9", "#5E3B2A"],
  pot:   ["#E8875F", "#F2EADF", "#6EA8FF", "#FF6FA3"],
  fabric:["#FFB3CF", "#C9B6FF", "#FFE08A", "#9BE3D6", "#A9CBFF", "#FFFFFF"],
  metal: ["#5B5670", "#E9E4F2", "#FFC23D"],
  appl:  ["#F4F1EC", "#FF8FB8", "#8EC9FF", "#2B2838"],
  flower:["#FF4F8B", "#FFD84D", "#B48CFF", "#FF8A3D"]
};

/* ---------- рисунки предметов ---------- */
function legs4(u0, v0, u1, v1, h, c, t){ t = t || .06; return [B(u0, v0, 0, t, t, h, c), B(u1 - t, v0, 0, t, t, h, c), B(u0, v1 - t, 0, t, t, h, c), B(u1 - t, v1 - t, 0, t, t, h, c)]; }
function books(u0, u1, v, z, h, seed){
  var R = rnd(seed), out = [], u = u0, cols = ["#FF6FA3","#9B7BFF","#FFC23D","#3FC7B4","#6EA8FF","#E8875F","#24103A","#F2EADF"];
  while (u < u1 - .05){
    var w = .05 + R() * .06, hh = h * (.7 + R() * .3); if (u + w > u1) break;
    out.push(vertRect(u, u + w, v, z, z + hh, cols[Math.floor(R() * cols.length)], { sw:.4 }));
    u += w + .008;
  }
  return out;
}
function plantLeaves(u, v, z, s, c, seed){
  var R = rnd(seed), out = [];
  for (var i = 0; i < 7; i++){
    var a = R() * Math.PI * 2, d = R() * .16 * s;
    out.push(Sp(u + Math.cos(a) * d, v + Math.sin(a) * d, z + R() * .35 * s, (.1 + R() * .07) * s, i % 2 ? c : lt(c, .12)));
  }
  return out;
}
function pot(u, v, r, h, c){ return [Cy(u, v, 0, r, h, c, r * 1.2), El(u, v, h - .01, r * 1.05, r * 1.05, "#5a3a24", { stroke:false })]; }

var D = {};
/* — гостиная — */
D.sofa = function(c){ return [].concat(legs4(.1, .14, 1.9, .92, .08, WOOD_D), [
  B(.08, .12, .08, 1.84, .8, .26, c),
  B(.08, .12, .34, 1.84, .22, .52, c),
  B(.08, .12, .34, .2, .8, .26, lt(c, .05)), B(1.72, .12, .34, .2, .8, .26, lt(c, .05)),
  B(.3, .36, .34, .7, .54, .12, lt(c, .12)), B(1.0, .36, .34, .7, .54, .12, lt(c, .1)),
  B(.34, .36, .46, .34, .1, .3, "#FFD84D"), B(1.36, .36, .46, .3, .1, .28, WHITE)
]); };
D.sofa_corner = function(c){ return [].concat(legs4(.1, .14, 2.9, .92, .08, WOOD_D), legs4(2.1, .14, 2.9, 1.9, .08, WOOD_D), [
  B(.08, .12, .08, 2.84, .8, .26, c), B(2.12, .92, .08, .8, 1.0, .26, c),
  B(.08, .12, .34, 2.84, .22, .52, c), B(2.7, .34, .34, .22, 1.58, .52, c),
  B(.08, .12, .34, .2, .8, .26, lt(c, .05)),
  B(.3, .36, .34, .78, .54, .12, lt(c, .12)), B(1.1, .36, .34, .78, .54, .12, lt(c, .1)), B(1.9, .36, .34, .78, .54, .12, lt(c, .12)), B(2.14, 1.0, .34, .54, .8, .12, lt(c, .1)),
  B(.36, .36, .46, .3, .1, .3, "#FFD84D"), B(2.3, .38, .46, .3, .1, .3, WHITE), B(2.62, .5, .46, .08, .32, .3, "#9B7BFF")
]); };
D.armchair = function(c){ return [].concat(legs4(.14, .14, .86, .86, .1, WOOD_D), [
  B(.12, .12, .1, .76, .76, .24, c), B(.12, .12, .34, .76, .2, .52, c),
  B(.12, .12, .34, .14, .76, .24, lt(c, .05)), B(.74, .12, .34, .14, .76, .24, lt(c, .05)),
  B(.26, .32, .34, .48, .52, .1, lt(c, .12)), B(.36, .32, .44, .28, .08, .24, "#FFD84D")
]); };
D.beanbag = function(c){ return [El(.5, .52, 0, .42, .4, "rgba(0,0,0,.12)", { stroke:false }), Sp(.5, .55, .26, .36, c), Sp(.5, .36, .48, .26, lt(c, .06), { k:.2 })]; };
D.pouf = function(c){ return [Cy(.5, .5, 0, .3, .34, c), Ln([.5 - .3, .5, .17], [.5 + .3, .5, .17], dk(c, .2), .8)]; };
D.coffee_table = function(c){ return [].concat(legs4(.2, .22, 1.8, .82, .36, WOOD_D, .07), [
  B(.2, .22, .1, 1.6, .6, .04, dk(c, .1)), B(.12, .16, .36, 1.76, .72, .07, c),
  Cy(.5, .48, .43, .08, .12, "#FF6FA3"), B(1.1, .34, .43, .4, .3, .05, "#6EA8FF"), B(1.12, .36, .48, .36, .26, .04, "#FFD84D"),
  Cy(1.55, .62, .43, .1, .04, WHITE), Sp(1.55, .62, .5, .06, "#FF4F8B")
]); };
D.side_table = function(c){ return [].concat(legs4(.22, .22, .78, .78, .5, dk(c, .2), .05), [B(.18, .18, .5, .64, .64, .06, c), Cy(.5, .5, .56, .09, .22, "#3FC7B4", .05), Sp(.5, .5, .86, .1, "#FF6FA3"), Sp(.44, .52, .82, .06, "#FFD84D")]); };
D.tv_stand = function(c){ return [
  B(.05, .2, 0, 1.9, .6, .44, c), vertRect(.15, .95, .8, .08, .36, dk(c, .12), { sw:.5 }), vertRect(1.05, 1.85, .8, .08, .36, dk(c, .12), { sw:.5 }),
  B(.8, .38, .44, .4, .2, .06, "#2b2838"), B(.96, .44, .5, .08, .08, .14, "#2b2838"),
  B(.25, .44, .62, 1.5, .08, .86, "#1d1b26"),
  vertRect(.3, 1.7, .521, .67, 1.43, "#3a4f9c", { sw:.4, cls:"screen" }),
  Pl([[.4, .522, 1.3], [.9, .522, 1.38], [.6, .522, .95]], "rgba(255,255,255,.18)", { stroke:false }),
  Cy(.2, .55, .44, .08, .26, "#24103A"), Cy(1.8, .55, .44, .08, .26, "#24103A")
]; };
D.bookshelf = function(c, seed){
  var out = [B(.08, .1, 0, .84, .5, 1.95, c), vertRect(.14, .86, .6, .06, 1.89, dk(c, .45), { sw:.4 })];
  for (var i = 0; i < 4; i++){ var z = .08 + i * .47; out.push(vertRect(.14, .86, .601, z, z + .03, c, { sw:.3 })); out = out.concat(books(.16, .84, .602, z + .03, .38, seed + i * 7)); }
  out.push(Sp(.7, .45, 2.05, .1, "#3FC7B4"));
  return out;
};
D.floor_lamp = function(c){ return [El(.5, .5, 0, .2, .2, METAL), B(.47, .47, .02, .06, .06, 1.38, METAL), Cy(.5, .5, 1.3, .26, .36, c, .16), Gl(.5, .5, 1.2, 1.3, "warm")]; };
D.plant_big = function(c, seed){ return pot(.5, .5, .2, .36, c).concat(plantLeaves(.5, .5, .55, 1.5, "#2FAE60", seed), [Sp(.5, .5, 1.05, .16, "#38C46F")]); };
D.plant_small = function(c, seed){ return pot(.5, .5, .16, .3, c).concat(plantLeaves(.5, .5, .42, 1, "#3DBB66", seed)); };
D.cactus = function(c){ return pot(.5, .5, .15, .26, c).concat([Cy(.5, .5, .26, .1, .5, "#47B36B"), Sp(.5, .5, .76, .1, "#47B36B", { flat:true }), Cy(.38, .5, .44, .05, .18, "#3FA45F"), Cy(.62, .5, .38, .05, .22, "#3FA45F"), Sp(.5, .5, .86, .05, "#FF6FA3", { flat:true })]); };
D.rug_round = function(c){ return [El(1, 1, .005, .95, .95, dk(c, .1), { sw:.5 }), El(1, 1, .007, .8, .8, c, { stroke:false }), El(1, 1, .009, .5, .5, lt(c, .3), { stroke:false }), El(1, 1, .011, .22, .22, c, { stroke:false })]; };
D.rug_big = function(c){ return [Fl(.08, .08, .005, 2.84, 1.84, dk(c, .12)), Fl(.18, .18, .007, 2.64, 1.64, c, { stroke:false }), Fl(.4, .4, .009, 2.2, 1.2, lt(c, .3), { stroke:false }), Fl(.6, .6, .011, 1.8, .8, c, { stroke:false })]; };
D.fireplace = function(c){ return [
  B(.05, .02, 0, 1.9, .5, 1.25, c), B(-.02, 0, 1.25, 2.04, .62, .1, WOOD_D),
  Pl([[.5,.521,.05],[1.5,.521,.05],[1.5,.521,.6],[1.4,.521,.72],[1.0,.521,.8],[.6,.521,.72],[.5,.521,.6]], "#2a1a22", { sw:.5 }),
  B(.66, .3, .06, .7, .1, .08, "#6b4226", { k:5 }), B(.7, .38, .1, .6, .08, .08, "#8a5a3b", { k:5.01 }),
  Pl([[.72,.53,.14],[.82,.53,.48],[.9,.53,.26],[1.0,.53,.62],[1.1,.53,.3],[1.18,.53,.5],[1.28,.53,.14]], "#FF8A3D", { stroke:false, cls:"fire", k:6 }),
  Pl([[.84,.535,.14],[.92,.535,.34],[1.0,.535,.44],[1.08,.535,.32],[1.16,.535,.14]], "#FFD84D", { stroke:false, cls:"fire2", k:6.1 }),
  Cy(.3, .3, 1.35, .08, .2, "#FF6FA3"), Cy(1.7, .3, 1.35, .07, .3, WHITE), Sp(1.0, .3, 1.5, .1, "#FFC23D"),
  Gl(1, .7, .4, 1.6, "fire")
]; };
D.piano = function(c){ return [
  B(.1, .08, 0, 1.8, .52, 1.15, c), B(.06, .06, 1.15, 1.88, .58, .06, lt(c, .1)),
  B(.14, .6, .62, 1.72, .26, .08, c), Fl(.18, .62, .705, 1.64, .2, "#fbf7f2", { k:20 }),
  vertRect(.3, 1.7, .601, .78, 1.0, dk(c, .3), { sw:.3 }),
  B(.2, .62, 0, .08, .08, .62, c), B(1.72, .62, 0, .08, .08, .62, c),
  B(.6, .2, 1.21, .3, .2, .3, WHITE, { sw:.4 }), Cy(1.5, .3, 1.21, .07, .18, "#FFC23D")
].concat((function(){ var o = []; for (var i = 0; i < 12; i++) if ([1,2,4,5,6].indexOf(i % 7) >= 0) o.push(Fl(.24 + i * .13, .62, .712, .06, .11, "#24103A", { k:21, stroke:false })); return o; })()); };
D.aquarium = function(c){ return [
  B(.1, .2, 0, 1.8, .6, .55, c), B(.12, .22, .55, 1.76, .56, .74, "#8fd3ff", { op:.38, top:"#bfe8ff" }),
  B(.14, .24, .55, 1.72, .52, .06, "#E7CFA9", { k:30 }), Sp(.5, .5, .7, .14, "#2FAE60", { k:31 }), Sp(.62, .44, .82, .1, "#38C46F", { k:31 }), Sp(1.5, .5, .72, .12, "#2FAE60", { k:31 }),
  Ve(.9, .6, .95, .1, .05, "#FF8A3D", { k:32, cls:"fish1" }), Ve(1.3, .55, 1.1, .08, .04, "#FFD84D", { k:32, cls:"fish2" }),
  Sp(1.1, .6, 1.0, .02, "#fff", { k:33, cls:"bub" }), Sp(1.12, .6, 1.15, .015, "#fff", { k:33, cls:"bub" }),
  B(.08, .2, 1.29, 1.84, .6, .06, "#2b2838")
]; };
D.cat_bed = function(c){ return [
  Cy(.5, .5, 0, .42, .14, c), Cy(.5, .5, .06, .32, .1, lt(c, .3)),
  Sp(.52, .56, .26, .19, "#F4A259"), Sp(.33, .5, .3, .13, "#F4A259", { k:.3 }),
  Pl([[.25,.5,.38],[.28,.5,.48],[.33,.5,.4]], "#F4A259", { k:3 }), Pl([[.34,.5,.4],[.39,.5,.49],[.42,.5,.38]], "#F4A259", { k:3 }),
  Ln([.28, .58, .28], [.33, .58, .29], "#24103A", .8, { k:3.1 }), Ln([.35, .58, .29], [.4, .58, .28], "#24103A", .8, { k:3.1 }),
  Ln([.7, .62, .22], [.62, .82, .2], "#E08A3C", 3.2, { k:3 }),
  Tx(.62, .4, .72, "z", 9, "#9B7BFF", { cls:"zz", k:9 }), Tx(.72, .36, .9, "z", 7, "#9B7BFF", { cls:"zz z2", k:9 })
]; };
D.dining_table = function(c){ return [].concat(legs4(.14, .16, 1.86, .84, .72, dk(c, .2), .08), [
  B(.08, .1, .72, 1.84, .8, .07, c),
  Fl(.4, .25, .795, 1.2, .5, "#FFF3F7", { k:40, op:.95 }),
  Cy(1.0, .5, .79, .14, .08, WHITE), Sp(1.0, .5, .9, .07, "#FF4F8B"), Sp(.94, .46, .92, .05, "#FFD84D"),
  Cy(.5, .5, .79, .05, .2, "#FBF7F2"), Gl(.5, .5, 1.05, .5, "candle"), Sp(.5, .5, 1.02, .025, "#FFC23D", { flat:true })
]); };
D.chair = function(c){ return [].concat(legs4(.24, .24, .76, .76, .44, dk(c, .2), .05), [B(.2, .2, .44, .6, .6, .07, c), B(.2, .18, .51, .6, .06, .58, c), B(.28, .3, .51, .44, .44, .05, "#FFB3CF")]); };
D.guitar = function(c){ return [
  B(.42, .3, 0, .16, .3, .05, METAL), Ln([.5, .35, .05], [.5, .38, .8], METAL, 1.4),
  Ve(.5, .5, .32, .22, .2, c), Ve(.5, .5, .58, .16, .15, c, { k:.2 }), Ve(.5, .501, .45, .06, .06, "#24103A", { k:.3 }),
  B(.47, .5, .7, .06, .03, .62, WOOD_D, { k:.4 }), B(.45, .5, 1.3, .1, .04, .12, "#24103A", { k:.5 })
]; };
D.record_player = function(c){ return [].concat(legs4(.18, .2, .82, .8, .55, WOOD_D, .05), [
  B(.14, .16, .55, .72, .68, .12, c), El(.46, .48, .675, .26, .26, "#1d1b26", { k:50 }), El(.46, .48, .68, .08, .08, "#FF6FA3", { k:51, stroke:false }),
  Ln([.75, .25, .7], [.62, .5, .7], "#cfcfe0", 1.6, { k:52 }), B(.2, .62, .3, .6, .14, .22, "#FFC23D"), B(.22, .64, .3, .56, .1, .2, "#9B7BFF")
]); };
D.desk = function(c){ return [].concat(legs4(.1, .14, 1.9, .86, .72, dk(c, .2), .07), [
  B(.06, .1, .72, 1.88, .78, .06, c), B(1.3, .16, .28, .56, .66, .44, dk(c, .08)),
  Fl(.5, .35, .785, .6, .4, "#cfd3e6", { k:60 }), Pl([[.5,.35,.785],[1.1,.35,.785],[1.1,.3,1.15],[.5,.3,1.15]], "#3a3550", { k:61 }),
  Pl([[.54,.349,.82],[1.06,.349,.82],[1.06,.312,1.11],[.54,.312,1.11]], "#6EA8FF", { k:61.1, stroke:false, cls:"screen" }),
  Cy(1.6, .3, .78, .08, .02, METAL), Ln([1.6, .3, .8], [1.55, .45, 1.15], METAL, 1.3), Cy(1.55, .45, 1.08, .12, .12, "#FFC23D", .06), Gl(1.55, .5, 1.0, .7, "warm"),
  Cy(.3, .6, .78, .06, .12, "#FF6FA3")
]); };
D.heart_lamp = function(){ return [Cy(.5, .5, 0, .18, .08, "#24103A"), B(.48, .48, .08, .04, .04, .3, METAL), Pl(heartPts(.5, .5, .72, .32), "#FF4F8B", { cls:"heartglow" }), Pl(heartPts(.5, .51, .73, .22), "#FF9DBD", { stroke:false }), Gl(.5, .6, .7, 1.1, "pink")]; };
D.teddy = function(c){ c = c || "#C68A5A"; return [
  Sp(.5, .55, .3, .3, c), Sp(.5, .62, .28, .17, lt(c, .35), { k:.2 }),
  Sp(.28, .66, .14, .12, c, { k:.25 }), Sp(.72, .66, .14, .12, c, { k:.25 }),
  Sp(.24, .5, .36, .1, c), Sp(.76, .5, .36, .1, c),
  Sp(.5, .5, .74, .24, c, { k:.3 }), Sp(.32, .5, .92, .09, c, { k:.2 }), Sp(.68, .5, .92, .09, c, { k:.2 }),
  Sp(.5, .62, .68, .1, lt(c, .4), { k:.5 }), Sp(.5, .7, .7, .035, "#24103A", { flat:true, k:.6 }),
  Sp(.42, .66, .8, .03, "#24103A", { flat:true, k:.6 }), Sp(.58, .66, .8, .03, "#24103A", { flat:true, k:.6 }),
  Pl([[.38,.68,.54],[.5,.7,.5],[.62,.68,.54],[.62,.68,.44],[.5,.7,.48],[.38,.68,.44]], "#FF4F8B", { k:.7 })
]; };
D.tent = function(c){
  var a = [1, 1, 2.05], s = [.05, .05, 0], r = [1.95, .05, 0], f = [1.95, 1.95, 0], l = [.05, 1.95, 0], out = [
    El(1, 1, .01, .95, .95, "#FFF3F7", { stroke:false }),
    Pl([l, f, a], c, { k:100 }), Pl([r, f, a], dk(c, .15), { k:100 }),
    Pl([[.7, 1.95, 0], [1.3, 1.95, 0], [1, 1.95, .1], a], "#2a1a22", { k:100.1, op:.0 }),
    Pl([[.62,1.95,0],[1.38,1.95,0],[1.0,1.62,.68]], "#3a2440", { k:100.2 }),
    Sp(.85, 1.75, .12, .12, "#FFD84D", { k:100.3 }), Sp(1.15, 1.78, .12, .12, "#9B7BFF", { k:100.3 }),
    Ln([1, 1, 2.05], [1, 1, 2.35], WOOD_D, 1.6, { k:101 }), Ln([1, 1, 2.05], [.85, .9, 2.3], WOOD_D, 1.6, { k:101 })
  ];
  for (var i = 1; i < 7; i++){ var t = i / 7; out.push(Sp(.05 + (a[0] - .05) * t, 1.95 + (a[1] - 1.95) * t, a[2] * t, .025, ["#FFD84D","#FF6FA3","#9BE3D6"][i % 3], { flat:true, k:102, cls:"bulb" })); out.push(Sp(1.95 + (a[0] - 1.95) * t, 1.95 + (a[1] - 1.95) * t, a[2] * t, .025, ["#FFD84D","#FF6FA3","#9BE3D6"][(i + 1) % 3], { flat:true, k:102, cls:"bulb" })); }
  out.push(Gl(1, 1.6, .6, 1.4, "warm"));
  return out;
};
D.xmas_tree = function(){ var out = [Cy(.5, .5, 0, .18, .2, "#C0392B", .2), Cy(.5, .5, .2, .07, .12, WOOD_D)], cols = ["#FF4F8B","#FFD84D","#6EA8FF","#B48CFF","#fff"];
  [[.32, .45, .45], [.62, .38, .4], [.92, .3, .38], [1.18, .22, .34]].forEach(function(l, i){ out.push(Cy(.5, .5, l[0], l[1], l[2], i % 2 ? "#2FAE60" : "#27985A", .02)); });
  var R = rnd(7); for (var i = 0; i < 12; i++){ var z = .4 + R() * 1.0, rr = (1.5 - z) * .28, a = R() * Math.PI; out.push(Sp(.5 + Math.cos(a) * rr, .5 + Math.sin(a) * rr * .3 + .2, z, .035, cols[i % cols.length], { flat:true, k:10, cls:i % 2 ? "bulb" : "" })); }
  out.push(Pl([[.5,.5,1.62],[.53,.5,1.55],[.6,.5,1.55],[.545,.5,1.5],[.57,.5,1.42],[.5,.5,1.47],[.43,.5,1.42],[.455,.5,1.5],[.4,.5,1.55],[.47,.5,1.55]], "#FFD84D", { k:20 }));
  out.push(Gl(.5, .6, .9, 1.4, "warm")); return out; };
/* — кухня — */
D.counter = function(c){ return [B(.02, .05, 0, .96, .78, .82, c), vertRect(.1, .9, .831, .1, .74, dk(c, .1), { sw:.4 }), B(.46, .83, .62, .08, .02, .03, METAL), B(0, .03, .82, 1.0, .84, .06, "#F2EADF")]; };
D.stove = function(c){ return [B(.02, .05, 0, .96, .78, .86, c), vertRect(.12, .88, .831, .14, .6, "#2b2838", { sw:.4 }), vertRect(.2, .8, .832, .22, .52, "#FF8A3D", { op:.35, stroke:false, cls:"oven" }),
  B(.1, .831, .66, .8, .02, .05, METAL), El(.3, .3, .865, .13, .13, "#2b2838", { k:70 }), El(.7, .3, .865, .13, .13, "#2b2838", { k:70 }), El(.3, .62, .865, .11, .11, "#2b2838", { k:70 }), El(.7, .62, .865, .11, .11, "#2b2838", { k:70 }),
  Cy(.7, .3, .87, .14, .16, "#E9E4F2", .15), B(.84, .28, .97, .3, .04, .04, METAL), Sp(.25, .84, .76, .03, "#24103A", { flat:true }), Sp(.4, .84, .76, .03, "#24103A", { flat:true })]; };
D.fridge = function(c){ return [B(.06, .08, 0, .88, .76, 1.95, c), Ln([.06, .84, 1.25], [.94, .84, 1.25], dk(c, .3), 1), B(.8, .84, 1.35, .04, .03, .4, METAL), B(.8, .84, .7, .04, .03, .4, METAL),
  vertRect(.2, .4, .841, 1.55, 1.75, "#FFD84D", { sw:.4 }), vertRect(.45, .62, .841, 1.5, 1.68, "#FF6FA3", { sw:.4 }), Sp(.3, .84, 1.0, .04, "#6EA8FF", { flat:true })]; };
D.sink = function(c){ return [B(.02, .05, 0, .96, .78, .82, c), vertRect(.1, .48, .831, .1, .74, dk(c, .1), { sw:.4 }), vertRect(.52, .9, .831, .1, .74, dk(c, .1), { sw:.4 }), B(0, .03, .82, 1.0, .84, .06, "#F2EADF"),
  Fl(.22, .25, .885, .56, .46, "#9fb3c8", { k:80 }), B(.46, .1, .88, .08, .08, .3, METAL), B(.46, .1, 1.16, .08, .26, .05, METAL), Cy(.82, .2, .88, .05, .14, "#3FC7B4")]; };
D.island = function(c){ return [B(.1, .12, 0, 1.8, .7, .82, c), vertRect(.2, .9, .821, .1, .74, dk(c, .1), { sw:.4 }), vertRect(1.1, 1.8, .821, .1, .74, dk(c, .1), { sw:.4 }), B(.04, .06, .82, 1.92, .9, .06, "#F2EADF"),
  Cy(.6, .5, .88, .2, .1, "#E9E4F2", .24), Sp(.55, .48, .98, .07, "#FF4F8B"), Sp(.66, .52, .98, .07, "#FFD84D"), Sp(.6, .42, 1.03, .06, "#47B36B"), B(1.2, .3, .88, .5, .32, .03, WOOD_L), Sp(1.4, .45, .95, .05, "#FF8A3D")]; };
D.coffee_machine = function(c){ return [B(.02, .05, 0, .96, .78, .82, "#F4F1EC"), vertRect(.1, .9, .831, .1, .74, "#E6DFD6", { sw:.4 }), B(0, .03, .82, 1.0, .84, .06, "#F2EADF"),
  B(.25, .15, .88, .5, .45, .5, c), B(.3, .58, .96, .4, .04, .1, METAL), Cy(.5, .6, .88, .07, .1, WHITE), Sp(.5, .6, 1.3, .03, "#FF6FA3", { flat:true }), Gl(.5, .6, 1.0, .25, "warm")]; };
D.bar_stool = function(c){ return [Cy(.5, .5, 0, .2, .03, METAL), B(.47, .47, .03, .06, .06, .7, METAL), Cy(.5, .5, .7, .22, .08, c)]; };
/* — спальня — */
D.bed = function(c){ return [
  B(.06, .02, 0, 1.88, 1.96, .32, WOOD), B(.06, .02, .32, 1.88, .14, .7, WOOD_D),
  B(.12, .16, .32, 1.76, 1.76, .2, WHITE), B(.24, .2, .52, .66, .38, .1, WHITE), B(1.1, .2, .52, .66, .38, .1, WHITE),
  B(.1, .7, .5, 1.8, 1.26, .08, c), B(.1, 1.96 - .1, .2, 1.8, .1, .38, dk(c, .1)),
  Pl(heartPts(1, 1.2, .59, .12, "floor"), "#FF4F8B", { k:1e3, stroke:false })
]; };
D.bed_canopy = function(c){ var o = D.bed(c); [[.08,.04],[1.86,.04],[.08,1.86],[1.86,1.86]].forEach(function(p){ o.push(B(p[0], p[1], 0, .08, .08, 2.1, WOOD_D)); });
  o.push(B(.06, .02, 2.1, 1.9, 1.94, .06, lt(c, .3), { op:.85 }));
  o.push(Pl([[.1,1.9,2.1],[.4,1.9,2.1],[.3,1.9,.6],[.14,1.9,.6]], lt(c, .5), { op:.6, k:1e3 }));
  o.push(Pl([[1.6,1.9,2.1],[1.9,1.9,2.1],[1.86,1.9,.6],[1.7,1.9,.6]], lt(c, .5), { op:.6, k:1e3 }));
  for (var i = 0; i < 8; i++) o.push(Sp(.1 + i * .25, 1.92, 2.05, .02, "#FFD84D", { flat:true, k:1001, cls:"bulb" }));
  return o; };
D.wardrobe = function(c){ return [B(.05, .08, 0, 1.9, .72, 2.0, c), Ln([1, .8, .05], [1, .8, 1.95], dk(c, .35), 1), B(.9, .8, .9, .04, .03, .2, METAL), B(1.06, .8, .9, .04, .03, .2, METAL),
  vertRect(1.15, 1.8, .801, .3, 1.7, "#cfe8ff", { sw:.5 }), Pl([[1.25,.802,1.5],[1.4,.802,1.65],[1.25,.802,1.2]], "rgba(255,255,255,.6)", { stroke:false }), B(.05, .08, 2.0, 1.9, .72, .05, dk(c, .1)),
  B(.2, .2, 2.05, .4, .4, .3, "#FFC23D"), B(.7, .2, 2.05, .35, .35, .2, "#FF6FA3")]; };
D.dresser = function(c){ var o = [B(.06, .12, 0, .88, .66, .9, c)]; for (var i = 0; i < 3; i++){ o.push(vertRect(.12, .88, .781, .08 + i * .27, .3 + i * .27, lt(c, .06), { sw:.4 })); o.push(Sp(.5, .79, .19 + i * .27, .025, METAL, { flat:true })); }
  o.push(Cy(.25, .35, .9, .07, .2, "#9B7BFF")); o.push(Sp(.25, .35, 1.16, .08, "#FF6FA3")); o.push(B(.55, .3, .9, .3, .25, .2, WHITE)); return o; };
D.vanity = function(c){ return [].concat(legs4(.12, .16, .88, .7, .7, dk(c, .2), .05), [B(.08, .12, .7, .84, .62, .06, c), B(.2, .14, .76, .6, .06, .12, dk(c, .1)),
  Ve(.5, .17, 1.3, .3, .38, "#E7CFA9"), Ve(.5, .18, 1.3, .25, .33, "#cfe8ff", { k:.1 }), Pl([[.4,.185,1.45],[.48,.185,1.55],[.4,.185,1.25]], "rgba(255,255,255,.7)", { stroke:false, k:.2 }),
  Cy(.3, .4, .76, .04, .12, "#FF6FA3"), Cy(.38, .38, .76, .04, .08, "#FFD84D"), Cy(.5, .9, 0, .18, .42, "#FFB3CF")]); };
D.nightstand = function(c){ return [B(.12, .12, 0, .76, .7, .6, c), vertRect(.18, .82, .821, .32, .54, lt(c, .06), { sw:.4 }), Sp(.5, .82, .43, .025, METAL, { flat:true }),
  Cy(.4, .4, .6, .09, .04, METAL), B(.38, .38, .64, .04, .04, .28, METAL), Cy(.4, .4, .86, .17, .2, "#FFE08A", .1), Gl(.4, .45, .8, .8, "warm"), B(.6, .45, .6, .2, .28, .05, "#6EA8FF")]; };
/* — ванная — */
D.bathtub = function(c){ return [B(.06, .1, .1, 1.88, .8, .48, c), Fl(.16, .2, .55, 1.68, .6, "#9BE3FF", { k:200 }),
  Sp(.6, .45, .58, .1, "#fff", { k:201 }), Sp(.75, .5, .6, .12, "#fff", { k:201 }), Sp(.9, .42, .58, .08, "#fff", { k:201 }),
  Sp(.15, .14, .05, .05, "#FFC23D", { flat:true }), Sp(1.85, .14, .05, .05, "#FFC23D", { flat:true }), Sp(.15, .85, .05, .05, "#FFC23D", { flat:true }), Sp(1.85, .85, .05, .05, "#FFC23D", { flat:true }),
  B(1.75, .44, .58, .06, .06, .26, METAL), B(1.6, .44, .8, .2, .06, .05, METAL), Sp(1.2, .5, .62, .06, "#FFD84D", { k:202 })]; };
D.shower = function(){ return [B(.04, .04, 0, .92, .92, .1, "#F2EADF"), sideRect(.94, .06, .94, .1, 1.9, "#cfeeff", { op:.35 }), vertRect(.06, .94, .94, .1, 1.9, "#cfeeff", { op:.35, k:1e3 }),
  B(.2, .1, 1.7, .06, .3, .05, METAL), Cy(.23, .38, 1.62, .1, .06, METAL), Ln([.23, .38, 1.6], [.23, .38, .3], "#9fdcff", .8, { cls:"drip" })]; };
D.toilet = function(){ return [B(.25, .08, .3, .5, .24, .5, WHITE), Cy(.5, .55, 0, .17, .3, WHITE, .22), El(.5, .58, .31, .24, .3, WHITE), El(.5, .58, .32, .16, .2, "#cfe8ff", { stroke:false, k:300 }), B(.44, .1, .8, .12, .1, .03, METAL)]; };
D.bath_sink = function(c){ return [Cy(.5, .45, 0, .1, .72, WHITE), B(.14, .14, .72, .72, .56, .14, c), Fl(.24, .24, .865, .52, .36, "#cfe8ff", { k:310 }), B(.46, .14, .86, .08, .08, .2, METAL), B(.46, .14, 1.02, .08, .18, .04, METAL)]; };
D.washer = function(c){ return [B(.08, .1, 0, .84, .76, .9, c), Ve(.5, .861, .42, .26, .26, "#cfd3e6"), Ve(.5, .862, .42, .19, .19, "#6EA8FF", { k:.1, cls:"spin" }), B(.15, .861, .76, .3, .01, .08, "#2b2838"), Sp(.75, .86, .8, .03, "#3FC7B4", { flat:true })]; };
D.duck = function(c){ c = c || "#FFD84D"; return [Sp(.5, .55, .12, .14, c), Sp(.42, .48, .3, .09, c, { k:.2 }), Pl([[.34,.5,.3],[.26,.52,.28],[.34,.52,.26]], "#FF8A3D", { k:.3 }), Sp(.4, .52, .34, .015, "#24103A", { flat:true, k:.31 })]; };
/* — тараканий штаб — */
D.roach_table = function(c){ return [].concat(legs4(.2, .2, 1.8, .8, .45, WOOD_D, .06), [B(.12, .12, .45, 1.76, .76, .06, c), Fl(.6, .3, .515, .8, .4, "#FBF7F2", { k:500 }), Ln([.7, .4, .52], [1.3, .55, .52], "#FF4F8B", 1, { k:501 }), Pl(heartPts(1.3, .5, .52, .06, "floor"), "#FF4F8B", { k:502, stroke:false })],
  roach(.35, .5, .51, .7, { k:510 }), roach(1.65, .5, .51, .7, { k:510 }), roach(1, .75, .51, .7, { k:511, bow:"#9B7BFF" })); };
D.roach_bunk = function(c){ return [B(.15, .2, 0, .7, .6, .06, c), B(.15, .2, .45, .7, .6, .06, c), B(.15, .2, 0, .06, .06, .9, WOOD_D), B(.79, .2, 0, .06, .06, .9, WOOD_D), B(.15, .74, 0, .06, .06, .9, WOOD_D), B(.79, .74, 0, .06, .06, .9, WOOD_D),
  Fl(.2, .25, .065, .6, .5, "#FFB3CF", { k:600 }), Fl(.2, .25, .515, .6, .5, "#C9B6FF", { k:601 })].concat(roach(.5, .5, .07, .55, { k:600.5 }), roach(.5, .5, .52, .55, { k:601.5 }), [Tx(.7, .4, .95, "z", 8, "#9B7BFF", { cls:"zz", k:700 })]); };
D.roach_throne = function(c){ return [B(.15, .15, 0, .7, .7, .3, "#FFC23D"), B(.15, .1, .3, .7, .14, .95, "#FFC23D"), B(.22, .24, .3, .56, .56, .08, c), Sp(.2, .12, 1.3, .06, "#FF4F8B", { flat:true }), Sp(.8, .12, 1.3, .06, "#FF4F8B", { flat:true }), Sp(.5, .12, 1.32, .07, "#6EA8FF", { flat:true })]
  .concat(roach(.5, .55, .38, 1.1, { k:800, crown:true })); };
D.plan_board = function(){ return [Ln([.3, .7, 0], [.4, .5, 1.3], WOOD_D, 2), Ln([.7, .7, 0], [.6, .5, 1.3], WOOD_D, 2), Ln([.5, .3, 0], [.5, .48, 1.3], WOOD_D, 2),
  vertRect(.12, .88, .52, .55, 1.4, "#FBF7F2", { k:1 }), Pl(heartPts(.62, .53, 1.0, .12), "#FF4F8B", { k:2, stroke:false }), Ln([.22, .53, .7], [.52, .53, .95], "#24103A", 1, { k:2 }),
  Tx(.36, .53, 1.22, "ОПЕРАЦИЯ «САША»", 5, "#24103A", { k:3, plane:"wall" }), Ln([.2, .53, .65], [.35, .53, .78], "#9B7BFF", 1, { k:2 })].concat(roach(.5, .9, 0, .5, { k:5 })); };
/* — на стену (u — вдоль стены, v — от стены) — */
D.window = function(c, seed, ctx){ var sky = ctx && ctx.night ? "#1d2350" : "#9fd8ff"; return [
  B(.08, 0, .7, .84, .08, 1.12, WHITE), vertRect(.14, .86, .081, .76, 1.76, sky, { sw:.4, cls:ctx && ctx.night ? "nightsky" : "" }),
  ctx && ctx.night ? Sp(.68, .09, 1.55, .06, "#FFF6C9", { flat:true, k:9 }) : Sp(.68, .09, 1.55, .08, "#FFE08A", { flat:true, k:9 }),
  Ln([.5, .085, .76], [.5, .085, 1.76], WHITE, 2, { k:10 }), Ln([.14, .085, 1.26], [.86, .085, 1.26], WHITE, 2, { k:10 }),
  B(.02, 0, .62, .96, .2, .08, WHITE), Pl([[.02,.1,1.9],[.24,.1,1.9],[.16,.1,.66],[.02,.1,.66]], c, { k:11 }), Pl([[.76,.1,1.9],[.98,.1,1.9],[.98,.1,.66],[.84,.1,.66]], c, { k:11 }),
  B(0, 0, 1.88, 1.0, .1, .05, WOOD_D)
]; };
D.window_big = function(c, seed, ctx){ var sky = ctx && ctx.night ? "#1d2350" : "#9fd8ff"; return [
  B(.08, 0, .5, 1.84, .08, 1.35, WHITE), vertRect(.14, 1.86, .081, .56, 1.79, sky, { sw:.4 }),
  ctx && ctx.night ? Sp(1.5, .09, 1.55, .07, "#FFF6C9", { flat:true, k:9 }) : Sp(1.5, .09, 1.5, .1, "#FFE08A", { flat:true, k:9 }),
  !(ctx && ctx.night) ? Sp(.5, .09, 1.45, .08, "#fff", { flat:true, k:9 }) : Sp(.5, .09, 1.6, .015, "#fff", { flat:true, k:9 }),
  Ln([1, .085, .56], [1, .085, 1.79], WHITE, 2.4, { k:10 }), Ln([.14, .085, 1.18], [1.86, .085, 1.18], WHITE, 2, { k:10 }),
  B(.02, 0, .44, 1.96, .22, .08, WHITE), Pl([[.0,.1,1.95],[.3,.1,1.95],[.2,.1,.48],[.0,.1,.48]], c, { k:11 }), Pl([[1.7,.1,1.95],[2.0,.1,1.95],[2.0,.1,.48],[1.8,.1,.48]], c, { k:11 }),
  Cy(.4, .14, .52, .06, .1, "#E8875F"), Sp(.4, .14, .7, .08, "#47B36B")
]; };
D.picture_heart = function(c){ return [B(.18, 0, 1.0, .64, .05, .64, WOOD_D), vertRect(.24, .76, .051, 1.06, 1.58, lt(c, .55), { sw:.3 }), Pl(heartPts(.5, .052, 1.32, .16), c, { k:5 })]; };
D.picture_land = function(c){ return [B(.1, 0, .95, 1.8, .05, .8, WOOD_L), vertRect(.16, 1.84, .051, 1.01, 1.69, "#bfe6ff", { sw:.3 }),
  Pl([[.16,.052,1.01],[.6,.052,1.45],[1.0,.052,1.15],[1.4,.052,1.5],[1.84,.052,1.1],[1.84,.052,1.01]], c, { k:5, stroke:false }), Pl([[.16,.052,1.01],[1.84,.052,1.01],[1.84,.052,1.12],[.16,.052,1.2]], "#47B36B", { k:6, stroke:false }), Ve(1.5, .053, 1.55, .08, .08, "#FFD84D", { k:6 })]; };
D.photo_wall = function(){ var o = [Ln([.05, .04, 1.62], [1.95, .04, 1.62], "#8A5A3B", 1)], cols = ["#FFB3CF","#C9B6FF","#9BE3D6","#FFE08A","#A9CBFF"];
  for (var i = 0; i < 5; i++){ var u = .12 + i * .37, z = 1.15 + (i % 2) * .08; o.push(vertRect(u, u + .3, .05, z, z + .38, "#fff", { sw:.4, k:2 + i })); o.push(vertRect(u + .03, u + .27, .051, z + .1, z + .35, cols[i], { stroke:false, k:2.1 + i })); o.push(Pl(heartPts(u + .15, .052, z + .22, .05), "#FF4F8B", { stroke:false, k:2.2 + i })); o.push(B(u + .13, .03, z + .36, .04, .03, .06, "#FFD84D", { k:2.3 + i })); }
  return o; };
D.clock = function(c, seed, ctx){ var h = ctx && ctx.h || 10, m = ctx && ctx.m || 10, ah = (h % 12 + m / 60) / 12 * Math.PI * 2, am = m / 60 * Math.PI * 2;
  return [Ve(.5, .05, 1.5, .3, .3, c), Ve(.5, .06, 1.5, .24, .24, WHITE, { k:.1 }),
    Ln([.5, .065, 1.5], [.5 + Math.sin(ah) * .13, .065, 1.5 + Math.cos(ah) * .13], "#24103A", 1.8, { k:.2 }),
    Ln([.5, .065, 1.5], [.5 + Math.sin(am) * .2, .065, 1.5 + Math.cos(am) * .2], "#FF4F8B", 1.2, { k:.3 }),
    Sp(.5, .066, 1.5, .02, "#24103A", { flat:true, k:.4 })]; };
D.shelf = function(c, seed){ return [B(.06, 0, 1.25, .88, .26, .05, c), B(.12, .05, 1.1, .05, .2, .15, dk(c, .3)), B(.83, .05, 1.1, .05, .2, .15, dk(c, .3))].concat(books(.12, .6, .2, 1.3, .3, seed), [Cy(.75, .12, 1.3, .06, .12, "#E8875F"), Sp(.75, .12, 1.48, .08, "#47B36B")]); };
D.tv_wall = function(){ return [B(.1, 0, .9, 1.8, .06, .95, "#1d1b26"), vertRect(.14, 1.86, .061, .94, 1.81, "#3a4f9c", { sw:.4, cls:"screen" }), Pl([[.3,.062,1.7],[.9,.062,1.75],[.5,.062,1.2]], "rgba(255,255,255,.15)", { stroke:false, k:2 })]; };
D.garland = function(){ var o = [], cols = ["#FFD84D","#FF6FA3","#9BE3D6","#B48CFF"];
  for (var i = 0; i < 16; i++){ var t = i / 15, u = .05 + t * 1.9, z = 1.9 - Math.sin(t * Math.PI) * .25; if (i) o.push(Ln([.05 + (i - 1) / 15 * 1.9, .03, 1.9 - Math.sin((i - 1) / 15 * Math.PI) * .25], [u, .03, z], "#3b2c4a", .8)); o.push(Sp(u, .05, z - .04, .03, cols[i % 4], { flat:true, k:5, cls:"bulb b" + (i % 3) })); }
  o.push(Gl(1, .1, 1.7, 1.6, "warm")); return o; };
D.mirror = function(c){ return [Ve(.5, .04, 1.25, .3, .5, c), Ve(.5, .05, 1.25, .24, .44, "#d9f0ff", { k:.1 }), Pl([[.38,.055,1.45],[.48,.055,1.6],[.38,.055,1.15]], "rgba(255,255,255,.7)", { stroke:false, k:.2 })]; };
D.spice_rack = function(c){ var o = [B(.06, 0, 1.25, .88, .22, .05, c)], cols = ["#C0392B","#FFC23D","#47B36B","#8A5A3B","#FF8A3D"]; for (var i = 0; i < 5; i++) o.push(Cy(.16 + i * .17, .1, 1.3, .05, .14, cols[i])); return o; };
D.towel = function(c){ return [B(.12, 0, 1.3, .76, .14, .04, METAL), Pl([[.18,.1,1.32],[.82,.1,1.32],[.82,.1,.75],[.18,.1,.75]], c, { k:2 }), Ln([.18, .101, .85], [.82, .101, .85], lt(c, .4), 2, { k:3 })]; };
D.calendar = function(c, seed, ctx){ var d = ctx && ctx.day || 9, mo = ctx && ctx.mon || "окт"; return [vertRect(.2, .8, .03, .95, 1.6, WHITE, { sw:.5 }), vertRect(.2, .8, .031, 1.42, 1.6, c, { sw:.4, k:.1 }),
  Tx(.5, .032, 1.12, String(d), 15, "#24103A", { plane:"wall", k:.2 }), Tx(.5, .032, 1.47, mo, 6, "#fff", { plane:"wall", k:.3 }), Sp(.5, .033, 1.3, .015, "#FF4F8B", { flat:true, k:.4 })]; };
D.neon = function(c){ return [vertRect(.05, 1.95, .02, 1.2, 1.75, "#24103A", { sw:.5, op:.85 }), Tx(1.0, .03, 1.38, "Кто где?", 13, c, { plane:"wall", cls:"neon", k:.2 }), Gl(1, .2, 1.45, 1.4, "pink")]; };
/* — сад — */
D.garden_bed = function(c, seed, ctx, it){ var wet = ctx && ctx.wet, o = [B(.06, .06, 0, .88, .88, .16, wet ? "#5b3620" : "#8a5a3b", { top:wet ? "#4a2a18" : "#7a4b2a" })];
  for (var i = 0; i < 3; i++) o.push(Ln([.12, .2 + i * .28, .165], [.88, .2 + i * .28, .165], wet ? "#3a2012" : "#5e3b22", .8, { k:10 }));
  return o.concat(ART.cropPrims(it && it.crop, ctx)); };
D.pond = function(){ var o = [El(1.5, 1, .005, 1.45, .95, "#9a9a9a", { k:-10 }), El(1.5, 1, .01, 1.3, .82, "#4FA7E8", { k:-9 }), El(1.45, .96, .012, 1.0, .6, "#6EC0F5", { stroke:false, k:-8, cls:"water" }),
  El(.9, .7, .015, .18, .12, "#47B36B", { k:-7 }), El(2.1, 1.3, .015, .2, .14, "#47B36B", { k:-7 }), Sp(2.1, 1.28, .05, .05, "#FF9DBD", { flat:true, k:-6 })];
  var R = rnd(11); for (var i = 0; i < 14; i++){ var a = i / 14 * Math.PI * 2; o.push(Sp(1.5 + Math.cos(a) * 1.42, 1 + Math.sin(a) * .92, .06, .08 + R() * .05, i % 2 ? "#a8a3b5" : "#8f8a9e")); }
  o.push(Cy(.25, .9, 0, .03, .7, "#4a8f3a")); o.push(Cy(.3, 1.1, 0, .03, .6, "#4a8f3a")); o.push(Cy(.27, .95, .55, .05, .2, "#6b4226"));
  return o; };
D.tree = function(c, seed, ctx, it){ var o = [El(.5, .5, 0, .45, .4, "rgba(0,0,0,.14)", { stroke:false }), Cy(.5, .5, 0, .1, .9, "#8A5A3B", .07)], g = c || "#3DBB66";
  o.push(Sp(.5, .5, 1.25, .45, g)); o.push(Sp(.3, .55, 1.05, .3, lt(g, .08), { k:.1 })); o.push(Sp(.7, .45, 1.1, .3, dk(g, .06), { k:.1 })); o.push(Sp(.5, .6, 1.55, .3, lt(g, .14), { k:.2 }));
  if (it && it.fruit && ctx && ctx.ripe){ var R = rnd(seed); for (var i = 0; i < 7; i++) o.push(Sp(.5 + (R() - .5) * .7, .5 + (R() - .5) * .3 + .25, .95 + R() * .8, .06, it.fruit, { k:.5, flat:false })); }
  return o; };
D.pine = function(){ return [El(.5, .5, 0, .4, .36, "rgba(0,0,0,.14)", { stroke:false }), Cy(.5, .5, 0, .07, .3, "#8A5A3B"), Cy(.5, .5, .3, .4, .5, "#2E8B57", .1), Cy(.5, .5, .65, .32, .45, "#36A064", .06), Cy(.5, .5, .98, .22, .45, "#3DB36F", .01)]; };
D.bush = function(c){ c = c || "#3DBB66"; return [Sp(.5, .55, .22, .26, c), Sp(.32, .5, .2, .18, lt(c, .08)), Sp(.68, .48, .24, .2, dk(c, .05)), Sp(.5, .45, .4, .18, lt(c, .12), { k:.1 })]; };
D.flower_bed = function(c, seed){ var o = [B(.08, .08, 0, .84, .84, .1, "#8a5a3b", { top:"#6b4226" })], R = rnd(seed); for (var i = 0; i < 9; i++){ var u = .2 + (i % 3) * .3, v = .2 + Math.floor(i / 3) * .3; o.push(Ln([u, v, .1], [u, v, .26], "#3a8f45", 1)); o.push(Sp(u, v, .3, .06, i % 2 ? c : COLS.flower[Math.floor(R() * 4)], { flat:true })); } return o; };
D.roses = function(c){ var o = D.bush("#2f9450"); [[.3,.5,.35],[.6,.4,.42],[.5,.62,.3],[.7,.6,.3],[.42,.4,.5]].forEach(function(p){ o.push(Sp(p[0], p[1], p[2], .05, c, { k:.3 })); }); return o; };
D.fence = function(c){ var o = []; for (var i = 0; i < 3; i++) o.push(B(.04 + i * .44, .02, 0, .1, .08, .7, c, { k:i })); o.push(B(0, .04, .22, 1, .05, .07, dk(c, .08))); o.push(B(0, .04, .5, 1, .05, .07, dk(c, .08))); return o; };
D.path = function(c){ return [Fl(.06, .06, .004, .4, .4, c, { sw:.4 }), Fl(.54, .06, .004, .4, .4, lt(c, .06), { sw:.4 }), Fl(.06, .54, .004, .4, .4, lt(c, .04), { sw:.4 }), Fl(.54, .54, .004, .4, .4, c, { sw:.4 })]; };
D.bench = function(c){ return [B(.15, .3, 0, .08, .5, .4, METAL), B(1.77, .3, 0, .08, .5, .4, METAL), B(.1, .3, .4, 1.8, .16, .05, c), B(.1, .5, .4, 1.8, .16, .05, c), B(.1, .7, .4, 1.8, .14, .05, c),
  B(.1, .26, .5, 1.8, .05, .14, c), B(.1, .26, .7, 1.8, .05, .14, c), B(.15, .24, .4, .08, .06, .55, METAL), B(1.77, .24, .4, .08, .06, .55, METAL)]; };
D.swing = function(c){ return [Ln([.1, .1, 0], [.25, .5, 1.6], WOOD_D, 3), Ln([.1, .9, 0], [.25, .5, 1.6], WOOD_D, 3), Ln([1.9, .1, 0], [1.75, .5, 1.6], WOOD_D, 3), Ln([1.9, .9, 0], [1.75, .5, 1.6], WOOD_D, 3),
  B(.2, .46, 1.6, 1.6, .08, .08, WOOD_D, { k:10 }), Ln([.6, .5, 1.6], [.6, .5, .5], "#d9c3a0", 1, { k:9 }), Ln([1.4, .5, 1.6], [1.4, .5, .5], "#d9c3a0", 1, { k:9 }),
  B(.5, .36, .45, 1.0, .3, .06, c, { k:9.5 }), Pl(heartPts(1, .37, 1.3, .1), "#FF4F8B", { k:11 })]; };
D.lantern = function(c){ return [Cy(.5, .5, 0, .12, .06, "#2b2838"), B(.47, .47, .06, .06, .06, 1.25, "#2b2838"), B(.4, .4, 1.3, .2, .2, .26, "#FFE08A", { op:.9 }), Pl([[.36,.36,1.56],[.64,.36,1.56],[.64,.64,1.56],[.5,.5,1.7],[.36,.64,1.56]], "#2b2838"), Gl(.5, .5, 1.4, 1.6, "warm")]; };
D.bbq = function(c){ return [Ln([.35, .35, 0], [.5, .5, .5], METAL, 1.6), Ln([.65, .35, 0], [.5, .5, .5], METAL, 1.6), Ln([.5, .7, 0], [.5, .5, .5], METAL, 1.6),
  Cy(.5, .5, .45, .28, .2, c, .32), El(.5, .5, .66, .3, .3, "#2b2838", { k:5 }), Cy(.5, .5, .66, .3, .12, c, .15, { k:6 }), Sp(.5, .5, .82, .04, METAL, { flat:true, k:7 }),
  Sp(.45, .45, 1.0, .06, "rgba(220,220,230,.6)", { flat:true, cls:"smoke", k:8 })]; };
D.hammock = function(c){ var o = [B(.05, .4, 0, .12, .12, 1.2, WOOD_D), B(1.83, .4, 0, .12, .12, 1.2, WOOD_D)], a = [], b = [];
  for (var i = 0; i <= 12; i++){ var t = i / 12, u = .15 + t * 1.7, z = 1.0 - Math.sin(t * Math.PI) * .5; a.push([u, .3, z]); b.unshift([u, .7, z]); }
  o.push(Pl(a.concat(b), c, { k:5 })); o.push(Pl(a.concat(b).map(function(p){ return [p[0], p[1], p[2] + .03]; }).filter(function(_, i){ return i % 1 === 0; }), lt(c, .25), { k:5.1, op:.5, stroke:false }));
  o.push(Sp(.5, .5, .75, .12, WHITE, { k:6 })); return o; };
D.well = function(c){ return [Cy(.5, .5, 0, .38, .55, "#a8a3b5"), El(.5, .5, .56, .3, .3, "#2a3550", { k:5 }), B(.14, .46, .55, .06, .08, .9, WOOD_D), B(.8, .46, .55, .06, .08, .9, WOOD_D),
  Pl([[.06,.2,1.4],[.94,.2,1.4],[.94,.5,1.7],[.06,.5,1.7]], c, { k:6 }), Pl([[.06,.8,1.4],[.94,.8,1.4],[.94,.5,1.7],[.06,.5,1.7]], dk(c, .1), { k:7 }),
  Ln([.5, .5, 1.35], [.5, .5, .9], "#d9c3a0", .8, { k:5.5 }), Cy(.5, .5, .78, .09, .12, "#8A5A3B", .11, { k:5.6 })]; };
D.birdhouse = function(c){ return [B(.47, .47, 0, .06, .06, 1.1, WOOD_D), B(.32, .32, 1.1, .36, .36, .36, c), Pl([[.28,.28,1.46],[.72,.28,1.46],[.5,.5,1.66],[.28,.72,1.46]], "#C0392B", { k:5 }), Pl([[.72,.28,1.46],[.72,.72,1.46],[.5,.5,1.66]], dk("#C0392B", .1), { k:5 }),
  Ve(.5, .681, 1.3, .06, .06, "#24103A", { k:6 }), Sp(.75, .55, 1.5, .06, "#6EA8FF", { k:7, cls:"bird" })]; };
D.gazebo = function(c){ var o = [Cy(1.5, 1.5, 0, 1.4, .14, "#E7CFA9", 1.4)];
  [[.4,.4],[2.6,.4],[.4,2.6],[2.6,2.6]].forEach(function(p){ o.push(B(p[0] - .06, p[1] - .06, .14, .12, .12, 1.6, WHITE)); });
  o.push(B(.6, .5, .14, 1.8, .4, .4, c)); o.push(B(.5, .6, .14, .4, 1.8, .4, c));
  var ap = [1.5, 1.5, 2.6]; o.push(Pl([[.1,2.9,1.74],[2.9,2.9,1.74],ap], dk(c, .1), { k:200 })); o.push(Pl([[2.9,.1,1.74],[2.9,2.9,1.74],ap], dk(c, .25), { k:200 }));
  for (var i = 0; i < 10; i++){ var t = i / 9; o.push(Sp(.1 + t * 2.8, 2.9, 1.7, .03, "#FFD84D", { flat:true, k:201, cls:"bulb" })); }
  o.push(Gl(1.5, 1.5, 1.2, 2, "warm")); return o; };
D.scarecrow = function(c){ return [B(.47, .47, 0, .06, .06, 1.2, WOOD_D), B(.1, .47, .9, .8, .06, .06, WOOD_D), B(.3, .42, .55, .4, .16, .45, c)].concat(roach(.5, .45, 1.0, 1.4, { k:5 }), [Cy(.5, .38, 1.45, .2, .03, "#E8C26A", .2, { k:6 }), Cy(.5, .38, 1.48, .12, .14, "#E8C26A", .1, { k:6.1 })]); };
D.mailbox = function(c){ return [B(.47, .47, 0, .06, .06, .8, WOOD_D), B(.3, .3, .8, .4, .4, .26, c), Cy(.5, .5, 1.03, .2, .02, c), B(.68, .48, .95, .03, .04, .25, "#FF4F8B")]; };

/* ---------- культуры ---------- */
var CROP_ART = {
  radish:    { leaf:"#4CC46B", fruit:"#FF6F9C", type:"root" },
  carrot:    { leaf:"#52C55A", fruit:"#FF8A3D", type:"root" },
  lettuce:   { leaf:"#8EDB6A", fruit:"#A6E87E", type:"head" },
  potato:    { leaf:"#3DAA5C", fruit:"#C9A06A", type:"bush" },
  tomato:    { leaf:"#3DAA5C", fruit:"#FF4F4F", type:"bush" },
  cucumber:  { leaf:"#47B36B", fruit:"#3E9B4F", type:"vine" },
  strawberry:{ leaf:"#3DAA5C", fruit:"#FF3E6C", type:"low" },
  pepper:    { leaf:"#3DAA5C", fruit:"#FF6A2B", type:"bush" },
  corn:      { leaf:"#7BC74D", fruit:"#FFD84D", type:"tall" },
  sunflower: { leaf:"#59B653", fruit:"#FFC23D", type:"flower" },
  lavender:  { leaf:"#6FAE7A", fruit:"#A98BFF", type:"spike" },
  pumpkin:   { leaf:"#47B36B", fruit:"#FF8A2B", type:"big" },
  watermelon:{ leaf:"#47B36B", fruit:"#3E9B4F", type:"big" }
};
function cropPrims(crop, ctx){
  if (!crop || !crop.id) return [];
  var a = CROP_ART[crop.id] || CROP_ART.radish, st = ctx && ctx.stage || 0, o = [], z = .17, K = 50;
  if (st === 0){ for (var i = 0; i < 5; i++) o.push(Sp(.25 + i * .12, .5 + (i % 2 ? .1 : -.1), z + .01, .02, "#3b2416", { flat:true, k:K })); return o; }
  if (st === 1){ [[.35,.4],[.62,.38],[.5,.62]].forEach(function(p){ o.push(Ln([p[0], p[1], z], [p[0], p[1], z + .12], a.leaf, 1.2, { k:K })); o.push(Sp(p[0] - .03, p[1], z + .13, .035, a.leaf, { flat:true, k:K + .1 })); o.push(Sp(p[0] + .03, p[1], z + .14, .035, lt(a.leaf, .1), { flat:true, k:K + .1 })); }); return o; }
  var big = st >= 3, s = big ? 1 : .7;
  switch (a.type){
    case "root": [[.32,.35],[.66,.36],[.36,.66],[.64,.66]].forEach(function(p){ if (big) o.push(Sp(p[0], p[1] + .05, z + .02, .07, a.fruit, { k:K })); o.push(Sp(p[0], p[1], z + .12 * s, .07 * s, a.leaf, { k:K + .1 })); o.push(Sp(p[0] - .05, p[1] - .02, z + .2 * s, .05 * s, lt(a.leaf, .1), { k:K + .2 })); }); break;
    case "head": [[.32,.35],[.66,.36],[.36,.66],[.64,.66]].forEach(function(p){ o.push(Sp(p[0], p[1], z + .08 * s, .12 * s, a.leaf, { k:K })); o.push(Sp(p[0], p[1], z + .13 * s, .07 * s, lt(a.leaf, .2), { k:K + .1 })); }); break;
    case "low": [[.32,.38],[.66,.38],[.5,.66]].forEach(function(p){ o.push(Sp(p[0], p[1], z + .07, .11 * s, a.leaf, { k:K })); if (big){ o.push(Sp(p[0] + .06, p[1] + .08, z + .05, .045, a.fruit, { k:K + .2 })); o.push(Sp(p[0] - .06, p[1] + .06, z + .04, .04, a.fruit, { k:K + .2 })); } }); break;
    case "vine": o.push(Ln([.3, .3, z], [.3, .3, z + .8 * s], WOOD_L, 1.4, { k:K })); o.push(Ln([.7, .3, z], [.7, .3, z + .8 * s], WOOD_L, 1.4, { k:K })); for (var j = 0; j < 5; j++) o.push(Sp(.3 + j * .1, .32, z + .25 + (j % 2) * .25 * s, .1 * s, a.leaf, { k:K + .1 })); if (big){ o.push(Cy(.4, .45, z + .2, .04, .16, a.fruit, .04, { k:K + .3 })); o.push(Cy(.62, .45, z + .3, .04, .18, a.fruit, .04, { k:K + .3 })); } break;
    case "tall": [[.35,.4],[.65,.4],[.5,.65]].forEach(function(p){ o.push(Cy(p[0], p[1], z, .03, 1.0 * s, a.leaf, .02, { k:K })); o.push(Sp(p[0] + .05, p[1], z + .6 * s, .06, a.leaf, { k:K + .1 })); if (big) o.push(Cy(p[0] + .06, p[1] + .03, z + .5, .04, .2, a.fruit, .03, { k:K + .2 })); }); break;
    case "flower": o.push(Cy(.5, .5, z, .03, 1.1 * s, a.leaf, .025, { k:K })); o.push(Sp(.42, .5, z + .5 * s, .07, a.leaf, { k:K + .1 })); if (big){ o.push(Ve(.5, .52, z + 1.15, .2, .2, a.fruit, { k:K + .2 })); o.push(Ve(.5, .53, z + 1.15, .09, .09, "#6b4226", { k:K + .3 })); } else o.push(Sp(.5, .5, z + .78, .08, a.leaf, { k:K + .2 })); break;
    case "spike": for (var q = 0; q < 6; q++){ var u = .25 + (q % 3) * .25, v = .35 + Math.floor(q / 3) * .3; o.push(Ln([u, v, z], [u, v, z + .4 * s], a.leaf, 1.2, { k:K })); if (big) o.push(Cy(u, v, z + .35, .03, .2, a.fruit, .02, { k:K + .1 })); } break;
    case "big": o.push(Sp(.35, .35, z + .1, .14 * s, a.leaf, { k:K })); o.push(Sp(.65, .4, z + .12, .13 * s, lt(a.leaf, .08), { k:K })); if (big) o.push(Sp(.5, .6, z + .14, .2, a.fruit, { k:K + .2 })); else o.push(Sp(.45, .6, z + .1, .12, a.leaf, { k:K + .1 })); break;
    default: [[.35,.38],[.65,.38],[.5,.66]].forEach(function(p){ o.push(Sp(p[0], p[1], z + .16 * s, .13 * s, a.leaf, { k:K })); o.push(Sp(p[0], p[1] - .02, z + .3 * s, .09 * s, lt(a.leaf, .1), { k:K + .1 })); if (big){ o.push(Sp(p[0] + .07, p[1] + .1, z + .2, .055, a.fruit, { k:K + .2 })); o.push(Sp(p[0] - .07, p[1] + .08, z + .14, .05, a.fruit, { k:K + .2 })); } });
  }
  if (big && ctx && ctx.ripe) o.push(Sp(.5, .5, z + 1.3, .06, "#FFD84D", { flat:true, k:K + 10, cls:"spark" }));
  return o;
}

/* ---------- полы и стены ---------- */
var FLOORS = {
  oak:      { name:"Светлый дуб", a:"#E3B886", b:"#D9AA74", lines:"#C2915C", kind:"plank" },
  walnut:   { name:"Тёмный орех", a:"#9A6544", b:"#8C5A3B", lines:"#6E4229", kind:"plank" },
  herring:  { name:"Ёлочка", a:"#D7A36B", b:"#C99560", lines:"#A9784A", kind:"herring" },
  tiles:    { name:"Белая плитка", a:"#F4F1EC", b:"#E9E4DC", lines:"#D5CEC4", kind:"tile" },
  checker:  { name:"Шахматка", a:"#F4F1EC", b:"#3A3550", lines:"#2a2540", kind:"checker" },
  pink:     { name:"Розовый ковролин", a:"#FFC4D8", b:"#FFB9D2", lines:"#F7A6C2", kind:"carpet" },
  lilac:    { name:"Лиловый ковролин", a:"#D7C8FF", b:"#CDBCFF", lines:"#B9A6F2", kind:"carpet" },
  mint:     { name:"Мятная плитка", a:"#BFF0E3", b:"#AEE6D7", lines:"#8FCFBE", kind:"tile" },
  stone:    { name:"Камень", a:"#C9C3D3", b:"#BDB6C9", lines:"#9f97ae", kind:"tile" },
  grass:    { name:"Трава", a:"#7FD36B", b:"#74C95F", lines:"#5fb34d", kind:"grass" },
  deck:     { name:"Деревянный настил", a:"#C8925E", b:"#BC8653", lines:"#94643C", kind:"plank" }
};
var WALLS = {
  cream:   { name:"Сливочные", a:"#FFF4E6", kind:"plain" },
  blush:   { name:"Пудровые", a:"#FFDDE8", kind:"plain" },
  lilac:   { name:"Лавандовые", a:"#E6DCFF", kind:"plain" },
  mint:    { name:"Мятные", a:"#D6F5EC", kind:"plain" },
  sky:     { name:"Небесные", a:"#D8ECFF", kind:"plain" },
  stripes: { name:"Розовая полоска", a:"#FFE6EF", b:"#FFC8DA", kind:"stripes" },
  dots:    { name:"Горошек", a:"#FFF4E6", b:"#FF9DBD", kind:"dots" },
  panel:   { name:"Деревянные панели", a:"#FFF4E6", b:"#C8925E", kind:"panel" },
  night:   { name:"Звёздная ночь", a:"#2E2A5A", b:"#FFE08A", kind:"stars" },
  sun:     { name:"Солнечные", a:"#FFF0B8", kind:"plain" }
};
function floorTile(x, y, f, R){
  var c = (x + y) % 2 ? f.a : f.b, s = "";
  if (f.kind === "checker") c = (x + y) % 2 ? f.a : f.b;
  if (f.kind === "grass") c = R() < .5 ? f.a : f.b;
  s += poly([P(x,y,0),P(x+1,y,0),P(x+1,y+1,0),P(x,y+1,0)], c, { stroke:f.kind === "grass" ? false : f.lines, sw:.5 });
  if (f.kind === "plank"){ for (var i = 1; i < 4; i++){ var a = P(x, y + i / 4, 0), b = P(x + 1, y + i / 4, 0); s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + f.lines + '" stroke-width=".6"/>'; }
    var j = P(x + ((x * 7 + y * 3) % 4 + 1) / 5, y + .25, 0), j2 = P(x + ((x * 7 + y * 3) % 4 + 1) / 5, y + .5, 0); s += '<line x1="' + j[0] + '" y1="' + j[1] + '" x2="' + j2[0] + '" y2="' + j2[1] + '" stroke="' + f.lines + '" stroke-width=".6"/>'; }
  if (f.kind === "herring"){ var m = P(x + .5, y + .5, 0), a1 = P(x, y + .5, 0), a2 = P(x + .5, y, 0); s += '<line x1="' + a1[0] + '" y1="' + a1[1] + '" x2="' + m[0] + '" y2="' + m[1] + '" stroke="' + f.lines + '" stroke-width=".6"/><line x1="' + a2[0] + '" y1="' + a2[1] + '" x2="' + m[0] + '" y2="' + m[1] + '" stroke="' + f.lines + '" stroke-width=".6"/>'; }
  if (f.kind === "carpet" && R() < .3){ var q = P(x + R(), y + R(), 0); s += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="1.2" fill="' + f.lines + '"/>'; }
  if (f.kind === "grass" && R() < .35){ var g = P(x + .2 + R() * .6, y + .2 + R() * .6, 0); s += '<path d="M' + g[0].toFixed(1) + " " + g[1].toFixed(1) + " l-2 -5 M" + g[0].toFixed(1) + " " + g[1].toFixed(1) + ' l2 -6" stroke="' + f.lines + '" stroke-width="1" fill="none" stroke-linecap="round"/>'; }
  if (f.kind === "grass" && R() < .06){ var fl = P(x + .3 + R() * .4, y + .3 + R() * .4, 0); s += '<circle cx="' + fl[0].toFixed(1) + '" cy="' + (fl[1] - 2).toFixed(1) + '" r="2" fill="' + ["#FFD84D","#fff","#FF9DBD"][Math.floor(R() * 3)] + '"/>'; }
  return s;
}
function wallFace(side, len, H, w){
  // side "y": стена вдоль x на y=0; side "x": вдоль y на x=0
  var A = function(t, z){ return side === "y" ? P(t, 0, z) : P(0, t, z); }, s = "", base = side === "y" ? w.a : dk(w.a, .07);
  s += poly([A(0,0),A(len,0),A(len,H),A(0,H)], base, { stroke:dk(w.a, .25), sw:.6 });
  if (w.kind === "stripes"){ for (var i = 0; i < len * 4; i += 2){ s += poly([A(i / 4, 0),A((i + 1) / 4, 0),A((i + 1) / 4, H),A(i / 4, H)], side === "y" ? w.b : dk(w.b, .07), { stroke:false }); } }
  if (w.kind === "dots"){ for (var t = .25; t < len; t += .5) for (var z = .3; z < H; z += .45){ var q = A(t + ((z * 10) % 2 ? .25 : 0), z); s += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.4" fill="' + w.b + '" opacity=".8"/>'; } }
  if (w.kind === "panel"){ s += poly([A(0,0),A(len,0),A(len,1.0),A(0,1.0)], side === "y" ? w.b : dk(w.b, .07), { stroke:dk(w.b, .3), sw:.6 }); for (var p = .5; p < len; p += .5){ var a = A(p, 0), b = A(p, 1.0); s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + dk(w.b, .3) + '" stroke-width=".6"/>'; } }
  if (w.kind === "stars"){ var R = rnd(len * 13 + (side === "y" ? 1 : 2)); for (var k = 0; k < len * 6; k++){ var st = A(R() * len, .3 + R() * (H - .4)); s += '<circle cx="' + st[0].toFixed(1) + '" cy="' + st[1].toFixed(1) + '" r="' + (1 + R() * 1.4).toFixed(1) + '" fill="' + w.b + '" class="twinkle" style="animation-delay:' + (R() * 3).toFixed(1) + 's"/>'; } }
  // плинтус
  s += poly([A(0,0),A(len,0),A(len,.12),A(0,.12)], "#FBF7F2", { stroke:dk(w.a, .25), sw:.5 });
  return s;
}
function roomSVG(room, opts){
  opts = opts || {};
  var Wd = room.w, Dp = room.d, H = room.wallH || 2.6, out = "", R = rnd(hash(room.id));
  var f = FLOORS[room.floor] || FLOORS.oak, w = WALLS[room.wall] || WALLS.cream, outdoor = room.outdoor;
  // «остров»: толщина пола
  var th = .45, side1 = outdoor ? "#8a5a3b" : "#D9C6B0", side2 = outdoor ? "#6e4529" : "#C4AF97";
  out += poly([P(0,Dp,0),P(Wd,Dp,0),P(Wd,Dp,-th),P(0,Dp,-th)], side1, { stroke:dk(side1, .3) });
  out += poly([P(Wd,0,0),P(Wd,Dp,0),P(Wd,Dp,-th),P(Wd,0,-th)], side2, { stroke:dk(side2, .3) });
  if (outdoor){ out += poly([P(0,Dp,0),P(Wd,Dp,0),P(Wd,Dp,-.12),P(0,Dp,-.12)], "#5fb34d", { stroke:false }); out += poly([P(Wd,0,0),P(Wd,Dp,0),P(Wd,Dp,-.12),P(Wd,0,-.12)], "#53a043", { stroke:false }); }
  for (var y = 0; y < Dp; y++) for (var x = 0; x < Wd; x++) out += floorTile(x, y, f, R);
  if (!outdoor){
    out += wallFace("x", Dp, H, w); out += wallFace("y", Wd, H, w);
    // торцы стен
    out += poly([P(0,0,H),P(Wd,0,H),P(Wd,-.15,H),P(-.15,-.15,H),P(-.15,Dp,H),P(0,Dp,H)], "#EDE3F6", { stroke:"#bfb2cf", sw:.6 });
    out += poly([P(0,Dp,0),P(0,Dp,H),P(-.15,Dp,H),P(-.15,Dp,0)], "#E1D6EC", { stroke:"#bfb2cf", sw:.6 });
    out += poly([P(Wd,0,0),P(Wd,0,H),P(Wd,-.15,H),P(Wd,-.15,0)], "#D6CAE3", { stroke:"#bfb2cf", sw:.6 });
  } else if (room.glass){
    // стеклянные стены теплицы
    ["x", "y"].forEach(function(sd){
      var len = sd === "y" ? Wd : Dp, A2 = function(t, z){ return sd === "y" ? P(t, 0, z) : P(0, t, z); };
      out += poly([A2(0,0),A2(len,0),A2(len,H),A2(0,H)], "#CFEFFF", { op:.35, stroke:"#ffffff", sw:1.2 });
      for (var t = 1; t < len; t++){ var a = A2(t, 0), b = A2(t, H); out += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#fff" stroke-width="1.6"/>'; }
      var m1 = A2(0, H / 2), m2 = A2(len, H / 2); out += '<line x1="' + m1[0] + '" y1="' + m1[1] + '" x2="' + m2[0] + '" y2="' + m2[1] + '" stroke="#fff" stroke-width="1.4"/>';
      var g1 = A2(len * .3, H * .9), g2 = A2(len * .5, H * .55); out += '<line x1="' + g1[0] + '" y1="' + g1[1] + '" x2="' + g2[0] + '" y2="' + g2[1] + '" stroke="#fff" stroke-width="3" opacity=".5" stroke-linecap="round"/>';
    });
  } else if (room.wallSide){
    out += wallFace("y", Wd, H * .45, WALLS[room.wall] || WALLS.cream);
  }
  return out;
}

window.ART = {
  TW:TW, TH:TH, ZH:ZH, P:P, poly:poly, pts:pts, mix:mix, lt:lt, dk:dk, rnd:rnd, hash:hash,
  B:B, Cy:Cy, Sp:Sp, Fl:Fl, El:El, Pl:Pl, Ve:Ve, Ln:Ln, Tx:Tx, Gl:Gl,
  renderPrims:renderPrims, roach:roach, heartPts:heartPts, D:D, COLS:COLS, FLOORS:FLOORS, WALLS:WALLS,
  roomSVG:roomSVG, cropPrims:cropPrims, CROP_ART:CROP_ART, floorTile:floorTile
};
})();
