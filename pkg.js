/* ═══════════════════════════════════════════════════════════════════════
   웹 견적요청 — 패키지(지시서 1104-03 개정 b · 통합 개정 a, 2026-11-04)

   1단계 = 적용형: 고른 패키지를 지금의 공간별 상품 이름으로 풀어 담는다. 보내는 형식(공간별 상품)은 그대로라
   서버 · 앱은 바뀌지 않는다. 고른 패키지는 요청 내용에 한 줄('[패키지] …')로 남고, 보내기 칸 pkg에도 싣는다(지금 서버는 건너뜀).

   · 단계: ① 기본 정보 → ② 패키지(전체 시공일 때만) → ③ 공사할 곳 → ④ 마무리
   · 담는 곳 = 고객이 고른 공간에만
     - ②에서 패키지를 고르면 공용(전체)의 도배 · 바닥재만 담는다
     - 욕실 · 주방은 ③에서 고객이 그 공간을 누를 때 대표(★) 컨셉을 담는다(5초 되돌리기) — 한 공간에 한 번만
   · 공간 판 맨 위 '패키지' 줄 — 컨셉 바꾸기 · 고급 섞기 · 패키지 없이(상품 그대로 · 표시만 없앰) · 패키지대로 되돌리기
   · 컨셉을 바꾸면 고객이 바꾼 공종은 그대로 두고, 바꾸지 않은 공종만 새 컨셉으로 바뀐다
   · '바꾼 곳'은 저장하지 않고 매번 컨셉과 견줘 센다
   · 게시 조건(화면에서도 같은 검사): 이름이 하나라도 안 맞거나, 덧방 컨셉에 대형 타일이 든 컨셉은 숨긴다
   · 웹 가격 없음 · 사진 없음(색 칩)

   이 파일은 app.js보다 먼저 읽힌다. 맨 위에서는 선언만 하고, 실제로 부르는 것은 app.js · plan.js가 다 읽힌 뒤다.
   ═══════════════════════════════════════════════════════════════════════ */

const PKG_TILE_MAX_MM = 600;   // [가정] 덧방 '대형 타일' = 긴 변 600mm 넘음(사장님 값이 정해지면 그 값으로)
const PKG_LINE_MAX = 100;      // 요청 내용 '[패키지]' 줄 — 서버가 요청 내용을 1000자로 자른다(구조 120 + 패키지 100 + 요청사항 778)
const PKG_OPEN = "pkg:";       // 공간 판에서 펼친 줄 열쇠(plan.open) — 공종 이름과 겹치지 않게

/** 고객이 고른 것 — tier: "" 아직 · "basic" · "premium" · "none"(직접 고르기).
    rooms: 공간 → Map(카테고리 → 컨셉 id | ""(패키지 없이)). touched: 대표 컨셉을 한 번 담아 준 공간(되돌린 뒤 다시 채우지 않게). */
const pkg = { tier: "", rooms: new Map(), touched: new Set(), peek: "", filled: null, filledTimer: 0 };

