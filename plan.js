/* ════════════════════════════════════════════════════════════════════
   웹 견적요청 — 집 구조 평면도 (2026-10-24 지시서 1024-웹1 · 시안 89-1)

   앱 '견적 작성 › 평면도'와 같은 방식이다. 축척 없는 격자(가로 24 · 세로 30칸)에 도형을 놓는다.
   · 배치: 끌어 옮기기 · 모서리 점(8개)으로 크기 · 90° · 지우기 · 도형 상자 · 되돌리기 ↺ ↻
   · 공사 고르기: 도형(또는 아래 '공용(전체)' 띠)을 누르면 그 공간의 공종 → 상품을 고른다(단일 선택은 1개 고르면 접힘)

   도형은 고객 집의 '대략의 구조'를 업체가 보기 위한 것이다.
   · 도형 크기는 수량에 쓰지 않는다.
   · 수량은 앱이 계산한다 — 전체 평형(부분 시공은 공간 평형)과 공간 크기(작음 · 보통 · 큼 — 앱의 크기 그룹 치수)로.

   업체에 가는 것(보내는 형식은 그대로)
   · 그림 1장 — 사진 칸
   · 구조 한 줄 — 요청 내용 맨 앞
   · 도형 자료는 앱 평면도와 같은 격자 · 같은 도형 이름으로 둔다(나중에 앱이 그대로 불러올 수 있게).

   [가정] 기본 평면 모양 · 도형 처음 크기 중 앱 문서에 없는 값(현관 · 드레스룸 · 다용도실 · 발코니 · 복도 · 파우더 · 알파룸)은 근사값.

   이 파일은 app.js보다 먼저 읽힌다. 맨 위에서는 선언만 하고, app.js가 다 읽힌 뒤 planInit()을 부른다.
   ════════════════════════════════════════════════════════════════════ */

const PLAN_COLS = 24, PLAN_ROWS = 30, PLAN_MIN = 2, PLAN_MAX_SHAPES = 120, PLAN_NAME_LIMIT = 40, PLAN_STRUCT_MAX = 120;
/* 도형 상자 11종 — 앱 PlanPreset.all 그대로 [이름, 분류, 종류, 가로, 세로]. */
const PLAN_PRESETS = [["거실", "거실", "room", 10, 8], ["침실", "침실", "room", 6, 6], ["주방", "주방", "room", 6, 4], ["욕실", "욕실", "room", 4, 4],
  ["현관", "현관", "room", 4, 4], ["드레스룸", "침실", "room", 4, 4], ["다용도실", "발코니/베란다", "balcony", 4, 2],
  ["발코니", "발코니/베란다", "balcony", 10, 2], ["복도", "", "hall", 4, 8], ["파우더", "욕실", "room", 3, 3], ["알파룸", "침실", "room", 4, 4]];
/* 기본 평면 — 집 크기 3가지 × 확장형 · 비확장형. [이름, 분류, 종류, 칸 x, y, 가로, 세로, 같은 이름 순번]
   20평대 이하 = 앱 PlanTemplates 그대로(침실 2 · 욕실 1). 30평대 · 40평대는 같은 모양에 침실 · 욕실을 더한 것([가정]).
   고르면 앱 '자동 잇기'(adoptRooms)처럼 큰 도형부터 갈래가 같은 견적 공간에 잇는다(안방 · 방1 · 화장실1 · 발코니1 …). */
const PLAN_SIZES = [["small", "20평대 이하"], ["mid", "30평대"], ["large", "40평대 이상"]];
const PLAN_TEMPLATES = (() => {
  const s = (name, category, kind, x, y, w, h, nth = 0) => [name, category, kind, x, y, w, h, nth];
  const backSmall = [s("침실2", "침실", "room", 0, 0, 6, 6), s("후면 발코니 · 다용도실", "발코니/베란다", "balcony", 6, 0, 10, 2),
    s("욕실", "욕실", "room", 6, 2, 4, 4), s("주방", "주방", "room", 10, 2, 6, 4), s("현관", "현관", "room", 16, 0, 4, 4)];
  const backMid = backSmall.concat([s("욕실2", "욕실", "room", 20, 0, 4, 4), s("복도", "", "hall", 16, 4, 4, 4), s("드레스룸", "침실", "room", 20, 4, 4, 4)]);
  const backLarge = [s("침실3", "침실", "room", 0, 0, 6, 6)].concat(backMid.slice(1), [s("침실2", "침실", "room", 0, 6, 6, 6)]);
  return {
    small: {
      ext: backSmall.concat([s("복도", "", "hall", 16, 4, 4, 10), s("침실1", "침실", "room", 0, 6, 6, 8), s("거실", "거실", "room", 6, 6, 10, 8)]),
      base: backSmall.concat([s("복도", "", "hall", 16, 4, 4, 10), s("침실1", "침실", "room", 0, 6, 6, 6), s("거실", "거실", "room", 6, 6, 10, 6),
        s("전면 발코니", "발코니/베란다", "balcony", 0, 12, 6, 2), s("전면 발코니", "발코니/베란다", "balcony", 6, 12, 10, 2, 1)]),
    },
    mid: {
      ext: backMid.concat([s("침실1", "침실", "room", 0, 6, 6, 8), s("거실", "거실", "room", 6, 6, 10, 8), s("침실3", "침실", "room", 16, 8, 8, 8)]),
      base: backMid.concat([s("침실1", "침실", "room", 0, 6, 6, 6), s("거실", "거실", "room", 6, 6, 10, 6), s("침실3", "침실", "room", 16, 8, 8, 6),
        s("전면 발코니", "발코니/베란다", "balcony", 0, 12, 6, 2), s("전면 발코니", "발코니/베란다", "balcony", 6, 12, 10, 2, 1),
        s("전면 발코니", "발코니/베란다", "balcony", 16, 14, 8, 2, 2)]),
    },
    large: {
      ext: backLarge.concat([s("침실1", "침실", "room", 0, 12, 6, 8), s("거실", "거실", "room", 6, 6, 10, 14), s("침실4", "침실", "room", 16, 8, 8, 12)]),
      base: backLarge.concat([s("침실1", "침실", "room", 0, 12, 6, 6), s("거실", "거실", "room", 6, 6, 10, 12), s("침실4", "침실", "room", 16, 8, 8, 10),
        s("전면 발코니", "발코니/베란다", "balcony", 0, 18, 6, 2), s("전면 발코니", "발코니/베란다", "balcony", 6, 18, 10, 2, 1),
        s("전면 발코니", "발코니/베란다", "balcony", 16, 18, 8, 2, 2)]),
    },
  };
})();
const PLAN_BASES = [["base", "비확장형", "발코니가 따로 있는 구조"], ["ext", "확장형", "발코니를 방 · 거실에 합친 구조"], ["empty", "빈 격자", "도형을 하나씩 놓아 직접 그리기"]];
const PLAN_BASE_LABEL = { base: "비확장형", ext: "확장형", empty: "직접 그림", none: "그림 없음" };
/* 앱 저장 글의 base 값 — PlanLayout.Base */
const PLAN_APP_BASE = { base: "nonExpanded", ext: "expanded", empty: "blank", none: "blank" };
/* 갈래(앱 PlanRoomClass) → 이름 · 구조 한 줄 */
const PLAN_CLASS_LABEL = { living: "거실", kitchen: "주방", bath: "욕실", entrance: "현관", balcony: "발코니", dress: "드레스룸", hall: "복도", bedroom: "침실", other: "기타" };
const PLAN_DIRS = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };

/** 평면도 상태 — 고른 공사(공간 · 공종 · 상품)는 app.js의 state.rooms 그대로, 여기에는 도형과 화면 상태만. */
const plan = {
  base: "",          // "" = 아직 안 고름 · base · ext · empty · none(그림 없이 고르기)
  size: "",          // small · mid · large
  /* 도형 — 앱 PlanShape와 같은 칸: { id, name, nth, category, kind(room · balcony · hall), x, y, w, h }.
     견적 공간과는 이름 + 같은 이름 중 순번(nth)으로 이어진다(앱과 같게). room은 그리기용 사본(planRefresh가 채운다). */
  shapes: [],
  mode: "pick",      // arrange(배치) · pick(공사 고르기)
  sel: null,         // 고른 도형 id 또는 "R:<공간>"(공용(전체) 띠 · 도면에 없는 공간)
  open: null,        // 공간 판에서 펼친 공종(하나만)
  ask: "",           // 그 자리 '정말?' — reset · del(도형 위) · del-panel(도형 판)
  err: null,         // { room, text, size } 공간 판 안 오류(다음 · 보내기 검사)
  hist: [], fut: [], // 되돌리기 · 다시
  note: null, noteTimer: 0,
  cell: 20, ox: 0, oy: 0,
};
let planDrag = null, planNoClickUntil = 0;

