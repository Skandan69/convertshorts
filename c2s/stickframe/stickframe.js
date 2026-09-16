/* ---------- motion import core: joint positions -> stickman angle tracks ---------- */
const MC = (() => {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const R2D = 180 / Math.PI;
  const KEYS = ["pelvis","neck","head","lhip","lknee","lankle","rhip","rknee","rankle","lsho","lelb","lwri","rsho","relb","rwri"];
  const CH = ["torso","head","uaL","faL","uaR","faR","thL","shL","thR","shR","lift","dx"];

  function unwrap(arr) {
    for (let i = 1; i < arr.length; i++) { let d = arr[i] - arr[i - 1]; while (d > 180) { arr[i] -= 360; d -= 360; } while (d < -180) { arr[i] += 360; d += 360; } }
    return arr;
  }
  function smooth(arr) {
    if (arr.length < 3) return arr;
    const o = arr.slice();
    for (let i = 1; i < arr.length - 1; i++) o[i] = (arr[i - 1] + 2 * arr[i] + arr[i + 1]) / 4;
    return o;
  }
  function trimTpose(frames) {
    const isT = J => {
      const up = norm(sub(J.neck, J.pelvis));
      let ok = 0;
      for (const s of ["l", "r"]) {
        const a = norm(sub(J[s + "wri"], J[s + "sho"]));
        if (Math.abs(dot(a, up)) < .3) ok++;
      }
      const acr = norm(sub(J.lsho, J.rsho));
      const span = Math.abs(dot(sub(J.lwri, J.rwri), acr)), sh = len(sub(J.lsho, J.rsho));
      return ok === 2 && span > sh * 3.2;
    };
    let a = 0, b = frames.length - 1;
    while (a < b && isT(frames[a].j)) a++;
    while (b > a && isT(frames[b].j)) b--;
    return frames.slice(a, b + 1).length >= 4 ? frames.slice(a, b + 1) : frames;
  }
  // frames: [{t, j:{key:[x,y,z]}}]; returns compact track
  function extract(frames, opt = {}) {
    const view = opt.view || "side", fps = opt.fps || 20;
    if (opt.trimTpose) frames = trimTpose(frames);
    if (opt.maxDur) { const t0 = frames[0].t; frames = frames.filter(f => f.t - t0 <= opt.maxDur); }
    if (frames[0].t) { const t0 = frames[0].t; frames = frames.map(f => ({t: f.t - t0, j: f.j})); }
    const f0 = frames[0].j;
    // up axis: dominant axis of pelvis->neck in first frames
    let upv = [0, 0, 0];
    for (let i = 0; i < Math.min(frames.length, 10); i++) upv = add(upv, sub(frames[i].j.neck, frames[i].j.pelvis));
    const ax = [Math.abs(upv[0]), Math.abs(upv[1]), Math.abs(upv[2])];
    const ui = ax.indexOf(Math.max(...ax));
    const UP = [0, 0, 0]; UP[ui] = Math.sign(upv[ui]) || 1;
    if (opt.up) { UP[0] = opt.up[0]; UP[1] = opt.up[1]; UP[2] = opt.up[2]; }
    // across (character left) from hips, averaged over first 15% frames, flattened
    let acr = [0, 0, 0];
    const nA = Math.max(1, Math.floor(frames.length * .15));
    for (let i = 0; i < nA; i++) acr = add(acr, sub(frames[i].j.lhip, frames[i].j.rhip));
    acr = norm(sub(acr, scale(UP, dot(acr, UP))));
    let fwd = norm(cross(acr, UP));
    // knees point forward: choose sign
    let kn = 0;
    for (const fr of frames) for (const s of ["l", "r"]) {
      const J = fr.j, mid = scale(add(J[s + "hip"], J[s + "ankle"]), .5);
      kn += dot(sub(J[s + "knee"], mid), fwd);
    }
    if (kn < 0) fwd = scale(fwd, -1);
    const X = view === "front" ? acr : fwd;
    const P = v => [dot(v, X), dot(v, UP)];
    const dn = v => { const p = P(v); return Math.atan2(p[0], -p[1]) * R2D; };
    const upA = v => { const p = P(v); return Math.atan2(p[0], p[1]) * R2D; };
    // scale: leg length -> 80 units
    let leg = 0;
    for (const s of ["l", "r"]) leg += len(sub(f0[s + "knee"], f0[s + "hip"])) + len(sub(f0[s + "ankle"], f0[s + "knee"]));
    const k = 80 / (leg / 2 || 1);
    // resample
    const T = frames[frames.length - 1].t, n = Math.max(2, Math.round(T * fps) + 1);
    const at = tt => {
      let lo = 0, hi = frames.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (frames[m].t <= tt) lo = m; else hi = m; }
      const a = frames[lo], b = frames[hi], w = b.t > a.t ? Math.min(1, Math.max(0, (tt - a.t) / (b.t - a.t))) : 0;
      const J = {};
      for (const key of KEYS) { const pa = a.j[key], pb = b.j[key]; J[key] = [pa[0] + (pb[0] - pa[0]) * w, pa[1] + (pb[1] - pa[1]) * w, pa[2] + (pb[2] - pa[2]) * w]; }
      return J;
    };
    const out = {}; for (const c of CH) out[c] = [];
    const lows = [];
    const p0 = P(f0.pelvis)[0];
    for (let i = 0; i < n; i++) {
      const J = at(Math.min(T, i / fps));
      const torso = upA(sub(J.neck, J.pelvis));
      out.torso.push(torso);
      out.head.push(upA(sub(J.head, J.neck)) - torso);
      for (const [s, S] of [["l", "L"], ["r", "R"]]) {
        const u = dn(sub(J[s + "elb"], J[s + "sho"])), f = dn(sub(J[s + "wri"], J[s + "elb"]));
        out["ua" + S].push(u - torso); out["fa" + S].push(f - u);
        const th = dn(sub(J[s + "knee"], J[s + "hip"])), sh = dn(sub(J[s + "ankle"], J[s + "knee"]));
        out["th" + S].push(th); out["sh" + S].push(sh - th);
      }
      let low = Infinity;
      for (const key of KEYS) low = Math.min(low, dot(J[key], UP));
      lows.push(low);
      out.dx.push((P(J.pelvis)[0] - p0) * k);
    }
    const sorted = lows.slice().sort((a, b) => a - b);
    const floor = sorted[Math.floor(sorted.length * .02)];
    out.lift = lows.map(l => Math.max(0, (l - floor) * k - 2));
    for (const c of CH) {
      if (c !== "lift" && c !== "dx") { unwrap(out[c]); out[c] = smooth(out[c]); }
      // relative channels: normalise mean into (-180,180]
      if (["head","uaL","faL","uaR","faR","shL","shR"].includes(c)) {
        const m = out[c].reduce((a, b) => a + b, 0) / out[c].length;
        const sh = Math.round(m / 360) * 360; if (sh) out[c] = out[c].map(v => v - sh);
      }
      out[c] = out[c].map(v => Math.round(v * (c === "dx" || c === "lift" ? 1 : 1)));
    }
    return {v: 1, fps, n, dur: +(T).toFixed(2), view, ch: out};
  }

  /* ---------- BVH ---------- */
  const rotM = (axis, deg) => {
    const r = deg / R2D, c = Math.cos(r), s = Math.sin(r);
    if (axis === "X") return [1,0,0, 0,c,-s, 0,s,c];
    if (axis === "Y") return [c,0,s, 0,1,0, -s,0,c];
    return [c,-s,0, s,c,0, 0,0,1];
  };
  const mm = (a, b) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]; return o; };
  const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  const mT = m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
  const I3 = [1,0,0, 0,1,0, 0,0,1];
  const clean = s => s.toLowerCase().replace(/^.*:/, "").replace(/[^a-z0-9]/g, "");
  const PAT = {
    pelvis: [/^hips?$/, /^pelvis$/, /^root$/],
    neck: [/^neck$/, /^neck1$/, /^lowerneck$/, /neck/],
    head: [/^head$/, /head/],
    lhip: [/^leftupleg$/, /^lupleg$/, /^lthigh$/, /^leftthigh$/, /^lfemur$/, /^lefthip$/, /^lhip$/],
    lknee: [/^leftleg$/, /^lleg$/, /^lshin$/, /^leftshin$/, /^ltibia$/, /^leftknee$/, /^lknee$/, /^leftlowerleg$/, /^lcalf$/],
    lankle: [/^leftfoot$/, /^lfoot$/, /^leftankle$/, /^lankle$/],
    lsho: [/^leftarm$/, /^larm$/, /^leftupperarm$/, /^lupperarm$/, /^lhumerus$/, /^lshldr$/],
    lelb: [/^leftforearm$/, /^lforearm$/, /^leftlowerarm$/, /^lradius$/, /^leftelbow$/, /^lelbow$/],
    lwri: [/^lefthand$/, /^lhand$/, /^leftwrist$/, /^lwrist$/],
  };
  for (const k of ["hip","knee","ankle","sho","elb","wri"]) PAT["r" + k] = PAT["l" + k].map(re => new RegExp(re.source.replace(/left/g, "right").replace(/\^l/g, "^r")));
  function mapNames(names) {
    const cn = names.map(clean), res = {};
    for (const key in PAT) {
      for (const re of PAT[key]) { const i = cn.findIndex(n => re.test(n)); if (i >= 0) { res[key] = names[i]; break; } }
    }
    return res;
  }
  function parseBVH(text) {
    const tok = text.split(/\s+/).filter(Boolean);
    let i = 0;
    const joints = [], stack = [];
    let root = null;
    while (i < tok.length) {
      const t = tok[i++];
      if (t === "ROOT" || t === "JOINT") {
        const j = {name: tok[i++], offset: [0, 0, 0], channels: [], children: [], parent: stack[stack.length - 1] || null, end: null};
        if (j.parent) j.parent.children.push(j); else root = j;
        joints.push(j); stack.push(j);
      } else if (t === "End") {
        i++; // Site
        const e = {name: "_end", offset: [0, 0, 0], isEnd: true};
        stack[stack.length - 1].end = e; stack.push(e);
      } else if (t === "OFFSET") { const j = stack[stack.length - 1]; j.offset = [+tok[i++], +tok[i++], +tok[i++]]; }
      else if (t === "CHANNELS") { const n = +tok[i++]; const j = stack[stack.length - 1]; for (let c = 0; c < n; c++) j.channels.push(tok[i++]); }
      else if (t === "}") stack.pop();
      else if (t === "MOTION") break;
    }
    if (!root) throw new Error("No skeleton found in this BVH file.");
    while (i < tok.length && tok[i] !== "Frames:") i++;
    const nF = +tok[i + 1]; i += 2;
    while (i < tok.length && tok[i] !== "Time:") i++;
    const dt = +tok[i + 1]; i += 2;
    const nCh = joints.reduce((a, j) => a + j.channels.length, 0);
    const names = joints.map(j => j.name);
    const map = mapNames(names);
    const miss = ["pelvis","neck","lhip","lknee","lankle","rhip","rknee","rankle","lsho","lelb","lwri","rsho","relb","rwri"].filter(k => !map[k]);
    if (miss.length) throw new Error("Couldn't find these body parts: " + miss.join(", "));
    const byName = Object.fromEntries(joints.map(j => [j.name, j]));
    const step = Math.max(1, Math.round((1 / 30) / dt)); // sample to ~30 fps
    const frames = [];
    for (let f = 0; f < nF; f += step) {
      const vals = tok.slice(i + f * nCh, i + (f + 1) * nCh).map(Number);
      if (vals.length < nCh) break;
      let k = 0;
      const pos = {}, rot = {};
      const walk = (j, pPos, pRot) => {
        let off = j.offset.slice(), R = I3;
        const tr = [0, 0, 0]; let hasT = false;
        for (const c of j.channels) {
          const v = vals[k++];
          if (c[1] === "p") { hasT = true; tr["XYZ".indexOf(c[0])] = v; }
          else R = mm(R, rotM(c[0], v));
        }
        if (hasT) off = tr;
        const wp = pPos ? add(pPos, mv(pRot, off)) : off;
        const wr = pRot ? mm(pRot, R) : R;
        pos[j.name] = wp; rot[j.name] = wr;
        if (j.end) pos[j.name + "_end"] = add(wp, mv(wr, j.end.offset));
        for (const c of j.children) walk(c, wp, wr);
      };
      walk(root, null, null);
      const J = {};
      for (const key of KEYS) if (map[key]) J[key] = pos[map[key]];
      const hj = map.head ? byName[map.head] : null;
      J.head = hj ? (hj.children[0] ? pos[hj.children[0].name] : (pos[hj.name + "_end"] || pos[hj.name])) : add(J.neck, sub(J.neck, J.pelvis).map(v => v * .2));
      frames.push({t: f * dt, j: J});
    }
    return frames;
  }

  /* ---------- ASF / AMC (CMU native) ---------- */
  function parseASF(text) {
    const lines = text.split(/\r?\n/);
    const bones = {root: {name: "root", dir: [0, 0, 0], len: 0, C: I3, dof: [], children: []}};
    let sec = "", cur = null, angDeg = true, lenScale = 1, rootOrder = [], rootAxis = "XYZ";
    const eul = (order, a) => { let R = I3; for (let q = 0; q < 3; q++) R = mm(rotM(order[q], a[q]), R); return R; };
    for (const raw of lines) {
      const l = raw.trim(); if (!l || l.startsWith("#")) continue;
      if (l.startsWith(":")) { sec = l.split(/\s+/)[0]; continue; }
      const w = l.split(/\s+/);
      if (sec === ":units") { if (w[0] === "angle") angDeg = w[1] !== "rad"; if (w[0] === "length") lenScale = +w[1]; }
      else if (sec === ":root") {
        if (w[0] === "order") rootOrder = w.slice(1).map(s => s.toUpperCase());
        if (w[0] === "axis") rootAxis = w[1].toUpperCase();
      } else if (sec === ":bonedata") {
        if (w[0] === "begin") cur = {dir: [0, 0, 0], len: 0, C: I3, dof: [], children: []};
        else if (w[0] === "name") cur.name = w[1];
        else if (w[0] === "direction") cur.dir = [+w[1], +w[2], +w[3]];
        else if (w[0] === "length") cur.len = +w[1];
        else if (w[0] === "axis") { const ang = [+w[1], +w[2], +w[3]].map(v => angDeg ? v : v * R2D); cur.C = eul((w[4] || "XYZ").toUpperCase(), ang); }
        else if (w[0] === "dof") cur.dof = w.slice(1).map(s => s.toUpperCase());
        else if (w[0] === "end") { bones[cur.name] = cur; cur = null; }
      } else if (sec === ":hierarchy") {
        if (w[0] === "begin" || w[0] === "end") continue;
        const p = bones[w[0]]; if (!p) continue;
        for (const c of w.slice(1)) if (bones[c]) { p.children.push(bones[c]); bones[c].parent = p; }
      }
    }
    return {bones, angDeg, rootOrder, rootAxis, eul};
  }
  function parseAMC(text, asf, fps = 120) {
    const {bones, angDeg, rootOrder} = asf;
    const need = {pelvis: "root", lhip: "lfemur", rhip: "rfemur", neck: "lowerneck", head: "head"};
    for (const b of ["lfemur","ltibia","lhumerus","lradius","rfemur","rtibia","rhumerus","rradius","head"])
      if (!bones[b]) throw new Error("This ASF skeleton isn't a CMU-style skeleton (missing " + b + ").");
    const lines = text.split(/\r?\n/);
    const frames = [];
    let vals = null, fi = -1;
    const step = Math.max(1, Math.round(fps / 30));
    const flush = () => {
      if (!vals || fi % step) return;
      const S = {}, E = {};
      const rv = vals.root || [0, 0, 0, 0, 0, 0];
      let tr = [0, 0, 0], ang = [0, 0, 0];
      rootOrder.forEach((c, q) => { const v = rv[q] ?? 0; if (c[0] === "T") tr["XYZ".indexOf(c[1])] = v; else ang["XYZ".indexOf(c[1])] = angDeg ? v : v * R2D; });
      let Rr = I3;
      rootOrder.filter(c => c[0] === "R").forEach(c => { Rr = mm(rotM(c[1], ang["XYZ".indexOf(c[1])]), Rr); });
      // (root rotation applied in listed order)
      const walk = (b, start, PR) => {
        let M = I3;
        if (b.name !== "root") {
          const v = vals[b.name] || [];
          const d = b.dof.map((c, q) => { const a = v[q] ?? 0; return angDeg ? a : a * R2D; });
          // M = R(last) ... R(first)
          for (let q = 0; q < b.dof.length; q++) M = mm(rotM(b.dof[q][1], d[q]), M);
        }
        const L = b.name === "root" ? Rr : mm(mm(b.C, M), mT(b.C));
        const R = PR ? mm(PR, L) : L;
        const end = b.name === "root" ? start : add(start, mv(R, scale(b.dir, b.len)));
        S[b.name] = start; E[b.name] = end;
        for (const c of b.children) walk(c, end, R);
      };
      walk(bones.root, tr, null);
      const J = {pelvis: S.root, lhip: S.lfemur, lknee: E.lfemur, lankle: E.ltibia, rhip: S.rfemur, rknee: E.rfemur, rankle: E.rtibia,
        lsho: S.lhumerus, lelb: E.lhumerus, lwri: E.lradius, rsho: S.rhumerus, relb: E.rhumerus, rwri: E.rradius,
        neck: S.lowerneck || S.head, head: E.head};
      frames.push({t: frames.length * step / fps, j: J});
    };
    for (const raw of lines) {
      const l = raw.trim(); if (!l || l.startsWith("#") || l.startsWith(":")) continue;
      if (/^\d+$/.test(l)) { flush(); vals = {}; fi = +l - 1; continue; }
      if (!vals) continue;
      const w = l.split(/\s+/); vals[w[0]] = w.slice(1).map(Number);
    }
    flush();
    if (frames.length < 2) throw new Error("No motion frames found in this AMC file.");
    return frames;
  }
  // track sampling for playback
  function sample(tr, p) {
    const x = Math.max(0, Math.min(1, p)) * (tr.n - 1), i = Math.floor(x), w = x - i, j = Math.min(tr.n - 1, i + 1);
    const o = {};
    for (const c in tr.ch) { const a = tr.ch[c][i], b = tr.ch[c][j]; o[c] = a + (b - a) * w; }
    return o;
  }
  return {extract, parseBVH, parseASF, parseAMC, sample, CH};
})();
if (typeof module !== "undefined") module.exports = MC;

