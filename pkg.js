/* ═══════════════════════════════════════════════════════════════════════
   웹 견적요청 — 패키지(지시서 1104-03 개정 b · 통합 개정 a, 2026-11-04)

   1단계 = 적용형: 고른 패키지를 지금의 공간별 상품 이름으로 풀어 담는다. 보내는 형식(공간별 상품)은 그대로라
   서버 · 앱은 바뀌지 않는다. 고른 패키지는 요청 내용에 한 줄('[패키지] …')로 남고, 보내기 칸 pkg에도 싣는다(2026-11-06부터 서버 '패키지' 열 · 옛 서버는 건너뜀).

   · 단계: ① 기본 정보 → ② 패키지(전체 시공일 때만) → ③ 공사할 곳 → ④ 마무리
   · 담는 곳 = 고객이 고른 공간에만
     - ②에서 패키지를 고르면 공용(전체)의 도배 · 바닥재만 담는다
     - 욕실 · 주방은 ③ 공간 판 '패키지' 줄의 '담기' 단추를 누를 때 대표(★) 컨셉을 담는다(5초 되돌리기 — 11/5 사장님 판단 5,
       그 전에는 공간을 누르기만 해도 담겨 안 할 공간이 접수에 섞일 수 있었음)
   · 공간 판 맨 위 '패키지' 줄 — 컨셉 바꾸기 · 고급 섞기 · 패키지 없이(상품 그대로 · 표시만 없앰) · 패키지대로 되돌리기
   · 컨셉을 바꾸면 고객이 바꾼 공종은 그대로 두고, 바꾸지 않은 공종만 새 컨셉으로 바뀐다
   · '바꾼 곳'은 저장하지 않고 매번 컨셉과 견줘 센다
   · 게시 조건(화면에서도 같은 검사): 이름이 하나라도 안 맞거나, 덧방 컨셉에 대형 타일이 든 컨셉은 숨긴다
   · 목록 원본(2026-11-06 지시서 1106-04 C2): 앱 '웹 견적 페이지 반영'이 설정과 함께 올린 패키지(설정 packages)가 있으면 그것,
     없으면(옛 앱 · 옛 스크립트 · 처음) 게시본 packages.js. 앱에서 '웹에 보이기'를 끈 컨셉(web: false)은 숨긴다
   · 웹 가격 없음 · 사진 없음(색 칩)
   · 2026-11-06b(지시서 1106-05): 패키지 수 · 이름은 목록대로(최대 8 — 'basic' · 'premium' 고정 없음) · 카테고리 차례 = 목록 차례 ·
     카테고리 담길 곳 여럿(targets — 없으면 target 하나) · 공간 맞추기 = 앱 PackageCatalog.matches와 같은 규칙(pkgTargetHit)

   이 파일은 app.js보다 먼저 읽힌다. 맨 위에서는 선언만 하고, 실제로 부르는 것은 app.js · plan.js가 다 읽힌 뒤다.
   ═══════════════════════════════════════════════════════════════════════ */

const PKG_TILE_MAX_MM = 600;   // [가정] 덧방 '대형 타일' = 긴 변 600mm 넘음(사장님 값이 정해지면 그 값으로)
const PKG_LINE_MAX = 100;      // 요청 내용 '[패키지]' 줄 — 서버가 요청 내용을 1000자로 자른다(구조 120 + 패키지 100 + 요청사항 778)
const PKG_OPEN = "pkg:";       // 공간 판에서 펼친 줄 열쇠(plan.open) — 공종 이름과 겹치지 않게
const PKG_COMPARE_MAX = 4;     // ② 비교 표에 견줄 패키지 수 상한(1106-05 — 넘으면 표 없이 카드 '구성'만)

/** 고객이 고른 것 — tier: "" 아직 · 등급 id(목록대로) · "none"(직접 고르기 — 등급 id로 쓰지 않음).
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
/** 목록 원본 — 앱이 올린 것(웹 설정 packages · 1106-04 C2)이 v 1 · tiers 배열이면 그것(비어 있어도 — 모두 숨김 = 패키지 없음),
    아니면 게시본 packages.js. from: "app" · "file". */