// ── 작은 도우미 ───────────────────────────────────────────────────────
const planWhole = () => CONFIG.WHOLE_HOUSE_ROOM;
const planNewId = () => "p" + Math.random().toString(36).slice(2, 9);
const planClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const planHit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const planInGrid = r => r.x >= 0 && r.y >= 0 && r.x + r.w <= PLAN_COLS && r.y + r.h <= PLAN_ROWS;
const planFree = (r, exceptId) => !plan.shapes.some(s => s.id !== exceptId && planHit(s, r));
const planShape = id => plan.shapes.find(s => s.id === id) || null;
const planSelShape = () => (plan.sel && !plan.sel.startsWith("R:") ? planShape(plan.sel) : null);
const planRoomLabel = room => room;   // 공간 이름 그대로 — 공용(전체)도 앱과 같은 이름
const planWebRooms = () => WEB.rooms.filter(r => r !== planWhole());
const planReduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const planHasDrawing = () => plan.shapes.length > 0;
function planEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function planBtn(cls, text, onClick, key) {
  const b = planEl("button", cls, text);
  b.type = "button";
  if (key) b.dataset.k = key;
  if (onClick) b.addEventListener("click", onClick);
  return b;
}
/** 공간 갈래 — 앱 PlanRoomClass.of와 같은 낱말 순서('주방'의 '방' · '드레스룸'이 침실로 가지 않게). */
function planClassOf(text) {
  const t = String(text || "").replace(/\s+/g, "");
  if (t.includes("거실")) return "living";
  if (t.includes("주방") || t.includes("부엌")) return "kitchen";
  if (t.includes("욕실") || t.includes("화장실") || t.includes("파우더")) return "bath";
  if (t.includes("현관")) return "entrance";
  if (t.includes("발코니") || t.includes("베란다") || t.includes("다용도")) return "balcony";
  if (t.includes("드레스") || t.includes("옷방") || t.includes("팬트리")) return "dress";
  if (t.includes("복도")) return "hall";
  if (t.includes("침실") || t.includes("방") || t.includes("알파")) return "bedroom";
  return "other";
}
/** 분류가 먼저, 모르면 이름(앱 PlanRoomClass.of(name:type:)). */
const planClassBy = (name, type) => { const c = planClassOf(type); return c === "other" ? planClassOf(name) : c; };
const planShapeClass = s => planClassBy(s.name, s.category);
/** 견적 공간의 분류 — 앱이 올린 표(roomCategories)가 먼저, 없으면 공간 분류 규칙(app.js matchCategory). */
function planRoomCategory(room) {
  if (WEB.roomCategories) return WEB.roomCategories.get(room) || "";
  return matchCategory(room, WEB.categories.map(c => c.name)) || "";
}
const planRoomClass = room => planClassBy(room, planRoomCategory(room));
const planShapeLabel = s => s.name || PLAN_CLASS_LABEL[planShapeClass(s)];
/** 이름 + 순번으로 견적 공간에 이어졌는지 다시 본다(같은 공간에 도형 둘이면 앞 도형만). 바꾼 뒤마다 부른다. */
function planRefresh() {
  const rooms = new Set(planWebRooms()), seen = new Set();
  plan.shapes.forEach(s => {
    const ok = s.nth === 0 && rooms.has(s.name) && !seen.has(s.name);
    if (ok) seen.add(s.name);
    s.room = ok ? s.name : "";
  });
}
/** 도형에 이어진 공간들. */
function planLinked() {
  const set = new Set();
  plan.shapes.forEach(s => { if (s.room) set.add(s.room); });
  return set;
}
/** 이 갈래 도형에 이을 수 있는 견적 공간 — 아직 어느 도형에도 안 이어진 것(keep은 지금 이 도형의 공간). */
function planFreeRooms(cls, keep) {
  const used = planLinked();
  return planWebRooms().filter(r => planRoomClass(r) === cls && (r === keep || !used.has(r)));
}
/** 도면에 없는 견적 공간(놓지 않은 공간). */
const planUnplaced = () => { const used = planLinked(); return planWebRooms().filter(r => !used.has(r)); };
/** 새 도형 이름 — 앱 PlanLink.newName과 같게(침실 · 욕실은 번호, 그 밖은 겹치면 2부터). 견적 공간 이름과도 겹치지 않게. */
function planNewName(base) {
  const keys = new Set(plan.shapes.map(s => s.name).concat(WEB.rooms));
  if (base === "침실" || base === "욕실") {
    let n = keys.has(base) ? 2 : 1;
    while (keys.has(base + n)) n++;
    return base + n;
  }
  if (!keys.has(base)) return base;
  let n = 2;
  while (keys.has(base + n)) n++;
  return base + n;
}
/** 기본 평면을 고른 뒤 — 앱 adoptRooms와 같게: 아직 놓지 않은 견적 공간을 큰 도형부터 갈래가 같은 도형에 잇는다
    (안방 → 가장 큰 침실, 방1 → 다음 침실, 화장실1 → 욕실, 발코니1 → 가장 큰 발코니). 이어진 도형은 그 공간 이름 · 분류로 바뀐다. */
function planAutoLink() {
  planRefresh();
  const used = planLinked();
  const unplaced = planWebRooms().filter(r => !used.has(r));
  if (unplaced.length) {
    const candidates = plan.shapes.map((s, i) => [s, i]).filter(([s]) => !s.room)
      .sort((a, b) => (b[0].w * b[0].h - a[0].w * a[0].h) || (a[1] - b[1])).map(([s]) => s);
    for (const s of candidates) {
      const cls = planShapeClass(s);
      if (cls === "other") continue;
      const i = unplaced.findIndex(r => planRoomClass(r) === cls);
      if (i < 0) continue;
      const room = unplaced.splice(i, 1)[0];
      s.name = room; s.nth = 0; s.category = planRoomCategory(room) || s.category;
      if (!unplaced.length) break;
    }
  }
  // 같은 이름 · 순번을 쥔 다른 도형은 순번을 비킨다
  const seen = new Set();
  plan.shapes.forEach(s => {
    while (seen.has(s.name + "#" + s.nth)) s.nth++;
    seen.add(s.name + "#" + s.nth);
  });
  planRefresh();
}
/** 놓지 않은 공간을 놓을 때의 크기 · 종류 — 앱 PlanPreset.size(forCategory:) · kind(forCategory:)와 같게. */
function planSizeForCategory(category) {
  const p = PLAN_PRESETS.find(x => x[0] === category);
  if (p) return [p[3], p[4]];
  return category === "발코니/베란다" ? [10, 2] : [4, 4];
}
/** 빈 자리 — 위에서부터 왼쪽부터. 없으면 null. */
function planFreeSpot(w, h) {
  for (let y = 0; y + h <= PLAN_ROWS; y++) {
    for (let x = 0; x + w <= PLAN_COLS; x++) {
      const r = { x, y, w, h };
      if (planFree(r)) return r;
    }
  }
  return null;
}
/** 적어 주신 평형으로 고른 집 크기. */
function planRecommendedSize() {
  const py = parseFloat($("#pyeong").value);
  return py > 0 && py < 26 ? "small" : py >= 40 ? "large" : "mid";
}
/** 기본 평면 도형(새 id). */
function planTemplate(base, size) {
  const t = (PLAN_TEMPLATES[size] || PLAN_TEMPLATES.mid)[base === "ext" ? "ext" : "base"];
  return t.map(([name, category, kind, x, y, w, h, nth]) => ({ id: planNewId(), name, nth, category, kind, x, y, w, h, room: "" }));
}

// ── 공간의 상태(도형 꼬리표 · 공간 판) ───────────────────────────────────
/** 공사를 고른 공간 수 · 공종 수 · 확인할 곳. */
function planTotals() {
  const rooms = roomOrder();
  let trades = 0, warn = 0;
  rooms.forEach(r => {
    const d = state.rooms.get(r);
    trades += roomTrades(r).filter(t => d.trades.has(t)).length;
    if (roomIssue(r)) warn++;
  });
  return { rooms: rooms.length, trades, warn };
}
/** 도형 · 띠 · 칩에 쓰는 한 줄 — { text, work, warn }. */
function planRoomTag(room) {
  if (!room) return { text: "", work: false, warn: false };
  const data = state.rooms.get(room);
  if (!data || !roomHasWork(room)) return { text: "", work: false, warn: false };
  const issue = roomIssue(room);
  if (issue) return { text: issue.size ? "크기 선택 필요" : "확인 필요", work: true, warn: true };
  const trades = roomTrades(room).filter(t => data.trades.has(t));
  const size = needsSize(room) && data.size ? data.size + " · " : "";
  return { text: size + trades.slice(0, 2).join(" · ") + (trades.length > 2 ? ` 외 ${trades.length - 2}` : ""), work: true, warn: false };
}
/** 이 공간을 고르는 열쇠 — 도형이 있으면 도형, 없으면 "R:<공간>". */
function planKeyOf(room) {
  const s = plan.shapes.find(x => x.room === room);
  return s ? s.id : "R:" + room;
}
/** 고른 열쇠의 공간 — 이어지지 않은 도형이면 "". */
function planSelRoom() {
  if (!plan.sel) return "";
  if (plan.sel.startsWith("R:")) return plan.sel.slice(2);
  const s = planShape(plan.sel);
  return s ? s.room : "";
}
/** 이 공간에서 고를 수 있는 공종 중 공용(전체)에서만 고르는 것(도배 · 마루 등) — 안내 글에 쓴다. */
function planWholeOnly() {
  const whole = planWhole(), others = planWebRooms();
  if (!WEB.rooms.includes(whole) || !others.length) return [];
  return roomTrades(whole).filter(t => others.every(r => !tradeAllowed(r, t)));
}