(() => {
"use strict";
const TAU = Math.PI * 2, D2R = Math.PI / 180, BLEND = .25;
const FIELDS = ["torso","head","uaL","faL","uaR","faR","thL","shL","thR","shR","lift","rot","stool","flip"];
const ANG = ["torso","head","uaL","faL","uaR","faR","thL","shL","thR","shR"];
const BASE = {torso:0,head:0,uaL:10,faL:10,uaR:-8,faR:10,thL:5,shL:0,thR:-5,shR:0,lift:0,rot:0,stool:0,flip:0};
const sm = x => x * x * (3 - 2 * x);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const full = o => { const r = {}; for (const k of FIELDS) r[k] = o[k] ?? BASE[k]; return r; };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escH = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
function kf(keys, p) {
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].p) i++;
  const a = keys[i], b = keys[i + 1];
  const w = sm(clamp((p - a.p) / ((b.p - a.p) || 1), 0, 1));
  const r = {};
  for (const k of FIELDS) { const va = a[k] ?? BASE[k], vb = b[k] ?? BASE[k]; r[k] = va + (vb - va) * w; }
  return r;
}
const CROUCH = {torso:22,thL:55,shL:-100,thR:50,shR:-95,uaL:-45,uaR:-40,faL:10,faR:10};
const GUARD = {torso:10,uaL:35,faL:115,uaR:45,faR:120,thL:18,shL:-8,thR:-14,shR:-4};
const LYING = {rot:-90,uaL:150,uaR:170,faL:10,faR:10,thL:8,thR:-2,head:6};
const KICK_KEYS = [{p:0,...GUARD},{p:.25,...GUARD,thL:70,shL:-100},{p:.45,...GUARD,thL:100,shL:-5,torso:-20,uaL:-20,faL:40},{p:.7,...GUARD,thL:60,shL:-90},{p:1,...GUARD}];
const walkFn = p => { const s = Math.sin(TAU * p), c = Math.cos(TAU * p);
  return {torso:4,head:-2,thL:26*s,thR:-26*s,shL:-6-38*Math.max(0,c),shR:-6-38*Math.max(0,-c),uaL:-24*s,uaR:24*s,faL:18,faR:18}; };
const runFn = p => { const s = Math.sin(TAU * p), c = Math.cos(TAU * p);
  return {torso:14,head:-6,thL:44*s,thR:-44*s,shL:-15-75*Math.max(0,c),shR:-15-75*Math.max(0,-c),uaL:-50*s,uaR:50*s,faL:85,faR:85,lift:6*Math.abs(s)}; };

const ACTIONS = {
  idle:{label:"Stand",g:"basic",cycle:2.4,dur:1.5,thumb:.2,fn:p=>{const s=Math.sin(TAU*p);return{torso:1.5*s,uaL:9+3*s,uaR:-7-3*s,head:-1*s}}},
  walk:{label:"Walk",g:"basic",cycle:1.0,dur:2.5,speed:120,thumb:.2,fn:walkFn},
  run:{label:"Run",g:"basic",cycle:.6,dur:2,speed:290,thumb:.25,fn:runFn},
  sneak:{label:"Sneak",g:"basic",cycle:1.4,dur:3,speed:65,thumb:.25,fn:p=>{const s=Math.sin(TAU*p),c=Math.cos(TAU*p);
    return{torso:24,head:-12,thL:18+22*s,thR:18-22*s,shL:-40-25*Math.max(0,c),shR:-40-25*Math.max(0,-c),uaL:40,faL:95+10*s,uaR:30,faR:105-10*s}}},
  jump:{label:"Jump",g:"basic",cycle:1.0,dur:1,thumb:.52,fn:p=>kf([{p:0},{p:.22,...CROUCH},
    {p:.34,torso:-4,thL:-5,shL:-5,thR:-8,shR:-5,uaL:165,uaR:155,faL:5,faR:5,lift:40},
    {p:.52,torso:6,thL:40,shL:-70,thR:35,shR:-65,uaL:120,uaR:110,lift:62},
    {p:.72,torso:2,thL:10,shL:-10,thR:5,shR:-10,uaL:60,uaR:50,lift:18},
    {p:.84,torso:18,thL:45,shL:-85,thR:40,shR:-80,uaL:30,uaR:25,faL:40,faR:40},{p:1}],p)},
  backflip:{label:"Quick flip",g:"basic",cycle:1.4,dur:1.4,thumb:.5,fn:p=>kf([{p:0},{p:.18,...CROUCH},
    {p:.3,torso:-6,uaL:170,uaR:165,thL:-5,thR:-5,lift:50,rot:-40},
    {p:.5,thL:110,shL:-140,thR:105,shR:-135,uaL:90,faL:60,uaR:80,faR:70,lift:95,rot:-180},
    {p:.7,thL:20,shL:-20,thR:15,shR:-20,uaL:150,uaR:140,lift:60,rot:-320},
    {p:.84,...CROUCH,rot:-360},{p:1,rot:-360}],p)},
  wave:{label:"Wave",g:"basic",cycle:.8,dur:2,thumb:.25,fn:p=>{const w=Math.sin(TAU*p);return{uaL:150,faL:25+30*w,uaR:-6,head:-6,torso:-2}}},
  point:{label:"Point",g:"basic",cycle:.5,dur:1.5,hold:true,thumb:1,fn:p=>kf([{p:0},{p:1,uaL:90,faL:0,head:-4,torso:-2}],p)},
  punch:{label:"Punch",g:"basic",cycle:.7,dur:2.1,thumb:.15,fn:p=>kf([{p:0,...GUARD},{p:.15,...GUARD,uaL:88,faL:2,torso:18},{p:.35,...GUARD},
    {p:.5,...GUARD,uaR:88,faR:2,torso:16},{p:.7,...GUARD},{p:1,...GUARD}],p)},
  kick:{label:"Kick",g:"basic",cycle:1.0,dur:2,thumb:.45,fn:p=>kf(KICK_KEYS,p)},
  clap:{label:"Clap",g:"basic",cycle:.5,dur:2,thumb:.5,fn:p=>{const a=.5+.5*Math.cos(TAU*p);return{uaL:62,faL:8+50*a,uaR:58,faR:12+55*a,head:-4,lift:2*(1-a)}}},
  cheer:{label:"Cheer",g:"basic",cycle:.6,dur:2.4,thumb:.25,fn:p=>{const s=Math.sin(TAU*p);return{uaL:160+15*s,faL:10,uaR:150-15*s,faR:10,lift:14*Math.max(0,s),thL:8,thR:-8,head:-12,torso:-4}}},
  dance:{label:"Dance",g:"basic",cycle:1.2,dur:3.6,thumb:.25,fn:p=>{const s=Math.sin(TAU*p),c=Math.cos(TAU*p);
    return{torso:10*s,head:8*s,uaL:97+68*s,faL:20,uaR:40-30*s,faR:90,thL:22*Math.max(0,s),shL:-45*Math.max(0,s),thR:22*Math.max(0,-s),shR:-45*Math.max(0,-s),lift:6*Math.abs(c)}}},
  bow:{label:"Bow",g:"basic",cycle:2,dur:2,thumb:.45,fn:p=>kf([{p:0},{p:.35,torso:70,head:10,uaL:20,uaR:10,faL:5},{p:.6,torso:70,head:10,uaL:20,uaR:10,faL:5},{p:1}],p)},
  think:{label:"Think",g:"basic",cycle:2,dur:2.5,thumb:.3,fn:p=>{const s=Math.sin(TAU*p);return{uaL:35,faL:150,head:-10+4*s,torso:-3,uaR:-10,faR:40,thR:-8+6*Math.max(0,Math.sin(TAU*p*2))}}},
  sit:{label:"Sit",g:"basic",cycle:.8,dur:2,hold:true,thumb:1,fn:p=>kf([{p:0,stool:1},{p:1,thL:88,shL:-88,thR:84,shR:-86,torso:6,uaL:40,faL:40,uaR:35,faR:45,stool:1}],p)},
  fall:{label:"Fall",g:"basic",cycle:.9,dur:1.8,hold:true,thumb:.6,fn:p=>kf([{p:0},{p:.25,rot:-25,uaL:120,faL:30,uaR:140,faR:40,thL:30,shL:-20,lift:4},
    {p:.6,rot:-80,uaL:150,uaR:170,thL:40,thR:20},{p:.8,rot:-92,uaL:140,uaR:175,thL:15,thR:5},{p:1,...LYING}],p)},
  getup:{label:"Get up",g:"basic",cycle:1.2,dur:1.6,hold:true,thumb:.55,fn:p=>kf([{p:0,...LYING},
    {p:.4,rot:-20,torso:40,thL:95,shL:-130,thR:90,shR:-120,uaL:60,faL:30,uaR:50},
    {p:.7,torso:30,thL:50,shL:-90,thR:45,shR:-85,uaL:20},{p:1}],p)},
  turn:{label:"Turn",g:"basic",cycle:.45,dur:.6,hold:true,thumb:.35,fn:p=>({flip:sm(p)})},

  approach:{label:"Walk up to",g:"pair",pair:{gap:100,walk:true},cycle:1,dur:1,thumb:.2,fn:walkFn},
  shake:{label:"Shake hands",g:"pair",pair:{gap:100,react:"shake",at:0},cycle:.5,dur:1.8,thumb:.25,fn:p=>{const s=Math.sin(TAU*p);return{uaL:66+7*s,faL:16,uaR:-8,head:-2}}},
  hug:{label:"Hug",g:"pair",pair:{gap:34,react:"hug",at:0},cycle:.6,dur:2,hold:true,thumb:1,fn:p=>kf([{p:0},{p:1,uaL:84,faL:75,uaR:78,faR:80,torso:10,head:6}],p)},
  highfive:{label:"High five",g:"pair",pair:{gap:58,react:"highfive",at:0},cycle:1,dur:1,thumb:.5,fn:p=>kf([{p:0},{p:.35,uaL:150,faL:12},{p:.5,uaL:162,faL:0,lift:6},{p:.75,uaL:150,faL:10},{p:1}],p)},
  jab:{label:"Punch someone",g:"pair",pair:{gap:66,react:"hit",at:.3},cycle:.8,dur:.8,thumb:.3,fn:p=>kf([{p:0,...GUARD},{p:.3,...GUARD,uaL:88,faL:2,torso:18},{p:.55,...GUARD},{p:1,...GUARD}],p)},
  kickat:{label:"Kick someone",g:"pair",pair:{gap:96,react:"hit",at:.45},cycle:1,dur:1,thumb:.45,fn:p=>kf(KICK_KEYS,p)},
  push:{label:"Push",g:"pair",pair:{gap:72,react:"knockdown",at:.4},cycle:.9,dur:.9,thumb:.45,fn:p=>kf([{p:0},{p:.3,uaL:80,faL:12,uaR:75,faR:16,torso:12},{p:.45,uaL:90,faL:0,uaR:88,faR:2,torso:22},{p:1,uaL:40,faL:20,uaR:35,faR:25,torso:6}],p)},
  knockdown:{label:"Knocked down",g:"pair",cycle:.9,dur:1.8,hold:true,speed:-70,thumb:.6,fn:p=>ACTIONS.fall.fn(p)},
  hit:{label:"Get hit",g:"pair",cycle:.9,dur:.9,speed:-45,thumb:.25,fn:p=>kf([{p:0},{p:.22,torso:-28,head:-25,uaL:120,faL:40,uaR:140,faR:30,thL:18,shL:-10,thR:-22},{p:.6,torso:-10,head:-8,uaL:30,uaR:20},{p:1}],p)},
};
function trackAction(tr, o) {
  const t0 = clamp(o.t0 ?? 0, 0, tr.dur), t1 = clamp(o.t1 ?? tr.dur, t0 + .1, tr.dur);
  const a = t0 / tr.dur, b = t1 / tr.dur;
  const dx0 = MC.sample(tr, a).dx, dxE = MC.sample(tr, b).dx - dx0;
  const cycle = Math.max(.1, t1 - t0);
  return {label: o.label, g: o.g, track: tr, cycle, dur: +(cycle * (o.reps || 1)).toFixed(2), hold: !o.loop, thumb: o.thumb ?? .35,
    dxEnd: dxE, loop: !!o.loop,
    fn: p => { const r = MC.sample(tr, a + (b - a) * p); r.dx -= dx0; return r; }};
}
const REAL = [
  ["mbackflip","backflip","Backflip",1,.45],["cartwheel","cartwheel","Cartwheel",1,.45],["crawl","crawl","Crawl",2,.3],
  ["dance2","dance_a","Dance 2",2,.4],["dance3","dance_b","Dance 3",2,.3],["pushrise","getup_facedown","Push-up rise",1,.6],
  ["situprise","getup_faceup","Sit-up rise",1,.55],["longjump","jump","Long jump",1,.45],["frontkick","kick","Front kick",1,.45],
  ["combo","punch","Punch combo",1,.55],["roll","roll","Forward roll",1,.35],["jog","run","Jog",4,.3],
  ["bspin","spin","Breakdance",1,.5],["spinkick","spinkick","Spin kick",1,.55],["stroll","walk","Stroll",2,.3],
];
for (const [key, src, label, reps, thumb] of REAL) {
  const tr = DM_TRACKS[src];
  ACTIONS[key] = trackAction(tr, {label, g: "real", loop: tr.loop, reps, thumb});
}
let USER_MOVES = [];
const getA = k => ACTIONS[k] || (typeof k === "string" && k.startsWith("c:") ? buildCmu(k) : undefined);
const TRAVEL = new Set(["walk","run","sneak"]);

/* ---------- faces ---------- */
const FF = ["eo","es","bt","br","ba","mc","mo","mw","sk","tear","sweat","blush","wink","zzz"];
const FNEUT = {eo:1,es:0,bt:0,br:0,ba:0,mc:.15,mo:0,mw:1,sk:0,tear:0,sweat:0,blush:0,wink:0,zzz:0};
const FACES = {
  neutral:{label:"Neutral"},
  happy:{label:"Happy",mc:.9,br:.2,blush:.45},
  laugh:{label:"Laugh",es:1,mc:1,mo:.75,br:.4,blush:.6},
  sad:{label:"Sad",bt:-1,mc:-.8,eo:.8,br:.3},
  cry:{label:"Crying",bt:-1,mc:-.9,mo:.35,eo:.55,tear:1},
  angry:{label:"Angry",bt:1,mc:-.6,mo:.12,eo:.8},
  hurt:{label:"Hurt",bt:-.9,eo:.2,mc:-.7,mo:.35,mw:.8},
  surprised:{label:"Surprised",br:1,eo:1.35,mc:0,mo:1,mw:.55},
  scared:{label:"Scared",bt:-.7,br:.8,eo:1.3,mc:-.4,mo:.45,mw:.9,sweat:1},
  confused:{label:"Confused",ba:1,mc:-.15,mw:.7,sk:.8},
  sleepy:{label:"Sleepy",eo:.22,br:-.2,mc:0,mo:.18,mw:.5,zzz:1},
  wink:{label:"Wink",wink:1,mc:.85,blush:.3,sk:.4},
  focused:{label:"Focused",bt:.55,mc:0,eo:.85},
  sly:{label:"Sly",eo:.55,bt:.35,mc:.55,sk:1},
};
const FACE_ORDER = ["auto", ...Object.keys(FACES)];
const AUTOFACE = {idle:"neutral",walk:"neutral",run:"focused",sneak:"sly",jump:"happy",backflip:"laugh",wave:"happy",point:"happy",
  punch:"angry",kick:"angry",clap:"happy",cheer:"laugh",dance:"happy",bow:"happy",think:"confused",sit:"neutral",fall:"surprised",getup:"sad",turn:"neutral",
  approach:"neutral",shake:"happy",hug:"happy",highfive:"laugh",jab:"angry",kickat:"angry",push:"angry",hit:"hurt",knockdown:"surprised",
  mbackflip:"laugh",cartwheel:"happy",crawl:"focused",dance2:"happy",dance3:"happy",pushrise:"focused",situprise:"neutral",longjump:"focused",
  frontkick:"angry",combo:"angry",roll:"happy",jog:"neutral",bspin:"laugh",spinkick:"angry",stroll:"neutral"};