// ── 목록 읽기 · 대조(게시 조건) ──────────────────────────────────────────
let pkgCache = { key: null, data: null };
/** 타일 크기 — 이름 · 설명의 '600×1200' · '600*1200'에서 긴 변(mm). 없으면 0. */
function pkgTileLong(text) {
  const m = String(text || "").match(/(\d{3,4})\s*[×xX*]\s*(\d{3,4})/);
  return m ? Math.max(Number(m[1]), Number(m[2])) : 0;
}
function pkgProductSub(trade, name) {
  const hit = (WEB.products[trade] || []).find(([n]) => n === name);
  return hit ? hit[1] : "";
}
/** 덧방에 맞지 않는 대형 타일인가 — 타일 공종 상품만 본다. */
function pkgBigTile(trade, name) {
  if (!/타일/.test(trade) && !/타일|포세린/.test(name)) return false;
  return Math.max(pkgTileLong(name), pkgTileLong(pkgProductSub(trade, name))) > PKG_TILE_MAX_MM;
}
/** 상품 이름 → 실제 공종. (공종, 항목명)이 맞으면 그 공종, 아니면 그 이름을 가진 공종이 하나뿐일 때만(공종 이름 바뀜 — 마루 → 바닥재 등). */
function pkgResolveItem(item, index) {
  const name = String(item && item.name || "").trim(), trade = String(item && item.trade || "").trim();
  if (!name) return null;
  if ((WEB.products[trade] || []).some(([n]) => n === name)) return { trade, name };
  const hits = index.get(name) || [];
  return hits.length === 1 ? { trade: hits[0], name } : null;
}
/** 쓰기 좋은 모양 — 컨셉마다 대조 결과. 웹 설정이 바뀌면(webSource) 다시 만든다. */
function pkgData() {
  const key = webSource + "|" + (typeof PACKAGES_V1 === "object" ? PACKAGES_V1.rev : "");
  if (pkgCache.key === key && pkgCache.data) return pkgCache.data;
  const src = typeof PACKAGES_V1 === "object" && PACKAGES_V1 && PACKAGES_V1.v === 1 && Array.isArray(PACKAGES_V1.tiers) ? PACKAGES_V1 : null;
  const index = new Map();
  WEB.trades.forEach(t => (WEB.products[t] || []).forEach(([n]) => { if (!index.has(n)) index.set(n, []); index.get(n).push(t); }));
  const tiers = [], byId = new Map(), problems = [];
  (src ? src.tiers : []).forEach(t => {
    if (!t || typeof t.id !== "string") return;
    const tier = { id: t.id, name: String(t.name || ""), short: String(t.short || t.name || ""), sub: String(t.sub || ""), cats: [] };
    (Array.isArray(t.categories) ? t.categories : []).forEach(c => {
      if (!c || typeof c.id !== "string") return;
      const cat = { id: c.id, name: String(c.name || ""), target: String(c.target || ""), method: c.method || "", concepts: [] };
      (Array.isArray(c.concepts) ? c.concepts : []).forEach(k => {
        if (!k || typeof k.id !== "string") return;
        const items = (Array.isArray(k.items) ? k.items : []).map(it => pkgResolveItem(it, index));
        let why = "";
        if (!items.length) why = "상품 없음";
        else if (items.some(x => !x)) why = "이름 불일치 " + (k.items || []).filter((it, i) => !items[i]).map(it => it.name).join(", ");
        else if (cat.method === "덧방" && items.some(x => pkgBigTile(x.trade, x.name))) why = "덧방 대형 타일";
        else {
          const per = {};
          items.forEach(x => { per[x.trade] = (per[x.trade] || 0) + 1; });
          const dup = Object.keys(per).find(tr => isSingle(tr) && per[tr] > 1);
          if (dup) why = `단일 선택 공종 ${dup}에 상품 ${per[dup]}개`;
        }
        if (why) { problems.push(`${tier.short} · ${cat.name} · ${k.name}: ${why}`); return; }   // 게시 조건 — 웹에서 숨김
        const concept = byId.get(k.id) || { id: k.id, name: String(k.name || ""), desc: String(k.desc || ""),
          swatch: (Array.isArray(k.swatch) ? k.swatch : []).filter(x => /^#[0-9A-Fa-f]{6}$/.test(x)).slice(0, 3),
          items, cat: cat.id, catName: cat.name, method: cat.method, tiers: [] };
        concept.tiers.push(tier.id);
        byId.set(k.id, concept);
        cat.concepts.push({ concept, star: k.star === true });
      });
      if (cat.concepts.length) tier.cats.push(cat);
    });
    if (tier.cats.length) tiers.push(tier);
  });
  const data = { ok: tiers.length > 0, rev: src ? String(src.rev || "") : "", tiers, byId, problems };
  pkgCache = { key, data };
  // 설정이 바뀌어 숨은 컨셉 — 표시만 지운다(담긴 상품은 그대로)
  pkg.rooms.forEach(cats => cats.forEach((id, cat) => { if (id && !byId.has(id)) cats.delete(cat); }));
  if (pkg.tier && pkg.tier !== "none" && !tiers.some(t => t.id === pkg.tier)) pkg.tier = "";
  return data;
}
const pkgAvailable = () => pkgData().ok;
/** ② 패키지 단계를 보이는가 — 전체 시공이고 보일 패키지가 있을 때. 부분 시공은 건너뛰고 ③ '패키지' 줄만. */
const pkgStepOn = () => state.scope === "전체" && pkgAvailable();
const pkgTier = id => pkgData().tiers.find(t => t.id === id) || null;
const pkgConcept = id => (id && pkgData().byId.get(id)) || null;
/** 고른 등급이 살아 있는가 — 전체 시공일 때만(부분으로 바꾸면 등급은 쉬고, 담긴 컨셉 표시만 남는다 — 검토 1). */
const pkgTierActive = () => state.scope === "전체" && (pkg.tier === "basic" || pkg.tier === "premium") && !!pkgTier(pkg.tier);
/** 그 등급 · 카테고리의 대표(★) 컨셉 — 대표가 숨었으면 없음(사장님 ★만 미리 고름). */
function pkgDefault(tierId, catId) {
  const tier = pkgTier(tierId), cat = tier && tier.cats.find(c => c.id === catId);
  const star = cat && cat.concepts.find(x => x.star);
  return star ? star.concept : null;
}

// ── 공간 → 카테고리 ─────────────────────────────────────────────────────
/** 공간 분류 이름 — 안 쓰는 공종과 같은 규칙(app.js roomExcluded). */
function pkgRoomCategory(room) {
  return WEB.roomCategories ? (WEB.roomCategories.get(room) || "") : (matchCategory(room, WEB.categories.map(c => c.name)) || "");
}
function pkgTargetHit(room, target) {
  if (target === "whole") return room === CONFIG.WHOLE_HOUSE_ROOM;
  if (room === CONFIG.WHOLE_HOUSE_ROOM) return false;
  const cat = pkgRoomCategory(room);
  return cat ? cat === target || !!matchCategory(cat, [target]) : !!matchCategory(room, [target]);
}
/** 이 공간에 쓸 수 있는 카테고리 — [{ id, name, method, options:[{ concept, tier, star }] }]. 공간에서 못 고르는 공종만 든 컨셉은 뺀다. */
function pkgRoomCats(room) {
  const out = [];
  pkgData().tiers.forEach(tier => tier.cats.forEach(cat => {
    if (!pkgTargetHit(room, cat.target)) return;
    let row = out.find(r => r.id === cat.id);
    if (!row) { row = { id: cat.id, name: cat.name, method: cat.method, options: [] }; out.push(row); }
    cat.concepts.forEach(({ concept, star }) => {
      if (!concept.items.some(x => tradeAllowed(room, x.trade))) return;
      const had = row.options.find(o => o.concept.id === concept.id);
      if (had) { had.common = true; return; }
      row.options.push({ concept, tier: tier.id, star, common: false });
    });
  }));
  return out.filter(r => r.options.length);
}

// ── 담기 · 바꾸기 ───────────────────────────────────────────────────────
/** 컨셉이 이 공간에 담는 것 — Map(공종 → Set(상품)). 이 공간에서 못 고르는 공종은 뺀다. */
function pkgSets(room, concept) {
  const out = new Map();
  if (!concept) return out;
  concept.items.forEach(x => {
    if (!tradeAllowed(room, x.trade)) return;
    if (!out.has(x.trade)) out.set(x.trade, new Set());
    out.get(x.trade).add(x.name);
  });
  return out;
}
const pkgSame = (a, b) => !!a && !!b && a.size === b.size && [...a].every(x => b.has(x));
/** 컨셉 놓기(되돌리기 묶음 안에서 부른다) — 이전 컨셉 공종 중 고객이 바꾸지 않은 것만 새 컨셉으로. force면 모두. id ""는 '패키지 없이'(상품 그대로). */
function pkgAssign(room, catId, id, force) {
  const marks = pkg.rooms.get(room) || new Map();
  const prev = pkgConcept(marks.get(catId)), next = pkgConcept(id);
  if (id && !next) return;
  marks.set(catId, id || "");
  pkg.rooms.set(room, marks);
  if (!id) return;   // 패키지 없이 — 표시만 없앤다
  const data = planEnsure(room);
  const prevSets = pkgSets(room, prev), nextSets = pkgSets(room, next), kept = new Set();
  prevSets.forEach((names, trade) => {
    const cur = data.items.get(trade);
    if (!force && !pkgSame(cur, names)) { kept.add(trade); return; }                  // 고객이 바꾼 공종 — 그대로
    if (nextSets.has(trade) && pkgSame(cur, nextSets.get(trade))) { kept.add(trade); return; }   // 이미 새 컨셉과 같음 — 가구 길이까지 그대로
    data.items.delete(trade); data.trades.delete(trade); data.len.delete(trade);
  });
  nextSets.forEach((names, trade) => {
    if (kept.has(trade)) return;
    const cur = data.items.get(trade);
    if (!force && cur && cur.size) return;   // 패키지 전에 고객이 고른 공종 — 그대로('바꿈'으로 보이고 '패키지대로 되돌리기'로 바꿀 수 있음)
    data.items.set(trade, new Set(names)); data.trades.add(trade);
  });
}
/** 패키지대로 되돌리기 — 지금 컨셉 그대로(바꾼 공종을 컨셉 상품으로). 추가한 공종은 그대로. */
function pkgRestore(room) {
  const marks = pkg.rooms.get(room);
  if (!marks) return;
  planDo(`${room} 패키지대로 되돌림`, () => { marks.forEach((id, cat) => { if (id) pkgAssign(room, cat, id, true); }); });
  const head = $("#planPanel .pk-row-tr .tr-head");   // 되돌리기 단추가 사라지므로 '패키지' 줄로
  if (head) head.focus({ preventScroll: true });
}
/** ③ 공간 판에서 컨셉 고르기. */
function pkgPick(room, catId, id) {
  const c = pkgConcept(id);
  const label = c ? `${room} ‹ ${c.name} 담음` : `${room} ‹ 패키지 없이 — 상품은 그대로`;
  planDo(label, () => { pkg.touched.add(room); pkgAssign(room, catId, id, false); });
  setTimeout(() => {   // 고른 뒤 잠깐 보여 주고 접는다(단일 선택과 같게) — 포커스는 그 '패키지' 줄로
    if (plan.open !== PKG_OPEN + catId || planSelRoom() !== room || current !== "plan") return;
    plan.open = null; planRender();
    const head = $(`#planPanel [data-k="t-${CSS.escape(PKG_OPEN + catId)}"]`);
    if (head) head.focus({ preventScroll: true });
  }, 300);
}
/** ② 패키지 고르기 — 공용(전체)의 도배 · 바닥재만 담는다. 이미 담긴 공간은 같은 카테고리의 새 등급 대표로(바꾼 공종은 그대로). */
function pkgChooseTier(tierId) {
  if (tierId === pkg.tier) { pkg.peek = tierId === "none" ? "" : tierId; pkgRenderStep(); return; }
  const tier = pkgTier(tierId);
  const label = tierId === "none" ? "직접 고르기 — 담긴 상품은 그대로" : `${tier ? tier.name : ""} 고름`;
  planDo(label, () => {
    pkg.tier = tierId; pkg.peek = tierId === "none" ? "" : tierId;
    if (tierId === "none") { pkg.rooms.clear(); return; }   // 표시만 지운다(상품 그대로)
    const whole = CONFIG.WHOLE_HOUSE_ROOM;
    if (WEB.rooms.includes(whole)) pkgRoomCats(whole).forEach(cat => { const d = pkgDefault(tierId, cat.id); if (d) pkgAssign(whole, cat.id, d.id, false); });
    pkg.rooms.forEach((marks, room) => {
      if (room === whole) return;
      [...marks].forEach(([cat, id]) => { const d = id && pkgDefault(tierId, cat); if (d && d.id !== id) pkgAssign(room, cat, d.id, false); });
    });
  });
  clearInvalid("pkg");
  pkgRenderStep();
}
/** ③ 공간을 누를 때 — 비어 있는 공간이면 고른 등급의 대표 컨셉을 담는다(한 공간에 한 번 · 5초 되돌리기). planSelect가 부른다. */
function pkgAutoFill(room) {
  if (!room || !pkgTierActive() || room === CONFIG.WHOLE_HOUSE_ROOM || pkg.touched.has(room) || roomHasWork(room)) return;
  const picks = pkgRoomCats(room).map(cat => [cat.id, pkgDefault(pkg.tier, cat.id)]).filter(([, d]) => d);
  if (!picks.length) return;
  pkg.touched.add(room);
  const text = `${pkgTier(pkg.tier).short} 패키지 ${picks.map(([, d]) => d.name).join(" · ")}을 담았어요`;
  planDo(`${room}에 ${text.replace(/을 담았어요$/, "")} 담음`, () => picks.forEach(([cat, d]) => pkgAssign(room, cat, d.id, false)));
  // 폰은 공간 판으로 화면이 내려가 위 안내가 안 보인다 — 공간 판 맨 위에도 5초 되돌리기(검토 3)
  pkg.filled = { room, text, until: Date.now() + 5000 };
  clearTimeout(pkg.filledTimer);
  pkg.filledTimer = setTimeout(() => { pkg.filled = null; if (current === "plan") planRender(); }, 5100);
}

// ── 견줘 보기(저장하지 않음) ─────────────────────────────────────────────
/** 공간 상태 — 컨셉 · 바꾼 공종 · 추가한 공종 · 덧방 대형 타일. 컨셉이 없으면 null. */
function pkgRoomInfo(room) {
  const marks = pkg.rooms.get(room), data = state.rooms.get(room);
  if (!marks || !data) return null;
  const concepts = [...marks].map(([cat, id]) => ({ cat, concept: pkgConcept(id) })).filter(x => x.concept);
  if (!concepts.length) return null;
  const expect = new Map();
  concepts.forEach(({ concept }) => pkgSets(room, concept).forEach((names, t) => {
    if (!expect.has(t)) expect.set(t, new Set());
    names.forEach(n => expect.get(t).add(n));
  }));
  const changed = new Set(), added = new Set();
  expect.forEach((names, t) => { if (!data.trades.has(t) || !pkgSame(data.items.get(t), names)) changed.add(t); });
  roomTrades(room).forEach(t => { if (data.trades.has(t) && !expect.has(t)) added.add(t); });
  const thin = concepts.some(x => x.concept.method === "덧방");
  const bigTile = thin && [...data.items].some(([t, set]) => [...set].some(n => pkgBigTile(t, n)));
  return { concepts, expect, changed, added, bigTile };
}
/** 공종 줄 꼬리표 — '패키지' · '바꿈' · '추가' · "". */
function pkgTradeMark(room, trade) {
  const info = pkgRoomInfo(room);
  if (!info) return "";
  if (info.expect.has(trade)) return info.changed.has(trade) ? "바꿈" : "패키지";
  return info.added.has(trade) ? "추가" : "";
}
/** 도형 · 칩 한 줄 — '화이트 클린' · '화이트 클린 · 바꿈'. 컨셉이 없으면 "". */
function pkgRoomTagText(room) {
  const info = pkgRoomInfo(room);
  if (!info) return "";
  return info.concepts.map(x => x.concept.name).join(" · ") + (info.changed.size ? " · 바꿈" : "");
}
/** 등급 이름 — 고른 등급, 없으면(부분 시공) 담긴 컨셉의 등급으로. */
function pkgTierLabel() {
  if (pkgTierActive()) return pkgTier(pkg.tier).short;
  const set = new Set();
  pkg.rooms.forEach((marks, room) => { if (roomHasWork(room)) marks.forEach(id => { const c = pkgConcept(id); if (c && c.tiers.length === 1) set.add(c.tiers[0]); }); });
  return [...set].map(id => (pkgTier(id) || {}).short).filter(Boolean).join(" + ");
}
/** 바꾼 곳 — 패키지 상품을 바꾸거나 뺀 공간 수(추가는 세지 않는다 — '패키지대로 되돌리기'로 사라지는 것만). */
function pkgChangedRooms() {
  return roomOrder().filter(r => { const i = pkgRoomInfo(r); return i && i.changed.size; });
}
const pkgUsedRooms = () => roomOrder().filter(r => pkgRoomInfo(r));

// ── 업체에 가는 것 ──────────────────────────────────────────────────────
/** 요청 내용 한 줄 — '[패키지] 일반 · 깔끔 합지 · 표준 강마루 · 화이트 클린 · 바꾼 곳 1 · 판 2026-11-04'. 고른 게 없으면 "". */
function pkgNoteLine() {
  const used = pkgUsedRooms();
  if (!used.length && !pkgTierActive()) return "";
  const label = pkgTierLabel() || "패키지";
  const names = [], seen = new Set(), base = pkgTierActive() ? pkg.tier : "";
  const catOrder = ["wall", "floor", "kitchen", "bath"];
  const list = [];
  used.forEach(r => pkgRoomInfo(r).concepts.forEach(x => list.push(x)));
  const ord = c => { const i = catOrder.indexOf(c); return i < 0 ? 99 : i; };
  list.sort((a, b) => ord(a.cat) - ord(b.cat));
  list.forEach(({ concept }) => {
    if (seen.has(concept.id)) return;
    seen.add(concept.id);
    const other = base && !concept.tiers.includes(base) ? `(${(pkgTier(concept.tiers[0]) || {}).short || ""})` : "";
    names.push(concept.name + other);
  });
  const big = used.filter(r => pkgRoomInfo(r).bigTile);
  // 덧방 확인(안전 표시)은 앞에 — 100자를 넘으면 컨셉 이름부터 줄인다(검토 10)
  const head = ["[패키지] " + label].concat(big.length ? [`덧방 확인 필요 ${big.join("·")}`] : []);
  const tail = [`바꾼 곳 ${pkgChangedRooms().length}`, "판 " + pkgData().rev];
  let shown = names.slice(), text = "";
  for (;;) {
    const more = names.length - shown.length;
    text = head.concat(shown, more ? [`외 ${more}`] : [], tail).join(" · ");
    if (text.length <= PKG_LINE_MAX || !shown.length) break;
    shown.pop();
  }
  return text.length > PKG_LINE_MAX ? text.slice(0, PKG_LINE_MAX - 1) + "…" : text;
}
/** 보내기 칸 pkg — 지금 서버는 건너뛴다(2단계에 '패키지' 열). */
function pkgPayload() {
  const used = pkgUsedRooms(), tier = pkgTierActive() ? pkg.tier : pkg.tier === "none" && state.scope === "전체" ? "none" : "";
  if (!used.length && !tier) return null;
  return {
    v: 1, rev: pkgData().rev, tier,
    rooms: used.map(r => {
      const i = pkgRoomInfo(r), cats = {};
      i.concepts.forEach(x => { cats[x.cat] = x.concept.id; });
      return { room: r, cats, changed: [...i.changed], added: [...i.added], bigTile: i.bigTile };
    }),
  };
}
/** 마무리 요약 한 줄들 — 없으면 null. */
function pkgSummaryLines() {
  const used = pkgUsedRooms(), label = pkgTierLabel();
  if (!used.length) {
    if (state.scope === "전체" && pkg.tier === "none") return ["직접 고르기 — 패키지 없이"];
    if (!pkgTierActive()) return null;
  }
  const names = [];
  used.forEach(r => pkgRoomInfo(r).concepts.forEach(x => { if (!names.includes(x.concept.name)) names.push(x.concept.name); }));
  const lines = [`${label ? label + " 패키지" : "패키지"} · 바꾼 곳 ${pkgChangedRooms().length}`];
  lines.push(names.length ? names.join(" · ") : "아직 담긴 곳이 없어요");
  return lines;
}
function pkgRoomSummaryLine(room) {
  const i = pkgRoomInfo(room);
  if (!i) return "";
  return `패키지: ${i.concepts.map(x => x.concept.name).join(" · ")}${i.changed.size ? ` · 바꿈 ${i.changed.size}` : ""}${i.added.size ? ` · 추가 ${i.added.size}` : ""}${i.bigTile ? " · 덧방 확인 필요" : ""}`;
}
/** 아래 바 — 왼쪽 등급 이름 · 오른쪽 '바꾼 곳 n'. */
function pkgBarText() {
  const left = pkg.tier === "none" ? "" : pkgTierLabel() ? `${pkgTierLabel()} 패키지` : "";
  const n = pkgChangedRooms().length;
  return { left, right: n ? `바꾼 곳 ${n}` : "" };
}

// ── 되돌리기 · 초안 ─────────────────────────────────────────────────────
/** 되돌리기 묶음 · 초안 — withTier가 아니면 등급은 빼고 공간 표시만(③ 되돌리기가 ②의 등급을 지우지 않게 — 검토 7). */
function pkgSnapOut(withTier) {
  const out = { rooms: [...pkg.rooms].map(([r, m]) => [r, [...m]]) };
  if (withTier) out.tier = pkg.tier;
  return out;
}
function pkgSnapIn(s) {
  pkg.rooms.clear();
  if (!s || typeof s !== "object") return;
  if ("tier" in s) pkg.tier = s.tier === "none" || ((s.tier === "basic" || s.tier === "premium") && pkgTier(s.tier)) ? s.tier : "";
  (Array.isArray(s.rooms) ? s.rooms : []).forEach(e => {
    if (!Array.isArray(e) || typeof e[0] !== "string" || !Array.isArray(e[1])) return;
    const marks = new Map(e[1].filter(x => Array.isArray(x) && typeof x[0] === "string" && typeof x[1] === "string")
      .filter(([, id]) => !id || pkgConcept(id)));
    if (marks.size) pkg.rooms.set(e[0], marks);
  });
}
function pkgDraftOut() {
  return { ...pkgSnapOut(true), touched: [...pkg.touched] };
}
function pkgDraftIn(d) {
  if (!d || typeof d !== "object") return;
  pkgSnapIn(d);
  [...pkg.rooms.keys()].forEach(r => { if (!WEB.rooms.includes(r)) pkg.rooms.delete(r); });
  pkg.touched = new Set((Array.isArray(d.touched) ? d.touched : []).filter(r => typeof r === "string" && WEB.rooms.includes(r)));
  pkg.peek = pkg.tier === "none" ? "" : pkg.tier;
}
function pkgReset() {
  pkg.tier = ""; pkg.rooms.clear(); pkg.touched.clear(); pkg.peek = ""; pkg.filled = null;
}
/** 공간을 비우거나 도형과 함께 지울 때 — 패키지 표시도 함께(같은 되돌리기 묶음 안에서 부른다 — 검토 4). */
function pkgForget(room) {
  pkg.rooms.delete(room);
}

// ── 그리기 · ② 패키지 단계 ─────────────────────────────────────────────
function pkgEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}
function pkgSwatch(colors) {
  const sw = pkgEl("span", "pk-sw");
  sw.setAttribute("aria-hidden", "true");
  colors.forEach(c => { const i = pkgEl("i"); i.style.background = c; sw.appendChild(i); });
  return sw;
}
function pkgRenderStep() {
  const list = $("#pkgList");
  if (!list) return;
  const active = document.activeElement, focusKey = active && list.contains(active) && active.dataset ? active.dataset.k : "";
  list.textContent = "";
  const d = pkgData();
  const cards = d.tiers.map(t => ({ id: t.id, name: t.name, sub: t.sub, tier: t }))
    .concat([{ id: "none", name: "직접 고르기", sub: "패키지 없이 공간마다 골라요", tier: null }]);
  cards.forEach(card => {
    const on = pkg.tier === card.id, open = !!card.tier && pkg.peek === card.id;
    const box = pkgEl("div", "tr pk-card" + (on ? " on" : ""));
    const head = pkgEl("div", "pk-head");
    const pick = pkgEl("button", "pr");
    pick.type = "button"; pick.dataset.k = "pk-card-" + card.id;
    pick.setAttribute("aria-pressed", String(on));
    const mark = pkgEl("span", "mark", on ? "✓" : "");
    mark.setAttribute("aria-hidden", "true");
    const txt = pkgEl("span", "pr-txt");
    txt.append(pkgEl("span", "pk-name", card.name), pkgEl("small", "", card.sub));
    pick.append(mark, txt);
    pick.addEventListener("click", () => pkgChooseTier(card.id));
    head.appendChild(pick);
    if (card.tier) {
      const more = pkgEl("button", "link-btn pk-more", open ? "접기 ⌃" : "구성 ⌄");
      more.type = "button"; more.dataset.k = "pk-more-" + card.id;
      more.setAttribute("aria-expanded", String(open));
      more.setAttribute("aria-label", `${card.name} 구성 ${open ? "접기" : "보기"}`);
      more.addEventListener("click", () => { pkg.peek = open ? "" : card.id; pkgRenderStep(); });
      head.appendChild(more);
    }
    box.appendChild(head);
    if (open) {
      const body = pkgEl("div", "pk-body");
      card.tier.cats.forEach(cat => {
        const star = cat.concepts.find(x => x.star) || cat.concepts[0];
        const it = pkgEl("div", "pk-it");
        const v = pkgEl("b", "");
        if (star.concept.swatch.length) v.appendChild(pkgSwatch(star.concept.swatch));
        v.append(document.createTextNode(star.concept.name));
        it.append(pkgEl("span", "", cat.name), v);
        body.appendChild(it);
      });
      const thin = card.tier.cats.find(c => c.method === "덧방");
      if (thin) {
        const inc = pkgEl("div", "pk-inc");
        const tags = pkgEl("span", "band-tags");
        tags.appendChild(pkgEl("span", "tag", "덧방 · 실측 뒤 확정"));
        inc.append(pkgEl("span", "", `${thin.name} 공법`), tags);
        body.appendChild(inc);
      }
      box.appendChild(body);
    }
    list.appendChild(box);
  });
  if (focusKey) { const again = list.querySelector(`[data-k="${CSS.escape(focusKey)}"]`); if (again) again.focus({ preventScroll: true }); }
  // 일반과 고급 차이 — 카테고리마다 컨셉 이름(대표 먼저)
  const cmp = $("#pkgCompare");
  if (cmp) {
    cmp.textContent = "";
    const tiers = d.tiers.slice(0, 2);
    cmp.hidden = tiers.length < 2;
    const label = $("#pkgCompareLabel");
    if (label) label.hidden = cmp.hidden;
    if (!cmp.hidden) {
      const row = (k, vals, cls) => {
        const r = pkgEl("div", "pk-row" + (cls ? " " + cls : ""));
        r.appendChild(pkgEl("div", "k", k));
        vals.forEach((v, i) => r.appendChild(pkgEl("div", "v" + (tiers[i].id === pkg.tier ? " cur" : ""), v)));
        cmp.appendChild(r);
      };
      row("", tiers.map(t => t.short), "h");
      const catIds = [];
      tiers.forEach(t => t.cats.forEach(c => { if (!catIds.some(x => x.id === c.id)) catIds.push({ id: c.id, name: c.name }); }));
      catIds.forEach(({ id, name }) => row(name, tiers.map(t => {
        const cat = t.cats.find(c => c.id === id);
        if (!cat) return "—";
        const names = [...cat.concepts].sort((a, b) => b.star - a.star).map(x => x.concept.name).join(" · ");
        return names + (cat.method ? ` (${cat.method})` : "");
      })));
    }
  }
  $("#pkgThin").hidden = !d.tiers.some(t => t.cats.some(c => c.method === "덧방"));
}