// ── 되돌리기 · 안내 ──────────────────────────────────────────────────
function planRoomsOut() {
  return [...state.rooms].map(([k, v]) => [k, [...v.trades], v.pyeong, [...v.items].map(([t, s]) => [t, [...s]]), v.size, [...v.len]]);
}
function planRoomsIn(list) {
  state.rooms.clear();
  list.forEach(([k, t, p, it, sz, ln]) => state.rooms.set(k, {
    trades: new Set(t), pyeong: p, items: new Map(it.map(([a, b]) => [a, new Set(b)])), size: sz, len: new Map(ln),
  }));
}
const planSnap = () => JSON.stringify({ base: plan.base, size: plan.size, shapes: plan.shapes, rooms: planRoomsOut() });
function planApplySnap(text) {
  const s = JSON.parse(text);
  plan.base = s.base; plan.size = s.size; plan.shapes = s.shapes;
  planRoomsIn(s.rooms);
  planRefresh();
  if (plan.sel && !plan.sel.startsWith("R:") && !planShape(plan.sel)) plan.sel = null;
  if (!plan.base) plan.sel = null;
}
/** 바꾸기 한 번 — 바꾸기 전 모습을 되돌리기 목록에 넣고, 안내(5초 되돌리기)를 띄운 뒤 다시 그린다. fn이 false를 돌려주면 없던 일. */
function planDo(text, fn) {
  const before = planSnap();
  if (fn() === false) return false;
  planRefresh();
  plan.hist.push(before);
  if (plan.hist.length > 40) plan.hist.shift();
  plan.fut = [];
  plan.err = null;
  if (text) planSay(text, true);
  afterChange();
  return true;
}
function planUndo() {
  if (!plan.hist.length) return;
  const now = planSnap();
  planApplySnap(plan.hist.pop());
  plan.fut.push(now);
  plan.ask = ""; plan.err = null;
  planSay("되돌렸어요", false);
  afterChange();
}
function planRedo() {
  if (!plan.fut.length) return;
  const now = planSnap();
  planApplySnap(plan.fut.pop());
  plan.hist.push(now);
  plan.ask = ""; plan.err = null;
  planSay("다시 했어요", false);
  afterChange();
}
/** 안내 한 줄 — 5초 뒤 사라진다. undo면 '되돌리기' 단추를 함께. */
function planSay(text, undo) {
  clearTimeout(plan.noteTimer);
  plan.note = { text, undo: !!undo };
  plan.noteTimer = setTimeout(() => { plan.note = null; planRenderNote(); }, 5000);
  planRenderNote();
}

// ── 도형 바꾸기(배치) ─────────────────────────────────────────────────
function planStart(base) {
  const label = PLAN_BASE_LABEL[base];
  planDo(base === "none" ? "그림 없이 고르기" : `${label}으로 시작`, () => {
    plan.base = base;
    plan.size = plan.size || planRecommendedSize();
    plan.shapes = base === "base" || base === "ext" ? planTemplate(base, plan.size) : [];
    planAutoLink();
    plan.mode = base === "empty" ? "arrange" : "pick";
    plan.sel = null; plan.ask = ""; plan.open = null;
  });
}
/** 도형 놓기 — 도형 상자(preset) 또는 놓지 않은 공간(room). 빈 자리에 놓는다.
    도형 상자 도형은 같은 갈래의 빈 견적 공간에 바로 잇는다(고객은 공간을 새로 만들 수 없어서 — 없으면 새 이름 · 그림만). */
function planAdd(preset, room) {
  let name, category, kind, w, h;
  if (room) {
    category = planRoomCategory(room); [w, h] = planSizeForCategory(category);
    kind = category === "발코니/베란다" ? "balcony" : "room"; name = room;
  } else {
    [name, category, kind, w, h] = preset;
    const free = kind === "hall" ? [] : planFreeRooms(planClassBy(name, category), "");
    if (free.length) { name = free[0]; category = planRoomCategory(free[0]) || category; }
    else name = planNewName(name);
  }
  const spot = planFreeSpot(w, h) || planFreeSpot(h, w) || planFreeSpot(PLAN_MIN, PLAN_MIN);
  if (!spot) { planSay("빈 자리가 없어요 · 도형을 줄이거나 지워 주세요", false); return; }
  if (plan.shapes.length >= PLAN_MAX_SHAPES) { planSay(`도형은 ${PLAN_MAX_SHAPES}개까지 놓을 수 있어요`, false); return; }
  const s = { id: planNewId(), name, nth: 0, category, kind, x: spot.x, y: spot.y, w: spot.w, h: spot.h, room: "" };
  planDo(`${name} 놓음`, () => { plan.shapes.push(s); plan.sel = s.id; plan.ask = ""; });
}
/** 자리 · 크기 바꾸기 — 격자 밖 · 겹침이면 안내만. */
function planPlace(id, r, text) {
  const s = planShape(id);
  if (!s) return false;
  if (!planInGrid(r)) { planSay("격자 밖으로는 놓을 수 없어요", false); return false; }
  if (!planFree(r, id)) { planSay("겹치는 자리에는 놓을 수 없어요", false); return false; }
  return planDo(text, () => { s.x = r.x; s.y = r.y; s.w = r.w; s.h = r.h; plan.ask = ""; });
}
function planRotate(id) {
  const s = planShape(id);
  if (!s) return;
  const r = { x: s.x, y: s.y, w: s.h, h: s.w };
  r.x = Math.min(r.x, PLAN_COLS - r.w); r.y = Math.min(r.y, PLAN_ROWS - r.h);
  planPlace(id, r, `${planShapeLabel(s)} 90° 돌림`);
}
function planResize(id, dw, dh) {
  const s = planShape(id);
  if (!s) return;
  const r = { x: s.x, y: s.y, w: s.w + dw, h: s.h + dh };
  if (r.w < PLAN_MIN || r.h < PLAN_MIN) return;
  planPlace(id, r, `${planShapeLabel(s)} ${r.w} × ${r.h}칸`);
}
/** 도형 지우기 — 이어진 공간에 고른 공사가 있으면 그 자리 '정말?'(공간 · 상품도 함께 빠진다 — 앱과 같게). */
function planDelete(id, sure, fromPanel) {
  const s = planShape(id);
  if (!s) return;
  if (s.room && roomHasWork(s.room) && !sure) { plan.sel = id; plan.ask = fromPanel ? "del-panel" : "del"; planRender(); return; }
  planDo(`${planShapeLabel(s)} 지움`, () => {
    plan.shapes = plan.shapes.filter(x => x.id !== id);
    if (s.room) state.rooms.delete(s.room);
    plan.sel = null; plan.ask = "";
  });
}
/** 이름(견적 공간) 바꾸기 — room이 ""면 '이름 없음'(새 이름 · 그림만). 앱 도형 판 '이름'(1470)과 같다. */
function planRelink(id, room) {
  const s = planShape(id);
  if (!s || s.room === room) return;
  const cls = planShapeClass(s);
  const name = room || planNewName(cls === "bedroom" ? "침실" : cls === "bath" ? "욕실" : PLAN_CLASS_LABEL[cls]);
  planDo(room ? `이름 · ${room}` : `${name} · 견적 공간 없음`, () => {
    s.name = name; s.nth = 0;
    if (room) s.category = planRoomCategory(room) || s.category;
    plan.ask = "";
  });
}
function planSetMode(mode) {
  if (plan.mode === mode) return;
  plan.mode = mode; plan.ask = ""; plan.open = null; plan.err = null;
  planRender(); saveDraft();
}
function planSelect(key) {
  const changed = plan.sel !== key;
  plan.sel = key; plan.ask = "";
  if (changed) { plan.open = null; plan.err = null; }
  planRender();
  if (changed && key && !planPanelInSide()) planRevealPanel();
}
function planDeselect() {
  plan.sel = null; plan.ask = ""; plan.open = null;
  planRender();
  const board = $("#planBoard");
  if (!planPanelInSide() && board) reveal(board);
}

// ── 공사 고르기 ──────────────────────────────────────────────────────
function planEnsure(room) {
  if (!state.rooms.has(room)) state.rooms.set(room, newRoom());
  return state.rooms.get(room);
}
function planPick(room, trade, name) {
  const single = isSingle(trade);
  const cur = state.rooms.get(room), had = !!(cur && cur.items.get(trade) && cur.items.get(trade).has(name));
  planDo(`${room} ‹ ${name} ${had ? "뺌" : "담음"}`, () => {
    const data = planEnsure(room);
    let set = data.items.get(trade) || new Set();
    if (had) set.delete(name);
    else { if (single) set = new Set(); set.add(name); }
    if (set.size) { data.items.set(trade, set); data.trades.add(trade); }
    else { data.items.delete(trade); data.trades.delete(trade); data.len.delete(trade); }
  });
  // 단일 선택은 1개를 고르면 잠깐 보여 주고 접는다 — 그 공종 줄로(사용자 결정 2026-10-10 · 앱 1023-11과 같게)
  if (!had && single) setTimeout(() => {
    if (plan.open !== trade || planSelRoom() !== room || current !== "plan") return;
    plan.open = null; planRender();
    const head = $(`#planPanel [data-k="t-${CSS.escape(trade)}"]`);
    if (head) head.focus({ preventScroll: true });
  }, 300);
}
/** 상품이 없는 공종 — 눌러서 담기 / 빼기. */
function planToggleTrade(room, trade) {
  const cur = state.rooms.get(room), on = !!(cur && cur.trades.has(trade));
  planDo(`${room} ‹ ${trade} ${on ? "뺌" : "담음"}`, () => {
    const data = planEnsure(room);
    if (on) data.trades.delete(trade); else data.trades.add(trade);
  });
}
function planClearRoom(room) {
  planDo(`${room} 비움`, () => { state.rooms.delete(room); plan.open = null; });
}
function planSetSize(room, title) {
  const data = state.rooms.get(room);
  if (!data) return;
  data.size = title;
  if (plan.err && plan.err.room === room && plan.err.size) plan.err = null;
  afterChange();
}

// ── 그리기 ────────────────────────────────────────────────────────────
const planPanelInSide = () => wideScreen() && current === "plan";
/** 공간 판 자리 — 넓은 화면은 오른쪽(이전 · 다음 위), 폰 · 태블릿 세로는 도면 아래. */
function planPlacePanel() {
  const p = $("#planPanel"), side = $("#side"), slot = $("#planPanelSlot");
  if (!p || !side || !slot) return;
  const inSide = planPanelInSide();
  if (inSide && p.parentNode !== side) side.insertBefore(p, $("#bar"));
  if (!inSide && p.parentNode !== slot) slot.appendChild(p);
  p.classList.toggle("inline", !inSide);
  p.hidden = current !== "plan";
}
function planRevealPanel() {
  const p = $("#planPanel");
  if (!p) return;
  const y = scrollY + p.getBoundingClientRect().top - 64;
  window.scrollTo({ top: Math.max(0, y), behavior: planReduced() ? "auto" : "smooth" });
}
function planRender() {
  if (!$("#planStep")) return;
  const active = document.activeElement, key = active && active.dataset ? active.dataset.k : null;
  const panel = $("#planPanel"), scroll = panel ? panel.scrollTop : 0;
  planPlacePanel();
  planRenderTools(); planRenderBox(); planRenderBoard(); planRenderExtra(); planRenderPanel(); planRenderNote(); planRenderBarNote();
  if (panel) panel.scrollTop = scroll;
  if (key) { const again = $(`#planStep [data-k="${CSS.escape(key)}"], #planPanel [data-k="${CSS.escape(key)}"]`); if (again) again.focus({ preventScroll: true }); }
}