const faceParams = name => { const F = FACES[name] || FACES.neutral, r = {}; for (const k of FF) r[k] = F[k] ?? FNEUT[k]; return r; };
const faceName = (face, action) => (!face || face === "auto") ? (AUTOFACE[action] || "neutral") : face;
const FACE_WORDS = [
  ["laugh",["laughs","laughing","laugh","lol","giggles","giggle"]],
  ["cry",["cries","crying","cry","sobs","sob","tears"]],
  ["hurt",["hurt","ouch","in pain"]],
  ["happy",["happily","happy","smiles","smiling","smile","glad","joyfully","cheerfully"]],
  ["sad",["sadly","sad","upset","unhappy","gloomy"]],
  ["angry",["angrily","angry","mad","furious","rage","annoyed"]],
  ["surprised",["surprised","shocked","amazed","gasps","gasp","wow","stunned"]],
  ["scared",["scared","afraid","terrified","nervous","frightened","fear","panics","panic"]],
  ["confused",["confused","puzzled","unsure","baffled"]],
  ["sleepy",["sleepy","tired","yawns","yawn","sleeps","sleep","exhausted"]],
  ["wink",["winks","wink"]],
  ["focused",["focused","determined","serious"]],
  ["sly",["slyly","sly","sneaky","smirks","smirk"]],
];
const FACE_RE = FACE_WORDS.map(([f, ws]) => ({f, re: new RegExp("\\b(?:" + ws.map(esc).join("|") + ")\\b")}));

/* ---------- sentence parser ---------- */
const SYN_BASE = [
  ["approach",["sneak up to","sneaks up to","creep up to","creeps up to","tiptoe up to","tiptoes up to","walk up to","walks up to","walk over to","walks over to","walk to","walks to","go to","goes to","approach","approaches","come to","comes to","run to","runs to","run up to","runs up to"]],
  ["shake",["shake hands","shakes hands","shaking hands","handshake","shake hand"]],
  ["highfive",["high five","high-five","high fives","high-fives","highfive"]],
  ["hug",["hug","hugs","hugging","embrace","embraces"]],
  ["hit",["get hit","gets hit","is hit","flinch","flinches"]],
  ["pushrise",["push up","push-up","pushup","push ups","push-ups","pushups"]],
  ["situprise",["sit up","sits up","sit-up","situp"]],
  ["push",["push","pushes","shove","shoves"]],
  ["getup",["get up","gets up","getting up","stand up","stands up","stood up","rise","rises","gets back up","get back up"]],
  ["cheer",["jumping jacks","jumping jack","cheer","cheers","celebrate","celebrates","hooray"]],
  ["spinkick",["spin kick","spin kicks","spinning kick","roundhouse kick","roundhouse"]],
  ["frontkick",["front kick","front kicks"]],
  ["combo",["punch combo","boxing combo","combo","combos","shadowbox","shadowboxes"]],
  ["backflip",["quick flip","quick flips"]],
  ["mbackflip",["back flip","backflips","backflip","flips","flip"]],
  ["cartwheel",["cartwheel","cartwheels"]],
  ["roll",["forward roll","roll","rolls","rolling","tumble","tumbles","somersault","somersaults"]],
  ["crawl",["crawl","crawls","crawling"]],
  ["bspin",["breakdance","breakdances","breakdancing","spin","spins","spinning"]],
  ["longjump",["long jump","broad jump","leap forward","leap","leaps"]],
  ["dance2",["dance 2","disco","boogie","boogies"]],
  ["dance3",["dance 3","shuffle","shuffles"]],
  ["jog",["jog","jogs","jogging"]],
  ["stroll",["stroll","strolls","strolling"]],
  ["sneak",["sneak","sneaks","sneaking","tiptoe","tiptoes","creep","creeps"]],
  ["run",["run","runs","running","sprint","sprints","dash","dashes","race","races"]],
  ["walk",["walk","walks","walking","go","goes","move","moves","step","steps"]],
  ["jump",["jump","jumps","jumping","hop","hops"]],
  ["wave",["wave","waves","waving","greet","greets"]],
  ["point",["point","points","pointing"]],
  ["punch",["punch","punches","punching","box","boxes","boxing","fight","fights","hit","hits"]],
  ["kick",["kick","kicks","kicking"]],
  ["clap",["clap","claps","clapping","applaud","applauds"]],
  ["dance",["dance","dances","dancing","groove","grooves"]],
  ["bow",["bow","bows","bowing"]],
  ["think",["think","thinks","thinking","ponder","ponders","wonder","wonders"]],
  ["sit",["sit down","sits down","sit","sits","sitting"]],
  ["fall",["fall down","falls down","fall","falls","falling","trip","trips","slip","slips","collapse","collapses","lie down","lies down"]],
  ["turn",["turn around","turns around","turn back","turns back","turn","turns"]],
  ["idle",["stand still","stand","stands","standing","wait","waits","pause","pauses","idle","rest","rests","breathe","watch","watches","listen","listens"]],
];
let MATCHERS = [];
function rebuildMatchers() {
  const syn = SYN_BASE.slice();
  for (const m of USER_MOVES) {
    const words = [m.label, ...(m.words || "").split(",")].map(w => w.trim().toLowerCase()).filter(w => w.length > 1);
    if (words.length) syn.unshift(["u:" + m.id, words]);
  }
  MATCHERS = syn.flatMap(([a, list]) => list.map(w => ({a, w, re: new RegExp("\\b" + esc(w).replace(/\\-|\s+/g, m => m.trim() ? "[- ]?" : "\\s+") + "\\b", "g")})));
}
const NUMW = {once:1, twice:2, thrice:3, one:1, two:2, three:3, four:4, five:5, six:6};
const SAY_RE = /\b(?:says?|saying|said|tells?|telling|asks?|asking|shouts?|shouting|yells?|yelling|whispers?|whispering|replies|reply|answers?|exclaims?)\b\s*(?:[a-z ]{0,20}?)\s*:?\s*(.*)$/;

function parseScript(text) {
  const cast = S.chars;
  const quotes = [];
  const t = text.replace(/["“”]([^"“”]*)["“”]/g, (m, q) => { quotes.push(q.trim()); return ` qq${quotes.length - 1}qq `; });
  const beatsTxt = t.split(/(?:\bthen\b|\bafter that\b|\bnext\b|\bfinally\b|\blater\b|[,;.!?\n])+/i).map(s => s.trim()).filter(Boolean);
  const nameAlt = cast.map(c => esc(c.name.trim())).filter(Boolean).join("|");
  const nameRe = nameAlt ? new RegExp(`\\b(${nameAlt})(?:'s)?\\b`, "gi") : null;
  const idOf = n => cast.find(c => c.name.trim().toLowerCase() === n.toLowerCase())?.id;
  let last = cast[0]?.id;
  const beats = [], unknown = [];
  const unq = s => s.replace(/qq(\d+)qq/g, (m, i) => `"${quotes[+i]}"`).trim();
  for (const bt of beatsTxt) {
    let parts = bt.split(/\b(?:while|meanwhile|at the same time|whereas|as)\b/i);
    if (nameAlt) parts = parts.flatMap(pt => pt.split(new RegExp(`\\band\\s+(?=(?:${nameAlt})\\b)`, "i")));
    const clauses = []; let pending = [];
    for (let raw of parts) {
      raw = raw.trim(); if (!raw) continue;
      const c = parseClause(raw, quotes, nameRe, idOf);
      if (!c.acts.length && !c.say && !c.expr && c.subs.length && !c.targets.length && !c.all && !c.rest.length) { pending.push(...c.subs); continue; }
      if (pending.length) { c.subs = [...pending, ...c.subs]; pending = []; }
      clauses.push(c);
    }
    const items = [];
    for (const c of clauses) {
      let subs = c.all ? cast.map(x => x.id) : (c.subs.length ? c.subs : [last]);
      subs = [...new Set(subs)].filter(id => cast.some(x => x.id === id));
      if (!subs.length) continue;
      if (!c.acts.length) {
        if (c.say || c.expr) c.acts.push({a: "idle"});
        else { unknown.push(unq(c.raw)); continue; }
      }
      const made = [];
      for (const act of c.acts) {
        let a = act.a;
        let target = c.targets.find(id => !subs.includes(id) || subs.length > 1) ?? null;
        if (target != null && (a === "punch" || a === "kick")) a = a === "punch" ? "jab" : "kickat";
        const A = getA(a); if (!A) continue;
        if (A.pair) {
          const actor = subs[0];
          if (target == null || target === actor) target = subs.length > 1 ? subs[1] : (cast.find(x => x.id !== actor)?.id ?? null);
          if (target == null) { unknown.push(`${unq(c.raw)} (needs a second character)`); continue; }
          made.push(mkItem(actor, a, c, act, target));
        } else for (const id of subs) made.push(mkItem(id, a, c, act, null));
      }
      if (c.say) {
        const it = [...made].reverse().find(x => x.char === subs[0]);
        if (it) { it.say = c.say; if (!c.dur) it.dur = +Math.max(it.dur, clamp(1 + c.say.split(/\s+/).length * .35, 1.5, 6)).toFixed(1); }
      }
      items.push(...made);
      last = subs[0];
    }
    if (items.length) beats.push({items});
  }
  return {beats, unknown};
}
function mkItem(char, a, c, act, target) {
  const A = getA(a);
  let dur = A.dur;
  if (c.dur) dur = c.dur;
  else if (c.count && !A.hold) dur = c.count * A.cycle / c.speed;
  return {char, action: a, dir: (a === "turn" || A.pair) ? 0 : c.dir, target, dur: +clamp(dur, .2, 30).toFixed(2), wait: 0,
    face: c.expr || "auto", say: "", speed: c.speed, mode: act.mode || "walk"};
}
function parseClause(raw, quotes, nameRe, idOf) {
  let ph = raw.toLowerCase();
  let say = null;
  const sm_ = ph.match(SAY_RE);
  if (sm_) {
    const q = sm_[1].match(/qq(\d+)qq/) || ph.slice(sm_.index).match(/qq(\d+)qq/);
    if (q) say = quotes[+q[1]];
    else { const rest = sm_[1].trim(); say = rest ? raw.slice(raw.length - rest.length).trim() : null; }
    ph = ph.slice(0, sm_.index) + " ".repeat(ph.length - sm_.index);
  } else {
    const q = ph.match(/qq(\d+)qq/);
    if (q) say = quotes[+q[1]];
  }
  ph = ph.replace(/qq\d+qq/g, m => " ".repeat(m.length));
  const names = [];
  if (nameRe) { nameRe.lastIndex = 0; let r; while ((r = nameRe.exec(ph))) names.push({id: idOf(r[1]), i: r.index}); ph = ph.replace(nameRe, m => " ".repeat(m.length)); }
  const hits = [];
  for (const m of MATCHERS) { m.re.lastIndex = 0; let r; while ((r = m.re.exec(ph))) hits.push({a: m.a, i: r.index, len: r[0].length, w: r[0]}); }
  hits.sort((x, y) => x.i - y.i || y.len - x.len);
  const acts = []; let end = -1;
  for (const h of hits) if (h.i >= end) { acts.push({a: h.a, mode: /run/.test(h.w) ? "run" : /sneak|creep|tiptoe/.test(h.w) ? "sneak" : "walk"}); end = h.i + h.len; }
  const phq = ph.replace(/\b(everyone|everybody|both|together|they|them)\b/g, " ");
  if (!acts.length) {
    const hit = cmuBest(phq);
    if (hit) acts.push({a: "c:" + hit.id});
  } else if (acts.length === 1 && !getA(acts[0].a)?.pair) {
    // a more specific real-motion clip wins when every word matches (e.g. "salsa dance")
    const hit = cmuBest(phq, true);
    if (hit) acts[0] = {a: "c:" + hit.id};
  }
  const rest = ph.replace(/[^a-z]+/g, " ").split(" ").filter(w => w && !["and", "then", "with", "to", "the", "a"].includes(w));
  const firstAct = hits.length ? hits[0].i : Infinity;
  const subs = names.filter(n => n.i < firstAct).map(n => n.id);
  const targets = names.filter(n => n.i >= firstAct).map(n => n.id);
  const allW = /\b(everyone|everybody|all of them|both of them)\b/.test(ph) || (/\b(both|together|they)\b/.test(ph) && !subs.length);
  let dir = 0;
  if (/\bleft\b/.test(ph)) dir = -1; else if (/\bright\b/.test(ph)) dir = 1;
  let speed = 1;
  if (/\b(slowly|slow)\b/.test(ph)) speed = .6; else if (/\b(quickly|fast|quick|rapidly)\b/.test(ph)) speed = 1.5;
  const dm = ph.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/);
  const cm = ph.match(/\b(\d+)\s*(?:x|times)\b/) || ph.match(/\b(once|twice|thrice)\b/) || ph.match(/\b(one|two|three|four|five|six)\s+times\b/);
  let expr = null;
  for (const m of FACE_RE) if (m.re.test(ph)) { expr = m.f; break; }
  return {raw, ph, rest, acts, subs, targets, all: allW, dir, speed, dur: dm ? +dm[1] : null, count: cm ? (NUMW[cm[1]] ?? +cm[1]) : null, expr, say};
}


/* ---------- state ---------- */
const COLORS = ["#1B2127", "#C23B5A", "#2F6FB0", "#2E8A57"];
const FMT = {wide:[1280,720,"1280×720"], tall:[720,1280,"720×1280"], square:[1080,1080,"1080×1080"]};
let uid = 1;
const nid = () => uid++;
const DEF_CAST = () => [{id: nid(), name: "Ravi", color: COLORS[0], x: -110}, {id: nid(), name: "Meera", color: COLORS[1], x: 110}];
const defaultScript = cast => {
  const a = cast[0]?.name || "Ravi", b = cast[1]?.name || "Meera";
  return cast.length > 1
    ? `${a} walks up to ${b} happily while ${b} waves and says "Hey ${a}!". ${a} and ${b} shake hands. ${b} tells a joke: "Why did the stickman cross the road?". ${a} laughs. ${a} does a backflip, then ${b} claps.`
    : `${a} walks right for 2 seconds, then waves happily and says "Hi there!", jumps twice, looks confused, turns around, then runs away scared.`;
};
let S = {v: 3, chars: [], beats: [], active: null, script: "", scene: "park", parallax: true, fmt: "wide", fps: 24,
  weight: 5, size: .9, head: 1.25, faces: true, solid: false, onion: true, loop: true, addMode: "new", tab: "basic"};
try {
  const saved = JSON.parse(localStorage.getItem("stickframe.v3") || "null");
  if (saved && saved.v === 3) S = {...S, ...saved};
} catch (e) {}
if (!Array.isArray(S.chars) || !S.chars.length) S.chars = DEF_CAST();
for (const c of S.chars) uid = Math.max(uid, (c.id | 0) + 1);
for (const b of S.beats || []) { uid = Math.max(uid, (b.id | 0) + 1); for (const it of b.items) uid = Math.max(uid, (it.id | 0) + 1); }
if (!S.active || !S.chars.some(c => c.id === S.active)) S.active = S.chars[0].id;
if (!S.script) S.script = defaultScript(S.chars);
const persist = () => { try { localStorage.setItem("stickframe.v3", JSON.stringify(S)); } catch (e) {} };
const charById = id => S.chars.find(c => c.id === id);