function pkgSource() {
  const ok = p => !!p && typeof p === "object" && p.v === 1 && Array.isArray(p.tiers);
  if (WEB && ok(WEB.packages)) return { src: WEB.packages, from: "app" };
  return { src: typeof PACKAGES_V1 === "object" && ok(PACKAGES_V1) ? PACKAGES_V1 : null, from: "file" };
}
/** 쓰기 좋은 모양 — 컨셉마다 대조 결과. 웹 설정이 바뀌면(webSource — 앱 패키지도 그 안) · 원본 · 판(rev)이 바뀌면 다시 만든다. */
function pkgData() {
  const { src, from } = pkgSource();
  const key = webSource + "|" + from + "|" + (src ? String(src.rev || "") : "");
  if (pkgCache.key === key && pkgCache.data) return pkgCache.data;
  const index = new Map();
  WEB.trades.forEach(t => (WEB.products[t] || []).forEach(([n]) => { if (!index.has(n)) index.set(n, []); index.get(n).push(t); }));
  const tiers = [], byId = new Map(), problems = [];
  (src ? src.tiers : []).forEach(t => {
    if (!t || typeof t.id !== "string" || !t.id || t.id === "none") return;   // "none" = '직접 고르기' 카드 값
    const tier = { id: t.id, name: String(t.name || ""), short: String(t.short || t.name || ""), sub: String(t.sub || ""), cats: [] };
    (Array.isArray(t.categories) ? t.categories : []).forEach(c => {
      if (!c || typeof c.id !== "string") return;
      const cat = { id: c.id, name: String(c.name || ""), target: String(c.target || ""), places: pkgPlaces(c), method: c.method || "", concepts: [] };
      (Array.isArray(c.concepts) ? c.concepts : []).forEach(k => {
        if (!k || typeof k.id !== "string") return;
        if (k.web === false) return;   // 앱 '웹에 보이기' 끔(1106-04 C2) — 숨김(점검 목록에도 안 넣음)
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
  // 카테고리 차례 = 목록 차례(등급 차례 · 그 안 카테고리 차례 — 처음 나온 자리) — 요청 내용 줄 · 비교 표가 쓴다(1106-05).
  const catOrder = [];
  tiers.forEach(t => t.cats.forEach(c => { if (!catOrder.includes(c.id)) catOrder.push(c.id); }));
  const data = { ok: tiers.length > 0, rev: src ? String(src.rev || "") : "", from, tiers, byId, problems, catOrder };
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
const pkgTierActive = () => state.scope === "전체" && !!pkg.tier && pkg.tier !== "none" && !!pkgTier(pkg.tier);
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
/** 카테고리 담길 곳 — targets(글 배열 · 빈 글 · 겹침 뺌)가 있으면 그것, 없으면 target 하나(1106-05 · 앱 PackageCategory.placeTargets). */
function pkgPlaces(c) {
  const out = [];
  (Array.isArray(c && c.targets) ? c.targets : []).forEach(x => {
    const v = typeof x === "string" ? x.trim() : "";
    if (v && !out.includes(v)) out.push(v);
  });
  return out.length ? out : [String(c && c.target || "")];
}
/** 공간 ↔ 담길 곳 하나 — 앱 PackageCatalog.matches(target:)와 같은 규칙(1106-05). 공간 글 = 공간 이름 · 그 공간 분류.
    ① 욕실 공간 = 욕실 · 화장실이 든 공간 · 공용 공간 = 욕실이 아니고 '공용'이 든 공간 ② whole = 공용 공간만 · 공용 공간은 whole에만
    ③ 욕실 · 화장실 = 욕실 공간 ④ 그 글자가 든 공간(두 글자 이상) ⑤ 공간 분류 규칙(matchCategory — 뒤 번호 · '/' 나눔 · 흔한 다른 이름). */
function pkgTargetHit(room, target) {
  const t = String(target || "").trim();
  if (!t) return false;
  const texts = [String(room || ""), pkgRoomCategory(room)].filter(Boolean);
  const bath = texts.some(x => x.includes("욕실") || x.includes("화장실"));
  const whole = !bath && texts.some(x => x.includes("공용"));
  if (t === "whole" || t.includes("공용")) return whole;
  if (whole) return false;
  if (t === "욕실" || t === "화장실") return bath;
  if (t.length >= 2 && texts.some(x => x.includes(t))) return true;
  return texts.some(x => !!matchCategory(x, [t]));
}
/** 이 공간에 이 카테고리가 담기나 — 담길 곳 중 하나라도. */
function pkgCatHit(room, cat) {
  return (cat.places || [cat.target]).some(t => pkgTargetHit(room, t));
}
/** 컨셉이 든 패키지 이름 — '일반 · 고급 같음'(둘 이상) · 하나면 그 짧은 이름 · 모든 패키지(셋 이상)면 '모든 패키지 같음'. */
function pkgTiersText(concept) {
  const ids = concept ? concept.tiers : [];
  if (ids.length > 2 && ids.length === pkgData().tiers.length) return "모든 패키지 같음";
  const names = ids.map(id => (pkgTier(id) || {}).short).filter(Boolean);
  return names.length > 1 ? names.join(" · ") + " 같음" : (names[0] || "");
}
/** 이 공간에 쓸 수 있는 카테고리 — [{ id, name, method, options:[{ concept, tier, star }] }]. 공간에서 못 고르는 공종만 든 컨셉은 뺀다. */
function pkgRoomCats(room) {
  const out = [];
  pkgData().tiers.forEach(tier => tier.cats.forEach(cat => {
    if (!pkgCatHit(room, cat)) return;
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
    // 패키지 전에 고객이 고른 공종 — 그대로('바꿈'으로 보이고 '패키지대로 되돌리기'로 바꿀 수 있음).
    // 단, 같은 카테고리 다른 컨셉이 담아 둔 그대로면 패키지 것이므로 바꾼다(고급 → 직접 고르기 → 일반 — 2026-11-05 더블체크 c3)
    if (!force && cur && cur.size && !pkgFromPackage(room, catId, trade, cur)) return;
    data.items.set(trade, new Set(names)); data.trades.add(trade);
  });
}
/** 지금 상품이 이 카테고리 어느 컨셉이 담은 것과 같은가(고객이 고른 것이 아님). */
function pkgFromPackage(room, catId, trade, cur) {
  for (const c of pkgData().byId.values()) {
    if (c.cat === catId && pkgSame(cur, pkgSets(room, c).get(trade))) return true;
  }
  return false;
}
/** 받침 따라 조사 — pkgJosa("화이트 클린", "을", "를"). */
function pkgJosa(word, withBatchim, without) {
  const s = String(word), c = s.charCodeAt(s.length - 1) - 0xAC00;
  return c >= 0 && c <= 11171 && c % 28 ? withBatchim : without;
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
/** ② 패키지 고르기 — 공용(전체)의 도배 · 바닥재만 담는다. 이미 담긴 공간은 같은 카테고리의 새 등급 대표로(바꾼 공종은 그대로).
    ②의 선택은 ③ 되돌리기 묶음에 넣지 않는다 — 등급을 바꾸면 되돌리기 기록은 새로 시작(③ 되돌리기가 ② 담기를 풀던 것 — 2026-11-05 더블체크 c2). */
function pkgChooseTier(tierId) {
  if (tierId === pkg.tier) { pkg.peek = tierId === "none" ? "" : tierId; pkgRenderStep(); return; }
  pkg.tier = tierId; pkg.peek = tierId === "none" ? "" : tierId;
  if (tierId === "none") pkg.rooms.clear();   // 표시만 지운다(상품 그대로)
  else {
    const whole = CONFIG.WHOLE_HOUSE_ROOM;
    if (WEB.rooms.includes(whole)) pkgRoomCats(whole).forEach(cat => { const d = pkgDefault(tierId, cat.id); if (d) pkgAssign(whole, cat.id, d.id, false); });
    pkg.rooms.forEach((marks, room) => {
      if (room === whole) return;
      [...marks].forEach(([cat, id]) => { const d = id && pkgDefault(tierId, cat); if (d && d.id !== id) pkgAssign(room, cat, d.id, false); });
    });
  }
  planRefresh();
  plan.hist = []; plan.fut = []; plan.note = null;
  afterChange();
  clearInvalid("pkg");
  const t = $("#toast"); if (t) t.classList.remove("on");   // '패키지를 골라 주세요' 알림을 바로 지움(c4)
  pkgRenderStep();
}
/** ③ 공간 판 '담기' — 고른 등급의 대표 컨셉을 그 공간에 담는다(누를 때만 — 사장님 11/5 판단 5). */
function pkgFill(room, catId, id) {
  const c = pkgConcept(id);
  if (!c || !room) return;
  const tier = pkgTierActive() ? pkgTier(pkg.tier).short + " 패키지 " : "";
  planDo(`${room} ‹ ${c.name} 담음`, () => { pkg.touched.add(room); pkgAssign(room, catId, id, false); });
  // 폰은 위 안내가 화면 밖일 수 있다 — 공간 판 맨 위에도 5초 되돌리기(검토 3)
  pkg.filled = { room, text: `${tier}${c.name}${pkgJosa(c.name, "을", "를")} 담았어요`, until: Date.now() + 5000 };
  clearTimeout(pkg.filledTimer);
  pkg.filledTimer = setTimeout(() => { pkg.filled = null; if (current === "plan") planRender(); }, 5100);
  planRender();
  const head = $(`#planPanel [data-k="t-${CSS.escape(PKG_OPEN + catId)}"]`);
  if (head) head.focus({ preventScroll: true });
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
  // 적용 범위 위주(업체가 어느 공간에 무엇이 담겼는지 한 줄로 — 2026-11-05 더블체크 c5):
  // '[패키지] 일반 / 공용 깔끔 합지 · 표준 강마루 / 화장실1 화이트 클린 / 변경 없음 / 판 2026-11-05'
  const label = pkgTierLabel() || "패키지";
  const base = pkgTierActive() ? pkg.tier : "";
  const short = r => (r === CONFIG.WHOLE_HOUSE_ROOM ? "공용" : r);
  const catOrder = pkgData().catOrder;   // 목록 차례(1106-05 — 고정 차례 걷어 냄)
  const ord = c => { const i = catOrder.indexOf(c); return i < 0 ? 99 : i; };
  const nm = c => c.name + (base && !c.tiers.includes(base) ? `(${(pkgTier(c.tiers[0]) || {}).short || ""})` : "");
  const parts = used.map(r => `${short(r)} ${[...pkgRoomInfo(r).concepts].sort((a, b) => ord(a.cat) - ord(b.cat)).map(x => nm(x.concept)).join(" · ")}`);
  const big = used.filter(r => pkgRoomInfo(r).bigTile);
  // 덧방 확인(안전 표시)은 앞에 — 100자를 넘으면 뒤 공간부터 '외 n곳'으로 줄인다(검토 10)
  const head = ["[패키지] " + label].concat(big.length ? [`덧방 확인 필요 ${big.join("·")}`] : []);
  const ch = pkgChangedRooms();
  const tails = [[ch.length ? `변경 ${ch.map(short).join("·")}` : "변경 없음", "판 " + pkgData().rev], [ch.length ? `변경 ${ch.length}곳` : "변경 없음", "판 " + pkgData().rev]];
  let text = "";
  for (const tail of tails) {
    let shown = parts.slice();
    for (;;) {
      const more = parts.length - shown.length;
      text = head.concat(shown.length || more ? shown : ["담긴 곳 없음"], more ? [`외 ${more}곳`] : [], tail).join(" / ");
      if (text.length <= PKG_LINE_MAX || !shown.length) break;
      shown.pop();
    }
    if (text.length <= PKG_LINE_MAX) break;
  }
  return text.length > PKG_LINE_MAX ? text.slice(0, PKG_LINE_MAX - 1) + "…" : text;
}
/** 보내기 칸 pkg — 서버가 '패키지' 열에 JSON 글로 적고 앱 동기화에 pkg로 싣는다(2026-11-06 1106-04 C2 · 옛 서버는 건너뜀). */
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
  const n = pkgChangedRooms().length;
  const lines = [`${label ? label + " 패키지" : "패키지"} · ${n ? `바꾼 곳 ${n}` : "바꾼 곳 없음"}`];
  lines.push(names.length ? names.join(" · ") : "아직 담긴 곳이 없어요");
  return lines;
}
/** 마무리 공간 줄 — 바꿈 · 추가 · 덧방 확인이 있을 때만(같은 말 세 번 — 2026-11-05 더블체크 c10). */
function pkgRoomSummaryLine(room) {
  const i = pkgRoomInfo(room);
  if (!i || (!i.changed.size && !i.added.size && !i.bigTile)) return "";
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
  if ("tier" in s) pkg.tier = s.tier === "none" || (typeof s.tier === "string" && !!s.tier && !!pkgTier(s.tier)) ? s.tier : "";
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
  // 카드 부제 = 이 패키지가 담는 것(보이는 카테고리만 — 숨은 것이 있어도 말이 맞게, 2026-11-05 더블체크 c1)
  const cover = t => t.cats.map(c => c.name + (c.method ? ` ${c.method}` : "")).join(" · ");
  const cards = d.tiers.map(t => ({ id: t.id, name: t.name, sub: cover(t), tier: t }))
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
        const col = pkgEl("span", "pk-v");
        col.appendChild(v);
        if (star.concept.desc) col.appendChild(pkgEl("small", "pk-desc", star.concept.desc));   // 사양 한 줄(c8)
        it.append(pkgEl("span", "", cat.name), col);
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
  // 패키지 차이 — 카테고리마다 컨셉 이름(대표 먼저). 패키지 2 ~ 4개일 때(1106-05 — 5개부터는 칸이 좁아 카드 '구성'으로만)
  const cmp = $("#pkgCompare");
  if (cmp) {
    cmp.textContent = "";
    const tiers = d.tiers.length <= PKG_COMPARE_MAX ? d.tiers : [];
    cmp.hidden = tiers.length < 2;
    const label = $("#pkgCompareLabel");
    if (label) {
      label.hidden = cmp.hidden;
      const a = tiers.length === 2 ? tiers[0].short : "";
      label.textContent = a ? `${a}${pkgJosa(a, "과", "와")} ${tiers[1].short} 차이` : "패키지 차이";
    }
    if (!cmp.hidden) {
      const row = (k, vals, cls) => {
        const r = pkgEl("div", "pk-row" + (cls ? " " + cls : ""));
        if (tiers.length !== 2) r.style.gridTemplateColumns = `76px repeat(${tiers.length}, minmax(0, 1fr))`;
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
  pkgRenderHint(d);
}
/** 제목 · 안내 한 줄 — 지금 보이는 카테고리만 말한다(이름이 안 맞아 숨은 컨셉이 있으면 그 공간은 빼고 — 2026-11-04 실서버 대조 · 11-05 더블체크 c1 · c7).
    공간 이름은 웹 설정의 실제 이름(화장실1 → '화장실')으로. */
function pkgRenderHint(d) {
  const josa = w => pkgJosa(w, "은", "는");
  const roomName = target => { const r = WEB.rooms.find(x => x !== CONFIG.WHOLE_HOUSE_ROOM && pkgTargetHit(x, target)); return r ? r.replace(/\s*\d+$/, "") : target; };
  const whole = [], rooms = [];
  d.tiers.forEach(t => t.cats.forEach(c => (c.places || [c.target]).forEach(target => {   // 담길 곳마다(1106-05)
    const isWhole = target === "whole" || target.includes("공용"), list = isWhole ? whole : rooms, nm = isWhole ? c.name : roomName(target);
    if (nm && !list.includes(nm)) list.push(nm);
  })));
  const w = whole.join(" · "), r = rooms.join(" · ");
  const title = $("#pkgTitleSub");
  if (title) title.textContent = rooms.length ? "고른 공간에 추천 상품을 담아요." : whole.length ? `${w}${pkgJosa(w, "을", "를")} 한 번에 골라요.` : "";
  const hint = $("#pkgHint");
  if (!hint) return;
  const range = "범위 · 수량은 실측 때 정해요.";
  if (whole.length && rooms.length) hint.textContent = `${w}${josa(w)} 공용(전체)에 바로 담기고, ${r}${josa(r)} 다음 화면에서 그 공간을 누른 뒤 '담기'로 담아요. ${range}`;
  else if (whole.length) hint.textContent = `${w}${josa(w)} 공용(전체)에 바로 담겨요. 그 밖의 공간은 다음 화면에서 직접 골라요. ${range}`;
  else if (rooms.length) hint.textContent = `${r}${josa(r)} 다음 화면에서 그 공간을 누른 뒤 '담기'로 담아요. ${range}`;
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
    // 아직 안 담았고 등급을 골랐으면 그 등급 대표를 '담기' 단추로(누를 때만 — 사장님 11/5 판단 5)
    const def = !cur && curId === null && pkgTierActive() ? pkgDefault(pkg.tier, cat.id) : null;
    const sub = cur ? `${pkgTiersText(cur)} · ${cur.name}${changedHere ? ` · 바꿈 ${changedHere}` : ""}`
      : curId === "" ? "패키지 없이 직접 고름"
      : def ? `${pkgTier(pkg.tier).short} 추천 · ${def.name}`
      : "추천 구성 한 번에 담기 — " + pkgData().tiers.map(t => t.short).filter(Boolean).join(" · ");
    const txt = pkgEl("span", "tr-txt");
    const title = pkgEl("b", "", cats.length > 1 ? `패키지 · ${cat.name}` : "패키지");
    txt.append(title, pkgEl("span", "tr-sub", sub));
    head.prepend(pkgPkgIcon());
    head.append(txt, pkgEl("span", "tr-right", open ? "⌃" : "바꾸기 ⌄"));
    head.setAttribute("aria-expanded", String(open));
    head.setAttribute("aria-label", `${cats.length > 1 ? `패키지 ${cat.name}` : "패키지"}: ${sub}`);
    row.appendChild(head);
    if (def && !open) {
      const fill = planBtn("pk-fill", null, () => pkgFill(room, cat.id, def.id), "pk-fill-" + cat.id);
      if (def.swatch.length) fill.appendChild(pkgSwatch(def.swatch));
      fill.appendChild(pkgEl("span", "", `‘${def.name}’ 담기`));
      fill.setAttribute("aria-label", `${pkgTier(pkg.tier).short} 패키지 ${def.name} ${room}에 담기`);
      row.appendChild(fill);
    }
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
        const tierName = o.common ? pkgTiersText(o.concept) : (pkgTier(o.tier) || {}).short;
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