// ── 그리기 · ③ 공간 판 '패키지' 줄 ─────────────────────────────────────
/** 공간 판 맨 위 — 카테고리마다 '패키지' 줄(누르면 그 아래 컨셉 목록). plan.js planPanelRoom이 부른다. */
function pkgPanelRows(p, room) {
  const cats = pkgRoomCats(room);
  if (!cats.length) return;
  if (pkg.filled && pkg.filled.room === room && Date.now() < pkg.filled.until) {
    const note = pkgEl("div", "pk-filled");
    note.setAttribute("role", "status");
    note.append(pkgEl("span", "", pkg.filled.text),
      planBtn("tool-btn", "되돌리기", () => { pkg.filled = null; planUndo(); }, "pk-filled-undo"));
    p.appendChild(note);
  }
  const marks = pkg.rooms.get(room) || new Map(), info = pkgRoomInfo(room);
  const base = pkgTierActive() ? pkg.tier : "";
  cats.forEach(cat => {
    const key = PKG_OPEN + cat.id, open = plan.open === key;
    const curId = marks.has(cat.id) ? marks.get(cat.id) : null, cur = pkgConcept(curId);
    const row = pkgEl("div", "tr pk-row-tr" + (cur ? " on" : "") + (open ? " open" : ""));
    const head = planBtn("tr-head", null, () => { plan.open = open ? null : key; planRender(); }, "t-" + key);
    const changedHere = cur && info ? [...info.changed].filter(t => pkgSets(room, cur).has(t)).length : 0;
    const sub = cur ? `${cur.tiers.length > 1 ? "공통" : (pkgTier(cur.tiers[0]) || {}).short} · ${cur.name}${changedHere ? ` · 바꿈 ${changedHere}` : ""}`
      : curId === "" ? "패키지 없이 직접 고름" : "골라서 한 번에 담기";
    const txt = pkgEl("span", "tr-txt");
    const title = pkgEl("b", "", cats.length > 1 ? `패키지 · ${cat.name}` : "패키지");
    txt.append(title, pkgEl("span", "tr-sub", sub));
    head.prepend(pkgPkgIcon());
    head.append(txt, pkgEl("span", "tr-right", open ? "⌃" : "바꾸기 ⌄"));
    head.setAttribute("aria-expanded", String(open));
    head.setAttribute("aria-label", `${cats.length > 1 ? `패키지 ${cat.name}` : "패키지"}: ${sub}`);
    row.appendChild(head);
    if (open) {
      const body = pkgEl("div", "tr-body");
      body.setAttribute("role", "group");
      body.setAttribute("aria-label", `${room} ${cat.name} 컨셉 — 1개만`);
      const top = pkgEl("div", "tr-top");
      top.append(pkgEl("span", "t-mode", "1개만"), pkgEl("span", "", "고르면 그 공종 상품이 바뀌어요"));
      body.appendChild(top);
      const opts = [...cat.options].sort((a, b) => (a.tier === base ? 0 : 1) - (b.tier === base ? 0 : 1) || b.star - a.star);
      opts.forEach((o, i) => {
        const sel = cur && cur.id === o.concept.id;
        const b = planBtn("pr", null, () => pkgPick(room, cat.id, o.concept.id), `pk-${cat.id}-${i}`);
        b.setAttribute("aria-pressed", String(!!sel));
        const mark = pkgEl("span", "mark", sel ? "✓" : "");
        mark.setAttribute("aria-hidden", "true");
        const t = pkgEl("span", "pr-txt");
        const tierName = o.common ? "공통" : (pkgTier(o.tier) || {}).short;
        t.append(pkgEl("span", "", o.concept.name + (o.star && o.tier === base ? " ★" : "")),
          pkgEl("small", "", [tierName, o.concept.desc].filter(Boolean).join(" · ")));
        b.append(mark, t);
        if (o.concept.swatch.length) b.appendChild(pkgSwatch(o.concept.swatch));
        body.appendChild(b);
      });
      const none = planBtn("pr", null, () => pkgPick(room, cat.id, ""), `pk-${cat.id}-none`);
      none.setAttribute("aria-pressed", String(curId === ""));
      const nm = pkgEl("span", "mark", curId === "" ? "✓" : "");
      nm.setAttribute("aria-hidden", "true");
      const nt = pkgEl("span", "pr-txt");
      nt.append(pkgEl("span", "", "패키지 없이 직접 고르기"), pkgEl("small", "", "담긴 상품은 그대로 · 아래 공종에서 고쳐요"));
      none.append(nm, nt);
      body.appendChild(none);
      if (cur && info && info.changed.size) body.appendChild(pkgEl("p", "pp-text small pk-keep", "고르신 공종은 그대로 두고, 바꾸지 않은 공종만 새 컨셉으로 바뀌어요."));
      row.appendChild(body);
    }
    p.appendChild(row);
  });
  if (info && info.changed.size) {
    const acts = pkgEl("div", "pk-acts");
    acts.appendChild(planBtn("link-btn", "패키지대로 되돌리기", () => pkgRestore(room), "pk-restore"));
    p.appendChild(acts);
  }
  if (info && info.bigTile) p.appendChild(pkgEl("p", "hint warn pk-big", "덧방에는 큰 타일이 맞지 않을 수 있어요. 실측 때 확인해 안내해 드려요."));
}
function pkgPkgIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("class", "pk-ic"); svg.setAttribute("aria-hidden", "true");
  [["path", { d: "M12 3 3 7.5v9L12 21l9-4.5v-9z" }], ["path", { d: "M3 7.5 12 12l9-4.5M12 12v9" }]].forEach(([tag, attrs]) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    svg.appendChild(el);
  });
  return svg;
}