/* ---------- compile beats -> per-character segments ---------- */
let LANES = {}, SPANS = [], total = 0, cam = {min: 0, max: 0};
function makeSeg(L, o) {
  const A = o.holdOf ? o.holdOf.A : getA(o.action);
  const f0 = o.f ?? L.f;
  const seg = {A, action: o.holdOf ? o.holdOf.action : o.action, start: o.start, dur: Math.max(.05, o.dur), x0: L.x, f0,
    f1: (o.action === "turn" && !o.holdOf) ? -f0 : f0, speed: o.speed || 1, say: o.say || "", holdOf: o.holdOf || null,
    face: o.faceP || faceParams(faceName(o.face, o.action)), faceKey: o.face, item: o.item ?? null};
  seg.talk = seg.say ? Math.min(seg.dur, .3 + seg.say.split(/\s+/).length * .32) : 0;
  const end = segState(seg, seg.dur);
  L.x = end.x; L.f = seg.f1;
  L.segs.push(seg);
  return seg;
}
function filler(L, start, dur) {
  if (dur < .005) return;
  const last = L.segs[L.segs.length - 1];
  if (last && last.A.hold) makeSeg(L, {holdOf: last.holdOf || last, start, dur, faceP: last.face});
  else makeSeg(L, {action: "idle", start, dur, faceP: last ? last.face : faceParams("neutral")});
}
function compile() {
  LANES = {}; SPANS = [];
  for (const c of S.chars) LANES[c.id] = {segs: [], x: +c.x || 0, f: (+c.x || 0) > 0 ? -1 : 1};
  let T = 0;
  S.beats.forEach((beat, bi) => {
    const b0 = T;
    const plans = {}; for (const c of S.chars) plans[c.id] = [];
    const xNow = {}; for (const c of S.chars) xNow[c.id] = LANES[c.id].x;
    const by = {};
    for (const it of beat.items) { if (!LANES[it.char] || !getA(it.action)) continue; (by[it.char] ||= []).push(it); }
    for (const cid in by) {
      const L = LANES[cid];
      let cur = b0, x = L.x, f = L.f;
      const list = by[cid].slice().sort((a, b) => (+a.wait || 0) - (+b.wait || 0));
      for (const it of list) {
        const A = getA(it.action);
        let start = Math.max(cur, b0 + (+it.wait || 0));
        const face = it.face;
        if (A.pair && LANES[it.target] && +it.target !== +cid) {
          const tx = xNow[it.target];
          const side = Math.sign(tx - x) || f || 1;
          const dist = Math.abs(tx - x), gap = A.pair.gap;
          const mvA = ["run", "sneak"].includes(it.mode) ? it.mode : (it.run ? "run" : "walk"), W = getA(mvA);
          if (dist > gap + 6) {
            const need = dist - gap, d = Math.max(.3, need / W.speed);
            plans[cid].push({action: mvA, start, dur: d, f: side, speed: need / (d * W.speed), face, item: it.id});
            start += d;
          } else if (dist < gap - 10) {
            const need = gap - dist, d = Math.max(.3, need / 70);
            plans[cid].push({action: "walk", start, dur: d, f: side, speed: -need / (d * 120), face, item: it.id});
            start += d;
          } else if (side !== f) {
            plans[cid].push({action: "idle", start, dur: .2, f: side, face, item: it.id}); start += .2;
          }
          x = tx - side * gap; f = side;
          if (A.pair.walk) {
            if (it.say) { const d = Math.max(1.2, clamp(1 + it.say.split(/\s+/).length * .35, 1.2, 6)); plans[cid].push({action: "idle", start, dur: d, f: side, face, say: it.say, item: it.id}); start += d; }
            cur = start; continue;
          }
          const dur = +it.dur || A.dur;
          plans[cid].push({action: it.action, start, dur, f: side, face, say: it.say, speed: it.speed, item: it.id});
          if (A.pair.react) {
            const R = getA(A.pair.react);
            plans[it.target].push({action: A.pair.react, start: start + A.pair.at * A.cycle, dur: A.pair.react === it.action ? dur : R.dur, f: -side, face: "auto", reaction: true});
          }
          cur = start + dur;
        } else {
          if (it.dir) f = +it.dir;
          const dur = +it.dur || A.dur;
          plans[cid].push({action: it.action, start, dur, f, face, say: it.say, speed: it.speed, item: it.id});
          const tmp = {A, action: it.action, x0: x, f0: f, speed: it.speed || 1, dur, holdOf: null, face: FNEUT};
          x = segState(tmp, dur).x;
          if (it.action === "turn") f = -f;
          cur = start + dur;
        }
      }
    }
    let bEnd = b0 + .3;
    const cursors = {};
    for (const c of S.chars) {
      const L = LANES[c.id];
      let cur = b0;
      for (const e of plans[c.id].sort((a, b) => a.start - b.start)) {
        const s = Math.max(cur, e.start);
        if (s > cur + .005) filler(L, cur, s - cur);
        makeSeg(L, {...e, start: s});
        cur = s + e.dur;
      }
      cursors[c.id] = cur; bEnd = Math.max(bEnd, cur);
    }
    for (const c of S.chars) { const cur = cursors[c.id]; if (bEnd > cur + .005) filler(LANES[c.id], cur, bEnd - cur); }
    SPANS.push({start: b0, dur: bEnd - b0, bi});
    T = bEnd;
  });
  total = T;
  let mn = Infinity, mx = -Infinity;
  for (const c of S.chars) { mn = Math.min(mn, +c.x || 0); mx = Math.max(mx, +c.x || 0); }
  for (let q = 0; q <= total; q += .05) for (const c of S.chars) { const x = charState(c.id, q).x; mn = Math.min(mn, x); mx = Math.max(mx, x); }
  cam.min = isFinite(mn) ? mn : 0; cam.max = isFinite(mx) ? mx : 0;
}
function segState(seg, lt) {
  if (seg.holdOf) { const r = segState(seg.holdOf, seg.holdOf.dur); r.x = seg.x0; return r; }
  const A = seg.A, spd = Math.abs(seg.speed) || 1, cyc = A.cycle / spd;
  const ltc = clamp(lt, 0, seg.dur);
  const p = A.hold ? Math.min(1, ltc / cyc) : ((ltc % cyc) / cyc);
  const raw = A.fn(p);
  const pose = full(raw);
  const f = seg.action === "turn" ? seg.f0 * Math.cos(Math.PI * pose.flip) : seg.f0;
  let x;
  if (A.track) {
    const cycles = A.hold ? 0 : Math.floor(ltc / cyc);
    const dx = A.hold ? raw.dx : cycles * A.dxEnd + raw.dx;
    x = seg.x0 + seg.f0 * dx * Math.sign(seg.speed || 1);
  } else x = seg.x0 + (A.speed || 0) * seg.speed * seg.f0 * (A.hold ? Math.min(ltc, cyc) : ltc);
  return {pose, f, x};
}
function charState(cid, t) {
  const L = LANES[cid];
  if (!L || !L.segs.length) { const c = charById(cid); return {pose: full({}), f: (+c?.x || 0) > 0 ? -1 : 1, x: +c?.x || 0, say: "", k: -1, face: faceParams("neutral"), lt: t, t}; }
  const segs = L.segs;
  let k = segs.findIndex(s => t < s.start + s.dur);
  if (k < 0) k = segs.length - 1;
  const seg = segs[k], lt = Math.max(0, t - seg.start);
  const cur = segState(seg, lt);
  cur.face = {...seg.face};
  if (k > 0 && lt < BLEND) {
    const pvS = segs[k - 1], pv = segState(pvS, pvS.dur), w = sm(lt / BLEND);
    for (const f of ANG) pv.pose[f] += 360 * Math.round((cur.pose[f] - pv.pose[f]) / 360);
    pv.pose.rot += 360 * Math.round((cur.pose.rot - pv.pose.rot) / 360);
    for (const f of FIELDS) cur.pose[f] = pv.pose[f] + (cur.pose[f] - pv.pose[f]) * w;
    cur.f = pv.f + (cur.f - pv.f) * w;
    const pf = pvS.face;
    for (const f of FF) cur.face[f] = pf[f] + (cur.face[f] - pf[f]) * w;
  }
  cur.say = seg.say; cur.k = k; cur.lt = lt; cur.t = t; cur.seg = seg;
  if (seg.say && lt < seg.talk) cur.face.mo = Math.max(cur.face.mo, .15 + .5 * Math.abs(Math.sin(lt * 13)));
  return cur;
}

/* ---------- skeleton ---------- */
function skel(P, f) {
  const sn = a => Math.sin(a * D2R), cs = a => Math.cos(a * D2R);
  const up = (o, a, l) => [o[0] + sn(a) * f * l, o[1] + cs(a) * l];
  const dn = (o, a, l) => [o[0] + sn(a) * f * l, o[1] - cs(a) * l];
  const HR = 13 * S.head;
  const H = [0, 0];
  const S_ = up(H, P.torso, 52), N = up(H, P.torso, 60), Hd = up(N, P.torso + P.head, 6 + HR);
  const eL = dn(S_, P.torso + P.uaL, 30), hL = dn(eL, P.torso + P.uaL + P.faL, 28);
  const eR = dn(S_, P.torso + P.uaR, 30), hR = dn(eR, P.torso + P.uaR + P.faR, 28);
  const kL = dn(H, P.thL, 40), fL = dn(kL, P.thL + P.shL, 40);
  const kR = dn(H, P.thR, 40), fR = dn(kR, P.thR + P.shR, 40);
  const pts = {H, S: S_, N, Hd, eL, hL, eR, hR, kL, fL, kR, fR};
  if (Math.abs(P.rot) > .01) {
    const pv = up(H, P.torso, 24), th = -P.rot * Math.sign(f || 1) * D2R, c = Math.cos(th), s = Math.sin(th);
    for (const k in pts) { const dx = pts[k][0] - pv[0], dy = pts[k][1] - pv[1]; pts[k] = [pv[0] + dx * c - dy * s, pv[1] + dx * s + dy * c]; }
  }
  let minY = pts.Hd[1] - HR;
  for (const k of ["H","eL","hL","eR","hR","kL","fL","kR","fR"]) minY = Math.min(minY, pts[k][1]);
  const oy = -minY + P.lift;
  for (const k in pts) pts[k] = [pts[k][0], pts[k][1] + oy];
  return pts;
}