function planRenderTools() {
  const box = $("#planTools");
  box.textContent = "";
  box.hidden = !plan.base;
  if (!plan.base) return;
  const seg = planEl("div", "seg");
  seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "도면 모드");
  [["arrange", "배치"], ["pick", "공사 고르기"]].forEach(([m, label]) => {
    const b = planBtn("", label, () => planSetMode(m), "mode-" + m);
    b.setAttribute("aria-pressed", String(plan.mode === m));
    seg.appendChild(b);
  });
  box.appendChild(seg);
  if (plan.mode === "arrange") {
    const tools = planEl("div", "tools");
    const reset = planBtn("tool-btn", "기본 평면 ⌄", () => { plan.ask = plan.ask === "reset" ? "" : "reset"; planRender(); }, "reset");
    reset.setAttribute("aria-expanded", String(plan.ask === "reset"));
    const u = planBtn("tool-btn icon", "↺", planUndo, "undo"); u.setAttribute("aria-label", "되돌리기"); u.disabled = !plan.hist.length;
    const r = planBtn("tool-btn icon", "↻", planRedo, "redo"); r.setAttribute("aria-label", "다시"); r.disabled = !plan.fut.length;
    tools.append(reset, u, r);
    box.appendChild(tools);
  }
  if (plan.ask === "reset") {
    const row = planEl("div", "plan-ask");
    row.append(planEl("b", "", "정말 다시 고를까요?"), planEl("span", "", "놓은 도형이 지워져요 · 고른 공사는 그대로"));
    const go = planBtn("tool-btn", "기본 평면 다시 고르기", () => planDo("기본 평면 다시 고르기", () => {
      plan.base = ""; plan.shapes = []; plan.sel = null; plan.ask = ""; plan.mode = "pick";
    }), "reset-go");
    const no = planBtn("tool-btn plain", "닫기", () => { plan.ask = ""; planRender(); }, "reset-no");
    row.append(go, no);
    box.appendChild(row);
  }
}

/** 도형 상자(배치) — 놓지 않은 공간 · 기본 도형 11종. 누르면 빈 자리에 놓인다. */
function planRenderBox() {
  const box = $("#planBox");
  box.textContent = "";
  box.hidden = !(plan.base && plan.mode === "arrange");
  if (box.hidden) return;
  const un = planUnplaced();
  if (un.length) {
    box.appendChild(planEl("p", "plan-label", "놓지 않은 공간 · 견적에는 들어가요 · 누르면 빈 자리에"));
    const row = planEl("div", "plan-chips");
    un.forEach(r => row.appendChild(planBtn("chip unplaced", r, () => planAdd(null, r), "un-" + r)));
    box.appendChild(row);
  }
  box.appendChild(planEl("p", "plan-label", "기본 도형 · 누르면 빈 자리에"));
  const row = planEl("div", "plan-chips kinds");
  PLAN_PRESETS.forEach(preset => {
    const [name, , , w, h] = preset;
    const b = planBtn("chip kind", null, () => planAdd(preset, ""), "kind-" + name);
    b.append(planEl("span", "", name), planEl("small", "", `${w}×${h}`));
    b.setAttribute("aria-label", `${name} 도형 놓기`);
    row.appendChild(b);
  });
  box.appendChild(row);
}

/** 처음 — 집 크기 · 기본 평면 고르기(앱 1479와 같은 자리). */
function planRenderStart(board) {
  const wrap = planEl("div", "plan-start");
  const size = plan.size || planRecommendedSize();
  const py = parseFloat($("#pyeong").value);
  const sizeRow = planEl("div", "plan-sizes");
  sizeRow.setAttribute("role", "group"); sizeRow.setAttribute("aria-label", "집 크기");
  sizeRow.appendChild(planEl("span", "plan-label inline", "집 크기"));
  PLAN_SIZES.forEach(([k, label]) => {
    const b = planBtn("chip", label, () => { plan.size = k; planRender(); saveDraft(); }, "size-" + k);
    b.setAttribute("aria-pressed", String(size === k));
    sizeRow.appendChild(b);
  });
  wrap.appendChild(sizeRow);
  if (py > 0 && !plan.size) wrap.appendChild(planEl("p", "plan-hint", `적어 주신 ${py}평에 맞춰 골라 두었어요.`));
  const cards = planEl("div", "plan-cards");
  PLAN_BASES.forEach(([base, label, sub]) => {
    const b = planBtn("plan-card", null, () => { plan.size = size; planStart(base); }, "base-" + base);
    const mini = planEl("div", "plan-mini");
    mini.setAttribute("aria-hidden", "true");
    const shapes = base === "empty" ? [] : planTemplate(base, size);
    const gw = Math.max(...shapes.map(s => s.x + s.w), 1), gh = Math.max(...shapes.map(s => s.y + s.h), 1);
    const c = Math.min(176 / gw, 120 / gh);
    if (!shapes.length) mini.classList.add("empty");
    shapes.forEach(s => {
      const q = planEl("i");
      q.style.left = s.x * c + "px"; q.style.top = s.y * c + "px";
      q.style.width = Math.max(2, s.w * c - 2) + "px"; q.style.height = Math.max(2, s.h * c - 2) + "px";
      mini.appendChild(q);
    });
    b.append(mini, planEl("b", "", label), planEl("span", "", sub));
    cards.appendChild(b);
  });
  wrap.appendChild(cards);
  wrap.appendChild(planBtn("link-btn plan-skip", "그림 없이 공간 이름으로 고르기", () => planStart("none"), "base-none"));
  board.appendChild(wrap);
}

/** 도면 — 배치는 격자 전체(24 × 30), 공사 고르기는 놓인 도형만큼 크게. */
function planRenderBoard() {
  const board = $("#planBoard");
  board.textContent = "";
  if (!plan.base) { planRenderStart(board); return; }
  const arrange = plan.mode === "arrange";
  if (!arrange && !plan.shapes.length) {
    board.appendChild(planEl("div", "empty", plan.base === "none"
      ? "그림 없이 고르는 중이에요. 아래에서 공간을 눌러 공사를 골라 주세요."
      : "놓인 도형이 없어요. '배치'에서 도형을 놓거나 아래에서 공간을 눌러 주세요."));
    return;
  }
  let x0 = 0, y0 = 0, gw = PLAN_COLS, gh = PLAN_ROWS;
  if (!arrange) {
    x0 = Math.min(...plan.shapes.map(s => s.x)); y0 = Math.min(...plan.shapes.map(s => s.y));
    gw = Math.max(...plan.shapes.map(s => s.x + s.w)) - x0; gh = Math.max(...plan.shapes.map(s => s.y + s.h)) - y0;
  }
  const W = board.clientWidth || 340, wide = wideScreen();
  const maxH = arrange ? (wide ? Math.max(420, innerHeight - 260) : 1e4) : (wide ? Math.max(360, innerHeight - 330) : 460);
  const cell = planClamp(Math.floor(Math.min(W / gw, maxH / gh)), 10, arrange ? 28 : 44);
  plan.cell = cell; plan.ox = x0; plan.oy = y0;
  const grid = planEl("div", "plan-grid" + (arrange ? " arrange" : ""));
  grid.style.width = gw * cell + "px"; grid.style.height = gh * cell + "px";
  grid.style.setProperty("--cell", cell + "px");
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", arrange
    ? "집 구조 도면 — 도형을 끌어 옮기고 모서리 점으로 크기를 바꿔요. 키보드: 방향키 옮기기 · Shift+방향키 크기 · R 돌리기 · Delete 지우기"
    : "집 구조 도면 — 도형을 누르면 그 공간의 공사를 골라요");
  plan.shapes.forEach(s => grid.appendChild(planShapeEl(s, arrange)));
  const sel = planSelShape();
  if (arrange && sel) {
    Object.keys(PLAN_DIRS).forEach(d => {
      const h = planEl("button", "plan-h");
      h.type = "button"; h.dataset.h = d; h.tabIndex = -1;
      h.setAttribute("aria-hidden", "true");
      grid.appendChild(h);
    });
    planPlaceHandles(grid, planRectPx(sel));
    grid.appendChild(planFloatEl(sel));
  }
  grid.addEventListener("pointerdown", planDown);
  grid.addEventListener("pointermove", planMove);
  grid.addEventListener("pointerup", planUp);
  grid.addEventListener("pointercancel", planUp);
  grid.addEventListener("click", e => {
    if (Date.now() < planNoClickUntil) return;
    const el = e.target.closest(".shape");
    if (el) planSelect(el.dataset.sid);
  });
  grid.addEventListener("keydown", planKey);
  board.appendChild(grid);
  if (arrange && sel) planPlaceFloat(grid, planRectPx(sel));
}
const planRectPx = s => ({ l: (s.x - plan.ox) * plan.cell, t: (s.y - plan.oy) * plan.cell, w: s.w * plan.cell, h: s.h * plan.cell });
function planShapeEl(s, arrange) {
  const r = planRectPx(s);
  const b = planBtn("shape", null, null, "s-" + s.id);
  b.dataset.sid = s.id;
  b.style.left = r.l + 1 + "px"; b.style.top = r.t + 1 + "px";
  b.style.width = r.w - 2 + "px"; b.style.height = r.h - 2 + "px";
  const tag = planRoomTag(s.room);
  b.classList.toggle("unlinked", !s.room);
  b.classList.toggle("work", !arrange && tag.work && !tag.warn);
  b.classList.toggle("warn", !arrange && tag.warn);
  b.classList.toggle("sel", plan.sel === s.id);
  b.classList.toggle("tiny", r.w < 56 || r.h < 46);
  const label = planShapeLabel(s);
  const t = arrange ? `${s.w} × ${s.h}` : (s.room ? tag.text : "견적 공간 없음");
  b.append(planEl("span", "s-name", label), planEl("span", "s-tag", t));
  b.setAttribute("aria-pressed", String(plan.sel === s.id));
  b.setAttribute("aria-label", arrange
    ? `${label} 도형 ${s.w} × ${s.h}칸${s.room ? "" : " · 견적 공간 없음"}`
    : `${label} — ${s.room ? tag.text || "고른 공사 없음" : "견적 공간 없음"}`);
  return b;
}
function planPlaceHandles(grid, r) {
  $$(".plan-h", grid).forEach(h => {
    const [fx, fy] = PLAN_DIRS[h.dataset.h];
    h.style.left = r.l + r.w * fx + "px"; h.style.top = r.t + r.h * fy + "px";
  });
}
/** 고른 도형 위 [90° · 지우기] — 지우기를 누르면 그 자리 '정말?'(담긴 공사가 있을 때만). */
function planFloatEl(s) {
  const f = planEl("div", "plan-float");
  if (plan.ask === "del") {
    const n = s.room && state.rooms.get(s.room) ? roomTrades(s.room).filter(t => state.rooms.get(s.room).trades.has(t)).length : 0;
    f.append(planEl("span", "q", `정말 지우기? 담긴 공사 ${n}건도 빠져요`),
      planBtn("del-go", "지우기", () => planDelete(s.id, true), "del-go"),
      planBtn("", "취소", () => { plan.ask = ""; planRender(); }, "del-no"));
  } else {
    f.append(planBtn("", "90°", () => planRotate(s.id), "rot"), planEl("i"), planBtn("del", "지우기", () => planDelete(s.id), "del"));
  }
  return f;
}
function planPlaceFloat(grid, r) {
  const f = $(".plan-float", grid);
  if (!f) return;
  const fw = f.offsetWidth, fh = f.offsetHeight, gw = grid.offsetWidth;
  f.style.left = planClamp(r.l, 0, Math.max(0, gw - fw)) + "px";
  f.style.top = (r.t - fh - 8 >= 0 ? r.t - fh - 8 : r.t + r.h + 8) + "px";
}

