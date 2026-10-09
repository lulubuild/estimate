/* 완성 모습 미리보기 — 3D 도면 (웹 견적요청 페이지 전용, 2026-10-08 · 조명 종류 · 작은 이름표 · 실제 도면 4종 · 상품 고르면 가구 · 창틀 · 상하좌우 돌려 보기 2026-10-09)
   · three.js r128(three.min.js, 같은 사이트 파일)이 먼저 읽혀 있어야 한다. 페이지 보안 설정(CSP)이
     외부 스크립트를 막으므로 두 파일 모두 index.html 옆에 둔다.
   · 평면 4가지 — 사장님이 주신 실제 도면 78 · 79 · 86 · 109㎡(그림 그대로, 2026-10-09). 예전 대표 평면(59 · 84 · 105)은 뺐다.
   · 방마다 벽 · 바닥 · 창 재질이 따로라서 '어느 방의 어느 면'만 색을 바꿀 수 있다.
     페이지(index.html)가 체크표를 읽어 [{ id, part, color }] 목록을 넘기면 여기서 칠한다.
   · 화면은 바뀔 때만 다시 그린다(멈춰 있으면 그리지 않음 — 휴대폰 배터리).
   · 손가락 · 마우스로 끄는 방향 그대로 돌아간다 — 좌우는 한 바퀴, 위아래는 바로 위에서 내려다보기 ~ 거의 옆에서 보기(사용자 결정 2026-10-09).
     도면 칸 위에서는 페이지가 굴러가지 않는다(touch-action: none). 어느 각도든 평면 전체가 화면에 들도록 거리를 그때그때 맞춘다. */