/* ---------- scenes ---------- */
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
let customImg = null;
const SCENES = {
  paper: {label: "Paper", draw(c, v) {
    c.fillStyle = "#F4F6F9"; c.fillRect(0, 0, v.W, v.H);
    c.strokeStyle = "rgba(96,150,200,.16)"; c.lineWidth = 1;
    const st = 30 * v.s, off = ((-v.camX * v.s) % st + st) % st;
    c.beginPath();
    for (let x = (v.W / 2) % st + off - st; x < v.W; x += st) { c.moveTo(x, 0); c.lineTo(x, v.H); }
    for (let y = v.gy % st; y < v.H; y += st) { c.moveTo(0, y); c.lineTo(v.W, y); }
    c.stroke(); groundLine(c, v, "rgba(27,33,39,.55)", true);
    return {shadow: "rgba(27,33,39,.10)", bubble: true};
  }},
  white: {label: "White", draw(c, v) { c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, v.W, v.H); groundLine(c, v, "rgba(27,33,39,.25)", true); return {shadow: "rgba(27,33,39,.08)"}; }},
  green: {label: "Green screen", draw(c, v) { c.fillStyle = "#00B140"; c.fillRect(0, 0, v.W, v.H); return {shadow: null}; }},
  park: {label: "Park", draw(c, v) {
    sky(c, v, "#9FD3EE", "#E4F3FA");
    sun(c, v, v.W * .82, v.H * .16, 30, "#FFE28A");
    hills(c, v, .12, 70, "#B5DDA9", 1);
    hills(c, v, .25, 42, "#9BCF8E", 2);
    tiled(c, v, .6, 230, (x, i) => { const h = (55 + rnd(i) * 30) * v.s0, y = v.gy - 26 * v.s0;
      c.fillStyle = "#7A5A3C"; c.fillRect(x - 4 * v.s0, y - h, 8 * v.s0, h);
      c.fillStyle = rnd(i + 3) > .5 ? "#5DA85A" : "#6DB765"; c.beginPath(); c.arc(x, y - h - 18 * v.s0, (30 + rnd(i + 1) * 12) * v.s0, 0, TAU); c.fill(); });
    c.fillStyle = "#86C46F"; c.fillRect(0, v.gy - 26 * v.s0, v.W, v.H);
    c.fillStyle = "#E4D6B4"; c.fillRect(0, v.gy - 8 * v.s0, v.W, 26 * v.s0);
    tiled(c, v, 1, 70, (x, i) => { c.strokeStyle = "#5E9E4E"; c.lineWidth = 1.5 * v.s0; const y = v.gy + 30 * v.s0 + rnd(i) * 30 * v.s0;
      c.beginPath(); c.moveTo(x - 4 * v.s0, y); c.lineTo(x - 6 * v.s0, y - 8 * v.s0); c.moveTo(x, y); c.lineTo(x, y - 10 * v.s0); c.moveTo(x + 4 * v.s0, y); c.lineTo(x + 7 * v.s0, y - 8 * v.s0); c.stroke(); });
    tiled(c, v, 1, 640, (x, i) => bench(c, v, x + 120 * v.s0, v.gy - 8 * v.s0));
    return {shadow: "rgba(40,70,30,.18)"};
  }},
  city: {label: "City street", draw(c, v) {
    sky(c, v, "#C4D4E8", "#EEF2F7");
    tiled(c, v, .18, 70, (x, i) => { const h = (80 + rnd(i) * 150) * v.s0, w = (50 + rnd(i + 2) * 30) * v.s0;
      c.fillStyle = "#B4C1D4"; c.fillRect(x - w / 2, v.gy - 34 * v.s0 - h, w, h + 10); });
    tiled(c, v, .45, 160, (x, i) => { const h = (130 + rnd(i + 5) * 170) * v.s0, w = (110 + rnd(i + 7) * 30) * v.s0, y0 = v.gy - 34 * v.s0 - h;
      c.fillStyle = ["#7F8EA6", "#8A7F96", "#6F8A9A"][i % 3 < 0 ? -(i % 3) : i % 3]; c.fillRect(x - w / 2, y0, w, h + 10);
      for (let wy = y0 + 14 * v.s0; wy < y0 + h - 20 * v.s0; wy += 26 * v.s0)
        for (let wx = x - w / 2 + 12 * v.s0; wx < x + w / 2 - 16 * v.s0; wx += 24 * v.s0) {
          c.fillStyle = rnd(wx * .37 + wy * 1.3 + i) > .72 ? "#F4D88A" : "#D7E1EC"; c.fillRect(wx, wy, 12 * v.s0, 14 * v.s0); } });
    c.fillStyle = "#C9CFD7"; c.fillRect(0, v.gy - 34 * v.s0, v.W, 34 * v.s0 + 14 * v.s0);
    c.fillStyle = "#9EA6B1"; c.fillRect(0, v.gy + 14 * v.s0, v.W, 5 * v.s0);
    c.fillStyle = "#555C66"; c.fillRect(0, v.gy + 19 * v.s0, v.W, v.H);
    tiled(c, v, 1, 90, (x) => { c.fillStyle = "#E9E3C8"; c.fillRect(x, v.gy + 60 * v.s0, 44 * v.s0, 6 * v.s0); });
    tiled(c, v, 1, 380, (x) => { c.fillStyle = "#3F4652"; c.fillRect(x - 3 * v.s0, v.gy - 170 * v.s0, 6 * v.s0, 170 * v.s0);
      c.fillRect(x - 3 * v.s0, v.gy - 170 * v.s0, 30 * v.s0, 5 * v.s0); c.fillStyle = "#F4E3A1"; c.fillRect(x + 18 * v.s0, v.gy - 166 * v.s0, 12 * v.s0, 7 * v.s0); });
    return {shadow: "rgba(30,35,45,.16)"};
  }},
  classroom: {label: "Classroom", draw(c, v) {
    c.fillStyle = "#D9E7E3"; c.fillRect(0, 0, v.W, v.H);
    c.fillStyle = "#C6D8D3"; c.fillRect(0, v.gy - 70 * v.s0, v.W, 8 * v.s0);
    tiled(c, v, .85, 900, (x, i) => {
      const w = 360 * v.s0, h = 160 * v.s0, y = v.gy - 290 * v.s0;
      c.fillStyle = "#8A6A48"; c.fillRect(x - w / 2 - 8 * v.s0, y - 8 * v.s0, w + 16 * v.s0, h + 16 * v.s0);
      c.fillStyle = "#2E4C3E"; c.fillRect(x - w / 2, y, w, h);
      c.fillStyle = "rgba(255,255,255,.85)"; c.font = `600 ${Math.round(22 * v.s0)}px "IBM Plex Sans", system-ui, sans-serif`; c.textBaseline = "top";
      c.fillText(["Today: Stickmen 101", "2 + 2 = 4", "Homework: p. 42"][((i % 3) + 3) % 3], x - w / 2 + 20 * v.s0, y + 20 * v.s0);
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 2 * v.s0; c.beginPath(); c.moveTo(x - w / 2 + 20 * v.s0, y + 70 * v.s0); c.lineTo(x + 40 * v.s0, y + 70 * v.s0); c.moveTo(x - w / 2 + 20 * v.s0, y + 100 * v.s0); c.lineTo(x - 10 * v.s0, y + 100 * v.s0); c.stroke();
      const wx = x + 450 * v.s0; win(c, v, wx, y, 150 * v.s0, 150 * v.s0, "#A9D8F2");
    });
    c.fillStyle = "#C79B6B"; c.fillRect(0, v.gy - 62 * v.s0, v.W, v.H);
    tiled(c, v, 1, 70, (x) => { c.strokeStyle = "rgba(90,60,30,.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, v.gy - 62 * v.s0); c.lineTo(x - 20 * v.s0, v.H); c.stroke(); });
    tiled(c, v, 1, 560, (x) => desk(c, v, x + 200 * v.s0, v.gy - 30 * v.s0));
    return {shadow: "rgba(70,45,20,.18)"};
  }},
  bedroom: {label: "Bedroom", draw(c, v) {
    c.fillStyle = "#E3DDF0"; c.fillRect(0, 0, v.W, v.H);
    tiled(c, v, .9, 40, (x) => { c.fillStyle = "rgba(160,140,200,.14)"; c.fillRect(x, 0, 14 * v.s0, v.gy); });
    tiled(c, v, .9, 820, (x, i) => {
      win(c, v, x - 120 * v.s0, v.gy - 300 * v.s0, 150 * v.s0, 130 * v.s0, "#23325C", true);
      c.fillStyle = "#F2B35B"; c.fillRect(x + 150 * v.s0, v.gy - 280 * v.s0, 70 * v.s0, 95 * v.s0);
      c.fillStyle = "#fff"; c.font = `700 ${Math.round(16 * v.s0)}px "IBM Plex Sans", system-ui, sans-serif`; c.textBaseline = "top"; c.fillText("★", x + 175 * v.s0, v.gy - 245 * v.s0);
      const bx = x + 220 * v.s0, by = v.gy - 40 * v.s0;
      c.fillStyle = "#6A4E7E"; c.fillRect(bx, by - 70 * v.s0, 12 * v.s0, 90 * v.s0);
      c.fillStyle = "#F7F4FB"; c.fillRect(bx + 12 * v.s0, by - 22 * v.s0, 220 * v.s0, 22 * v.s0);
      c.fillStyle = "#7C9CD6"; c.fillRect(bx + 60 * v.s0, by - 28 * v.s0, 172 * v.s0, 30 * v.s0);
      c.fillStyle = "#FFFFFF"; c.beginPath(); c.ellipse(bx + 36 * v.s0, by - 28 * v.s0, 22 * v.s0, 10 * v.s0, 0, 0, TAU); c.fill();
      c.fillStyle = "#6A4E7E"; c.fillRect(bx, by, 244 * v.s0, 10 * v.s0);
    });
    c.fillStyle = "#B7A5CF"; c.fillRect(0, v.gy - 40 * v.s0, v.W, v.H);
    tiled(c, v, 1, 700, (x) => { c.fillStyle = "#D98C8C"; c.beginPath(); c.ellipse(x, v.gy + 20 * v.s0, 150 * v.s0, 26 * v.s0, 0, 0, TAU); c.fill(); });
    return {shadow: "rgba(60,40,90,.18)"};
  }},
  beach: {label: "Beach", draw(c, v) {
    sky(c, v, "#8FD3EF", "#E6F6FC");
    sun(c, v, v.W * .2, v.H * .15, 34, "#FFE9A0");
    c.fillStyle = "#3C9CC9"; c.fillRect(0, v.gy - 80 * v.s0, v.W, 60 * v.s0);
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2 * v.s0;
    for (let k = 0; k < 3; k++) { const y = v.gy - (70 - k * 17) * v.s0; const ph = v.t * (1 + k * .3) * 40 * v.s0 - v.camX * v.s * .3;
      c.beginPath(); for (let x = -40; x < v.W + 40; x += 8) { const yy = y + Math.sin((x + ph) / (22 * v.s0)) * 2.5 * v.s0; x < 0 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); }
    c.fillStyle = "#EED9A6"; c.fillRect(0, v.gy - 22 * v.s0, v.W, v.H);
    tiled(c, v, .7, 520, (x, i) => { const y = v.gy - 22 * v.s0;
      c.strokeStyle = "#8A6A45"; c.lineWidth = 9 * v.s0; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 18 * v.s0, y - 90 * v.s0, x + 6 * v.s0, y - 170 * v.s0); c.stroke();
      c.fillStyle = "#3E9A55"; for (let a = 0; a < 6; a++) { const ang = a / 6 * TAU + .3; c.beginPath(); c.ellipse(x + 6 * v.s0 + Math.cos(ang) * 34 * v.s0, y - 170 * v.s0 + Math.sin(ang) * 12 * v.s0, 40 * v.s0, 9 * v.s0, ang, 0, TAU); c.fill(); } });
    tiled(c, v, 1, 150, (x, i) => { c.fillStyle = rnd(i) > .5 ? "#F2A7A0" : "#FFFFFF"; c.beginPath(); c.arc(x, v.gy + (30 + rnd(i + 1) * 40) * v.s0, 3.5 * v.s0, 0, TAU); c.fill(); });
    return {shadow: "rgba(120,90,40,.2)"};
  }},
  night: {label: "Night", draw(c, v) {
    sky(c, v, "#0A1230", "#27355E");
    for (let i = 0; i < 90; i++) { const x = ((rnd(i) * v.W * 1.5 - v.camX * v.s * .03) % v.W + v.W) % v.W, y = rnd(i + 50) * v.gy * .7;
      c.fillStyle = `rgba(255,255,255,${.4 + .5 * Math.abs(Math.sin(v.t * 1.5 + i))})`; c.fillRect(x, y, 2 * v.s0, 2 * v.s0); }
    c.fillStyle = "#F4F1DA"; c.beginPath(); c.arc(v.W * .8, v.H * .15, 26 * v.s0, 0, TAU); c.fill();
    c.fillStyle = "#27355E"; c.beginPath(); c.arc(v.W * .8 + 11 * v.s0, v.H * .15 - 6 * v.s0, 23 * v.s0, 0, TAU); c.fill();
    hills(c, v, .15, 60, "#162143", 3);
    hills(c, v, .3, 36, "#1B274A", 4);
    c.fillStyle = "#1A2236"; c.fillRect(0, v.gy - 20 * v.s0, v.W, v.H);
    tiled(c, v, 1, 420, (x) => { const top = v.gy - 170 * v.s0;
      const g = c.createRadialGradient(x, top + 10 * v.s0, 2, x, top + 10 * v.s0, 90 * v.s0); g.addColorStop(0, "rgba(255,220,140,.45)"); g.addColorStop(1, "rgba(255,220,140,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, top + 10 * v.s0, 90 * v.s0, 0, TAU); c.fill();
      c.fillStyle = "#3A4560"; c.fillRect(x - 3 * v.s0, top, 6 * v.s0, 170 * v.s0);
      c.fillStyle = "#FFE3A0"; c.beginPath(); c.arc(x, top, 8 * v.s0, 0, TAU); c.fill(); });
    return {shadow: "rgba(0,0,0,.3)", dark: true};
  }},
  custom: {label: "Your image", draw(c, v) {
    c.fillStyle = "#222"; c.fillRect(0, 0, v.W, v.H);
    if (customImg) {
      const iw = customImg.naturalWidth || customImg.width, ih = customImg.naturalHeight || customImg.height;
      const extra = S.parallax ? 1.15 : 1;
      const sc = Math.max(v.W / iw, v.H / ih) * extra;
      const dw = iw * sc, dh = ih * sc;
      const span = Math.max(1, cam.max - cam.min);
      const k = S.parallax ? clamp((v.camX - cam.min) / span, 0, 1) : .5;
      c.drawImage(customImg, (v.W - dw) * k, (v.H - dh) / 2, dw, dh);
    }
    return {shadow: "rgba(0,0,0,.18)"};
  }},
};
function groundLine(c, v, col, ticks) {
  c.strokeStyle = col; c.lineWidth = Math.max(1.5, 1.6 * v.s0);
  c.beginPath(); c.moveTo(0, v.gy); c.lineTo(v.W, v.gy); c.stroke();
  if (!ticks) return;
  const tk = 40 * v.s, off = ((-v.camX * v.s) % tk + tk) % tk;
  c.beginPath();
  for (let x = (v.W / 2) % tk + off - tk; x < v.W; x += tk) { c.moveTo(x, v.gy); c.lineTo(x - 8 * v.s0, v.gy + 10 * v.s0); }
  c.lineWidth = 1; c.stroke();
}
function sky(c, v, a, b) { const g = c.createLinearGradient(0, 0, 0, v.gy); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, v.W, v.H); }
function sun(c, v, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r * v.s0, 0, TAU); c.fill(); }
function hills(c, v, par, amp, col, seed) {
  c.fillStyle = col; c.beginPath(); c.moveTo(0, v.H);
  for (let x = 0; x <= v.W + 8; x += 8) {
    const wx = (x - v.W / 2) / v.s + v.camX * par;
    const y = v.gy - 26 * v.s0 - (amp + amp * .5 * Math.sin(wx * .006 + seed) + amp * .3 * Math.sin(wx * .017 + seed * 2)) * v.s0;
    c.lineTo(x, y);
  }
  c.lineTo(v.W, v.H); c.fill();
}
function tiled(c, v, par, spacing, fn) {
  if (!S.parallax) par = 0;
  const cx = v.camX * par, half = v.W / v.s / 2 + 300;
  const i0 = Math.floor((cx - half) / spacing), i1 = Math.ceil((cx + half) / spacing);
  for (let i = i0; i <= i1; i++) {
    const wx = i * spacing + rnd(i * 7.3) * spacing * .3;
    fn(v.W / 2 + (wx - cx) * v.s, i);
  }
}
function win(c, v, x, y, w, h, glass, night) {
  c.fillStyle = "#FFFFFF"; c.fillRect(x - 6 * v.s0, y - 6 * v.s0, w + 12 * v.s0, h + 12 * v.s0);
  c.fillStyle = glass; c.fillRect(x, y, w, h);
  if (night) { c.fillStyle = "#F4F1DA"; c.beginPath(); c.arc(x + w * .7, y + h * .3, 12 * v.s0, 0, TAU); c.fill(); }
  else { c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.ellipse(x + w * .35, y + h * .35, 26 * v.s0, 9 * v.s0, 0, 0, TAU); c.fill(); }
  c.fillStyle = "#FFFFFF"; c.fillRect(x + w / 2 - 3 * v.s0, y, 6 * v.s0, h); c.fillRect(x, y + h / 2 - 3 * v.s0, w, 6 * v.s0);
}
function bench(c, v, x, y) {
  c.fillStyle = "#8C5B34"; c.fillRect(x, y - 34 * v.s0, 110 * v.s0, 7 * v.s0); c.fillRect(x, y - 52 * v.s0, 110 * v.s0, 6 * v.s0);
  c.fillStyle = "#4A4F57"; c.fillRect(x + 8 * v.s0, y - 34 * v.s0, 5 * v.s0, 34 * v.s0); c.fillRect(x + 97 * v.s0, y - 34 * v.s0, 5 * v.s0, 34 * v.s0);
}
function desk(c, v, x, y) {
  c.fillStyle = "#A7784B"; c.fillRect(x, y - 60 * v.s0, 120 * v.s0, 8 * v.s0);
  c.fillStyle = "#7D5836"; c.fillRect(x + 6 * v.s0, y - 52 * v.s0, 6 * v.s0, 52 * v.s0); c.fillRect(x + 108 * v.s0, y - 52 * v.s0, 6 * v.s0, 52 * v.s0);
  c.fillStyle = "#E9573F"; c.fillRect(x + 20 * v.s0, y - 70 * v.s0, 30 * v.s0, 10 * v.s0);
}