// 끌기 — 손가락을 따라 테두리가 이어서 움직이고(앱 1023-02), 놓일 칸은 옅게 · 겹치면 주황, 놓으면 가장 가까운 칸.
function planDown(e) {
  if (plan.mode !== "arrange" || (e.pointerType === "mouse" && e.button !== 0)) return;
  const grid = e.currentTarget, h = e.target.closest(".plan-h"), el = e.target.closest(".shape");
  if (!h && !el) return;
  const id = h ? plan.sel : el.dataset.sid, s = planShape(id);
  if (!s) return;
  e.preventDefault();
  try { grid.setPointerCapture(e.pointerId); } catch {}
  planDrag = { id, kind: h ? h.dataset.h : "move", x0: e.clientX, y0: e.clientY, o: { x: s.x, y: s.y, w: s.w, h: s.h },
    moved: false, grid, el: $(`.shape[data-sid="${CSS.escape(id)}"]`, grid), ghost: null, snap: null, bad: false };
}
function planMove(e) {
  const d = planDrag;
  if (!d) return;
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
  if (!d.moved) {
    if (Math.abs(dx) + Math.abs(dy) < 6) return;
    d.moved = true;
    d.grid.classList.add("dragging");
    d.ghost = planEl("div", "plan-ghost");
    d.grid.appendChild(d.ghost);
    if (d.el) d.el.classList.add("lift");
    if (d.id !== plan.sel) $$(".plan-h", d.grid).forEach(x => { x.hidden = true; });
  }
  const c = plan.cell, o = d.o, GW = PLAN_COLS * c, GH = PLAN_ROWS * c;
  let L = o.x * c, T = o.y * c, R = L + o.w * c, B = T + o.h * c;
  if (d.kind === "move") {
    const w = R - L, h = B - T;
    L = planClamp(L + dx, 0, GW - w); T = planClamp(T + dy, 0, GH - h); R = L + w; B = T + h;
  } else {
    if (d.kind.includes("w")) L = planClamp(L + dx, 0, R - PLAN_MIN * c);
    if (d.kind.includes("e")) R = planClamp(R + dx, L + PLAN_MIN * c, GW);
    if (d.kind.includes("n")) T = planClamp(T + dy, 0, B - PLAN_MIN * c);
    if (d.kind.includes("s")) B = planClamp(B + dy, T + PLAN_MIN * c, GH);
  }
  if (d.el) {
    d.el.style.left = L + 1 + "px"; d.el.style.top = T + 1 + "px";
    d.el.style.width = R - L - 2 + "px"; d.el.style.height = B - T - 2 + "px";
  }
  let x = Math.round(L / c), y = Math.round(T / c), w = Math.round(R / c) - x, h = Math.round(B / c) - y;
  if (d.kind === "move") { w = o.w; h = o.h; }
  w = Math.max(PLAN_MIN, w); h = Math.max(PLAN_MIN, h);
  x = planClamp(x, 0, PLAN_COLS - w); y = planClamp(y, 0, PLAN_ROWS - h);
  d.snap = { x, y, w, h };
  d.bad = !planFree(d.snap, d.id);
  d.ghost.style.left = x * c + "px"; d.ghost.style.top = y * c + "px";
  d.ghost.style.width = w * c + "px"; d.ghost.style.height = h * c + "px";
  d.ghost.classList.toggle("bad", d.bad);
  if (d.el) { const t = $(".s-tag", d.el); if (t) t.textContent = d.bad ? "겹침" : `${w} × ${h}`; }
  if (d.id === plan.sel) planPlaceHandles(d.grid, { l: L, t: T, w: R - L, h: B - T });
}
function planUp(e) {
  const d = planDrag;
  planDrag = null;
  if (!d) return;
  try { d.grid.releasePointerCapture(e.pointerId); } catch {}
  planNoClickUntil = Date.now() + 400;   // 이어 오는 click은 무시(고르기는 여기서)
  if (!d.moved) { if (e.type === "pointerup") planSelect(d.id); return; }
  const s = planShape(d.id), r = d.snap, o = d.o;
  if (e.type === "pointercancel" || !s || !r || (r.x === o.x && r.y === o.y && r.w === o.w && r.h === o.h)) { planRender(); return; }
  if (d.bad) { planSay("겹치는 자리에는 놓을 수 없어요", false); planRender(); return; }
  plan.sel = d.id;
  planDo(`${planShapeLabel(s)} ${d.kind === "move" ? "옮김" : `${r.w} × ${r.h}칸`}`, () => { s.x = r.x; s.y = r.y; s.w = r.w; s.h = r.h; plan.ask = ""; });
}
/** 키보드(배치) — 방향키 옮기기 · Shift+방향키 크기 · R 돌리기 · Delete 지우기 · Esc 고르기 풀기. */
function planKey(e) {
  if (plan.mode !== "arrange") return;
  const el = e.target.closest && e.target.closest(".shape");
  if (!el) return;
  const s = planShape(el.dataset.sid);
  if (!s) return;
  const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (dirs[e.key]) {
    e.preventDefault();
    const [dx, dy] = dirs[e.key];
    plan.sel = s.id;
    if (e.shiftKey) planResize(s.id, dx, dy);
    else planPlace(s.id, { x: s.x + dx, y: s.y + dy, w: s.w, h: s.h }, `${planShapeLabel(s)} 옮김`);
  } else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); planDelete(s.id); }
  else if (e.key === "r" || e.key === "R") { e.preventDefault(); plan.sel = s.id; planRotate(s.id); }
  else if (e.key === "Escape") { plan.sel = null; plan.ask = ""; planRender(); }
}

/** 도면 아래 공용(전체) 띠 — 앱 '평면도 › 공종'의 띠(1484)와 같은 이름 · 글: '공용(전체) · 바깥 테두리 · 집 전체'.
    배치에서도 보인다(누르면 공사 고르기로 바뀌며 공용(전체) 판이 열린다). 공사 고르기에서는 아래에 도면에 없는 공간 칩. */