(function () {
  "use strict";

  const T = 0.12;    // 벽 두께
  // 벽 · 문 · 창 · 가구 모두 실제 높이(벽 절반 높이는 되돌림 — 사용자 결정 2026-10-09). 방 안은 위에서 내려다보도록 돌려 본다.
  const H = 2.4;     // 벽 높이 — 천장 조명도 이 높이
  const DH = 2.1;    // 문 높이(문 위는 인방 벽)
  const WT = 2.1;    // 창 위 끝 — 창은 흰 창틀로 테를 두른다
  const FW = 0.05, FD = 0.07;   // 창틀 굵기 · 두께
  const FIT_TOP = H;     // 화면 맞춤에 넣는 높이
  const TILT_MIN = 0.12, TILT_MAX = 1.5;   // 위아래로 돌리는 범위(라디안) — 거의 옆에서(약 7°) ~ 거의 바로 위에서(약 86°)
  const DW = 0.9;    // 문 폭
  const EPS = 1e-6;

  /* 방: [id, 종류, x, y, 가로, 세로, 창(t·b·l·r), 문 [[변, 변 시작에서 거리]], 덧붙은 칸 [[x, y, 가로, 세로, 창, 문], …]]
     덧붙은 칸 = ㄱ자 방처럼 사각형 여러 개로 된 방(같은 방 칸 사이에는 벽이 없다). solids: 설비 칸(PS · AD) — 속이 찬 기둥.
     furn: 방마다 가구 자리 — 고른 상품이 있을 때만 그린다(사용자 결정 2026-10-09: 기본 가구는 모두 지움).
       wc · bas [가운데 x, y, 향한 쪽 t·b·l·r] · tub · shw [x, y, 가로, 세로] · sink [[x, y, 가로, 세로, 벽 쪽], …](순서대로 길이를 채움)
       hood [x, y] · wardrobe · shoe [x, y, 가로, 세로, 벽 쪽]. 없으면 방 크기로 기본 자리.
     좌표는 m, 왼쪽 위가 (0, 0), 아래(y가 큰 쪽)가 전면(남향).
     cuts: 벽 없이 트인 자리 [방향 h·v, 선 위치, 시작, 끝]. fx: 욕실 기구(높이만 다른 상자). */
  const PLANS = {
    // 실제 도면(사장님 제공 78㎡ 타입 · 2026-10-09) — 그림 그대로(확장 · 비확장 전환 없음). 치수가 없어 실내 면적에 맞춘 비율.
    "78": {
      label: "78㎡", sub: "24평형", W: 7.93, D: 10.65,
      rooms: [
        ["balcony2", "balcony", 0.0, 0.0, 2.4, 1.57, "t", []],
        ["balcony3", "balcony", 3.12, 0.0, 4.81, 1.57, "t", []],
        ["bed2", "bed", 0.0, 1.57, 2.4, 3.05, "t", [["b", 1.45]]],
        ["kitchen", "kitchen", 3.12, 1.57, 2.02, 3.05, "t", [], [[2.4, 1.57, 0.72, 2.5, "", []], [1.28, 4.62, 3.86, 1.46, "", []]]],
        ["bed1", "bed", 5.14, 1.57, 2.79, 2.76, "t", [["l", 1.81]]],
        ["bath1", "bath", 5.14, 4.33, 2.34, 1.75, "", [["l", 0.8]]],
        ["entry", "entry", 0.0, 4.62, 1.28, 1.46, "", [["l", 0.5]]],
        ["living", "living", 0.0, 6.08, 3.59, 3.03, "b", []],
        ["master", "master", 3.59, 6.08, 4.34, 3.37, "b", [["t", 0.21]]],
        ["balcony", "balcony", 0.0, 9.45, 7.19, 1.2, "b", [], [[0.0, 9.11, 3.59, 0.34, "", []]]],
        ["outdoor", "utility", 7.19, 9.45, 0.74, 1.2, "b", [["l", 0.17]]],
      ],
      cuts: [["v", 1.28, 4.62, 6.08], ["h", 6.08, 0.0, 1.28], ["h", 6.08, 1.28, 3.59]],
      solids: [[2.4, -0.14, 0.72, 1.71], [2.4, 4.07, 0.72, 0.55], [7.48, 4.33, 0.45, 1.75]],
      furn: {
        "bath1": {"wc": [5.56, 4.66, "b"], "bas": [6.42, 4.62, "b"], "tub": [6.83, 4.4, 0.62, 1.54], "shw": [6.83, 4.4, 0.62, 1.54]},
        "kitchen": {"sink": [[2.4, 1.57, 0.72, 2.5, "l"]], "hood": [2.76, 3.42]},
        "bed2": {"wardrobe": [0.0, 1.88, 0.51, 2.48, "l"]},
        "bed1": {"wardrobe": [7.41, 1.8, 0.51, 1.8, "r"]},
        "master": {"wardrobe": [7.41, 6.33, 0.51, 2.94, "r"]},
        "entry": {"shoe": [0.05, 4.62, 1.23, 0.38, "t"]},
      },
      bedrooms: ["bed1", "bed2"],
    },
    // 실제 도면(사장님 제공 79㎡ 타입 · 2026-10-09) — 그림 그대로(확장 · 비확장 전환 없음). 치수가 없어 실내 면적에 맞춘 비율.
    "79": {
      label: "79㎡", sub: "24평형", W: 11.1, D: 8.85,
      rooms: [
        ["refuge", "refuge", 0.0, 0.0, 1.16, 1.76, "l", []],
        ["balcony", "balcony", 0.0, 1.76, 1.16, 1.6, "l", [["t", 0.21]]],
        ["master", "master", 1.16, 0.0, 3.04, 3.36, "l", [["b", 2.08]]],
        ["powder", "powder", 4.2, 0.0, 1.09, 1.76, "", []],
        ["dress", "dress", 5.29, 0.0, 1.27, 1.76, "", []],
        ["bath2", "bath", 4.2, 1.76, 2.36, 1.13, "", [["t", 0.11]], [[4.2, 2.89, 1.54, 0.47, "", []]]],
        ["bath1", "bath", 6.56, 1.16, 1.56, 2.2, "", [["b", 0.61]]],
        ["entry", "entry", 8.12, 1.85, 1.71, 1.51, "", [["t", 0.67]]],
        ["pantry", "pantry", 9.83, 3.36, 1.27, 1.13, "", [["l", 0.18]]],
        ["living", "living", 0.0, 3.36, 5.47, 3.54, "l", []],
        ["hall", "hall", 5.47, 3.36, 4.36, 1.13, "", []],
        ["kitchen", "kitchen", 3.61, 6.9, 2.51, 1.95, "b", [], [[5.47, 4.49, 0.65, 2.41, "", []]]],
        ["bed1", "bed", 6.12, 4.49, 2.49, 3.23, "b", [["t", 0.22]]],
        ["bed2", "bed", 8.61, 4.49, 2.49, 3.23, "br", [["t", 0.15]]],
        ["outdoor", "utility", 0.71, 6.9, 1.36, 1.58, "l", [["t", 0.41]]],
        ["balcony2", "balcony", 2.07, 6.9, 1.54, 1.95, "b", [["t", 0.54]]],
      ],
      cuts: [["v", 4.2, 0.67, 1.76], ["v", 5.29, 0.76, 1.58], ["h", 3.36, 8.12, 9.83], ["h", 6.9, 3.61, 5.47], ["v", 5.47, 3.36, 4.49], ["v", 5.47, 4.49, 6.9], ["h", 4.49, 5.47, 6.12]],
      solids: [[6.56, 0.0, 0.83, 1.16], [5.74, 2.89, 0.82, 0.47], [6.12, 7.72, 0.55, 1.13], [0.71, 8.48, 1.36, 0.37]],
      furn: {
        "bath1": {"wc": [6.79, 2.94, "r"], "bas": [6.79, 2.13, "r"], "tub": [6.61, 1.22, 1.47, 0.54], "shw": [6.61, 1.22, 1.47, 0.54]},
        "bath2": {"wc": [4.6, 3.11, "t"], "bas": [5.3, 3.11, "t"], "tub": [5.74, 1.82, 0.8, 1.05], "shw": [5.74, 1.82, 0.8, 1.05]},
        "kitchen": {"sink": [[3.61, 8.3, 2.51, 0.54, "b"], [5.61, 4.49, 0.51, 3.81, "r"]], "hood": [5.89, 7.36]},
        "master": {"wardrobe": [1.34, 0.0, 2.72, 0.54, "t"]},
        "bed1": {"wardrobe": [8.06, 5.03, 0.54, 2.54, "r"]},
        "bed2": {"wardrobe": [8.61, 5.58, 0.54, 2.09, "l"]},
        "dress": {"wardrobe": [6.07, 0.05, 0.49, 1.67, "r"]},
        "entry": {"shoe": [8.12, 1.91, 0.49, 1.42, "l"]},
      },
      bedrooms: ["bed1", "bed2"],
    },
    // 실제 도면(사장님 제공 86㎡ 타입 · 2026-10-09) — 그림 그대로(확장 · 비확장 전환 없음). 치수가 없어 실내 면적에 맞춘 비율.
    "86": {
      label: "86㎡", sub: "26평형", W: 11.02, D: 6.78,
      rooms: [
        ["balcony", "balcony", 0.0, 0.0, 1.62, 6.07, "l", []],
        ["living", "living", 1.62, 0.0, 3.94, 3.06, "l", []],
        ["kitchen", "kitchen", 5.56, 0.0, 2.53, 2.76, "", []],
        ["bed1", "bed", 8.09, 0.0, 2.93, 2.76, "r", [["b", 0.09]]],
        ["master", "master", 1.62, 3.06, 3.94, 3.72, "l", [["r", 0.13]]],
        ["hall", "hall", 5.56, 2.76, 3.68, 1.56, "", []],
        ["entry", "entry", 9.24, 2.76, 1.78, 1.56, "", [["r", 0.6]]],
        ["bath1", "bath", 5.56, 4.32, 1.82, 2.46, "", [["t", 0.07]]],
        ["bed2", "bed", 8.09, 4.32, 2.93, 2.46, "r", [["t", 0.09]]],
      ],
      cuts: [["v", 5.56, 0.0, 3.06], ["h", 2.76, 5.56, 7.38], ["v", 9.24, 2.76, 4.32]],
      solids: [[0.0, 6.07, 1.62, 0.71], [7.38, 4.32, 0.71, 2.46]],
      furn: {
        "bath1": {"wc": [7.03, 4.81, "l"], "bas": [7.16, 5.53, "l"], "tub": [5.6, 6.07, 1.75, 0.69], "shw": [5.6, 6.07, 1.75, 0.69]},
        "kitchen": {"sink": [[5.56, 0.0, 2.54, 0.61, "t"], [5.56, 0.61, 0.62, 1.28, "l"], [7.38, 0.61, 0.54, 1.01, "r"]], "hood": [7.65, 1.15]},
        "master": {"wardrobe": [1.69, 6.18, 3.78, 0.61, "b"]},
        "bed1": {"wardrobe": [9.24, 2.2, 1.78, 0.57, "b"]},
        "bed2": {"wardrobe": [8.29, 6.2, 2.56, 0.58, "b"]},
        "entry": {"shoe": [9.26, 2.79, 1.73, 0.35, "t"]},
      },
      bedrooms: ["bed1", "bed2"],
    },
    // 실제 도면(사장님 제공 109㎡ 타입 · 2026-10-09) — 그림 그대로(확장 · 비확장 전환 없음). 치수가 없어 실내 면적에 맞춘 비율.
    "109": {
      label: "109㎡", sub: "33평형", W: 13.84, D: 8.82,
      rooms: [
        ["bath1", "bath", 0.0, 1.89, 1.6, 2.28, "", [["b", 0.65]]],
        ["entry", "entry", 2.51, 1.89, 1.66, 2.28, "", [["t", 0.4]], [[1.6, 2.75, 0.91, 1.42, "", []]]],
        ["alpha", "alpha", 4.17, 0.94, 2.05, 3.23, "t", [["b", 0.24]]],
        ["kitchen", "kitchen", 6.22, 0.0, 3.35, 2.65, "t", [["r", 0.9]]],
        ["pantry", "pantry", 9.57, 1.89, 0.62, 2.28, "", []],
        ["balcony2", "balcony", 9.57, 0.8, 2.26, 1.09, "", [], [[9.57, 0.0, 1.26, 0.8, "t", []]]],
        ["outdoor", "utility", 11.83, 0.0, 2.01, 1.32, "t", []],
        ["dress", "dress", 11.83, 1.32, 2.01, 1.69, "", [["t", 0.6]]],
        ["powder", "powder", 11.83, 3.01, 2.01, 1.16, "", [["t", 0.5]]],
        ["bath2", "bath", 10.69, 1.89, 1.14, 2.28, "", [["r", 1.34]], [[10.19, 2.75, 0.5, 1.42, "", []]]],
        ["master", "master", 10.19, 4.17, 3.65, 3.51, "b", [["l", 0.18]]],
        ["balcony", "balcony", 10.19, 7.68, 1.8, 1.14, "b", [["r", 0.19]]],
        ["refuge", "refuge", 11.99, 7.68, 1.85, 1.14, "b", []],
        ["bed2", "bed", 0.0, 5.39, 2.97, 3.43, "b", [["t", 1.91]]],
        ["bed1", "bed", 2.97, 5.39, 2.71, 3.43, "b", [["t", 1.6]]],
        ["closet", "pantry", 0.0, 4.17, 0.5, 1.22, "", []],
        ["hall", "hall", 0.5, 4.17, 5.18, 1.22, "", []],
        ["living", "living", 5.68, 4.17, 4.51, 4.65, "b", [], [[6.22, 2.65, 3.35, 1.52, "", []]]],
      ],
      cuts: [["h", 4.17, 1.6, 4.17], ["h", 2.65, 6.22, 9.57], ["v", 9.57, 1.89, 4.17], ["h", 4.17, 11.83, 12.43]],
      solids: [[1.6, 1.89, 0.91, 0.86], [10.83, 0.0, 1.0, 0.8], [10.19, 1.89, 0.5, 0.86]],
      furn: {
        "bath1": {"wc": [0.3, 3.69, "r"], "bas": [0.34, 2.97, "r"], "tub": [0.08, 1.95, 1.44, 0.74], "shw": [0.08, 1.95, 1.44, 0.74]},
        "bath2": {"wc": [10.49, 3.81, "r"], "bas": [10.53, 3.09, "r"], "tub": [10.75, 1.95, 1.02, 0.8], "shw": [10.75, 1.95, 1.02, 0.8]},
        "kitchen": {"sink": [[6.22, 0.0, 3.35, 0.6, "t"], [6.22, 0.6, 0.6, 1.34, "l"]], "hood": [6.52, 1.34]},
        "master": {"wardrobe": [13.24, 4.49, 0.6, 2.87, "r"]},
        "bed2": {"wardrobe": [0.0, 5.7, 0.6, 2.81, "l"]},
        "bed1": {"wardrobe": [5.07, 6.46, 0.6, 2.21, "r"]},
        "alpha": {"wardrobe": [4.17, 1.24, 0.6, 1.91, "l"]},
        "dress": {"wardrobe": [13.24, 2.05, 0.6, 0.92, "r"]},
        "entry": {"shoe": [3.71, 2.85, 0.46, 1.28, "r"]},
      },
      bedrooms: ["bed1", "bed2", "alpha"],
    },
  };

  const LABELS = {
    living: "거실", kitchen: "주방", master: "안방", bed1: "방1", bed2: "방2", bed3: "방3", alpha: "알파룸",
    bath1: "화장실1", bath2: "화장실2", entry: "현관", dress: "드레스룸", pantry: "팬트리", storage: "창고",
    utility: "다용도실", balcony: "발코니", hall: "",
    balcony2: "발코니", balcony3: "발코니", powder: "파우더룸", refuge: "대피공간", outdoor: "실외기실", closet: "",
  };

  const FLOOR = {
    living: 0xE4DFD4, kitchen: 0xE4DFD4, hall: 0xE4DFD4, master: 0xEBE3D3, bed: 0xEBE3D3, alpha: 0xEBE3D3, dress: 0xE2DDD4,
    bath: 0xD5DEE5, entry: 0xD9D6CF, pantry: 0xDCD9D2, utility: 0xD9D6CF, balcony: 0xE9E7E1,
    powder: 0xE6E0D6, refuge: 0xE1E1DF,
  };
  const WALL = 0xF4F2EC, OUTSIDE = 0xE3E0D8, CAP = 0xD3CFC5, EDGE = 0x9A988F, GLASS = 0x85B7EB, DOOR = 0xE6DFD2, FRAME = 0xFBFAF7;
  const MIX = { wall: 0.5, floor: 0.78, window: 1, door: 0.85, light: 0.5, fixture: 0.3, cabinet: 0.3 };
  const FURN_FIX = new Set(["wc", "bas", "tub", "shw", "mirror"]);   // 욕실 기구(나머지는 가구 — 싱크대 · 상부장 · 후드 · 붙박이장 · 신발장)
  const GLOW = 0xFFBE3D;   // 등 아래 · 간접조명 빛 번짐(더하기 섞기)
  // 조명 종류를 알 수 없을 때(세트 · 설치비 · 등기구 교체 …) 방 종류별 기본 등
  const DEFAULT_LIGHT = {
    living: "rect", kitchen: "rect", master: "square", bed: "square", alpha: "square",
    dress: "round", pantry: "round", entry: "round", bath: "round", utility: "round", balcony: "round", hall: "round",
    powder: "round", refuge: "round",
  };
  const DOOR_OPEN = 70 * Math.PI / 180;   // 문짝은 방 안쪽으로 70° 열린 모양

  /** 평면의 방 목록(색칠 대상 고르기용 — WebGL 없이도 쓴다). */
  function layout(planKey) {
    const P = PLANS[planKey] || PLANS["86"];
    const rooms = P.rooms.map(r => ({
      id: r[0], kind: r[1], x: r[2], y: r[3], w: r[4], h: r[5], win: r[6] || "", doors: r[7] || [],
      more: (r[8] || []).map(e => ({ x: e[0], y: e[1], w: e[2], h: e[3], win: e[4] || "", doors: e[5] || [] })),
    }));
    // 칸 목록: 첫 칸이 방의 대표(이름표 · 조명 자리), 나머지는 덧붙은 칸
    rooms.forEach(r => { r.rects = [{ x: r.x, y: r.y, w: r.w, h: r.h, win: r.win, doors: r.doors }].concat(r.more); });
    // 방마다 칠할 수 있는 면 — 창은 그 방 창(발코니는 늘), 문은 그 방에 단 문짝
    rooms.forEach(r => {
      r.parts = ["wall", "floor", "light"];
      if (r.rects.some(c => c.win) || r.kind === "balcony") r.parts.push("window");
      if (r.rects.some(c => c.doors.length)) r.parts.push("door");
    });
    return { P, rooms };
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
  function geometry(planKey) {
    const { P, rooms } = layout(planKey);
    const lines = new Map();
    const at = (o, c) => { const k = lineKey(o, c); if (!lines.has(k)) lines.set(k, { o, c, edges: [], cuts: [], doors: [], wins: [] }); return lines.get(k); };
    rooms.forEach(r => r.rects.forEach(c => {
      at("h", c.y).edges.push({ a: c.x, b: c.x + c.w, side: 1, room: r });
      at("h", c.y + c.h).edges.push({ a: c.x, b: c.x + c.w, side: -1, room: r });
      at("v", c.x).edges.push({ a: c.y, b: c.y + c.h, side: 1, room: r });
      at("v", c.x + c.w).edges.push({ a: c.y, b: c.y + c.h, side: -1, room: r });
    }));
    const wins = [];
    rooms.forEach(room => room.rects.forEach(c => {
      const r = Object.assign({}, c, { id: room.id, kind: room.kind });
      for (const s of r.win) {
        const hz = s === "t" || s === "b", L = hz ? r.w : r.h;
        const wide = r.kind === "living" || r.kind === "utility" || r.kind === "kitchen";
        const len = wide ? L - 0.5 : Math.min(L * 0.72, L - 0.5);
        const sill = r.kind === "living" ? 0.1 : 0.9;   // 창 아래 끝(실제 높이)
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
    }));
    P.cuts.forEach(([o, c, a, b]) => at(o, c).cuts.push([a, b]));
    // 같은 방 칸끼리 맞닿은 자리는 벽 없이 트인다
    const cutsAll = P.cuts.slice();
    lines.forEach(L => L.edges.forEach(e1 => {
      if (e1.side !== 1) return;
      L.edges.forEach(e2 => {
        if (e2.side !== -1 || e2.room !== e1.room) return;
        const a = Math.max(e1.a, e2.a), b = Math.min(e1.b, e2.b);
        if (b - a > EPS) { L.cuts.push([a, b]); cutsAll.push([L.o, L.c, a, b]); }
      });
    }));

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
      else if (pc.type === "door") { if (DH < H) boxes.push(Object.assign({ a: pc.a, b: pc.b, y0: DH, y1: H }, base)); }   // 문 위 인방
      else {
        boxes.push(Object.assign({ a: pc.a, b: pc.b, y0: 0, y1: pc.win.sill }, base));
        if (WT < H) boxes.push(Object.assign({ a: pc.a, b: pc.b, y0: WT, y1: H }, base));
        glass.push({ o: pc.o, c: pc.c, a: pc.a, b: pc.b, y0: pc.win.sill, y1: WT, win: wins.indexOf(pc.win) });
      }
    });
    return { P, rooms, boxes, glass, caps, wins, cuts: cutsAll, solids: P.solids || [] };
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

    let plan = String((opts && opts.plan) || "86");
    let yaw = -0.5, tilt = 0.98, dist = 20, W = 13, D = 9;
    // 지금 공간으로 시점 옮기기 — 바라보는 점(fx, fz)과 거리 배율(fk)이 목표(goal)로 천천히 다가간다
    let fx = 0, fz = 0, fk = 1, goal = { x: 0, z: 0, k: 1 }, focusIds = null, curRooms = [];
    let activeIds = new Set();   // 이름표를 강조할 방(지금 공간)
    let surfaces = new Map();     // "id:part" → { mats:[], base:[Color], kind:"wall|floor|window", hl:Color|null, t0 }
    let labelSprites = new Map(); // id → { sprite, text, pos }
    let labelText = {};
    let wanted = new Map();       // "id:part" → color (마지막으로 받은 목록)
    let lightKinds = new Map();   // id → ["round" · "square" · "rect" · "down" · "cove" · "pendant" · "auto"] (페이지가 상품 이름으로 고름)
    let lightObjs = new Map();    // id → { sig, objs } 지금 그려 둔 등
    let lightGroup = null, cutsNow = [];
    let furnWant = new Map();     // id → { kinds: ["wc" …], len }(페이지가 상품 이름으로 고름)
    let furnObjs = new Map();     // id → { sig, objs }
    let furnGroup = null;
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

    function surface(id, part, factory) {
      const k = id + ":" + part;
      if (!surfaces.has(k)) surfaces.set(k, { mats: [], base: [], part, hl: null, t0: 0 });
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
      furnObjs.forEach(o => o.objs.forEach(m => { m.geometry.dispose(); m.material.dispose(); }));
      surfaces = new Map(); labelSprites = new Map(); lightObjs = new Map(); lightGroup = null;
      furnObjs = new Map(); furnGroup = null;
      wallMats.clear(); floorMats.clear(); glassMats.clear();
    }

    function build() {
      clear();
      const g = geometry(plan);
      W = g.P.W; D = g.P.D; curRooms = g.rooms; cutsNow = g.cuts;
      const X = x => x - W / 2, Z = y => y - D / 2;
      // 바닥
      g.rooms.forEach(r => {
        const m = surface(r.id, "floor", () => new THREE.MeshLambertMaterial({ color: FLOOR[r.kind] || 0xE4DFD4 }));
        floorMats.set(r.id, m);
        r.rects.forEach(c => add(new THREE.BoxGeometry(c.w, 0.06, c.h), m, X(c.x + c.w / 2), 0.03, Z(c.y + c.h / 2), false));
      });
      // 설비 칸(PS · AD) — 속이 찬 기둥(윗면은 벽 마구리 색)
      g.solids.forEach(([sx, sy, sw, sh]) => add(new THREE.BoxGeometry(sw, H - 0.01, sh), [outMat, outMat, capMat, capMat, outMat, outMat], X(sx + sw / 2), (H - 0.01) / 2, Z(sy + sh / 2), true));
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
      // 유리 — 창마다 재질 하나, 그 창을 가진 방에 등록
      g.wins.forEach((w, i) => {
        const mats = w.owners.map(id => surface(id, "window", () => new THREE.MeshLambertMaterial({ color: GLASS, transparent: true, opacity: 0.42, depthWrite: false })));
        glassMats.set(i, mats);
      });
      g.glass.forEach(gl2 => {
        const mats = glassMats.get(gl2.win); if (!mats) return;
        const L = gl2.b - gl2.a, h = gl2.y1 - gl2.y0, mid = (gl2.a + gl2.b) / 2, ym = (gl2.y0 + gl2.y1) / 2;
        mats.forEach((m, j) => {
          const off = j * 0.012;   // 한 창을 두 방이 가지면 같은 자리 두 장이라 조금 띄운다
          if (gl2.o === "h") add(new THREE.BoxGeometry(L, h, 0.02), m, X(mid), ym, Z(gl2.c) + off, false);
          else add(new THREE.BoxGeometry(0.02, h, L), m, X(gl2.c) + off, ym, Z(mid), false);
        });
      });
      // 창틀 — 창마다 위 · 아래 · 양옆(긴 창은 1.5m쯤마다 살). 창 재질 묶음(그 창을 가진 방)이라 창호를 고르면 유리와 같이 칠해진다.
      g.wins.forEach(w => {
        const m = surface(w.owners[w.owners.length - 1], "window", () => new THREE.MeshLambertMaterial({ color: FRAME }));
        const len = w.b - w.a, hgt = WT - w.sill, mid = (w.a + w.b) / 2;
        const bar = (along, y, h, at) => w.o === "h"
          ? add(new THREE.BoxGeometry(along, h, FD), m, X(at), y, Z(w.c), true)
          : add(new THREE.BoxGeometry(FD, h, along), m, X(w.c), y, Z(at), true);
        bar(len, WT - FW / 2, FW, mid);
        bar(len, w.sill + FW / 2, FW, mid);
        const n = Math.max(1, Math.round(len / 1.5));
        for (let i = 0; i <= n; i++) bar(FW, w.sill + hgt / 2, hgt, w.a + FW / 2 + (len - FW) * i / n);
      });
      // 문짝 — 문을 단 방의 재질(칠할 수 있음). 경첩은 문 자리 시작, 방 안쪽으로 열림.
      g.rooms.forEach(room => room.rects.forEach(r => r.doors.forEach(([sd, of]) => {
        const hz = sd === "t" || sd === "b";
        const hx = hz ? r.x + of : (sd === "l" ? r.x : r.x + r.w);
        const hy = hz ? (sd === "t" ? r.y : r.y + r.h) : r.y + of;
        const c = Math.cos(DOOR_OPEN), s2 = Math.sin(DOOR_OPEN);
        const d = sd === "t" ? [c, s2] : sd === "b" ? [c, -s2] : sd === "l" ? [s2, c] : [-s2, c];
        const L = DW - 0.06;
        const m = surface(room.id, "door", () => new THREE.MeshLambertMaterial({ color: DOOR }));
        const mesh = add(new THREE.BoxGeometry(L, DH - 0.03, 0.04), m, X(hx + d[0] * L / 2), (DH - 0.03) / 2, Z(hy + d[1] * L / 2), true);
        const rot = Math.atan2(-d[1], d[0]);
        mesh.rotation.y = rot;
        root.children[root.children.length - 1].rotation.y = rot;   // 테두리 선도 같이
      })));
      // 조명 — 고른 방에만 그 종류의 등을 천장 높이에 그린다(syncLights). 천장 판은 그리지 않는다(위에서 들여다보는 도면).
      lightGroup = new THREE.Group(); root.add(lightGroup);
      // 가구 — 고른 상품이 있는 방에만(syncFurn). 기본으로 깔린 가구는 없다.
      furnGroup = new THREE.Group(); root.add(furnGroup);
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
      const cs = rs.flatMap(r => r.rects);
      const x0 = Math.min(...cs.map(r => r.x)), x1 = Math.max(...cs.map(r => r.x + r.w));
      const y0 = Math.min(...cs.map(r => r.y)), y1 = Math.max(...cs.map(r => r.y + r.h));
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
          if (s.part === "light" || s.part === "fixture" || s.part === "cabinet") { m.opacity = 0; m.visible = false; }
          return;
        }
        if (s.part === "fixture" || s.part === "cabinet") {
          m.visible = true; m.opacity = m.userData.op * Math.min(1, a * 1.6);
          if (!m.userData.keep) m.color.copy(base).lerp(s.hl, MIX[s.part] * a);
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
      if (!surfaces.has(k)) surfaces.set(k, { mats: [], base: [], part: "light", hl: null, t0: 0 });
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

    // ── 가구 ─────────────────────────────────────────────────────────────
    function furnMat(id, part, mat, op, keep) {
      const k = id + ":" + part;
      if (!surfaces.has(k)) surfaces.set(k, { mats: [], base: [], part, hl: null, t0: 0 });
      const s = surfaces.get(k);
      mat.transparent = true; mat.opacity = 0; mat.visible = false;
      mat.userData.op = op; mat.userData.keep = !!keep;
      s.mats.push(mat); s.base.push(mat.color.clone());
      return mat;
    }
    function dropFurn(id) {
      const o = furnObjs.get(id);
      if (!o) return;
      o.objs.forEach(m => { if (m.parent) m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); });
      furnObjs.delete(id); surfaces.delete(id + ":fixture"); surfaces.delete(id + ":cabinet");
    }
    function syncFurn() {
      if (!furnGroup) return;
      curRooms.forEach(r => {
        const w = furnWant.get(r.id);
        const kinds = w ? w.kinds.filter(k => wanted.has(r.id + ":" + (FURN_FIX.has(k) ? "fixture" : "cabinet"))).sort() : [];
        const sig = kinds.length ? kinds.join(",") + "|" + (w.len || 0) : "";
        const o = furnObjs.get(r.id);
        if ((o ? o.sig : "") === sig) return;
        dropFurn(r.id);
        if (sig) buildFurn(r, kinds, w.len || 0, sig);
      });
    }
    function buildFurn(r, kinds, len, sig) {
      const P = PLANS[plan], A = (P.furn && P.furn[r.id]) || {};
      const objs = [], X = x => x - W / 2, Z = y => y - D / 2, has = k => kinds.includes(k);
      const lam = (color, part, op, keep, extra) => furnMat(r.id, part, new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {})), op == null ? 1 : op, keep);
      const line = part => furnMat(r.id, part, new THREE.LineBasicMaterial({ color: EDGE }), 0.5, true);
      // 상자 하나(위치는 도면 좌표 m, y는 바닥에서 높이) — 테두리 선도 같이 나타난다
      const box = (part, mat, x, z, w, h, d, y, parent, rot) => {
        const geo = new THREE.BoxGeometry(w, h, d), mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z); if (rot) mesh.rotation.y = rot;
        const eg = new THREE.EdgesGeometry(geo), edge = new THREE.LineSegments(eg, line(part));
        edge.position.copy(mesh.position); edge.rotation.y = mesh.rotation.y;
        (parent || furnGroup).add(mesh, edge); objs.push(mesh, edge);
        return mesh;
      };
      const rotOf = f => f === "t" ? Math.PI : f === "r" ? Math.PI / 2 : f === "l" ? -Math.PI / 2 : 0;   // 앞이 +z(아래쪽)인 모양을 돌린다
      const spot = (cx, cy, face) => { const g = new THREE.Group(); g.position.set(X(cx), 0, Z(cy)); g.rotation.y = rotOf(face); furnGroup.add(g); return g; };
      const local = (g, part, mat, x, z, w, h, d, y) => box(part, mat, x, z, w, h, d, y, g);
      const main = r.rects[0];
      // 기본 자리(도면에 적은 자리가 없을 때)
      const wc = A.wc || [main.x + 0.35, main.y + 0.45, "b"];
      const bas = A.bas || [main.x + main.w - 0.35, main.y + 0.3, "b"];
      const tubR = A.tub || [main.x + 0.06, main.y + main.h - 0.8, main.w - 0.12, 0.74];
      const shwR = A.shw || tubR;
      const WHITE = 0xF7F7F5;
      if (has("wc")) {
        const g = spot(wc[0], wc[1], wc[2]), m = lam(WHITE, "fixture");
        local(g, "fixture", m, 0, -0.25, 0.4, 0.42, 0.18, 0.62);   // 물탱크
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.4, 20), m);
        body.position.set(0, 0.2, 0.05); body.scale.z = 1.3; g.add(body); objs.push(body);
      }
      if (has("bas")) {
        const g = spot(bas[0], bas[1], bas[2]), m = lam(WHITE, "fixture");
        local(g, "fixture", m, 0, -0.08, 0.16, 0.72, 0.16, 0.36);   // 다리
        local(g, "fixture", m, 0, 0, 0.5, 0.15, 0.42, 0.8);         // 세면기
      }
      if (has("mirror")) {
        const g = spot(bas[0], bas[1], bas[2]);
        local(g, "fixture", lam(0xDDE6EC, "fixture"), 0, -0.15, 0.6, 0.75, 0.12, 1.55);
      }
      if (has("tub")) {
        const [x, y, w, h] = tubR;
        box("fixture", lam(WHITE, "fixture"), X(x + w / 2), Z(y + h / 2), w, 0.55, h, 0.275);
        box("fixture", lam(0xCFE0EA, "fixture", 1, true), X(x + w / 2), Z(y + h / 2), Math.max(0.1, w - 0.14), 0.012, Math.max(0.1, h - 0.14), 0.557);
      }
      if (has("shw") && !(has("tub") && shwR === tubR)) {
        // 샤워 칸 — 바닥 받침 + 방 쪽(벽이 아닌 쪽)에 유리 칸막이
        const [x, y, w, h] = shwR, near = (a, b) => Math.abs(a - b) < 0.12;
        box("fixture", lam(0xE9EEF1, "fixture"), X(x + w / 2), Z(y + h / 2), w, 0.04, h, 0.02);
        const onWall = (o, c) => r.rects.some(rc => o === "x" ? (near(rc.x, c) || near(rc.x + rc.w, c)) : (near(rc.y, c) || near(rc.y + rc.h, c)));
        const glass = () => lam(0xBFD9EA, "fixture", 0.38, true, { depthWrite: false });
        if (!onWall("y", y)) box("fixture", glass(), X(x + w / 2), Z(y), w, 1.9, 0.02, 0.95);
        if (!onWall("y", y + h)) box("fixture", glass(), X(x + w / 2), Z(y + h), w, 1.9, 0.02, 0.95);
        if (!onWall("x", x)) box("fixture", glass(), X(x), Z(y + h / 2), 0.02, 1.9, h, 0.95);
        if (!onWall("x", x + w)) box("fixture", glass(), X(x + w), Z(y + h / 2), 0.02, 1.9, h, 0.95);
      }
      // 싱크대 줄 — 상품 길이(m)가 있으면 앞 칸부터 그 길이만큼
      let segs = (A.sink || [[main.x + 0.06, main.y + 0.06, Math.min(main.w - 0.12, 3), 0.6, "t"]]).map(s => s.slice());
      if (len > 0) {
        let left = len;
        segs = segs.filter(s => {
          if (left <= 0.05) return false;
          const along = s[2] >= s[3] ? 2 : 3, take = Math.min(left, s[along]);
          s[along] = take; left -= take; return true;
        });
      }
      if (has("sink")) segs.forEach((s, i) => {
        const [x, y, w, h] = s;
        box("cabinet", lam(0xEFEAE2, "cabinet"), X(x + w / 2), Z(y + h / 2), w, 0.85, h, 0.425);
        box("cabinet", lam(0x9A9893, "cabinet", 1, true), X(x + w / 2), Z(y + h / 2), w + 0.02, 0.04, h + 0.02, 0.87);
        if (i === 0) {   // 싱크볼
          const along = w >= h, bw = Math.min(0.7, (along ? w : h) * 0.35);
          box("cabinet", lam(0x6F7478, "cabinet", 1, true), X(x + w / 2), Z(y + h / 2), along ? bw : Math.min(0.36, w - 0.1), 0.012, along ? Math.min(0.36, h - 0.1) : bw, 0.896);
        }
      });
      if (has("upper")) segs.forEach(s => {
        const [x, y, w, h, sd] = s, d = 0.35;
        const fx = sd === "l" ? x : sd === "r" ? x + w - d : x, fy = sd === "t" ? y : sd === "b" ? y + h - d : y;
        const fw = sd === "l" || sd === "r" ? d : w, fh = sd === "t" || sd === "b" ? d : h;
        box("cabinet", lam(0xEFEAE2, "cabinet"), X(fx + fw / 2), Z(fy + fh / 2), fw, 0.7, fh, 1.85);
      });
      if (has("hood")) {
        const hp = A.hood || (segs[0] ? [segs[0][0] + Math.min(segs[0][2], 0.6) / 2, segs[0][1] + Math.min(segs[0][3], 0.6) / 2] : [main.x + 0.5, main.y + 0.4]);
        box("cabinet", lam(0xC9CBCC, "cabinet"), X(hp[0]), Z(hp[1]), 0.6, 0.45, 0.5, 1.75);
      }
      const tall = (key, color, height, fallback) => {
        const v = A[key] || fallback;
        box("cabinet", lam(color, "cabinet"), X(v[0] + v[2] / 2), Z(v[1] + v[3] / 2), v[2], height, v[3], height / 2);
      };
      if (has("wardrobe")) tall("wardrobe", 0xDCC8AA, 2.25, main.win.includes("t")
        ? [main.x + 0.3, main.y + main.h - 0.66, Math.max(0.6, main.w - 0.6), 0.6, "b"]
        : [main.x + 0.3, main.y + 0.06, Math.max(0.6, main.w - 0.6), 0.6, "t"]);
      if (has("shoe")) tall("shoe", 0xE2D6C2, 2.1, [main.x + 0.06, main.y + 0.06, 0.4, Math.min(1.2, main.h - 0.12), "l"]);
      furnObjs.set(r.id, { sig, objs });
    }

    function applyWanted() {
      syncLights();
      syncFurn();
      const now = performance.now() / 1000;
      surfaces.forEach((s, k) => {
        const want = wanted.get(k);
        if (!want) { s.hl = null; s.t0 = 0; paint(s, 0); return; }
        const col = new THREE.Color(want);
        const isNew = !s.hl || !s.hl.equals(col);
        s.hl = col;
        if (!isNew) { if (!s.t0) paint(s, 1); return; }
        if (reduce && reduce.matches) { s.t0 = 0; paint(s, 1); }
        else { s.t0 = now; paint(s, 0); }
      });
      invalidate();
    }

    // ── 시점 · 그리기 ───────────────────────────────────────────────────
    function fitDist() {
      const pts = [];
      [-W / 2, W / 2].forEach(x => [-D / 2, D / 2].forEach(z => [0, FIT_TOP].forEach(y => pts.push(new THREE.Vector3(x, y, z)))));
      const keep = [fx, fz, fk]; fx = 0; fz = 0; fk = 1;
      let lo = 2, hi = 150;
      for (let i = 0; i < 24; i++) {
        dist = (lo + hi) / 2; aim(); camera.updateMatrixWorld();
        const ok = pts.every(p => { const q = p.clone().project(camera); return Math.abs(q.x) <= 0.94 && Math.abs(q.y) <= 0.9 && q.z < 1; });
        if (ok) hi = dist; else lo = dist;
      }
      [fx, fz, fk] = keep;
      return hi;
    }
    function fit() {
      const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const v = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
      dist = fitDist();   // 지금 보는 방향에서 평면 모서리가 모두 화면 안에 드는 가장 가까운 거리(평면 모양 · 칸 비율에 맞춤)
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
      // 햇빛도 시점과 함께 돈다 — 어느 쪽에서 보든 처음 모습과 같은 밝기(뒤쪽 벽이 어둡게 보이지 않게)
      const a = yaw + 0.5, c = Math.cos(a), sn = Math.sin(a);
      sun.position.set(-5 * c + 9 * sn, 12, 5 * sn + 9 * c);
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
        if (!s.hl || !s.t0) return;
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
      tilt = Math.min(TILT_MAX, Math.max(TILT_MIN, drag.tilt + (e.clientY - drag.y) * 0.006));   // 아래로 끌면 위에서 내려다보기
      dist = fitDist();   // 이 각도에서 평면이 화면에 꼭 들어오는 거리
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
      /** 평면(78 · 79 · 86 · 109)을 바꾼다 — 칠은 그대로 옮겨 간다(움직임 없이). */
      setPlan(p) {
        p = PLANS[p] ? String(p) : plan;
        if (p === plan) return;
        plan = p; build();
      },
      /** list: [{ id, part:"wall|floor|window", color:"#RRGGBB" }] — 같은 면은 뒤쪽이 이긴다. */
      setHighlights(list) {
        wanted = new Map();
        (list || []).forEach(h => wanted.set(h.id + ":" + h.part, h.color));
        applyWanted();
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
        (list || []).forEach(h => { const s = surfaces.get(h.id + ":" + h.part); if (s && s.hl) s.t0 = now; });
        invalidate();
      },
      /** 방 id → { kinds: [wc · bas · tub · shw · mirror · sink · upper · hood · wardrobe · shoe], len: 싱크대 길이 m }.
          그 방 fixture(욕실 기구) · cabinet(가구)가 칠할 목록에 있을 때만 그린다. */
      setFurniture(map) {
        furnWant = new Map(Object.entries(map || {}).map(([id, v]) => [id, { kinds: [...new Set(v.kinds || [])], len: +v.len || 0 }]));
        applyWanted();
      },
      /** 방 id → 등 종류 목록(round · square · rect · down · cove · pendant · auto). 그 방 조명이 칠할 목록에 있을 때만 그린다. */
      setLights(map) {
        lightKinds = new Map(Object.entries(map || {}).map(([id, ks]) => [id, [...new Set(ks)].sort()]));
        applyWanted();
      },
      /** id → 이름(방 라벨). 빈 글자면 라벨을 숨긴다. 없는 id는 기본 이름. */
      setLabels(map) { labelText = Object.assign({}, map || {}); applyLabels(); invalidate(); },
    };
  }

  window.Room3D = {
    PLANS: Object.keys(PLANS).reduce((o, k) => { o[k] = { label: PLANS[k].label, sub: PLANS[k].sub, bedrooms: PLANS[k].bedrooms.slice() }; return o; }, {}),
    LABELS,
    DEFAULT_LIGHT: Object.assign({}, DEFAULT_LIGHT),
    /** 방 목록 [{ id, kind }] — WebGL 없이도 쓴다(무엇을 칠할지 고르기). */
    rooms(planKey) { return layout(planKey).rooms.map(r => ({ id: r.id, kind: r.kind, parts: r.parts.slice() })); },
    create,
  };
})();