/* ---------- drawing ---------- */
function drawFig(ctx, st, v, color, mode, sceneInfo) {
  const P = st.pose, pts = skel(P, st.f);
  const s = v.s, gy = v.gy, bx = v.W / 2 + (st.x - v.camX) * s;
  const X = p => bx + p[0] * s, Y = p => gy - p[1] * s;
  const lw = S.weight * s;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const main = mode === "main";
  if (main && sceneInfo.shadow) {
    const h = pts.H[1] - 40, k = clamp(1 - Math.max(0, h) / 160, .35, 1);
    ctx.fillStyle = sceneInfo.shadow; ctx.beginPath();
    ctx.ellipse(bx, gy + 2 * s, 34 * s * k, 5 * s * k, 0, 0, TAU); ctx.fill();
  }
  if (main && P.stool > .01) {
    ctx.save(); ctx.globalAlpha = clamp(P.stool, 0, 1);
    ctx.strokeStyle = sceneInfo.dark ? "#C9D1E0" : "#5B4632"; ctx.lineWidth = lw * .8;
    const top = gy - 38 * s, hx = bx + 4 * s * Math.sign(st.f || 1);
    ctx.beginPath();
    ctx.moveTo(hx - 20 * s, top); ctx.lineTo(hx + 20 * s, top);
    ctx.moveTo(hx - 15 * s, top); ctx.lineTo(hx - 19 * s, gy);
    ctx.moveTo(hx + 15 * s, top); ctx.lineTo(hx + 19 * s, gy);
    ctx.moveTo(hx - 17 * s, gy - 14 * s); ctx.lineTo(hx + 17 * s, gy - 14 * s);
    ctx.stroke(); ctx.restore();
  }
  const poly = (...ps) => { ctx.beginPath(); ctx.moveTo(X(ps[0]), Y(ps[0])); for (let i = 1; i < ps.length; i++) ctx.lineTo(X(ps[i]), Y(ps[i])); ctx.stroke(); };
  const HR = 13 * S.head * s;
  const body = (col, w, farA) => {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.save(); ctx.globalAlpha *= farA;
    poly(pts.H, pts.kR, pts.fR); poly(pts.S, pts.eR, pts.hR);
    ctx.restore();
    poly(pts.H, pts.N); poly(pts.H, pts.kL, pts.fL); poly(pts.S, pts.eL, pts.hL);
  };
  if (!main) { body(color, lw, 1); ctx.beginPath(); ctx.arc(X(pts.Hd), Y(pts.Hd), HR, 0, TAU); ctx.stroke(); return; }
  if (sceneInfo.dark) { body("rgba(255,255,255,.55)", lw + 4 * v.s0, 1); ctx.lineWidth = lw + 4 * v.s0; ctx.beginPath(); ctx.arc(X(pts.Hd), Y(pts.Hd), HR, 0, TAU); ctx.stroke(); }
  const farCol = mixColor(color, sceneInfo.dark ? "#FFFFFF" : "#FFFFFF", .45);
  ctx.strokeStyle = farCol; ctx.lineWidth = lw;
  poly(pts.H, pts.kR, pts.fR); poly(pts.S, pts.eR, pts.hR);
  ctx.strokeStyle = color;
  poly(pts.H, pts.N); poly(pts.H, pts.kL, pts.fL); poly(pts.S, pts.eL, pts.hL);
  ctx.beginPath(); ctx.arc(X(pts.Hd), Y(pts.Hd), HR, 0, TAU);
  ctx.fillStyle = S.solid ? color : "#FFFFFF"; ctx.fill(); ctx.stroke();
  if (S.faces && st.face) drawFace(ctx, st, pts, X, Y, s, S.solid ? "#FFFFFF" : color);
}
function mixColor(a, b, t) {
  const h = x => { x = x.replace("#", ""); if (x.length === 3) x = x.split("").map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)); };
  try { const A = h(a), B = h(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; } catch (e) { return a; }
}
function drawFace(ctx, st, pts, X, Y, s, col) {
  const F = st.face, f = st.f, sg = Math.sign(f) || 1;
  if (Math.abs(f) < .2) return;
  let ux = pts.Hd[0] - pts.N[0], uy = pts.Hd[1] - pts.N[1];
  const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
  const fx = uy, fy = -ux, k = S.head;
  const P = (lx, ly) => { const a = lx * f * k, b = ly * k; const w = [pts.Hd[0] + fx * a + ux * b, pts.Hd[1] + fy * a + uy * b]; return [X(w), Y(w)]; };
  const ang = Math.atan2(-fy * sg, fx * sg);
  const lw = Math.max(1, S.weight * .42 * s);
  ctx.save();
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const q = (a, c, b) => { ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]); };
  const blink = ((st.t + (st.k | 0) * .9 + (st.seed || 0)) % 3.4) < .12 ? .08 : 1;
  const eyes = [1.3, 7.4], ly = 2.2, er = 1.75 * k * s * Math.abs(f) ** .3;
  eyes.forEach((ex, i) => {
    const winkThis = i === 1 && F.wink > .5;
    const open = F.eo * blink;
    ctx.beginPath();
    if (F.es > .5 || winkThis) { q(P(ex - 2, ly - .6), P(ex, ly + 2.4), P(ex + 2, ly - .6)); ctx.stroke(); }
    else if (open < .3) { q(P(ex - 1.9, ly), P(ex, ly - .5), P(ex + 1.9, ly)); ctx.stroke(); }
    else { const c = P(ex, ly); ctx.ellipse(c[0], c[1], er * Math.max(1, open) * (i === 0 ? .85 : 1), er * Math.min(1.45, open), ang, 0, TAU); ctx.fill(); }
  });
  const bAmt = Math.max(Math.abs(F.bt), F.br, F.ba);
  if (bAmt > .08) {
    ctx.save(); ctx.globalAlpha *= clamp(bAmt * 2.2, 0, 1); ctx.beginPath();
    eyes.forEach((ex, i) => {
      const base = ly + 4.3 + F.br * 1.9 + (i === 0 ? 1.4 : -.6) * F.ba;
      const inner = base - F.bt * 1.4, outer = base + F.bt * .6;
      const xo = i === 0 ? ex - 2 : ex + 2, xi = i === 0 ? ex + 1.8 : ex - 1.8;
      const a = P(xo, outer), b = P(xi, inner); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    });
    ctx.stroke(); ctx.restore();
  }
  if (F.blush > .05) {
    ctx.save(); ctx.globalAlpha *= F.blush * .55; ctx.fillStyle = "#F07C7C";
    const c = P(8.2, -1.6); ctx.beginPath(); ctx.ellipse(c[0], c[1], 2.4 * k * s * Math.abs(f), 1.3 * k * s, ang, 0, TAU); ctx.fill(); ctx.restore();
  }
  const mcx = 4.6 + F.sk * .6, my = -5, hw = 3.6 * F.mw;
  const lft = P(mcx - hw, my + F.mc * 1.5), rgt = P(mcx + hw, my + F.mc * 1.5 + F.sk * 1.4);
  const top = P(mcx, my - F.mc * 2.2);
  ctx.beginPath();
  if (F.mo > .08) {
    const bot = P(mcx, my - F.mc * 2.2 - F.mo * 7);
    if (F.mw < .75) { const c = P(mcx, my - F.mo * 1.6); ctx.ellipse(c[0], c[1], hw * k * s * Math.abs(f) * .75 + lw, F.mo * 2.6 * k * s, ang, 0, TAU); }
    else { q(lft, top, rgt); ctx.quadraticCurveTo(bot[0], bot[1], lft[0], lft[1]); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
  } else { q(lft, top, rgt); ctx.stroke(); }
  const drop = (c, r, colr) => { ctx.save(); ctx.fillStyle = colr; ctx.beginPath(); ctx.moveTo(c[0], c[1] - r * 1.9); ctx.quadraticCurveTo(c[0] + r * 1.3, c[1] - r * .2, c[0], c[1] + r); ctx.quadraticCurveTo(c[0] - r * 1.3, c[1] - r * .2, c[0], c[1] - r * 1.9); ctx.fill(); ctx.restore(); };
  if (F.tear > .3) { const ph = (st.t * 1.6) % 1; drop(P(7.6, ly - 2.5 - ph * 7), 1.3 * k * s, "#4FA3E0"); }
  if (F.sweat > .3) { const ph = (st.t * .9) % 1; drop(P(-9.5, 7 - ph * 3), 1.6 * k * s, "#4FA3E0"); }
  if (F.zzz > .3) {
    ctx.save(); ctx.fillStyle = col; ctx.textBaseline = "middle";
    for (let i = 0; i < 3; i++) {
      const ph = ((st.t * .6) + i / 3) % 1, c = P(9 + ph * 8, 13 + ph * 12);
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.font = `700 ${Math.round((5 + ph * 5) * k * s)}px "IBM Plex Sans", system-ui, sans-serif`;
      ctx.fillText("z", c[0], c[1]);
    }
    ctx.restore();
  }
  ctx.restore();
}
function wrapText(ctx, text, maxW) {
  const words = text.split(/\s+/), lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}
function drawBubble(ctx, st, v, color, placed) {
  const pts = skel(st.pose, st.f);
  const hx = v.W / 2 + (st.x - v.camX) * v.s + pts.Hd[0] * v.s, hy = v.gy - pts.Hd[1] * v.s;
  const s0 = v.s0, fs = Math.round(17 * s0);
  ctx.font = `600 ${fs}px "IBM Plex Sans", system-ui, sans-serif`;
  const lines = wrapText(ctx, st.say, (v.W < v.H ? 170 : 210) * s0);
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
  const pad = 10 * s0, lh = fs * 1.25;
  const bw = tw + pad * 2, bh = lines.length * lh + pad * 2 - (lh - fs);
  let bx = hx + 18 * s0 * Math.sign(st.f || 1) - (st.f < 0 ? bw : 0);
  bx = clamp(bx, 10, v.W - bw - 10);
  let by = clamp(hy - 13 * S.head * v.s - bh - 16 * s0, 10, v.H - bh - 10);
  for (const r of placed) if (bx < r.x + r.w + 6 && bx + bw + 6 > r.x && by < r.y + r.h + 6 && by + bh + 6 > r.y) by = Math.max(10, r.y - bh - 10);
  placed.push({x: bx, y: by, w: bw, h: bh});
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, 2 * s0);
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10 * s0); ctx.fill(); ctx.stroke();
  const tx = clamp(hx, bx + 14 * s0, bx + bw - 14 * s0);
  ctx.beginPath(); ctx.moveTo(tx - 7 * s0, by + bh - 1); ctx.lineTo(clamp(hx, tx - 30 * s0, tx + 30 * s0), Math.min(hy - 16 * v.s, by + bh + 16 * s0)); ctx.lineTo(tx + 7 * s0, by + bh - 1);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1B2127"; ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad + i * lh));
}
function view(W, H, t) {
  const tall = W < H;
  const s0 = H / (tall ? 520 : 360), s = s0 * S.size;
  const gy = H * (tall ? .74 : .82);
  const halfW = W / s / 2;
  let camX;
  if (cam.max - cam.min <= halfW * 1.4) camX = (cam.min + cam.max) / 2;
  else {
    let a = Infinity, b = -Infinity;
    for (const c of S.chars) { const x = charState(c.id, t).x; a = Math.min(a, x); b = Math.max(b, x); }
    camX = clamp((a + b) / 2, cam.min + halfW * .7, cam.max - halfW * .7);
  }
  return {W, H, s0, s, gy, camX, t};
}
function render(ctx, W, H, t, opt = {}) {
  const v = view(W, H, t);
  const sc = SCENES[S.scene] || SCENES.paper;
  ctx.save();
  const info = sc.draw(ctx, v) || {};
  ctx.restore();
  const states = S.chars.map((c, i) => { const st = charState(c.id, t); st.seed = i * 1.37; return {c, st}; });
  if (opt.onion) {
    const d = 3 / S.fps;
    for (const {c} of states) {
      drawFig(ctx, charState(c.id, Math.max(0, t - d)), v, "rgba(63,127,184,.35)", "ghost", info);
      drawFig(ctx, charState(c.id, Math.min(total, t + d)), v, "rgba(201,67,58,.30)", "ghost", info);
    }
  }
  for (const {c, st} of states) drawFig(ctx, st, v, c.color, "main", info);
  const placed = [];
  for (const {c, st} of states) if (st.say) drawBubble(ctx, st, v, c.color, placed);
  return states;
}

/* ---------- UI ---------- */
const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");
let t = 0, playing = true, last = performance.now(), recording = false, curBeat = -1;
const beatAt = tt => { for (let i = 0; i < SPANS.length; i++) if (tt < SPANS[i].start + SPANS[i].dur) return i; return SPANS.length - 1; };

function setCanvasSize() { const [w, h] = FMT[S.fmt]; cv.width = w; cv.height = h; $("fmtLbl").textContent = `${FMT[S.fmt][2]} · ${S.fps} fps`; }
function fmtTime(x) { const m = Math.floor(x / 60), sec = x - m * 60; return `${String(m).padStart(2, "0")}:${sec.toFixed(2).padStart(5, "0")}`; }
function drawNow() {
  render(ctx, cv.width, cv.height, t, {onion: S.onion && !playing && !recording});
  const fr = Math.floor(t * S.fps), tf = Math.max(1, Math.round(total * S.fps));
  $("counter").innerHTML = `F <b>${String(Math.min(fr, tf)).padStart(3, "0")}</b> / ${String(tf).padStart(3, "0")} · ${fmtTime(t)}`;
  $("scrub").value = total ? t / total : 0;
  const hd = $("head"); if (hd) hd.style.left = `calc(${total ? (t / total) * 100 : 0}% - 1px)`;
  const b = beatAt(t);
  if (b !== curBeat) {
    curBeat = b;
    document.querySelectorAll(".beat").forEach((el, i) => el.classList.toggle("on", i === b));
    document.querySelectorAll(".blk").forEach((el, i) => el.classList.toggle("on", i === b));
  }
}
function tick(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (playing && !recording && total > 0) {
    t += dt;
    if (t >= total) { if (S.loop) t = t % total; else { t = total; setPlaying(false); } }
  }
  if (!recording) drawNow();
  requestAnimationFrame(tick);
}
function setPlaying(v) { playing = v; $("play").textContent = v ? "❚❚" : "▶"; $("play").setAttribute("aria-label", v ? "Pause" : "Play"); }

const GROUPS = [["basic", "Basic"], ["pair", "Together"], ["real", "Real motion"], ["cmu", "CMU library"], ["mine", "My moves"]];
const actionsIn = g => Object.keys(ACTIONS).filter(k => ACTIONS[k].g === g);
function actionOptions(sel) {
  return GROUPS.map(([g, lab]) => { const ks = g === "cmu" ? (sel && sel.startsWith("c:") && getA(sel) ? [sel] : []) : actionsIn(g); if (!ks.length) return "";
    return `<optgroup label="${lab}">${ks.map(k => `<option value="${escH(k)}"${k === sel ? " selected" : ""}>${escH(ACTIONS[k].label)}</option>`).join("")}</optgroup>`; }).join("");
}
const faceOptions = (sel, action) => FACE_ORDER.map(f => `<option value="${f}"${f === (sel || "auto") ? " selected" : ""}>${f === "auto" ? "Auto · " + FACES[AUTOFACE[action] || "neutral"].label : FACES[f].label}</option>`).join("");
const charOptions = sel => S.chars.map(c => `<option value="${c.id}"${c.id === sel ? " selected" : ""}>${escH(c.name)}</option>`).join("");
function thirdSelect(it) {
  const A = getA(it.action);
  if (A && A.pair) {
    const others = S.chars.filter(c => c.id !== it.char);
    return `<select data-k="target" id="tg-${it.id}" aria-label="Toward">${others.length ? others.map(c => `<option value="${c.id}"${c.id === it.target ? " selected" : ""}>→ ${escH(c.name)}</option>`).join("") : `<option value="">No one</option>`}</select>`;
  }
  return `<select data-k="dir" id="dr-${it.id}" aria-label="Direction" ${it.action === "turn" ? "disabled" : ""}>
    <option value="0"${!+it.dir ? " selected" : ""}>Keep</option><option value="1"${+it.dir === 1 ? " selected" : ""}>Face →</option><option value="-1"${+it.dir === -1 ? " selected" : ""}>Face ←</option></select>`;
}
function renderBeats() {
  const box = $("beats");
  if (!S.beats.length) box.innerHTML = `<div class="empty">The timeline is empty. Write a scene above or click a move.</div>`;
  else box.innerHTML = S.beats.map((b, bi) => {
    const sp = SPANS[bi];
    return `<div class="beat" data-b="${b.id}">
      <div class="beat-h"><b>Beat ${bi + 1}</b><span class="t">${sp ? sp.dur.toFixed(1) + " s" : ""}</span>
        <button class="btn small" data-op="additem">+ Action</button>
        <button class="mini" data-op="up" aria-label="Move beat up">↑</button>
        <button class="mini" data-op="down" aria-label="Move beat down">↓</button>
        <button class="mini" data-op="delbeat" aria-label="Delete beat">✕</button></div>
      ${b.items.map(it => {
        const c = charById(it.char), A = getA(it.action);
        return `<div class="item" data-i="${it.id}">
          <select data-k="char" id="ch-${it.id}" class="who" aria-label="Who" style="border-left-color:${escH(c?.color || "var(--line)")}">${charOptions(it.char)}</select>
          <select data-k="action" id="ac-${it.id}" aria-label="Move">${actionOptions(it.action)}</select>
          ${thirdSelect(it)}
          <select data-k="face" id="fc-${it.id}" aria-label="Face">${faceOptions(it.face, it.action)}</select>
          <input data-k="dur" id="du-${it.id}" type="number" min="0.2" max="30" step="0.1" value="${it.dur}" aria-label="Seconds" ${A && A.pair && A.pair.walk ? "disabled title=\"Set automatically by distance\"" : ""}>
          <input data-k="wait" id="wa-${it.id}" type="number" min="0" max="30" step="0.1" value="${it.wait || 0}" aria-label="Wait before starting (seconds)">
          <input data-k="say" id="sa-${it.id}" class="say" type="text" maxlength="90" placeholder="Speech bubble…" value="${escH(it.say)}" aria-label="Says">
          <button class="mini" data-op="delitem" aria-label="Remove action">✕</button>
        </div>`; }).join("")}
    </div>`; }).join("");
  $("strip").innerHTML = SPANS.map(sp => {
    const b = S.beats[sp.bi];
    const lab = b.items.map(it => `${charById(it.char)?.name?.[0] || "?"}:${getA(it.action)?.label || "?"}`).join(" · ");
    return `<div class="blk" style="flex:${sp.dur} 1 0" title="${escH(lab)}">${escH(lab)}</div>`; }).join("") + `<div class="head" id="head"></div>`;
  $("totalLbl").textContent = `${total.toFixed(1)} s · ${S.beats.length} beats`;
  curBeat = -2;
}
function changed(resetT) {
  compile(); if (resetT) t = 0; t = Math.min(t, total);
  renderBeats(); persist(); drawNow();
}
const findItem = id => { for (const b of S.beats) { const it = b.items.find(x => x.id === id); if (it) return {b, it}; } return {}; };
$("beats").addEventListener("change", e => {
  const row = e.target.closest(".item"); if (!row) return;
  const {it} = findItem(+row.dataset.i), k = e.target.dataset.k; if (!it || !k) return;
  const val = e.target.value;
  if (k === "char") { it.char = +val; if (it.target === it.char) it.target = S.chars.find(c => c.id !== it.char)?.id ?? null; }
  else if (k === "action") { it.action = val; const A = getA(val); it.dur = A.dur; if (A.pair && (it.target == null || it.target === it.char)) it.target = S.chars.find(c => c.id !== it.char)?.id ?? null; if (val === "turn") it.dir = 0; }
  else if (k === "target") it.target = +val;
  else if (k === "dir") it.dir = +val;
  else if (k === "face") it.face = val;
  else if (k === "dur") it.dur = clamp(+val || .2, .2, 30);
  else if (k === "wait") it.wait = clamp(+val || 0, 0, 30);
  else if (k === "say") it.say = val.trim();
  changed(false);
});
$("beats").addEventListener("click", e => {
  const btn = e.target.closest("[data-op]"); if (!btn) return;
  const bEl = btn.closest(".beat"), bi = S.beats.findIndex(b => b.id === +bEl.dataset.b);
  const op = btn.dataset.op;
  if (op === "delbeat") S.beats.splice(bi, 1);
  else if (op === "up" || op === "down") { const j = op === "up" ? bi - 1 : bi + 1; if (j < 0 || j >= S.beats.length) return; [S.beats[bi], S.beats[j]] = [S.beats[j], S.beats[bi]]; }
  else if (op === "additem") S.beats[bi].items.push(newItem(S.active, "wave"));
  else if (op === "delitem") { const id = +btn.closest(".item").dataset.i; const b = S.beats[bi]; b.items = b.items.filter(x => x.id !== id); if (!b.items.length) S.beats.splice(bi, 1); }
  changed(false);
});
function newItem(char, action) {
  const A = getA(action);
  const target = A.pair ? (S.chars.find(c => c.id !== char)?.id ?? null) : null;
  return {id: nid(), char, action, dir: 0, target, dur: A.dur, wait: 0, face: "auto", say: "", speed: 1};
}
$("addBeat").onclick = () => { S.beats.push({id: nid(), items: [newItem(S.active, "idle")]}); changed(false); };
$("clearAll").onclick = () => { S.beats = []; changed(true); };
$("strip").addEventListener("click", e => { const r = $("strip").getBoundingClientRect(); t = clamp((e.clientX - r.left) / r.width, 0, 1) * total; drawNow(); });