function planRenderExtra() {
  const box = $("#planExtra");
  box.textContent = "";
  box.hidden = !plan.base;
  if (box.hidden) return;
  const whole = planWhole();
  if (WEB.rooms.includes(whole)) {
    const key = "R:" + whole, tag = planRoomTag(whole), data = state.rooms.get(whole);
    const picks = data ? roomTrades(whole).filter(t => data.trades.has(t)).map(t => {
      const names = pickedNames(data, t);
      return names.length ? `${t} · ${names[0]}${names.length > 1 ? ` 외 ${names.length - 1}` : ""}` : t;
    }) : [];
    const py = parseFloat($("#pyeong").value);
    const band = planBtn("plan-band", null, () => {
      if (plan.mode !== "pick") { plan.mode = "pick"; plan.ask = ""; }
      planSelect(key);
    }, "band");
    band.classList.toggle("sel", plan.sel === key && plan.mode === "pick");
    band.classList.toggle("work", tag.work && !tag.warn);
    band.classList.toggle("warn", tag.warn);
    const top = planEl("span", "band-top");
    top.append(planEl("b", "", whole), planEl("span", "t", `바깥 테두리 · 집 전체${py > 0 ? ` ${py}평` : ""}`),
      planEl("span", "r", tag.warn ? "확인 필요" : picks.length ? `담긴 것 ${picks.length}` : "누르면 집 전체 공종"));
    band.appendChild(top);
    if (picks.length) {
      const tags = planEl("span", "band-tags");
      picks.forEach(t => tags.appendChild(planEl("span", "tag", t)));
      band.appendChild(tags);
    }
    band.setAttribute("aria-label", `${whole} — 바깥 테두리 · 집 전체. ${picks.length ? `담긴 것 ${picks.join(", ")}` : "누르면 집 전체 공종"}`);
    band.setAttribute("aria-pressed", String(plan.sel === key && plan.mode === "pick"));
    box.appendChild(band);
  }
  if (plan.mode !== "pick") return;
  const off = planUnplaced();
  if (off.length) {
    box.appendChild(planEl("p", "plan-label", plan.shapes.length ? "도면에 없는 공간" : "공간"));
    const row = planEl("div", "plan-chips");
    off.forEach(r => {
      const tag = planRoomTag(r), key = "R:" + r;
      const b = planBtn("chip room", null, () => planSelect(key), "off-" + r);
      b.append(planEl("span", "", r));
      if (tag.text) b.append(planEl("small", "", tag.text));
      b.classList.toggle("work", tag.work && !tag.warn);
      b.classList.toggle("warn", tag.warn);
      b.setAttribute("aria-pressed", String(plan.sel === key));
      row.appendChild(b);
    });
    box.appendChild(row);
  }
}

function planRenderNote() {
  const box = $("#planNote");
  if (!box) return;
  box.textContent = "";
  if (plan.note) {
    const pill = planEl("span", "pill");
    pill.append(planEl("span", "", plan.note.text));
    if (plan.note.undo && plan.hist.length) pill.append(planBtn("", "되돌리기", planUndo, "note-undo"));
    box.appendChild(pill);
    return;
  }
  const wide = wideScreen();
  box.appendChild(planEl("span", "", !plan.base ? "우리 집과 가까운 기본 평면을 골라 주세요."
    : plan.mode === "arrange" ? (wide ? "끌어서 옮기고 모서리 점으로 크기를 바꿔요 · 겹치면 놓이지 않아요" : "끌어서 옮기고 점으로 크기 조절 · 겹치면 안 놓여요")
    : "도형을 눌러 공종 고르기 · 담으면 5초 되돌리기 · 아래 띠 = 공용(전체)"));
}
/** 아래(넓은 화면은 오른쪽 아래) 한 줄 — 고른 공간 · 공사 · 확인할 곳. */
function planRenderBarNote() {
  const n = $("#barNote");
  if (!n) return;
  n.hidden = current !== "plan";
  if (n.hidden) return;
  const t = planTotals();
  $("#barNoteText").textContent = t.rooms ? `고른 공간 ${t.rooms}곳 · 공사 ${t.trades}건` : "아직 고른 공사가 없어요";
  $("#barNoteWarn").textContent = t.warn ? `확인 필요 ${t.warn}곳` : "";
}

