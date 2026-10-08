/* 완성 모습 미리보기 — 3D 도면 (웹 견적요청 페이지 전용, 2026-10-08 · 조명 종류 · 작은 이름표 2026-10-09)
   · three.js r128(three.min.js, 같은 사이트 파일)이 먼저 읽혀 있어야 한다. 페이지 보안 설정(CSP)이
     외부 스크립트를 막으므로 두 파일 모두 index.html 옆에 둔다.
   · 대표 평면 3가지(4베이 판상형) — 59 · 84 · 105㎡. 발코니 확장형("e") / 기본형("b").
   · 방마다 벽 · 바닥 · 창 재질이 따로라서 '어느 방의 어느 면'만 색을 바꿀 수 있다.
     페이지(index.html)가 체크표를 읽어 [{ id, part, color }] 목록을 넘기면 여기서 칠한다.
   · 화면은 바뀔 때만 다시 그린다(멈춰 있으면 그리지 않음 — 휴대폰 배터리).
   · 가로로 끌면 돌아가고, 세로로 밀면 페이지가 굴러간다(touch-action: pan-y). 마우스는 위아래로 기울기도 된다. */
(function () {
  "use strict";

  const T = 0.12;    // 벽 두께
  const H = 2.4;     // 벽 높이
  const DH = 2.1;    // 문 높이
  const WT = 2.1;    // 창 위 끝
  const DW = 0.9;    // 문 폭
  const BD = 1.4;    // 기본형 전면 발코니 깊이
  const EPS = 1e-6;

  /* 방: [id, 종류, x, y, 가로, 세로, 창(t·b·l·r), 문 [[변, 변 시작에서 거리]]]
     좌표는 m, 왼쪽 위가 (0, 0), 아래(y가 큰 쪽)가 전면(남향). 전면에 붙은 방은 기본형에서 발코니만큼 줄어든다.
     cuts: 벽 없이 트인 자리 [방향 h·v, 선 위치, 시작, 끝]. fx: 욕실 기구(높이만 다른 상자). */
  const PLANS = {
    "59": {
      label: "59㎡", sub: "25평형", W: 11.0, D: 8.2,
      rooms: [
        ["bath1", "bath", 0, 0, 1.7, 2.3, "", [["b", 0.2]]],
        ["entry", "entry", 1.7, 0, 1.6, 2.3, "", [["t", 0.35], ["b", 0.35]]],
        ["pantry", "pantry", 3.3, 0, 1.5, 2.3, "", [["r", 1.3]]],
        ["hall", "hall", 0, 2.3, 4.8, 1.7],
        ["utility", "utility", 4.8, 0, 3.4, 1.2, "t", [["b", 0.3]]],
        ["kitchen", "kitchen", 4.8, 1.2, 3.4, 2.8],
        ["living", "living", 4.8, 4.0, 3.4, 4.2, "b"],
        ["bath2", "bath", 8.2, 0, 2.8, 1.9, "", [["b", 1.7]]],
        ["dress", "dress", 8.2, 1.9, 2.8, 2.1, "", [["b", 0.3]]],
        ["bed2", "bed", 0, 4.0, 2.4, 4.2, "b", [["t", 1.4]]],
        ["bed1", "bed", 2.4, 4.0, 2.4, 4.2, "b", [["t", 0.3]]],
        ["master", "master", 8.2, 4.0, 2.8, 4.2, "b", [["l", 0.3]]],
      ],
      cuts: [["v", 4.8, 2.3, 4.0], ["h", 4.0, 4.8, 8.2]],
      fx: [["tub", 0, 0, 1.5, 0.7], ["wc", 1.2, 1.6], ["shw", 10.1, 0, 0.9, 0.9], ["wc", 8.4, 0], ["bas", 9.1, 0]],
      bedrooms: ["bed1", "bed2"],
    },
    "84": {
      label: "84㎡", sub: "34평형", W: 13.2, D: 9.0,
      rooms: [
        ["bath1", "bath", 0, 0, 2.0, 2.8, "", [["b", 0.2]]],
        ["entry", "entry", 2.0, 0, 1.7, 2.8, "", [["t", 0.4], ["b", 0.4]]],
        ["alpha", "alpha", 3.7, 0, 2.1, 2.8, "t", [["b", 0.6]]],
        ["hall", "hall", 0, 2.8, 5.8, 1.6],
        ["utility", "utility", 5.8, 0, 2.4, 1.4, "t", [["b", 0.3]]],
        ["pantry", "pantry", 8.2, 0, 1.6, 1.4, "", [["b", 0.35]]],
        ["kitchen", "kitchen", 5.8, 1.4, 4.0, 3.0],
        ["living", "living", 5.8, 4.4, 4.0, 4.6, "b"],
        ["bath2", "bath", 9.8, 0, 3.4, 2.0, "", [["b", 2.4]]],
        ["dress", "dress", 9.8, 2.0, 3.4, 2.4, "", [["b", 0.3]]],
        ["bed2", "bed", 0, 4.4, 3.0, 4.6, "b", [["t", 2.05]]],
        ["bed1", "bed", 3.0, 4.4, 2.8, 4.6, "b", [["t", 0.3]]],
        ["master", "master", 9.8, 4.4, 3.4, 4.6, "b", [["l", 0.3]]],
      ],
      cuts: [["v", 5.8, 2.8, 4.4], ["h", 4.4, 5.8, 9.8]],
      fx: [["tub", 0, 0, 1.5, 0.7], ["wc", 1.4, 2.1], ["shw", 12.3, 0, 0.9, 0.9], ["wc", 10.0, 0], ["bas", 10.7, 0]],
      bedrooms: ["bed1", "bed2", "alpha"],
    },
    "105": {
      label: "105㎡", sub: "40평대", W: 14.8, D: 10.2,
      rooms: [
        ["bed3", "bed", 0, 0, 3.3, 3.6, "t", [["b", 2.2]]],
        ["storage", "pantry", 3.3, 0, 1.7, 1.2, "", [["r", 0.15]]],
        ["bath1", "bath", 3.3, 1.2, 1.7, 2.4, "", [["b", 0.4]]],
        ["entry", "entry", 5.0, 0, 1.6, 3.6, "", [["t", 0.35], ["b", 0.35]]],
        ["hall", "hall", 0, 3.6, 6.6, 1.8],
        ["utility", "utility", 6.6, 0, 3.0, 1.4, "t", [["b", 0.3]]],
        ["pantry", "pantry", 9.6, 0, 1.6, 1.4, "", [["b", 0.35]]],
        ["kitchen", "kitchen", 6.6, 1.4, 4.6, 4.0],
        ["living", "living", 6.6, 5.4, 4.6, 4.8, "b"],
        ["bath2", "bath", 11.2, 0, 3.6, 2.4, "", [["b", 1.6]]],
        ["dress", "dress", 11.2, 2.4, 3.6, 3.0, "", [["b", 0.3]]],
        ["bed2", "bed", 0, 5.4, 3.3, 4.8, "b", [["t", 2.2]]],
        ["bed1", "bed", 3.3, 5.4, 3.3, 4.8, "b", [["t", 0.3]]],
        ["master", "master", 11.2, 5.4, 3.6, 4.8, "b", [["l", 0.3]]],
      ],
      cuts: [["v", 6.6, 3.6, 5.4], ["h", 5.4, 6.6, 11.2]],
      fx: [["tub", 3.3, 1.2, 0.7, 1.5], ["wc", 4.5, 1.2], ["tub", 11.2, 0, 1.5, 0.75], ["wc", 13.0, 0], ["shw", 13.9, 0, 0.9, 0.9]],
      bedrooms: ["bed1", "bed2", "bed3"],
    },
  };

  const LABELS = {
    living: "거실", kitchen: "주방", master: "안방", bed1: "방1", bed2: "방2", bed3: "방3", alpha: "알파룸",
    bath1: "화장실1", bath2: "화장실2", entry: "현관", dress: "드레스룸", pantry: "팬트리", storage: "창고",
    utility: "다용도실", balcony: "발코니", hall: "",
  };

  const FLOOR = {
    living: 0xE4DFD4, kitchen: 0xE4DFD4, hall: 0xE4DFD4, master: 0xEBE3D3, bed: 0xEBE3D3, alpha: 0xEBE3D3, dress: 0xE2DDD4,
    bath: 0xD5DEE5, entry: 0xD9D6CF, pantry: 0xDCD9D2, utility: 0xD9D6CF, balcony: 0xE9E7E1,
  };
  const WALL = 0xF4F2EC, OUTSIDE = 0xE3E0D8, CAP = 0xD3CFC5, EDGE = 0x9A988F, GLASS = 0x85B7EB, DOOR = 0xE6DFD2;
  const MIX = { wall: 0.5, floor: 0.78, window: 1, door: 0.85, light: 0.5 };
  const GLOW = 0xFFBE3D;   // 등 아래 · 간접조명 빛 번짐(더하기 섞기)
  // 조명 종류를 알 수 없을 때(세트 · 설치비 · 등기구 교체 …) 방 종류별 기본 등
  const DEFAULT_LIGHT = {
    living: "rect", kitchen: "rect", master: "square", bed: "square", alpha: "square",
    dress: "round", pantry: "round", entry: "round", bath: "round", utility: "round", balcony: "round", hall: "round",
  };
  const DOOR_OPEN = 70 * Math.PI / 180;   // 문짝은 방 안쪽으로 70° 열린 모양

  /** 평면 · 발코니 형식에 맞춘 방 목록(색칠 대상 고르기용 — WebGL 없이도 쓴다). */
  function layout(planKey, mode) {
    const P = PLANS[planKey] || PLANS["84"];
    const ext = mode !== "b";
    const rooms = P.rooms.map(r => ({
      id: r[0], kind: r[1], x: r[2], y: r[3], w: r[4], h: r[5], win: r[6] || "", doors: r[7] || [], front: false,
    }));
    if (!ext) {
      rooms.forEach(r => { if (Math.abs(r.y + r.h - P.D) < EPS) { r.h -= BD; r.front = true; } });
      rooms.push({ id: "balcony", kind: "balcony", x: 0, y: P.D - BD, w: P.W, h: BD, win: "", doors: [], front: false });
    }
    // 방마다 칠할 수 있는 면 — 창은 그 방 창(비확장이면 앞 방 · 발코니는 발코니 창), 문은 그 방에 단 문짝
    rooms.forEach(r => {
      r.parts = ["wall", "floor", "light"];
      if (r.win || r.front || r.kind === "balcony") r.parts.push("window");
      if (r.doors.length) r.parts.push("door");
    });
    return { P, ext, rooms };
  }

  // ── 구간 계산 ────────────────────────────────────────────────────────
  const lineKey = (o, c) => o + Math.round(c * 1000);
  function union(iv) {
    const s = iv.slice().sort((p, q) => p[0] - q[0]), out = [];
    for (const v of s) { const l = out[out.length - 1]; if (l && v[0] <= l[1] + EPS) l[1] = Math.max(l[1], v[1]); else out.push([v[0], v[1]]); }
    return out;
  }
  const inside = (iv, m) => iv.find(v => m > v[0] + EPS && m < v[1] - EPS);

  /** 3D 장면 데이터 — 벽 조각 · 유리 · 바닥 · 라벨 자리 (three.js와 무관한 순수 계산). */
  function geometry(planKey, mode) {
    const { P, ext, rooms } = layout(planKey, mode);
    const lines = new Map();
    const at = (o, c) => { const k = lineKey(o, c); if (!lines.has(k)) lines.set(k, { o, c, edges: [], cuts: [], doors: [], wins: [] }); return lines.get(k); };
    rooms.forEach(r => {
      at("h", r.y).edges.push({ a: r.x, b: r.x + r.w, side: 1, room: r });
      at("h", r.y + r.h).edges.push({ a: r.x, b: r.x + r.w, side: -1, room: r });
      at("v", r.x).edges.push({ a: r.y, b: r.y + r.h, side: 1, room: r });
      at("v", r.x + r.w).edges.push({ a: r.y, b: r.y + r.h, side: -1, room: r });
    });
    const wins = [];
    rooms.forEach(r => {
      for (const s of r.win) {
        const hz = s === "t" || s === "b", L = hz ? r.w : r.h;
        const wide = r.kind === "living" || r.kind === "utility" || r.kind === "kitchen";
        const len = wide ? L - 0.5 : Math.min(L * 0.72, L - 0.5);
        const sill = r.kind === "living" ? 0.1 : 0.9;
        const a = (hz ? r.x : r.y) + (L - len) / 2;
        const o = hz ? "h" : "v", c = s === "t" ? r.y : s === "b" ? r.y + r.h : s === "l" ? r.x : r.x + r.w;
        const w = { o, c, a, b: a + len, sill, owners: [r.id] };
        wins.push(w); at(o, c).wins.push(w);
      }
      r.doors.forEach(([s, of]) => {
        const hz = s === "t" || s === "b";
        const o = hz ? "h" : "v", c = s === "t" ? r.y : s === "b" ? r.y + r.h : s === "l" ? r.x : r.x + r.w;
        const a = (hz ? r.x : r.y) + of;
        at(o, c).doors.push([a, a + DW]);
      });
    });
    if (!ext) rooms.filter(r => r.front).forEach(r => {
      const w = { o: "h", c: P.D, a: r.x + 0.25, b: r.x + r.w - 0.25, sill: 0.3, owners: ["balcony", r.id] };
      wins.push(w); at("h", P.D).wins.push(w);
    });
    P.cuts.forEach(([o, c, a, b]) => at(o, c).cuts.push([a, b]));

    const pieces = [], glass = [], caps = [];
    lines.forEach(L => {
      const cover = union(L.edges.map(e => [e.a, e.b]));
      const cuts = union(L.cuts), doors = union(L.doors);
      const pts = new Set();
      L.edges.forEach(e => { pts.add(e.a); pts.add(e.b); });
      cuts.concat(doors).forEach(v => { pts.add(v[0]); pts.add(v[1]); });
      L.wins.forEach(w => { pts.add(w.a); pts.add(w.b); });
      const P2 = [...pts].sort((p, q) => p - q);
      let run = null;
      const flush = () => { if (run) { pieces.push(run); run = null; } };
      for (let i = 0; i + 1 < P2.length; i++) {
        const p = P2[i], q = P2[i + 1];
        if (q - p < EPS) continue;
        const m = (p + q) / 2;
        if (!inside(cover, m) || inside(cuts, m)) { flush(); continue; }
        const plus = L.edges.find(e => e.side === 1 && m > e.a + EPS && m < e.b - EPS);
        const minus = L.edges.find(e => e.side === -1 && m > e.a + EPS && m < e.b - EPS);
        const door = inside(doors, m);
        const win = door ? null : L.wins.find(w => m > w.a + EPS && m < w.b - EPS);
        const type = door ? "door" : win ? "win" : "full";
        const sig = [plus ? plus.room.id : "-", minus ? minus.room.id : "-", type, win ? wins.indexOf(win) : -1].join("|");
        if (run && run.sig === sig && Math.abs(run.b - p) < EPS) { run.b = q; continue; }
        flush();
        run = { sig, o: L.o, c: L.c, a: p, b: q, type, win, plus: plus ? plus.room : null, minus: minus ? minus.room : null, cover };
      }
      flush();
      // 위 마구리(벽 윗면) — 트인 자리만 빼고 선 전체
      cover.forEach(([a, b]) => {
        let segs = [[a, b]];
        cuts.forEach(([c1, c2]) => {
          const n = [];
          segs.forEach(([s1, s2]) => {
            if (c2 <= s1 + EPS || c1 >= s2 - EPS) { n.push([s1, s2]); return; }
            if (c1 > s1 + EPS) n.push([s1, c1]);
            if (c2 < s2 - EPS) n.push([c2, s2]);
          });
          segs = n;
        });
        segs.forEach(([s1, s2]) => caps.push({ o: L.o, c: L.c, a: s1 - T / 2, b: s2 + T / 2 }));
      });
    });
    // 조각 → 높이별 상자. 선 덮임의 끝(모서리)만 벽 두께 반만큼 늘려 모서리를 메운다.
    const boxes = [];
    pieces.forEach(pc => {
      const atEnd = v => pc.cover.some(cv => Math.abs(cv[0] - v) < EPS || Math.abs(cv[1] - v) < EPS);
      const ea = atEnd(pc.a) ? T / 2 : 0, eb = atEnd(pc.b) ? T / 2 : 0;
      const base = { o: pc.o, c: pc.c, plus: pc.plus, minus: pc.minus };
      if (pc.type === "full") boxes.push(Object.assign({ a: pc.a - ea, b: pc.b + eb, y0: 0, y1: H }, base));
      else if (pc.type === "door") boxes.push(Object.assign({ a: pc.a, b: pc.b, y0: DH, y1: H }, base));
      else {
        boxes.push(Object.assign({ a: pc.a, b: pc.b, y0: 0, y1: pc.win.sill }, base));
        boxes.push(Object.assign({ a: pc.a, b: pc.b, y0: WT, y1: H }, base));
        glass.push({ o: pc.o, c: pc.c, a: pc.a, b: pc.b, y0: pc.win.sill, y1: WT, win: wins.indexOf(pc.win) });
      }
    });
    return { P, ext, rooms, boxes, glass, caps, wins };
  }

  // ── three.js 장면 ────────────────────────────────────────────────────
  function create(stage, opts) {
    const THREE = window.THREE;
    if (!THREE) throw new Error("three.js 없음");
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true }) || canvas.getContext("experimental-webgl");
    if (!gl) throw new Error("WebGL 없음");
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    canvas.className = "room3d-canvas";
    canvas.setAttribute("aria-hidden", "true");
    stage.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
    scene.add(new THREE.AmbientLight(0xffffff, 0.74));
    const sun = new THREE.DirectionalLight(0xffffff, 0.46); sun.position.set(-5, 12, 9); scene.add(sun);
    const root = new THREE.Group(); scene.add(root);
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");

    let plan = String((opts && opts.plan) || "84"), mode = (opts && opts.mode) === "b" ? "b" : "e";
    let yaw = -0.5, tilt = 0.98, dist = 20, W = 13, D = 9;
    // 지금 공간으로 시점 옮기기 — 바라보는 점(fx, fz)과 거리 배율(fk)이 목표(goal)로 천천히 다가간다
    let fx = 0, fz = 0, fk = 1, goal = { x: 0, z: 0, k: 1 }, focusIds = null, curRooms = [];
    let activeIds = new Set();   // 이름표를 강조할 방(지금 공간)
    let surfaces = new Map();     // "id:part" → { mats:[], base:[Color], kind:"wall|floor|window", hl:Color|null, t0, wait }
    let labelSprites = new Map(); // id → { sprite, text, pos }
    let labelText = {};
    let wanted = new Map();       // "id:part" → color (마지막으로 받은 목록)
    let lightKinds = new Map();   // id → ["round" · "square" · "rect" · "down" · "cove" · "pendant" · "auto"] (페이지가 상품 이름으로 고름)
    let lightObjs = new Map();    // id → { sig, objs } 지금 그려 둔 등
    let lightGroup = null, cutsNow = [];
    let raf = 0, labelH = 0.05;
    const disposables = [];

    function gradTex(w, h, radial) {
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      const c = cv.getContext("2d");
      const g = radial ? c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2) : c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(radial ? 0.35 : 0.12, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
      return t;
    }
    const glowTex = gradTex(128, 128, true), washTex = gradTex(4, 64, false);
    const edgeMat = new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.55 });
    const capMat = new THREE.MeshLambertMaterial({ color: CAP });
    const outMat = new THREE.MeshLambertMaterial({ color: OUTSIDE });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

    function surface(id, part, factory) {
      const k = id + ":" + part;
      if (!surfaces.has(k)) surfaces.set(k, { mats: [], base: [], part, hl: null, t0: 0, wait: false });
      const s = surfaces.get(k);
      const m = factory(); s.mats.push(m); s.base.push(m.color.clone()); disposables.push(m);
      return m;
    }
    const wallMats = new Map(), floorMats = new Map(), glassMats = new Map();
    function wallMat(room) {
      if (!room) return outMat;
      if (!wallMats.has(room.id)) wallMats.set(room.id, surface(room.id, "wall", () => new THREE.MeshLambertMaterial({ color: WALL })));
      return wallMats.get(room.id);
    }

    function add(geo, mat, x, y, z, edges) {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); root.add(m); disposables.push(geo);
      if (edges) { const eg = new THREE.EdgesGeometry(geo); const e = new THREE.LineSegments(eg, edgeMat); e.position.copy(m.position); root.add(e); disposables.push(eg); }
      return m;
    }

    function clear() {
      while (root.children.length) root.remove(root.children[0]);
      disposables.splice(0).forEach(d => d.dispose && d.dispose());
      labelSprites.forEach(l => { if (l.sprite) { l.sprite.material.map.dispose(); l.sprite.material.dispose(); } });
      lightObjs.forEach(o => o.objs.forEach(m => { m.geometry.dispose(); m.material.dispose(); }));
      surfaces = new Map(); labelSprites = new Map(); lightObjs = new Map(); lightGroup = null;
      wallMats.clear(); floorMats.clear(); glassMats.clear();
    }

    function build() {
      clear();
      const g = geometry(plan, mode);
      W = g.P.W; D = g.P.D; curRooms = g.rooms; cutsNow = g.P.cuts;
      const X = x => x - W / 2, Z = y => y - D / 2;
      // 바닥
      g.rooms.forEach(r => {
        const m = surface(r.id, "floor", () => new THREE.MeshLambertMaterial({ color: FLOOR[r.kind] || 0xE4DFD4 }));
        floorMats.set(r.id, m);
        add(new THREE.BoxGeometry(r.w, 0.06, r.h), m, X(r.x + r.w / 2), 0.03, Z(r.y + r.h / 2), false);
      });
      // 벽 — 상자 면 순서 [+x, -x, +y, -y, +z, -z]. 방 쪽 면은 그 방 재질(칠할 수 있음), 바깥은 외벽색.
      g.boxes.forEach(b => {
        const L = b.b - b.a, h = b.y1 - b.y0, mid = (b.a + b.b) / 2, ym = (b.y0 + b.y1) / 2;
        if (L < EPS || h < EPS) return;
        if (b.o === "h") add(new THREE.BoxGeometry(L, h, T), [capMat, capMat, capMat, capMat, wallMat(b.plus), wallMat(b.minus)], X(mid), ym, Z(b.c), true);
        else add(new THREE.BoxGeometry(T, h, L), [wallMat(b.plus), wallMat(b.minus), capMat, capMat, capMat, capMat], X(b.c), ym, Z(mid), true);
      });
      // 위 마구리(벽 윗면) — 조각 사이 이음이 안 보이게 한 장으로 덮는다
      g.caps.forEach(c => {
        const L = c.b - c.a, mid = (c.a + c.b) / 2;
        if (c.o === "h") add(new THREE.BoxGeometry(L, 0.004, T), capMat, X(mid), H + 0.002, Z(c.c), false);
        else add(new THREE.BoxGeometry(T, 0.004, L), capMat, X(c.c), H + 0.002, Z(mid), false);
      });
      // 유리 — 창마다 재질 하나, 그 창을 가진 방(기본형 발코니 창은 앞 방도)에 등록
      g.wins.forEach((w, i) => {
        const mats = w.owners.map(id => surface(id, "window", () => new THREE.MeshLambertMaterial({ color: GLASS, transparent: true, opacity: 0.42, depthWrite: false })));
        glassMats.set(i, mats);
      });
      g.glass.forEach(gl2 => {
        const mats = glassMats.get(gl2.win); if (!mats) return;
        const L = gl2.b - gl2.a, h = gl2.y1 - gl2.y0, mid = (gl2.a + gl2.b) / 2, ym = (gl2.y0 + gl2.y1) / 2;
        mats.forEach((m, j) => {
          const off = j * 0.012;   // 같은 자리 두 장(발코니 창 = 발코니 + 앞 방)은 조금 띄운다
          if (gl2.o === "h") add(new THREE.BoxGeometry(L, h, 0.02), m, X(mid), ym, Z(gl2.c) + off, false);
          else add(new THREE.BoxGeometry(0.02, h, L), m, X(gl2.c) + off, ym, Z(mid), false);
        });
      });
      // 문짝 — 문을 단 방의 재질(칠할 수 있음). 경첩은 문 자리 시작, 방 안쪽으로 열림.
      g.rooms.forEach(r => r.doors.forEach(([sd, of]) => {
        const hz = sd === "t" || sd === "b";
        const hx = hz ? r.x + of : (sd === "l" ? r.x : r.x + r.w);
        const hy = hz ? (sd === "t" ? r.y : r.y + r.h) : r.y + of;
        const c = Math.cos(DOOR_OPEN), s2 = Math.sin(DOOR_OPEN);
        const d = sd === "t" ? [c, s2] : sd === "b" ? [c, -s2] : sd === "l" ? [s2, c] : [-s2, c];
        const L = DW - 0.06;
        const m = surface(r.id, "door", () => new THREE.MeshLambertMaterial({ color: DOOR }));
        const mesh = add(new THREE.BoxGeometry(L, DH - 0.03, 0.04), m, X(hx + d[0] * L / 2), (DH - 0.03) / 2, Z(hy + d[1] * L / 2), true);
        const rot = Math.atan2(-d[1], d[0]);
        mesh.rotation.y = rot;
        root.children[root.children.length - 1].rotation.y = rot;   // 테두리 선도 같이
      }));
      // 조명 — 고른 방에만 그 종류의 등을 천장 높이에 그린다(syncLights). 천장 판은 그리지 않는다(위에서 들여다보는 도면).
      lightGroup = new THREE.Group(); root.add(lightGroup);
      // 욕실 기구(흰 상자)
      g.P.fx.forEach(f => {
        const t = f[0];
        if (t === "tub") add(new THREE.BoxGeometry(f[3], 0.55, f[4]), whiteMat, X(f[1] + f[3] / 2), 0.275, Z(f[2] + f[4] / 2), true);
        else if (t === "shw") add(new THREE.BoxGeometry(f[3], 0.05, f[4]), whiteMat, X(f[1] + f[3] / 2), 0.085, Z(f[2] + f[4] / 2), true);
        else if (t === "wc") add(new THREE.BoxGeometry(0.45, 0.42, 0.7), whiteMat, X(f[1] + 0.225), 0.21, Z(f[2] + 0.35), true);
        else if (t === "bas") add(new THREE.BoxGeometry(0.5, 0.8, 0.4), whiteMat, X(f[1] + 0.25), 0.4, Z(f[2] + 0.2), true);
      });
      // 라벨 자리
      g.rooms.forEach(r => {
        const pos = new THREE.Vector3(X(r.x + r.w / 2), 0.12, Z(r.y + r.h / 2));
        labelSprites.set(r.id, { sprite: null, text: null, pos });
      });
      applyLabels();
      applyWanted(false, false);
      goal = focusGoal(focusIds); fx = goal.x; fz = goal.z; fk = goal.k;   // 평면이 바뀌면 같은 공간 쪽으로 바로
      fit();
    }
    function focusGoal(ids) {
      const rs = ids ? curRooms.filter(r => ids.includes(r.id)) : [];
      if (!rs.length) return { x: 0, z: 0, k: 1 };
      const x0 = Math.min(...rs.map(r => r.x)), x1 = Math.max(...rs.map(r => r.x + r.w));
      const y0 = Math.min(...rs.map(r => r.y)), y1 = Math.max(...rs.map(r => r.y + r.h));
      const size = Math.max(x1 - x0, y1 - y0) / Math.max(W, D);
      return { x: (x0 + x1) / 2 - W / 2, z: (y0 + y1) / 2 - D / 2, k: Math.min(1, Math.max(0.62, 0.5 + size * 0.6)) };
    }

    // ── 라벨(방 이름) — 글자는 캔버스에 그리므로 HTML로 해석되지 않는다 ──
    function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    // 글자 칸: 높이 64 중 알약 60 · 글자 38 → 화면에서 알약 약 15~17px, 글자 약 9.5~10.5px(fit에서 정함)
    const LABEL_FONT = "600 38px -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', sans-serif";
    function makeLabel(text, active) {
      const cv = document.createElement("canvas"), ch = 64;
      let c = cv.getContext("2d"); c.font = LABEL_FONT;
      cv.width = Math.min(480, Math.ceil(c.measureText(text).width) + 40); cv.height = ch;
      c = cv.getContext("2d"); c.font = LABEL_FONT;   // 크기를 바꾸면 글꼴이 초기화된다
      c.fillStyle = active ? "rgba(0,113,227,0.96)" : "rgba(255,255,255,0.78)"; roundRect(c, 2, 2, cv.width - 4, ch - 4, (ch - 4) / 2); c.fill();
      if (!active) { c.strokeStyle = "rgba(0,0,0,0.10)"; c.lineWidth = 2; c.stroke(); }
      c.fillStyle = active ? "#FFFFFF" : "#1D1D1F"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, cv.width / 2, ch / 2 + 1);
      const tex = new THREE.CanvasTexture(cv);
      tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;   // 2의 거듭제곱이 아닌 크기 그대로(줄여 흐려지지 않게)
      // 화면에서 늘 같은 크기(멀어져도 작아지지 않게) — 높이는 fit()이 화면 높이로 정한다.
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, sizeAttenuation: false }));
      sp.userData.aspect = cv.width / ch;
      sp.scale.set(labelH * sp.userData.aspect, labelH, 1); sp.renderOrder = 10;
      return sp;
    }
    function applyLabels() {
      labelSprites.forEach((l, id) => {
        const text = Object.prototype.hasOwnProperty.call(labelText, id) ? labelText[id] : (LABELS[id] || "");
        const act = activeIds.has(id);
        if (l.text === text && l.act === act) return;
        if (l.sprite) { root.remove(l.sprite); l.sprite.material.map.dispose(); l.sprite.material.dispose(); l.sprite = null; }
        l.text = text; l.act = act;
        if (text) { l.sprite = makeLabel(text, act); l.sprite.position.copy(l.pos); if (act) l.sprite.renderOrder = 11; root.add(l.sprite); }
      });
    }

    // ── 칠하기 ─────────────────────────────────────────────────────────
    function paint(s, a) {
      s.mats.forEach((m, i) => {
        const base = s.base[i];
        if (!s.hl || a <= 0) {
          m.color.copy(base);
          if (s.part === "window") m.opacity = 0.42;
          if (s.part === "light") { m.opacity = 0; m.visible = false; }
          return;
        }
        if (s.part === "light") {
          m.visible = true; m.opacity = m.userData.op * a;
          if (!m.userData.keep) m.color.copy(base).lerp(s.hl, MIX.light * a);
          return;
        }
        m.color.copy(base).lerp(s.hl, MIX[s.part] * a);
        if (s.part === "window") m.opacity = 0.42 + 0.46 * a;
      });
    }
    // 새로 칠한 면: 0.4초 동안 나타난 뒤 천천히 두 번 깜빡이고 그대로 남는다.
    function level(t) {
      if (t < 0.4) return t / 0.4;
      if (t < 2.0) return 1 - 0.62 * (0.5 - 0.5 * Math.cos(2 * Math.PI * (t - 0.4) / 0.8));
      return 1;
    }
    // ── 조명 ─────────────────────────────────────────────────────────────
    // 칠할 목록에 그 방 조명이 있으면 고른 종류(없으면 방 종류별 기본)의 등을 만든다. 종류가 바뀐 방만 다시 만든다.
    function lightMat(id, mat, op, keep) {
      const k = id + ":light";
      if (!surfaces.has(k)) surfaces.set(k, { mats: [], base: [], part: "light", hl: null, t0: 0, wait: false });
      const s = surfaces.get(k);
      mat.userData.op = op; mat.userData.keep = !!keep; mat.visible = false;
      s.mats.push(mat); s.base.push(mat.color.clone());
      return mat;
    }
    function dropLight(id) {
      const o = lightObjs.get(id);
      if (!o) return;
      o.objs.forEach(m => { if (lightGroup) lightGroup.remove(m); m.geometry.dispose(); m.material.dispose(); });
      lightObjs.delete(id); surfaces.delete(id + ":light");
    }
    function syncLights() {
      if (!lightGroup) return;
      curRooms.forEach(r => {
        const sig = wanted.has(r.id + ":light") ? (lightKinds.get(r.id) || ["auto"]).join(",") : "";
        const o = lightObjs.get(r.id);
        if ((o ? o.sig : "") === sig) return;
        dropLight(r.id);
        if (sig) buildLight(r, sig);
      });
    }
    // 벽이 없는 쪽(거실 · 주방처럼 트인 곳)에는 벽 빛을 그리지 않는다
    function openSide(o, c, a, b) {
      return cutsNow.some(([co, cc, ca, cb]) => co === o && Math.abs(cc - c) < 0.01 && Math.min(b, cb) - Math.max(a, ca) > 0.5 * (b - a));
    }
    function buildLight(r, sig) {
      const objs = [], X = x => x - W / 2, Z = y => y - D / 2;
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, short = Math.min(r.w, r.h), alongX = r.w >= r.h;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const basic = (color, op, keep, extra) => lightMat(r.id, new THREE.MeshBasicMaterial(Object.assign({ color, transparent: true, opacity: 0, depthWrite: false }, extra || {})), op, keep);
      const fixture = () => basic(0xFFFFFF, 0.97, false);
      const glow = (op, map) => basic(GLOW, op, true, { map: map || glowTex, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const put = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(X(x), y, Z(z)); m.renderOrder = 3; lightGroup.add(m); objs.push(m); return m; };
      const pool = (x, z, rad, op) => { put(new THREE.PlaneGeometry(rad * 2, rad * 2), glow(op), x, 0.075, z).rotation.x = -Math.PI / 2; };
      const kinds = new Set(sig.split(",").map(k => k === "auto" ? (DEFAULT_LIGHT[r.kind] || "round") : k));
      kinds.forEach(k => {
        if (k === "round") {
          const rad = clamp(short * 0.13, 0.17, 0.3);
          put(new THREE.CylinderGeometry(rad, rad, 0.05, 28), fixture(), cx, H - 0.06, cy);
          pool(cx, cy, clamp(short * 0.42, 0.7, 1.6), 0.28);
        } else if (k === "square" || k === "rect") {
          // 사각 방등 / 직사각(거실등 · 주방등) — 긴 쪽을 방의 긴 쪽에 맞춘다
          let a, b;
          if (k === "square") a = b = clamp(short * 0.2, 0.42, 0.6);
          else if (r.kind === "living") { a = 1.2; b = 0.7; } else if (r.kind === "kitchen") { a = 1.0; b = 0.4; } else { a = 0.7; b = 0.5; }
          a = Math.min(a, Math.max(r.w, r.h) * 0.45); b = Math.min(b, short * 0.45);
          put(alongX ? new THREE.BoxGeometry(a, 0.05, b) : new THREE.BoxGeometry(b, 0.05, a), fixture(), cx, H - 0.06, cy);
          pool(cx, cy, clamp(short * (k === "rect" ? 0.48 : 0.42), 0.75, 2.0), 0.3);
        } else if (k === "down") {
          // 다운라이트 — 방 크기에 따라 격자(최대 8개), 등마다 작은 빛 번짐
          let nx = clamp(Math.round((r.w - 0.6) / 1.1), 1, 4), nz = clamp(Math.round((r.h - 0.6) / 1.1), 1, 4);
          while (nx * nz > 8) { if (nx >= nz) nx--; else nz--; }
          if (nx * nz < 2) { if (alongX) nx = 2; else nz = 2; }
          for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
            const x = r.x + r.w * (i + 0.5) / nx, z = r.y + r.h * (j + 0.5) / nz;
            put(new THREE.CylinderGeometry(0.095, 0.095, 0.02, 16), fixture(), x, H - 0.03, z);
            pool(x, z, 0.55, 0.2);
          }
        } else if (k === "cove") {
          // 간접조명 — 천장 가장자리 빛 줄 + 벽 위쪽이 밝아짐(트인 쪽은 줄만)
          const e = T / 2 + 0.12, f = T / 2 + 0.012, hh = 0.75, ym = H - 0.02 - hh / 2;
          put(new THREE.BoxGeometry(r.w - 2 * e, 0.03, 0.05), fixture(), cx, H - 0.04, r.y + e);
          put(new THREE.BoxGeometry(r.w - 2 * e, 0.03, 0.05), fixture(), cx, H - 0.04, r.y + r.h - e);
          put(new THREE.BoxGeometry(0.05, 0.03, r.h - 2 * e), fixture(), r.x + e, H - 0.04, cy);
          put(new THREE.BoxGeometry(0.05, 0.03, r.h - 2 * e), fixture(), r.x + r.w - e, H - 0.04, cy);
          const wash = (len, x, z, ry) => { put(new THREE.PlaneGeometry(len, hh), glow(0.7, washTex), x, ym, z).rotation.y = ry; };
          if (!openSide("h", r.y, r.x, r.x + r.w)) wash(r.w - 2 * f, cx, r.y + f, 0);
          if (!openSide("h", r.y + r.h, r.x, r.x + r.w)) wash(r.w - 2 * f, cx, r.y + r.h - f, Math.PI);
          if (!openSide("v", r.x, r.y, r.y + r.h)) wash(r.h - 2 * f, r.x + f, cy, Math.PI / 2);
          if (!openSide("v", r.x + r.w, r.y, r.y + r.h)) wash(r.h - 2 * f, r.x + r.w - f, cy, -Math.PI / 2);
        } else if (k === "pendant") {
          // 펜던트 — 줄에 매달린 갓. 주방은 식탁 자리(앞쪽)에 두 개.
          const two = r.kind === "kitchen", py = two ? r.y + r.h * 0.62 : cy;
          (two ? [-0.35, 0.35] : [0]).forEach(d => {
            const x = alongX ? cx + d : cx, z = alongX ? py : py + d;
            put(new THREE.CylinderGeometry(0.008, 0.008, 0.55, 6), basic(0x6B6B6B, 0.9, true), x, H - 0.275, z);
            put(new THREE.CylinderGeometry(0.07, 0.2, 0.17, 24), fixture(), x, H - 0.635, z);
            pool(x, z, 0.75, 0.28);
          });
        }
      });
      lightObjs.set(r.id, { sig, objs });
    }

    function applyWanted(animate, defer) {
      syncLights();
      const now = performance.now() / 1000;
      surfaces.forEach((s, k) => {
        const want = wanted.get(k);
        if (!want) { s.hl = null; s.wait = false; s.t0 = 0; paint(s, 0); return; }
        const col = new THREE.Color(want);
        const isNew = !s.hl || !s.hl.equals(col);
        s.hl = col;
        if (!isNew) { if (!s.wait && !s.t0) paint(s, 1); return; }
        if (!animate || (reduce && reduce.matches)) { s.wait = false; s.t0 = 0; paint(s, 1); }
        else if (defer) { s.wait = true; s.t0 = 0; paint(s, 0); }
        else { s.wait = false; s.t0 = now; paint(s, 0); }
      });
      invalidate();
    }

    // ── 시점 · 그리기 ───────────────────────────────────────────────────
    function fit() {
      const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const v = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
      const rad = 0.5 * Math.hypot(W, D);
      dist = rad / Math.sin(Math.min(v, hf) / 2) * (camera.aspect >= 1 ? 0.86 : 0.98) + 1.2;   // 세로로 긴 칸은 옆이 잘리지 않게
      // 라벨 높이(CSS px) → 스프라이트 크기: 화면 높이의 px만큼(작은 화면은 조금 작게)
      const px = h < 330 ? 16 : 18;
      labelH = px * 2 * Math.tan(v / 2) / h;
      labelSprites.forEach(l => { if (l.sprite) l.sprite.scale.set(labelH * l.sprite.userData.aspect, labelH, 1); });
      place();
    }
    function aim() {
      const d = dist * fk;
      camera.position.set(fx + d * Math.cos(tilt) * Math.sin(yaw), 0.6 + d * Math.sin(tilt), fz + d * Math.cos(tilt) * Math.cos(yaw));
      camera.lookAt(fx, 0.5, fz + 0.25 * fk);
    }
    function place() { aim(); invalidate(); }
    function invalidate() { if (!raf) raf = requestAnimationFrame(frame); }
    function frame() {
      raf = 0;
      const now = performance.now() / 1000;
      let busy = false;
      const dx = goal.x - fx, dz = goal.z - fz, dk = goal.k - fk;
      if (Math.abs(dx) + Math.abs(dz) + Math.abs(dk) > 0.004) { fx += dx * 0.14; fz += dz * 0.14; fk += dk * 0.14; aim(); busy = true; }
      else if (dx || dz || dk) { fx = goal.x; fz = goal.z; fk = goal.k; aim(); }
      surfaces.forEach(s => {
        if (!s.hl || s.wait || !s.t0) return;
        const t = now - s.t0;
        if (t >= 2.0) { s.t0 = 0; paint(s, 1); } else { paint(s, level(t)); busy = true; }
      });
      renderer.render(scene, camera);
      if (busy) invalidate();
    }

    // ── 끌어서 돌리기 ───────────────────────────────────────────────────
    let drag = null;
    const down = e => {
      if (e.button !== undefined && e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw, tilt, mouse: e.pointerType === "mouse" };
      stage.classList.add("drag");
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    };
    const move = e => {
      if (!drag || e.pointerId !== drag.id) return;
      yaw = drag.yaw - (e.clientX - drag.x) * 0.008;
      if (drag.mouse) tilt = Math.min(1.45, Math.max(0.45, drag.tilt + (e.clientY - drag.y) * 0.005));
      place();
    };
    const up = e => { if (drag && e.pointerId === drag.id) { drag = null; stage.classList.remove("drag"); } };
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    const ro = window.ResizeObserver ? new ResizeObserver(() => fit()) : null;
    if (ro) ro.observe(stage); else window.addEventListener("resize", fit);

    build();

    return {
      /** 평면(59 · 84 · 105)과 발코니 형식(e 확장 · b 기본)을 바꾼다 — 칠은 그대로 옮겨 간다(움직임 없이). */
      setPlan(p, m) {
        p = PLANS[p] ? String(p) : plan; m = m === "b" ? "b" : "e";
        if (p === plan && m === mode) return;
        plan = p; mode = m; build();
      },
      /** list: [{ id, part:"wall|floor|window", color:"#RRGGBB" }] — 같은 면은 뒤쪽이 이긴다.
          defer: 상품 팝업이 열려 있으면 색을 미뤘다가 play()에서 보인다. */
      setHighlights(list, o) {
        wanted = new Map();
        (list || []).forEach(h => wanted.set(h.id + ":" + h.part, h.color));
        applyWanted(!(o && o.animate === false), !!(o && o.defer));
      },
      play() {
        const now = performance.now() / 1000;
        surfaces.forEach(s => { if (s.wait) { s.wait = false; s.t0 = (reduce && reduce.matches) ? 0 : now; paint(s, s.t0 ? 0 : 1); } });
        invalidate();
      },
      /** 지금 공간 쪽으로 시점을 천천히 옮긴다(ids = 방 id 목록, 없으면 집 전체). 끌어서 돌린 방향은 그대로. */
      focus(ids) {
        focusIds = ids && ids.length ? ids.slice() : null;
        goal = focusGoal(focusIds);
        if (reduce && reduce.matches) { fx = goal.x; fz = goal.z; fk = goal.k; }
        place();
      },
      /** 이름표를 파랗게 강조할 방(지금 공간). */
      setActive(ids) { activeIds = new Set(ids || []); applyLabels(); invalidate(); },
      /** 방금 고른 공사가 들어가는 자리를 다시 깜빡인다(이미 칠한 면도). list: [{ id, part }] */
      blink(list) {
        if (reduce && reduce.matches) return;
        const now = performance.now() / 1000;
        (list || []).forEach(h => { const s = surfaces.get(h.id + ":" + h.part); if (s && s.hl) { s.wait = false; s.t0 = now; } });
        invalidate();
      },
      /** 방 id → 등 종류 목록(round · square · rect · down · cove · pendant · auto). 그 방 조명이 칠할 목록에 있을 때만 그린다. */
      setLights(map) {
        lightKinds = new Map(Object.entries(map || {}).map(([id, ks]) => [id, [...new Set(ks)].sort()]));
        applyWanted(true, false);
      },
      /** id → 이름(방 라벨). 빈 글자면 라벨을 숨긴다. 없는 id는 기본 이름. */
      setLabels(map) { labelText = Object.assign({}, map || {}); applyLabels(); invalidate(); },
      resetView() { yaw = -0.5; tilt = 0.98; place(); },
      dispose() {
        if (raf) cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener("resize", fit);
        clear(); [edgeMat, capMat, outMat, whiteMat, glowTex, washTex].forEach(m => m.dispose());
        renderer.dispose(); canvas.remove();
      },
    };
  }

  window.Room3D = {
    PLANS: Object.keys(PLANS).reduce((o, k) => { o[k] = { label: PLANS[k].label, sub: PLANS[k].sub, bedrooms: PLANS[k].bedrooms.slice() }; return o; }, {}),
    LABELS,
    DEFAULT_LIGHT: Object.assign({}, DEFAULT_LIGHT),
    /** 방 목록 [{ id, kind }] — WebGL 없이도 쓴다(무엇을 칠할지 고르기). */
    rooms(planKey, mode) { return layout(planKey, mode).rooms.map(r => ({ id: r.id, kind: r.kind, parts: r.parts.slice() })); },
    create,
  };
})();