/* script */
function doParse(append) {
  S.script = $("script").value;
  const {beats, unknown} = parseScript(S.script);
  const box = $("unknown");
  if (unknown.length) { box.hidden = false; box.innerHTML = `<b>Skipped — not in the move library yet:</b> ${unknown.map(escH).join(" · ")}`; }
  else box.hidden = true;
  const add = beats.map(b => ({id: nid(), items: b.items.map(it => ({...it, id: nid()}))}));
  S.beats = append ? S.beats.concat(add) : add;
  changed(!append); setPlaying(true);
}
$("build").onclick = () => doParse(false);
$("append").onclick = () => doParse(true);
$("script").addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) doParse(false); });
function tries() {
  const a = S.chars[0]?.name || "Ravi", b = S.chars[1]?.name;
  const list = b ? [
    `${a} walks up to ${b}. ${a} punches ${b}. ${b} gets angry and pushes ${a}. ${a} gets up slowly and says "Okay, okay!"`,
    `${a} and ${b} hug happily, then ${a} does a cartwheel while ${b} cheers.`,
    `${b} sits and looks sleepy. ${a} sneaks up to ${b} and says "BOO!". ${b} looks scared and runs left.`,
    `${a} does a spin kick while ${b} does a breakdance. They high five and laugh.`,
    `${a} crawls right, then does a forward roll, then says "Ninja training complete."`,
  ] : [
    `${a} sneaks right slowly, then thinks, then points and says "Aha!"`,
    `${a} walks right, trips, cries, gets up, then laughs and says "I'm fine!"`,
    `${a} jogs right, does a long jump, then a backflip and cheers.`,
    `${a} does a punch combo angrily, a spin kick, then bows.`,
  ];
  $("tries").innerHTML = list.map((x, i) => `<button class="try" data-i="${i}">${escH(x)}</button>`).join("");
  $("tries").onclick = e => { const btn = e.target.closest(".try"); if (!btn) return; $("script").value = list[+btn.dataset.i]; doParse(false); };
}

/* cast */
function renderCast() {
  $("cast").innerHTML = S.chars.map(c => `
    <div class="actor" data-c="${c.id}">
      <input type="radio" name="active" id="act-${c.id}" ${c.id === S.active ? "checked" : ""} aria-label="Library adds moves for ${escH(c.name)}">
      <input type="color" id="col-${c.id}" data-k="color" value="${escH(c.color)}" aria-label="Colour for ${escH(c.name)}">
      <input type="text" id="nm-${c.id}" data-k="name" value="${escH(c.name)}" maxlength="16" aria-label="Name">
      <label class="pos">Start position<input type="range" id="px-${c.id}" data-k="x" min="-320" max="320" step="10" value="${c.x}"></label>
      <button class="mini" data-op="del" aria-label="Remove ${escH(c.name)}" ${S.chars.length < 2 ? "disabled" : ""}>✕</button>
    </div>`).join("");
  $("castCount").textContent = `${S.chars.length} of 4`;
  $("addChar").disabled = S.chars.length >= 4;
}
$("cast").addEventListener("input", e => {
  const row = e.target.closest(".actor"); if (!row) return;
  const c = charById(+row.dataset.c), k = e.target.dataset.k;
  if (e.target.type === "radio") { S.active = c.id; persist(); return; }
  if (!c || !k) return;
  if (k === "x") { c.x = +e.target.value; changed(false); }
  else if (k === "color") { c.color = e.target.value; persist(); drawNow(); }
});
$("cast").addEventListener("change", e => {
  const row = e.target.closest(".actor"); if (!row) return;
  const c = charById(+row.dataset.c);
  if (e.target.dataset.k === "name") { c.name = e.target.value.trim() || c.name; e.target.value = c.name; persist(); renderBeats(); tries(); }
  if (e.target.dataset.k === "color") renderBeats();
});
$("cast").addEventListener("click", e => {
  const btn = e.target.closest("[data-op=del]"); if (!btn) return;
  const id = +btn.closest(".actor").dataset.c;
  if (S.chars.length < 2) return;
  S.chars = S.chars.filter(c => c.id !== id);
  for (const b of S.beats) b.items = b.items.filter(it => it.char !== id && !(getA(it.action)?.pair && it.target === id));
  S.beats = S.beats.filter(b => b.items.length);
  if (S.active === id) S.active = S.chars[0].id;
  renderCast(); tries(); changed(false);
});
const NAMES = ["Ravi", "Meera", "Arjun", "Priya", "Kabir", "Anya"];
$("addChar").onclick = () => {
  if (S.chars.length >= 4) return;
  const name = NAMES.find(n => !S.chars.some(c => c.name === n)) || `Stick ${S.chars.length + 1}`;
  const used = S.chars.map(c => c.x);
  const x = [-110, 110, -260, 260, 0].find(v => !used.includes(v)) ?? 0;
  S.chars.push({id: nid(), name, color: COLORS.find(col => !S.chars.some(c => c.color === col)) || "#444444", x});
  renderCast(); tries(); changed(false);
};


/* library */
function thumbFor(c, key) {
  const A = getA(key); if (!A) return;
  const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#1b2127";
  const g = c.getContext("2d"), d = c.width;
  g.clearRect(0, 0, d, d);
  const pose = full(A.fn(A.thumb ?? .3));
  const f = key === "turn" ? .35 : 1;
  const pts = skel({...pose, lift: Math.min(pose.lift, 30)}, f);
  let mnx = 1e9, mxx = -1e9, mxy = 0;
  for (const k in pts) { mnx = Math.min(mnx, pts[k][0]); mxx = Math.max(mxx, pts[k][0]); mxy = Math.max(mxy, pts[k][1]); }
  mxy = Math.max(mxy + 16, 60);
  const sc = Math.min((d * .82) / (mxx - mnx + 30), (d * .86) / mxy);
  const cx = d / 2 - ((mnx + mxx) / 2) * sc, gy = d * .93;
  g.lineCap = g.lineJoin = "round"; g.strokeStyle = ink; g.lineWidth = Math.max(2, 5 * sc);
  const P = (...ps) => { g.beginPath(); g.moveTo(cx + ps[0][0] * sc, gy - ps[0][1] * sc); for (let i = 1; i < ps.length; i++) g.lineTo(cx + ps[i][0] * sc, gy - ps[i][1] * sc); g.stroke(); };
  g.globalAlpha = .45; P(pts.H, pts.kR, pts.fR); P(pts.S, pts.eR, pts.hR); g.globalAlpha = 1;
  P(pts.H, pts.N); P(pts.H, pts.kL, pts.fL); P(pts.S, pts.eL, pts.hL);
  g.beginPath(); g.arc(cx + pts.Hd[0] * sc, gy - pts.Hd[1] * sc, 13 * S.head * sc, 0, TAU); g.stroke();
  if (A.pair && A.pair.react) { g.globalAlpha = .35; g.beginPath(); g.arc(d * .9, d * .3, d * .07, 0, TAU); g.stroke(); g.globalAlpha = 1; }
}
function renderTabs() {
  const cnt = g => g === "mine" ? USER_MOVES.length : g === "cmu" ? CMU_IDX.length : actionsIn(g).length;
  $("tabs").innerHTML = GROUPS.map(([g, lab]) => `<button class="tab" role="tab" data-g="${g}" aria-selected="${S.tab === g}">${lab}<small>${cnt(g).toLocaleString()}</small></button>`).join("");
  $("libCount").textContent = `${(Object.keys(ACTIONS).filter(k => !k.startsWith("c:")).length + CMU_IDX.length).toLocaleString()} moves`;
}
function renderLib() {
  renderTabs();
  $("cmuBox").hidden = S.tab !== "cmu";
  if (S.tab === "cmu") { renderCmu(); $("importBox").hidden = true; return; }
  const keys = actionsIn(S.tab).filter(k => !k.startsWith("c:"));
  $("importBox").hidden = S.tab !== "mine";
  $("lib").hidden = S.tab === "mine" && !keys.length;
  $("lib").innerHTML = keys.map(k => `<button class="chip" data-a="${escH(k)}"><canvas width="96" height="96" data-a="${escH(k)}"></canvas>${escH(ACTIONS[k].label)}${ACTIONS[k].g === "real" || ACTIONS[k].g === "mine" ? `<span class="tagm">${ACTIONS[k].cycle.toFixed(1)}s</span>` : ""}</button>`).join("");
  document.querySelectorAll(".chip canvas").forEach(c => thumbFor(c, c.dataset.a));
  if (S.tab === "mine") renderMine();
}
$("tabs").addEventListener("click", e => { const b = e.target.closest(".tab"); if (!b) return; S.tab = b.dataset.g; persist(); renderLib(); });
$("lib").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  const a = b.dataset.a, A = getA(a);
  if (A.pair && S.chars.length < 2) { $("unknown").hidden = false; $("unknown").innerHTML = "<b>Add a second character first.</b> Together moves need two people."; return; }
  const it = newItem(S.active, a);
  if (S.addMode === "last" && S.beats.length) S.beats[S.beats.length - 1].items.push(it);
  else S.beats.push({id: nid(), items: [it]});
  changed(false);
  const sp = SPANS[S.beats.length - 1]; t = sp ? sp.start : 0; setPlaying(true);
});

/* scenes */
function renderScenes() {
  $("scenes").innerHTML = Object.entries(SCENES).map(([k, sc]) => `<button class="scene" data-s="${k}" aria-pressed="${S.scene === k}" ${k === "custom" && !customImg ? "hidden" : ""}><canvas width="160" height="90"></canvas>${sc.label}</button>`).join("");
  document.querySelectorAll(".scene").forEach(b => {
    const c = b.querySelector("canvas"), g = c.getContext("2d");
    const v = {W: 160, H: 90, s0: 90 / 360, s: 90 / 360, gy: 90 * .82, camX: 0, t: 1};
    try { SCENES[b.dataset.s].draw(g, v); } catch (e) {}
  });
}
$("scenes").addEventListener("click", e => { const b = e.target.closest(".scene"); if (!b) return; S.scene = b.dataset.s; persist(); renderScenes(); drawNow(); });
$("bgFile").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return;
  await loadBg(f);
  S.scene = "custom"; persist(); renderScenes(); drawNow();
  idb.set("bg", f).catch(() => { $("bgNote").textContent = "Loaded for this session. This browser couldn't store it for next time."; });
  e.target.value = "";
});
function loadBg(blob) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { customImg = img; res(true); };
    img.onerror = () => { $("bgNote").textContent = "That file couldn't be read as an image. Try a JPG or PNG."; res(false); };
    img.src = URL.createObjectURL(blob);
  });
}

/* look controls */
function bindSeg(id, key, conv = v => v, after) {
  const el = $(id);
  const sync = () => el.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(conv(b.dataset.v) === S[key])));
  el.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S[key] = conv(b.dataset.v); sync(); after && after(); persist(); drawNow(); });
  sync();
}
bindSeg("fmt", "fmt", v => v, setCanvasSize);
bindSeg("fps", "fps", v => +v, setCanvasSize);
bindSeg("addMode", "addMode");
const bindIn = (id, key, prop, conv, after) => { const el = $(id); el[prop] = S[key]; el.addEventListener("input", () => { S[key] = conv(el[prop]); after && after(); persist(); drawNow(); }); };
bindIn("weight", "weight", "value", v => +v);
bindIn("size", "size", "value", v => +v, () => compile());
bindIn("headsz", "head", "value", v => +v);
bindIn("solid", "solid", "checked", v => v);
bindIn("faces", "faces", "checked", v => v);
bindIn("onion", "onion", "checked", v => v);
bindIn("loop", "loop", "checked", v => v);
bindIn("parallax", "parallax", "checked", v => v);
$("headsz").addEventListener("change", () => document.querySelectorAll(".chip canvas").forEach(c => thumbFor(c, c.dataset.a)));

$("play").onclick = () => { if (!playing && t >= total) t = 0; setPlaying(!playing); };
$("restart").onclick = () => { t = 0; drawNow(); };
$("scrub").addEventListener("input", e => { setPlaying(false); t = +e.target.value * total; drawNow(); });
document.addEventListener("keydown", e => {
  if (e.target.closest("input,textarea,select,button")) return;
  if (e.code === "Space") { e.preventDefault(); $("play").click(); }
  if (e.key === "ArrowRight") { setPlaying(false); t = Math.min(total, t + 1 / S.fps); drawNow(); }
  if (e.key === "ArrowLeft") { setPlaying(false); t = Math.max(0, t - 1 / S.fps); drawNow(); }
});
try {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderLib);
  new MutationObserver(renderLib).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
} catch (e) {}

/* ---------- storage (IndexedDB) ---------- */
const idb = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open("stickframe", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  }));
  const tx = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const x = db.transaction("kv", mode), rq = fn(x.objectStore("kv"));
    x.oncomplete = () => res(rq && rq.result); x.onerror = () => rej(x.error); x.onabort = () => rej(x.error);
  }));
  return {get: k => tx("readonly", s => s.get(k)), set: (k, v) => tx("readwrite", s => s.put(v, k))};
})();