// ── 공간 판(오른쪽 · 폰은 도면 아래) ────────────────────────────────────
function planRenderPanel() {
  const p = $("#planPanel");
  if (!p) return;
  p.textContent = "";
  if (current !== "plan") return;
  if (!plan.base) {
    planPanelHead(p, "기본 평면", "", false);
    p.append(planEl("p", "pp-text", "우리 집과 가까운 모양을 고르면 도형이 놓여요. 도형을 눌러 공간마다 공사와 상품을 골라 주세요."),
      planEl("p", "pp-text", "도형은 대략의 구조만 보여 드리는 그림이에요. 수량은 적어 주신 평형과 공간 크기로 계산해요."));
    return;
  }
  if (plan.mode === "arrange") {
    const s = planSelShape();
    if (s) planPanelShape(p, s);
    else {
      planPanelHead(p, "도형을 눌러 주세요", "", false);
      p.append(planEl("p", "pp-text", "여기에서 이름(견적 공간) · 크기를 바꾸고 돌리거나 지워요."),
        planEl("p", "pp-text", "도형은 끌어서 옮기고, 모서리 점을 끌어 크기를 바꿔요. 도형 크기는 모양만 — 수량은 평형으로 계산해요."),
        planBtn("btn primary pp-go", "공사 고르기로", () => planSetMode("pick"), "to-pick"));
    }
    return;
  }
  const s = planSelShape(), room = planSelRoom();
  if (s && !s.room) { planPanelUnlinked(p, s); return; }
  if (room) { planPanelRoom(p, room); return; }
  planPanelHead(p, "도형을 눌러 주세요", "도면의 공간이나 아래 '공용(전체)' 띠를 누르면 여기에서 공사와 상품을 골라요.", false);
  const rooms = roomOrder();
  rooms.forEach(r => {
    const tag = planRoomTag(r);
    const b = planBtn("pp-room", null, () => planSelect(planKeyOf(r)), "list-" + r);
    b.classList.toggle("warn", tag.warn);
    b.append(planEl("b", "", planRoomLabel(r)), planEl("span", "", tag.text), planEl("i", "", "›"));
    p.appendChild(b);
  });
}
function planPanelHead(p, title, sub, closable) {
  const head = planEl("div", "pp-head");
  const t = planEl("div", "pp-title");
  t.append(planEl("h3", "", title));
  if (sub) t.append(planEl("p", "", sub));
  head.appendChild(t);
  if (closable && !planPanelInSide()) {
    const x = planBtn("icon-btn", "닫기", planDeselect, "close");
    x.setAttribute("aria-label", "닫고 도면으로");
    head.appendChild(x);
  }
  p.appendChild(head);
  return head;
}
/** 배치 — 고른 도형 판(이름 · 크기 · 돌리기 · 지우기). */
function planPanelShape(p, s) {
  const cls = planShapeClass(s);
  planPanelHead(p, planShapeLabel(s), `분류 ${PLAN_CLASS_LABEL[cls]} · ${s.w} × ${s.h}칸${s.room ? "" : " · 견적 공간 없음"}`, true);
  p.appendChild(planEl("p", "pp-note", "도형 크기는 모양만 — 수량은 적어 주신 평형과 공간 크기로 계산해요."));
  p.appendChild(planEl("p", "plan-label", "이름 (견적 공간)"));
  const options = planFreeRooms(cls, s.room);
  const row = planEl("div", "plan-chips");
  options.forEach(r => {
    const b = planBtn("chip", r, () => planRelink(s.id, r), "name-" + r);
    b.setAttribute("aria-pressed", String(s.room === r));
    row.appendChild(b);
  });
  const none = planBtn("chip", "이름 없음", () => planRelink(s.id, ""), "name-none");
  none.setAttribute("aria-pressed", String(!s.room));
  row.appendChild(none);
  p.appendChild(row);
  if (!options.length) p.appendChild(planEl("p", "pp-text small", `'${PLAN_CLASS_LABEL[cls]}' 갈래의 견적 공간이 없어요. 이 도형은 그림으로만 전달돼요 — 필요한 공사는 마지막 단계 요청사항에 적어 주세요.`));
  p.appendChild(planEl("p", "plan-label", "크기 (칸)"));
  const sizes = planEl("div", "pp-steppers");
  [["가로", s.w, [-1, 0], [1, 0]], ["세로", s.h, [0, -1], [0, 1]]].forEach(([label, v, minus, plus]) => {
    const box = planEl("div", "stepper");
    const m = planBtn("", "−", () => planResize(s.id, ...minus), `sz-${label}-m`); m.setAttribute("aria-label", `${label} 줄이기`); m.disabled = v <= PLAN_MIN;
    const pl = planBtn("", "+", () => planResize(s.id, ...plus), `sz-${label}-p`); pl.setAttribute("aria-label", `${label} 늘리기`);
    box.append(planEl("span", "", label), m, planEl("b", "", String(v)), pl);
    sizes.appendChild(box);
  });
  p.appendChild(sizes);
  const acts = planEl("div", "pp-acts");
  acts.append(planBtn("btn", "90° 돌리기", () => planRotate(s.id), "p-rot"), planBtn("btn warn", "도형 지우기", () => planDelete(s.id, false, true), "p-del"));
  p.appendChild(acts);
  if (plan.ask === "del-panel") {
    const ask = planEl("div", "plan-ask");
    ask.append(planEl("b", "", "정말 지울까요?"), planEl("span", "", "이 공간에 고른 공사도 함께 빠져요"),
      planBtn("tool-btn warn", "지우기", () => planDelete(s.id, true), "p-del-go"), planBtn("tool-btn plain", "취소", () => { plan.ask = ""; planRender(); }, "p-del-no"));
    p.appendChild(ask);
  }
  if (s.room && roomHasWork(s.room)) {
    const tag = planRoomTag(s.room);
    const w = planEl("div", "pp-work");
    w.append(planEl("span", "", "담긴 공사"), planEl("b", "", tag.text), planBtn("link-btn", "공사 고르기 ›", () => { planSetMode("pick"); planSelect(s.id); }, "p-pick"));
    p.appendChild(w);
  }
}
/** 공사 고르기 — 견적 공간에 이어지지 않은 도형. */
function planPanelUnlinked(p, s) {
  planPanelHead(p, planShapeLabel(s), "견적 공간 없음", true);
  const options = planFreeRooms(planShapeClass(s), "");
  p.appendChild(planEl("p", "pp-text", options.length
    ? "이 도형을 견적 공간으로 이으면 공사를 고를 수 있어요."
    : "그림으로만 업체에 전달돼요. 필요한 공사는 마지막 단계 요청사항에 적어 주세요."));
  if (options.length) {
    const row = planEl("div", "plan-chips");
    options.forEach(r => row.appendChild(planBtn("chip", r, () => planRelink(s.id, r), "name-" + r)));
    p.appendChild(row);
  }
}
/** 공사 고르기 — 공간 판(공간 평형 · 크기 · 공종 줄 → 상품). 앱 '평면도 › 공종'의 공간 판과 같은 순서. */
function planPanelRoom(p, room) {
  const data = state.rooms.get(room), whole = room === planWhole();
  const n = data ? roomTrades(room).filter(t => data.trades.has(t)).length : 0;
  const cat = whole ? "바깥 테두리 · 집 전체" : PLAN_CLASS_LABEL[planRoomClass(room)];
  const head = planPanelHead(p, planRoomLabel(room), `${cat} · ${n ? `고른 공사 ${n}건` : "아직 고른 공사 없음"}`, true);
  if (n) head.insertBefore(planBtn("tool-btn", "이 공간 비우기", () => planClearRoom(room), "clear"), head.lastChild && head.lastChild.classList.contains("icon-btn") ? head.lastChild : null);
  if (plan.err && plan.err.room === room) p.appendChild(planEl("div", "pp-err", plan.err.text));
  // 부분 시공 — 공간 평형(공용(전체)는 전체 평형을 그대로 쓴다)
  if (state.scope === "부분" && !whole) {
    const lab = planEl("label", "fl with-sfx pp-py");
    const inp = planEl("input", "input");
    inp.inputMode = "decimal"; inp.maxLength = 5; inp.placeholder = " "; inp.dataset.k = "py";
    inp.value = data ? data.pyeong : "";
    inp.addEventListener("input", e => {
      let v = e.target.value.replace(/[^\d.]/g, "");
      const i = v.indexOf("."); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, 1);
      e.target.value = v;
      planEnsure(room).pyeong = v; saveDraft();
    });
    lab.append(inp, planEl("span", "fl-label", "이 공간 평형 (모르면 비워 두세요)"), planEl("span", "sfx", "평"));
    p.appendChild(lab);
  }
  // 공간 크기(크기 그룹 공간에서 타일 등 크기를 묻는 공종의 상품을 골랐을 때 — 필수) — 앱이 기록한 치수로 수량을 계산한다
  if (needsSize(room)) {
    const group = sizeGroupOf(room), need = plan.err && plan.err.room === room && plan.err.size;
    const wrap = planEl("div", "room-size" + (need ? " need" : ""));
    wrap.appendChild(planEl("span", "group-label", "공간 크기 "));
    wrap.firstChild.appendChild(planEl("span", "opt", "(필수 · 수량 계산에 써요)"));
    const tiles = planEl("div", "tiles3");
    tiles.setAttribute("role", "group"); tiles.setAttribute("aria-label", `${room} 크기`);
    SIZE_TITLES.forEach((title, i) => {
      const b = planBtn("tile", null, () => planSetSize(room, title), "size-" + i);
      b.setAttribute("aria-pressed", String(data.size === title));
      b.append(planEl("b", "", title), planEl("span", "", "약 " + sizeText(group, i)));
      b.setAttribute("aria-label", `${room} 크기 ${title} — 약 ${sizeText(group, i)}`);
      tiles.appendChild(b);
    });
    wrap.appendChild(tiles);
    wrap.appendChild(planEl("div", "hint", group.wall ? "가로 × 세로 × 천장 높이 — 정확한 치수는 방문 실측으로 맞춰요." : "가로 × 세로 — 정확한 치수는 방문 실측으로 맞춰요."));
    p.appendChild(wrap);
  }
  const trades = roomTrades(room);
  if (!trades.length) { p.appendChild(planEl("div", "empty", "이 공간에서 고를 수 있는 공사가 없어요. 필요한 공사는 요청사항에 적어 주세요.")); return; }
  p.appendChild(planEl("p", "plan-label", `고를 수 있는 공사 ${trades.length}`));
  const only = whole ? [] : planWholeOnly().filter(t => !trades.includes(t));
  trades.forEach(t => p.appendChild(planTradeRow(room, t)));
  if (only.length) p.appendChild(planEl("p", "pp-text small", `${only.join(" · ")}${hasBatchim(only[only.length - 1]) ? "은" : "는"} 집 전체 기준이라 '공용(전체)'에서 골라요.`));
}
/** 공종 한 줄 — 누르면 그 아래 상품 목록(앱 1492 · 1496과 같게). 상품이 없는 공종은 눌러서 담기 / 빼기. */
function planTradeRow(room, trade) {
  const data = state.rooms.get(room);
  const list = WEB.products[trade] || [], hasProducts = list.length > 0, single = isSingle(trade);
  const picked = data ? pickedNames(data, trade) : [], on = !!(data && data.trades.has(trade));
  const need = on && hasProducts && !picked.length, open = hasProducts && plan.open === trade;
  const row = planEl("div", "tr");
  row.classList.toggle("on", on && !need); row.classList.toggle("need", need); row.classList.toggle("open", open);
  const head = planBtn("tr-head", null, null, "t-" + trade);
  const sub = picked.length ? (picked.length > 1 ? `${picked[0]} 외 ${picked.length - 1}개` : picked[0])
    : need ? "상품을 골라 주세요" : !hasProducts ? (on ? "담김" : "누르면 담기") : `상품 ${list.length}${single ? " · 1개만" : ""}`;
  const right = on && !need ? (hasProducts ? `✓ ${picked.length}` : "✓") : hasProducts ? (open ? "⌃" : "⌄") : "";
  const txt = planEl("span", "tr-txt");
  txt.append(planEl("b", "", trade), planEl("span", "tr-sub", sub));
  head.append(txt, planEl("span", "tr-right", right));
  head.setAttribute("aria-label", `${trade}: ${sub}`);
  if (!hasProducts) {
    head.setAttribute("aria-pressed", String(on));
    head.addEventListener("click", () => planToggleTrade(room, trade));
    row.appendChild(head);
    return row;
  }
  head.setAttribute("aria-expanded", String(open));
  head.addEventListener("click", () => { plan.open = open ? null : trade; planRender(); });
  row.appendChild(head);
  if (!open) return row;
  const body = planEl("div", "tr-body");
  body.setAttribute("role", "group");
  body.setAttribute("aria-label", `${room} ${trade} 상품 — ${single ? "단일 선택, 1개만" : "중복 선택, 여러 개"}`);
  const top = planEl("div", "tr-top");
  top.append(planEl("span", "t-mode", single ? "단일 선택" : "중복 선택"), planEl("span", "", single ? "1개 고르면 닫혀요" : "여러 개 고를 수 있어요"));
  if (!single) top.append(planBtn("tool-btn", "완료 ⌃", () => { plan.open = null; planRender(); }, "done-" + trade));
  body.appendChild(top);
  list.forEach(([name, subText], i) => {
    const sel = picked.includes(name);
    const b = planBtn("pr", null, () => planPick(room, trade, name), `p-${trade}-${i}`);
    b.setAttribute("aria-pressed", String(sel));
    const mark = planEl("span", "mark", sel ? "✓" : "");
    mark.setAttribute("aria-hidden", "true");
    const t = planEl("span", "pr-txt");
    t.append(planEl("span", "", name));
    if (subText) { t.append(planEl("small", "", subText)); b.title = `${name} — ${subText}`; }
    b.append(mark, t);
    body.appendChild(b);
  });
  // 가구 길이(주방가구 · 빌트인장 — 2026-10-10) — 그 상품을 고르면 보인다(선택). 앱이 줄 수량으로 바꾼다.
  if (data && needsLen(data, trade)) {
    const lab = planEl("label", "fl with-sfx t-len");
    const inp = planEl("input", "input");
    inp.inputMode = "decimal"; inp.maxLength = 5; inp.placeholder = " "; inp.dataset.k = "len-" + trade;
    inp.value = data.len.get(trade) || "";
    inp.addEventListener("input", e => {
      let v = e.target.value.replace(/[^\d.]/g, "");
      const i = v.indexOf("."); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, 2);
      e.target.value = v;
      if (v) data.len.set(trade, v); else data.len.delete(trade);
      saveDraft();
    });
    lab.append(inp, planEl("span", "fl-label", "가구 길이 (모르면 비워 두세요)"), planEl("span", "sfx", "m"));
    body.appendChild(lab);
  }
  row.appendChild(body);
  return row;
}

// ── 다음 · 보내기 검사 ─────────────────────────────────────────────────
/** 공사할 곳 검사 — 고른 곳이 없거나 빠진 것(상품 · 크기 · 가구 길이)이 있으면 그 공간 판을 열고 false. */
function planReady() {
  const rooms = roomOrder();
  const issue = rooms.map(roomIssue).find(Boolean) || null;
  if (rooms.length && !issue) { clearInvalid("plan"); return true; }
  if (current !== "plan") goTo("plan");
  if (!rooms.length) {
    $("#planErr").textContent = "공사할 곳을 하나 이상 골라 주세요. 도형이나 '공용(전체)' 띠를 누르고 상품을 골라 주세요.";
    setInvalid("plan");
    if (!plan.base) planStart("none");
    reveal($("#planErr"));
    toast("공사할 곳을 골라 주세요.");
    return false;
  }
  planShowIssue(issue);
  return false;
}
function planShowIssue(issue) {
  plan.mode = "pick"; plan.ask = "";
  plan.sel = planKeyOf(issue.room);
  plan.open = issue.trade || null;
  plan.err = { room: issue.room, text: issue.text, size: !!issue.size };
  planRender();
  if (planPanelInSide()) {
    const target = issue.size ? $("#planPanel .room-size") : issue.trade ? $(`#planPanel [data-k="t-${CSS.escape(issue.trade)}"]`) : null;
    if (target) target.scrollIntoView({ block: "center", behavior: planReduced() ? "auto" : "smooth" });
  } else planRevealPanel();
  toast("빠진 항목을 확인해 주세요.");
}
/** 요약의 '고치기' — 그 공간 판을 연다. */
function planGoRoom(room) {
  plan.mode = "pick"; plan.ask = ""; plan.open = null;
  plan.sel = room ? planKeyOf(room) : null;
  goTo("plan");
  if (room && !planPanelInSide()) planRevealPanel();
}