/* ---------- motion import ---------- */
function registerUserMoves() {
  for (const k of Object.keys(ACTIONS)) if (k.startsWith("u:")) delete ACTIONS[k];
  for (const m of USER_MOVES) {
    ACTIONS["u:" + m.id] = trackAction(m.track, {label: m.label, g: "mine", loop: m.loop, t0: m.t0, t1: m.t1, reps: 1, thumb: .4});
    AUTOFACE["u:" + m.id] = "neutral";
  }
  rebuildMatchers();
}
let saveTimer = 0;
function saveMoves() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => idb.set("moves", USER_MOVES).catch(() => log("This browser couldn't store your moves. They'll be gone when you close the page.")), 300);
}
function log(msg) { const el = $("impLog"); el.textContent = (msg + "\n" + el.textContent).slice(0, 4000); }
function renderMine() {
  const box = $("mine");
  if (!USER_MOVES.length) { box.innerHTML = `<p class="hint" style="margin:0">No imported moves yet. Free sources: CMU Graphics Lab Motion Capture Database (ASF/AMC, or its widely mirrored BVH conversion). Check each source’s licence before using clips in a paid product.</p>`; return; }
  box.innerHTML = `<div class="mv" style="font:500 10px var(--mono);color:var(--muted);text-transform:uppercase"><span>Name</span><span>Extra trigger words</span><span>From s</span><span>To s</span><span>Loop</span><span></span></div>` +
    USER_MOVES.map(m => `<div class="mv" data-m="${m.id}">
      <input id="mn-${m.id}" data-k="label" value="${escH(m.label)}" maxlength="40" aria-label="Move name">
      <input id="mw-${m.id}" data-k="words" value="${escH(m.words || "")}" placeholder="e.g. salsa, twirl" aria-label="Trigger words" class="opt">
      <input id="ma-${m.id}" data-k="t0" type="number" min="0" max="${m.track.dur}" step="0.1" value="${m.t0 ?? 0}" aria-label="Start second">
      <input id="mb-${m.id}" data-k="t1" type="number" min="0" max="${m.track.dur}" step="0.1" value="${m.t1 ?? m.track.dur}" aria-label="End second">
      <label class="check" style="font-size:12px"><input type="checkbox" data-k="loop" id="ml-${m.id}" ${m.loop ? "checked" : ""}> Loop</label>
      <button class="mini" data-op="delmove" aria-label="Delete move">✕</button>
    </div>`).join("");
}
$("mine").addEventListener("change", e => {
  const row = e.target.closest(".mv"); if (!row) return;
  const m = USER_MOVES.find(x => x.id === row.dataset.m), k = e.target.dataset.k; if (!m || !k) return;
  if (k === "label") m.label = e.target.value.trim() || m.label;
  else if (k === "words") m.words = e.target.value;
  else if (k === "t0" || k === "t1") m[k] = clamp(+e.target.value || 0, 0, m.track.dur);
  else if (k === "loop") m.loop = e.target.checked;
  if ((m.t1 ?? m.track.dur) - (m.t0 ?? 0) < .1) m.t1 = Math.min(m.track.dur, (m.t0 ?? 0) + .1);
  registerUserMoves(); saveMoves(); renderTabs();
  document.querySelectorAll(".chip canvas").forEach(c => thumbFor(c, c.dataset.a));
  document.querySelectorAll(".chip").forEach(c => { if (c.dataset.a === "u:" + m.id) c.lastChild.textContent !== undefined; });
  changed(false);
  if (k === "label") renderLib();
});
$("mine").addEventListener("click", e => {
  const b = e.target.closest("[data-op=delmove]"); if (!b) return;
  const id = b.closest(".mv").dataset.m;
  USER_MOVES = USER_MOVES.filter(m => m.id !== id);
  for (const bt of S.beats) bt.items = bt.items.filter(it => it.action !== "u:" + id);
  S.beats = S.beats.filter(bt => bt.items.length);
  registerUserMoves(); saveMoves(); renderLib(); changed(false);
});
const readText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(f); });
async function importFiles(fileList) {
  const files = [...fileList];
  const view = $("impView").value;
  const asfs = {}, amcs = [], bvhs = [];
  for (const f of files) {
    const n = f.name.toLowerCase();
    if (n.endsWith(".asf")) asfs[n.replace(/\.asf$/, "")] = f;
    else if (n.endsWith(".amc")) amcs.push(f);
    else if (n.endsWith(".bvh")) bvhs.push(f);
    else log(`Skipped ${f.name}: only .bvh, .asf and .amc files are supported.`);
  }
  let added = 0;
  const addTrack = (name, frames) => {
    let fr = frames;
    const maxT = 30;
    if (fr[fr.length - 1].t > maxT) { fr = fr.filter(x => x.t <= maxT); log(`${name}: longer than 30 s, kept the first 30 s. Use From/To to pick a part.`); }
    const tr = MC.extract(fr, {view, fps: 20});
    const label = name.replace(/\.(bvh|amc)$/i, "").replace(/[_]+/g, " ").trim().slice(0, 40);
    USER_MOVES.push({id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label, words: "", track: tr, t0: 0, t1: tr.dur, loop: false});
    added++;
  };
  for (const f of bvhs) {
    try { addTrack(f.name, MC.parseBVH(await readText(f))); log(`Imported ${f.name}`); }
    catch (err) { log(`${f.name}: ${err.message || err}`); }
    await new Promise(r => setTimeout(r));
  }
  const asfCache = {};
  const asfKeys = Object.keys(asfs);
  for (const f of amcs) {
    const base = f.name.toLowerCase().replace(/\.amc$/, ""), subj = base.split("_")[0];
    const key = asfs[subj] ? subj : asfs[base] ? base : (asfKeys.length === 1 ? asfKeys[0] : null);
    if (!key) { log(`${f.name}: needs its skeleton file (${subj}.asf). Select them together.`); continue; }
    try {
      asfCache[key] ||= MC.parseASF(await readText(asfs[key]));
      addTrack(f.name, MC.parseAMC(await readText(f), asfCache[key]));
      log(`Imported ${f.name}`);
    } catch (err) { log(`${f.name}: ${err.message || err}`); }
    await new Promise(r => setTimeout(r));
  }
  if (!amcs.length && asfKeys.length && !bvhs.length) log("An ASF file is only the skeleton. Add the .amc motion files with it.");
  if (added) { registerUserMoves(); saveMoves(); S.tab = "mine"; renderLib(); log(`${added} move${added > 1 ? "s" : ""} added. Rename them so your sentences can use them.`); }
}
$("files").addEventListener("change", e => { importFiles(e.target.files); e.target.value = ""; });
const drop = $("drop");
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => { if (e.dataTransfer?.files?.length) importFiles(e.dataTransfer.files); });

/* ---------- export ---------- */
let downloads = null, lastBlob = null, lastExt = "mp4";
const dlReady = Promise.resolve(downloads = {save: async ({filename, data}) => {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  if (typeof gtag === "function") gtag("event", "stickframe_download", {file_type: filename.split(".").pop()});
  return {status: "saved"};
}});
function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"])
    if (MediaRecorder.isTypeSupported(m)) return m;
  return null;
}
function status(msg, cls = "") { const el = $("status"); el.textContent = msg; el.className = "status " + cls; }
$("render").onclick = async () => {
  if (recording || !total) return;
  const mime = pickMime();
  $("out").hidden = false; $("vid").hidden = true; $("save").hidden = true;
  if (!mime || !cv.captureStream) { status("This browser can't record video from the page. Try Chrome or Edge.", "bad"); return; }
  lastExt = mime.startsWith("video/mp4") ? "mp4" : "webm";
  recording = true; setPlaying(false);
  $("render").disabled = true; $("recBadge").hidden = false;
  status(`Recording ${total.toFixed(1)} s as ${lastExt.toUpperCase()}…`);
  const stream = cv.captureStream(S.fps);
  const rec = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: 8e6});
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise(r => (rec.onstop = r));
  render(ctx, cv.width, cv.height, 0);
  rec.start(250);
  const t0 = performance.now();
  await new Promise(resolve => {
    const step = () => {
      const el = (performance.now() - t0) / 1000, tt = Math.min(el, total);
      render(ctx, cv.width, cv.height, tt);
      $("barFill").style.width = `${(tt / total) * 100}%`;
      if (el >= total + .15) resolve(); else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  rec.stop(); await done;
  stream.getTracks().forEach(tr => tr.stop());
  recording = false; $("render").disabled = false; $("recBadge").hidden = true;
  lastBlob = new Blob(chunks, {type: mime.split(";")[0]});
  const v = $("vid"); if (v.src) URL.revokeObjectURL(v.src);
  v.src = URL.createObjectURL(lastBlob); v.hidden = false;
  await dlReady;
  const mb = (lastBlob.size / 1048576).toFixed(1);
  if (downloads) { $("save").hidden = false; $("save").textContent = `Save ${lastExt.toUpperCase()} (${mb} MB)`; status(`Clip ready — ${total.toFixed(1)} s, ${FMT[S.fmt][2]}.`, "good"); }
  else status(`Clip ready (${mb} MB), but saving files isn't available in this view. Open the page in Claude to save it.`, "bad");
  t = 0; drawNow();
};
async function offer(filename, data) {
  await dlReady;
  $("out").hidden = false;
  if (!downloads) { status("Saving files isn't available in this view.", "bad"); return; }
  try { await downloads.save({filename, data}); status(`Downloaded ${filename}.`, "good"); }
  catch (err) {
    const c = err && err.code;
    if (c === "declined") status("Save cancelled.");
    else if (c === "rate_limited") status("A save prompt is already open. Finish that one first.", "bad");
    else status("Couldn't save the file here.", "bad");
  }
}
$("save").onclick = () => lastBlob && offer(`stickframe-clip.${lastExt}`, lastBlob);
$("png").onclick = () => {
  const keep = playing; setPlaying(false);
  render(ctx, cv.width, cv.height, t);
  cv.toBlob(b => { if (b) offer(`stickframe-frame-${String(Math.floor(t * S.fps)).padStart(3, "0")}.png`, b); drawNow(); setPlaying(keep); }, "image/png");
};
dlReady.then(d => { if (!d) $("png").disabled = true; });

/* ---------- CMU library ---------- */
let CMU_DATA = null, CMU_OFF = null, CMU_MAP = {}, cmuShown = 60, cmuCat = "all";
CMU_IDX.forEach((e, i) => { CMU_MAP[e[0]] = i; });
const CMU_CATS = [
  ["all", "All", null],
  ["walk", "Walk & run", /\b(walk|run|jog|stride|march|strut|limp|stagger|sneak|tiptoe|skip|hop)/],
  ["jump", "Jump & flip", /\b(jump|leap|flip|cartwheel|hop|somersault|roll|tumbl)/],
  ["dance", "Dance", /\b(danc|salsa|charleston|ballet|waltz|lindy|swing danc|breakdanc|indian danc|jive|dance)/],
  ["sport", "Sports", /\b(basketball|soccer|golf|football|baseball|tennis|box|swim|kick|throw|catch|dribbl|shoot|pitch|frisbee|bowl)/],
  ["fight", "Fight & martial arts", /\b(punch|fight|martial|kick|karate|kung|tai chi|block|sword|attack|wrestl)/],
  ["climb", "Climb & playground", /\b(climb|playground|ladder|hang|swing|monkey|ledge|rock)/],
  ["life", "Everyday", /\b(sit|stand|drink|eat|sweep|wash|wipe|open|door|pick|carry|lift|reach|chair|stool|lie|sleep|cook|clean|phone|read|brush|pour|laugh)/],
  ["act", "Acting & animals", /\b(pretend|animal|bear|monkey|chicken|dog|elephant|mime|zombie|robot|sad|happy|angry|scared|proud|shy|sneak|charact|motorcycle|airplane)/],
  ["stretch", "Stretch & balance", /\b(stretch|yoga|balanc|exercise|squat|pushup|push-up|sit-up|jumping jack|salutation|lunge|toe touch)/],
  ["gesture", "Gestures", /\b(wave|point|gesture|signal|direct|conduct|clap|bow|salute|shrug|nod|beckon|talk)/],
];
function stem(w) { return w.replace(/(ing|ed|es|s)$/, "").replace(/(.)\1$/, "$1"); }
const STOP = new Set("a an the and or to of on in at with then does do did doing is are was some his her their its up down from into for by very play plays playing perform performs performing game little bit like".split(" "));
const CMU_TOK = CMU_IDX.map(e => new Set(((e[1] || "") + " " + (e[2] || "")).toLowerCase().split(/[^a-z]+/).filter(w => w.length > 1).map(stem)));
const CMU_DTOK = CMU_IDX.map(e => new Set((e[1] || "").toLowerCase().split(/[^a-z]+/).filter(w => w.length > 1).map(stem)));
function cmuSearch(q, limit = 1e9) {
  const toks = q.toLowerCase().split(/[^a-z0-9_]+/).filter(w => w && !STOP.has(w));
  const exact = q.match(/\b(\d{1,3})_(\d{1,2})\b/);
  if (exact) { const id = exact[1].padStart(2, "0") + "_" + exact[2].padStart(2, "0"); return CMU_MAP[id] != null ? [{i: CMU_MAP[id], score: 9}] : []; }
  const st = toks.map(stem).filter(Boolean);
  if (!st.length) return [];
  const out = [];
  CMU_IDX.forEach((e, i) => {
    let m = 0, md = 0;
    for (const w of st) { if (CMU_DTOK[i].has(w)) { m++; md++; } else if (CMU_TOK[i].has(w)) m += .5; }
    if (m > 0) out.push({i, score: m / st.length + md * .01 - (e[1].length) * .0005});
  });
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}
function cmuBest(ph, strict) {
  if (!ph || !CMU_IDX.length) return null;
  const ex = ph.match(/\b(\d{1,3})_(\d{1,2})\b/);
  if (ex) { const id = ex[1].padStart(2, "0") + "_" + ex[2].padStart(2, "0"); return CMU_MAP[id] != null ? {id} : null; }
  const clean = ph.replace(/\b(left|right|slowly|quickly|fast|slow|once|twice|thrice|times?|\d+(\.\d+)?\s*(s|sec|secs|seconds?))\b/g, " ");
  for (const m of FACE_RE) m.re.lastIndex = 0;
  const words = clean.split(/[^a-z]+/).filter(w => w.length > 1 && !STOP.has(w) && !FACE_RE.some(m => m.re.test(w)));
  if (!words.length) return null;
  const r = cmuSearch(words.join(" "), 1)[0];
  if (!r || r.score < (strict ? .99 : .45)) return null;
  if (strict && CMU_DTOK[r.i].size > words.length + 1) return null;
  if (strict && words.filter(w => !STOP.has(w)).length < 2) return null;
  return {id: CMU_IDX[r.i][0]};
}
function buildCmu(k) {
  const id = k.slice(2), i = CMU_MAP[id];
  if (i == null || !CMU_DATA) return undefined;
  const e = CMU_IDX[i], n = e[3], CHN = ["torso","head","uaL","faL","uaR","faR","thL","shL","thR","shR","lift","dx"];
  let o = CMU_OFF[i];
  const ch = {};
  for (const c of CHN) { const a = new Array(n); let v = 0; for (let j = 0; j < n; j++) { v += CMU_DATA[o++]; a[j] = v; } ch[c] = a; }
  const tr = {v: 1, fps: 12, n, dur: e[4], ch};
  let name = e[1];
  if (name.split(" ").length <= 2 && e[2] && e[2].split(" ").length <= 2 && !name.toLowerCase().includes(e[2].toLowerCase())) name = `${name} (${e[2]})`;
  const label = name.length > 42 ? name.slice(0, 40) + "…" : name;
  ACTIONS[k] = trackAction(tr, {label: `${label} · ${id}`, g: "cmu", loop: false, thumb: .4});
  ACTIONS[k].dur = +Math.min(ACTIONS[k].dur, 8).toFixed(1);
  AUTOFACE[k] = "neutral";
  return ACTIONS[k];
}
async function loadCmu() {
  try {
    const bin = Uint8Array.from(atob(CMU_B64), c => c.charCodeAt(0));
    const buf = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    CMU_DATA = new Int16Array(buf);
    CMU_OFF = new Array(CMU_IDX.length); let o = 0;
    CMU_IDX.forEach((e, i) => { CMU_OFF[i] = o; o += e[3] * 12; });
    return true;
  } catch (e) { $("cmuNote").textContent = "This browser couldn't unpack the CMU library."; return false; }
}
function cmuMatches() {
  const q = $("cmuQ").value.trim();
  let list = q ? cmuSearch(q).map(r => r.i) : CMU_IDX.map((e, i) => i);
  const cat = CMU_CATS.find(c => c[0] === cmuCat);
  if (cat && cat[2]) list = list.filter(i => cat[2].test((CMU_IDX[i][1] + " " + CMU_IDX[i][2]).toLowerCase()));
  return list;
}
function renderCmu() {
  $("cmuCats").innerHTML = CMU_CATS.map(([k, lab]) => `<button data-c="${k}" aria-pressed="${k === cmuCat}">${lab}</button>`).join("");
  const list = cmuMatches();
  $("cmuCount").textContent = `${list.length.toLocaleString()} match${list.length === 1 ? "" : "es"}`;
  if (!CMU_DATA) { $("lib").hidden = false; $("lib").innerHTML = `<p class="hint">Unpacking the library…</p>`; return; }
  $("lib").hidden = false;
  $("lib").innerHTML = list.slice(0, cmuShown).map(i => { const e = CMU_IDX[i];
    return `<button class="chip cmu" data-a="c:${e[0]}" title="${escH(e[1])} — subject ${escH(e[2])}"><canvas width="96" height="96" data-a="c:${e[0]}"></canvas><span class="cl">${escH(e[1])}</span><span class="tagm">${e[0]} · ${e[4].toFixed(0)}s</span></button>`; }).join("")
    + (list.length > cmuShown ? `<button class="btn small more" id="cmuMore">Show ${Math.min(60, list.length - cmuShown)} more</button>` : "");
  document.querySelectorAll("#lib .chip canvas").forEach(c => thumbFor(c, c.dataset.a));
}
$("cmuQ").addEventListener("input", () => { cmuShown = 60; renderCmu(); });
$("cmuCats").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; cmuCat = b.dataset.c; cmuShown = 60; renderCmu(); });
$("lib").addEventListener("click", e => { if (e.target.id === "cmuMore") { e.stopPropagation(); cmuShown += 60; renderCmu(); } }, true);

/* ---------- boot ---------- */
rebuildMatchers();
setCanvasSize();
$("script").value = S.script;
renderCast(); tries(); renderScenes(); renderLib();
if (!S.beats.length) {
  const {beats} = parseScript(S.script);
  S.beats = beats.map(b => ({id: nid(), items: b.items.map(it => ({...it, id: nid()}))}));
}
compile(); renderBeats();
setPlaying(true);
requestAnimationFrame(t_ => { last = t_; tick(t_); });
(async () => {
  if (await loadCmu()) { $("cmuNote").textContent = ""; if (S.tab === "cmu") renderCmu(); changed(false); }
  try {
    const mv = await idb.get("moves");
    if (Array.isArray(mv) && mv.length) { USER_MOVES = mv; registerUserMoves(); renderLib(); changed(false); }
  } catch (e) {}
  try {
    const bg = await idb.get("bg");
    if (bg) { await loadBg(bg); renderScenes(); drawNow(); }
    else if (S.scene === "custom") { S.scene = "park"; renderScenes(); drawNow(); }
  } catch (e) { if (S.scene === "custom") { S.scene = "park"; renderScenes(); } }
})();
})();