// ── 업체에 가는 것 — 구조 한 줄 · 그림 1장 ───────────────────────────────
/** 구조 한 줄 — 요청 내용 맨 앞에 붙는다. 도형이 없으면 "". */
function planStructureText() {
  if (!plan.shapes.length) return "";
  const n = {};
  // 구조 한 줄은 이름이 먼저(드레스룸 · 알파룸이 침실 수에 섞이지 않게) — 잇기 판정은 앱처럼 분류가 먼저
  const countClass = s => { const c = planClassOf(s.name); return c === "other" ? planShapeClass(s) : c; };
  plan.shapes.forEach(s => { const c = countClass(s); n[c] = (n[c] || 0) + 1; });
  const order = ["bedroom", "bath", "living", "kitchen", "entrance", "balcony", "dress", "other"];
  const parts = order.filter(k => n[k]).map(k => `${PLAN_CLASS_LABEL[k]} ${n[k]}`);
  const un = {};
  plan.shapes.filter(s => !s.room && countClass(s) !== "hall").forEach(s => { const k = planShapeLabel(s); un[k] = (un[k] || 0) + 1; });
  const unlinked = Object.entries(un).map(([k, c]) => (c > 1 ? `${k} ×${c}` : k));
  const size = PLAN_SIZES.find(([k]) => k === plan.size);
  const text = `[집 구조 · 고객 그림(대략)] ${PLAN_BASE_LABEL[plan.base] || ""}${size && plan.base !== "empty" ? ` · ${size[1]} 기본` : ""} · ${parts.join(" · ")}`
    + (unlinked.length ? ` · 견적 공간 없는 도형: ${unlinked.join(", ")}` : "");
  // 서버가 요청사항을 1000자로 자른다(웹문의.gs clean_(note, 1000)) — 구조 줄은 120자까지, 요청사항 칸은 879자까지
  return text.length > PLAN_STRUCT_MAX ? text.slice(0, PLAN_STRUCT_MAX - 1) + "…" : text;
}
/** 그림 1장(JPEG) — { name, dataUrl }. 도형이 없으면 null. 이름 · 연락처 · 주소는 넣지 않는다. */
function planPhoto() {
  if (!plan.shapes.length) return null;
  try {
    const x0 = Math.min(...plan.shapes.map(s => s.x)), y0 = Math.min(...plan.shapes.map(s => s.y));
    const gw = Math.max(...plan.shapes.map(s => s.x + s.w)) - x0, gh = Math.max(...plan.shapes.map(s => s.y + s.h)) - y0;
    const c = Math.floor(Math.min(1040 / gw, 1000 / gh));
    const pad = 40, top = 120, bandH = WEB.rooms.includes(planWhole()) ? 70 : 0;
    const W = gw * c + pad * 2, H = top + gh * c + bandH + 70;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    const font = (px, bold) => `${bold ? "700" : "400"} ${px}px -apple-system, "Apple SD Gothic Neo", "Pretendard Variable", "Noto Sans KR", sans-serif`;
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1D1D1F"; g.font = font(30, true); g.textBaseline = "top";
    g.fillText("집 구조 — 고객 그림 (대략 · 축척 없음)", pad, 28);
    g.fillStyle = "#6E6E73"; g.font = font(20);
    planWrap(g, planStructureText().replace(/^\[[^\]]*\]\s*/, ""), W - pad * 2).slice(0, 2).forEach((line, i) => g.fillText(line, pad, 70 + i * 26));
    plan.shapes.forEach(s => {
      const X = pad + (s.x - x0) * c, Y = top + (s.y - y0) * c, w = s.w * c, h = s.h * c;
      const tag = planRoomTag(s.room);
      g.fillStyle = !s.room ? "#FAFAFA" : tag.work ? "#EAF3FF" : "#F5F5F7";
      g.fillRect(X + 2, Y + 2, w - 4, h - 4);
      g.setLineDash(s.room ? [] : [8, 6]);
      g.strokeStyle = tag.work ? "#0071E3" : "#86868B"; g.lineWidth = tag.work ? 3 : 2;
      g.strokeRect(X + 2, Y + 2, w - 4, h - 4);
      g.setLineDash([]);
      const big = Math.max(14, Math.min(24, Math.floor(Math.min(w, h) / 4)));
      g.fillStyle = s.room ? "#1D1D1F" : "#6E6E73"; g.font = font(big, true);
      g.fillText(planShapeLabel(s), X + 10, Y + 10, w - 20);
      if (s.room && tag.text) {
        g.fillStyle = tag.warn ? "#A84F06" : "#0057B8"; g.font = font(Math.max(12, big - 6));
        const lines = planWrap(g, tag.text, w - 20);
        lines.slice(0, Math.max(0, Math.floor((h - big - 24) / (big - 2)))).forEach((line, i) => g.fillText(line, X + 10, Y + 16 + big + i * (big - 2)));
      }
    });
    if (bandH) {
      const Y = top + gh * c + 16, tag = planRoomTag(planWhole());
      g.fillStyle = tag.work ? "#EAF3FF" : "#F5F5F7"; g.fillRect(pad, Y, gw * c, bandH - 16);
      g.fillStyle = "#1D1D1F"; g.font = font(20, true);
      g.fillText(`공용(전체) · 바깥 테두리: ${tag.text || "고른 공사 없음"}`, pad + 14, Y + 15, gw * c - 28);
    }
    g.fillStyle = "#86868B"; g.font = font(16);
    g.fillText("도형 크기는 모양만 — 수량은 평형 · 공간 크기로 계산 · 정확한 치수는 방문 실측", pad, H - 36, W - pad * 2);
    return { name: "집구조.jpg", dataUrl: cv.toDataURL("image/jpeg", 0.85) };
  } catch { return null; }
}
function planWrap(g, text, width) {
  const lines = [];
  let line = "";
  [...String(text)].forEach(ch => {
    if (g.measureText(line + ch).width > width && line) { lines.push(line); line = ch.trim() ? ch : ""; }
    else line += ch;
  });
  if (line) lines.push(line);
  return lines;
}

// ── 앱 저장 글 · 초안(이 브라우저에 7일 — 도형만, 개인정보 없음) · 설정 바뀜 · 새 요청 ───────────
/** 앱 SavedEstimate.planLayoutJSON과 같은 글 — { v: 1, base, shapes: [{ id, name, nth, category, kind, c, r, w, h }] }.
    지금은 초안에만 쓴다. 앱 · 서버를 고치면 이 글을 그대로 보내 앱 견적 작성 평면도에서 열 수 있다(지시서 1024-웹1 질문 답). */
function planAppLayout() {
  return { v: 1, base: PLAN_APP_BASE[plan.base] || "blank",
    shapes: plan.shapes.map(s => ({ id: s.id, name: s.name, nth: s.nth, category: s.category, kind: s.kind, c: s.x, r: s.y, w: s.w, h: s.h })) };
}
function planDraftOut() {
  return { web: plan.base, size: plan.size, mode: plan.mode, layout: planAppLayout() };
}
function planDraftIn(p) {
  if (!p || typeof p !== "object" || !PLAN_BASE_LABEL[p.web]) return;
  plan.base = p.web;
  plan.size = PLAN_TEMPLATES[p.size] ? p.size : "";
  plan.mode = p.mode === "arrange" ? "arrange" : "pick";
  const list = p.layout && Array.isArray(p.layout.shapes) ? p.layout.shapes : [];
  const out = [], ids = new Set();
  list.slice(0, PLAN_MAX_SHAPES).forEach(a => {
    if (!a || typeof a !== "object") return;
    const r = { x: a.c, y: a.r, w: a.w, h: a.h };
    if (![r.x, r.y, r.w, r.h].every(Number.isInteger) || r.w < PLAN_MIN || r.h < PLAN_MIN || !planInGrid(r) || out.some(o => planHit(o, r))) return;
    const id = typeof a.id === "string" && /^[\w-]{1,40}$/.test(a.id) && !ids.has(a.id) ? a.id : planNewId();
    ids.add(id);
    out.push({ id, name: String(a.name || "").trim().slice(0, PLAN_NAME_LIMIT), nth: planClamp(Number.isInteger(a.nth) ? a.nth : 0, 0, 99),
      category: String(a.category || "").slice(0, PLAN_NAME_LIMIT), kind: ["room", "balcony", "hall"].includes(a.kind) ? a.kind : "room",
      x: r.x, y: r.y, w: r.w, h: r.h, room: "" });
  });
  plan.shapes = out;
  planRefresh();
}
/** 앱이 올린 공간 목록이 바뀐 뒤 — 이름으로 다시 본다(없어진 공간의 도형은 그림만 남는다). */
function planSyncRooms() {
  planRefresh();
  if (plan.sel && plan.sel.startsWith("R:") && !WEB.rooms.includes(plan.sel.slice(2))) plan.sel = null;
}
function planReset() {
  clearTimeout(plan.noteTimer);
  Object.assign(plan, { base: "", size: "", shapes: [], mode: "pick", sel: null, open: null, ask: "", err: null, hist: [], fut: [], note: null });
}
function planInit() {
  // 칸 폭이 바뀌면(화면 돌리기 · 창 크기) 도면 칸 크기를 다시 정한다
  let lastW = 0;
  if (window.ResizeObserver) new ResizeObserver(() => {
    const w = $("#planBoard").clientWidth;
    if (current === "plan" && w && w !== lastW && !planDrag) { lastW = w; planRenderBoard(); }
  }).observe($("#planBoard"));
  matchMedia("(min-width: 1024px)").addEventListener("change", () => { if (current === "plan") planRender(); else planPlacePanel(); });
}
