/* 작업 공유 페이지 동작 — s.html이 읽는다(2026-10-19, 원스톱 4단계 · 시안 ㊸ ㊹).
   주소 # 뒤의 열쇠로 Apps Script(웹문의.gs shareView)에서 그 링크 내용만 받아 보여 주고, [확인] · [어려움] · 답을 보낸다(shareRespond).
   2026-11-03: 종류가 contract(계약서 · 원격 서명)이면 sign.js 를 불러 그쪽 화면으로 넘긴다(openContract).
   ⚠️ 받은 글은 모두 textContent로만 넣는다(innerHTML 금지) — 앱이 만든 내용이라도 고객 · 협력사 이름 같은 글이 섞인다.
   고칠 때 s.html의 share.js?v= 값을 바꿔 옛 판이 캐시에서 섞이지 않게 한다. */
const CONFIG = {
  // 앱 '연동 설정 → Web App 주소'와 같은 주소(…/exec) — app.js CONFIG.SCRIPT_URL과 같게.
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzRtjXk_fWwx6yxK_Vonj8sMRMild_j9hOrgCNXh34qBLupLQZqUnyu0VkwpAPULXn0/exec",
  PRIVACY_URL: "https://lulubuild.github.io/estimate/privacy.html",
  NOTE_MAX: 300,
};

const $ = (s, el = document) => el.querySelector(s);
const TOKEN_RE = /^[a-f0-9]{40}$/;
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/* 다른 사이트 틀(iframe) 안에서는 보내지 않는다 — app.js와 같은 클릭재킹 막기. */
const framedByOther = (() => {
  try { return window.top !== window.self && window.top.location.origin !== location.origin; }
  catch { return true; }
})();

let token = "";
let data = null;      // { kind, payload, answers, updated }

/* ── 작은 도우미 ─────────────────────────────────────────── */
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = String(text);
  return node;
}
function str(v, max = 200) { return typeof v === "string" ? v.slice(0, max) : ""; }
function list(v, max = 200) { return Array.isArray(v) ? v.slice(0, max) : []; }
/** "2026-10-21" → Date(서울 0시) · 틀리면 null. */
function day(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s, 10));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
/** "10. 21. (수)". */
function dayText(s) {
  const d = day(s);
  return d ? `${d.getMonth() + 1}. ${d.getDate()}. (${WEEK[d.getDay()]})` : "";
}
/** "10. 21. (수) ~ 23. (금)" — 같은 달이면 뒤는 날만. */
function rangeText(from, to) {
  const a = day(from), b = day(to);
  if (!a) return "";
  if (!b || +a === +b) return dayText(from);
  const tail = a.getMonth() === b.getMonth() ? `${b.getDate()}. (${WEEK[b.getDay()]})` : dayText(to);
  return `${dayText(from)} ~ ${tail}`;
}
function won(n) {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? "₩" + v.toLocaleString("ko-KR") : "";
}
function timeText(ms) {
  const d = new Date(Number(ms));
  if (!Number.isFinite(d.getTime()) || d.getTime() <= 0) return "";
  return `${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function pill(text, kind) { return el("span", "pill" + (kind ? " " + kind : ""), text); }
function canAnswer(id, answer) {
  return list(data && data.payload && data.payload.respond).some(r => r && r.id === id && list(r.answers).includes(answer));
}
function answerOf(id) {
  const a = data && data.answers && data.answers[id];
  return a && typeof a === "object" ? a : null;
}

/* ── 서버 ─────────────────────────────────────────────────── */
async function call(body, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body), signal: ctrl.signal, redirect: "follow",
    });
    return await res.json().catch(() => null);
  } catch { return null; }
  finally { clearTimeout(timer); }
}

async function load() {
  showStatus("불러오는 중…");
  const json = await call({ action: "shareView", t: token });
  if (!json) return showStatus("연결이 잠시 안 돼요 — 잠시 뒤 다시 열어 주세요.", true);
  if (json.error === "expired") return showStatus("기간이 지난 링크예요 — 보낸 업체에 새 링크를 요청해 주세요.");
  if (json.error || !json.ok || !json.payload) return showStatus("열 수 없는 링크예요 — 주소가 바뀌었거나 닫힌 링크입니다. 보낸 업체에 문의해 주세요.");
  data = { kind: json.kind, payload: json.payload, answers: json.answers || {}, updated: json.updated };
  if (json.kind === "contract") return openContract(json);
  // 이 판이 모르는 종류(앞으로 더해질 링크) — 아무 화면이나 그리지 않고 새로 고침을 안내(옛 판이 캐시에 남은 경우).
  if (!KNOWN_KINDS.includes(json.kind)) return showReload("이 링크는 새 화면이 필요해요 — 화면을 새로 고쳐 주세요.");
  render();
}

const KNOWN_KINDS = ["crew", "site", "contract"];
function showReload(text) {
  showStatus(text);
  const b = el("button", "btn", "새로 고침");
  b.type = "button";
  b.addEventListener("click", () => location.reload());
  $("#main .card").append(b);
}

/* 계약서 링크(2026-11-03 원격 서명 · 지시서 1030-03) — 화면은 sign.js(같은 사이트 · CSP script-src 'self')가 그린다.
   협력사 · 고객 진행 링크는 sign.js 를 받지 않는다. */
const SIGN_VER = "20261103b";                 // sign.js 안의 VERSION 과 같게 — 고칠 때 둘 다 바꾼다
const SIGN_JS = "sign.js?v=" + SIGN_VER;
function loadSignJs() {
  if (window.NFRWSign) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SIGN_JS;
    s.onload = () => (window.NFRWSign ? resolve() : reject(new Error("sign.js")));
    s.onerror = () => reject(new Error("sign.js"));
    document.body.append(s);
  });
}
async function openContract(json) {
  try { await loadSignJs(); } catch { return showStatus("화면을 불러오지 못했어요 — 잠시 뒤 다시 열어 주세요.", true); }
  if (window.NFRWSign.version !== SIGN_VER) return showReload("화면 파일이 바뀌었어요 — 새로 고쳐 주세요.");
  data.expires = Number(json.expires) || 0;
  data.signed = json.signed && typeof json.signed === "object" ? json.signed : null;
  data.signEnabled = json.signEnabled !== false;   // 서버 전체 서명 스위치(옛 서버는 값 없음 → 링크 내용대로)
  window.NFRWSign.start({ token, data, call, toast, showStatus, reload: load, privacyUrl: CONFIG.PRIVACY_URL, framed: framedByOther });
}

async function respond(item, answer, note, button) {
  if (framedByOther) return;
  if (!canAnswer(item, answer)) return;
  if (button) { button.disabled = true; button.dataset.label = button.textContent; button.textContent = "보내는 중…"; }
  const json = await call({ action: "shareRespond", t: token, item, answer, note: str(note, CONFIG.NOTE_MAX) });
  if (button) { button.disabled = false; button.textContent = button.dataset.label || "보내기"; }
  if (!json) return toast("보내지 못했어요 — 연결을 확인하고 다시 눌러 주세요.", true);
  if (json.error) return toast(str(json.message) || "보내지 못했어요 — 새로 열어 주세요.", true);
  data.answers = json.answers || data.answers;
  render();
  toast("보냈어요 — 업체가 확인 후 연락드립니다.");
}

/* ── 화면 ─────────────────────────────────────────────────── */
function showStatus(text, retry) {
  const main = $("#main");
  main.replaceChildren();
  const box = el("div", "card status");
  box.append(el("p", null, text));
  if (retry) {
    const b = el("button", "btn", "다시 열기");
    b.type = "button";
    b.addEventListener("click", load);
    box.append(b);
  }
  main.append(box);
}

let toastTimer = 0;
function toast(text, warn) {
  const t = $("#toast");
  t.textContent = text;
  t.className = "toast show" + (warn ? " warn" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = "toast"; }, 3500);
}

function render() {
  const p = data.payload;
  const main = $("#main");
  main.replaceChildren();
  const company = p.company && typeof p.company === "object" ? p.company : {};
  const head = el("header", "head");
  head.append(el("div", "eyebrow", [str(company.name, 40), data.kind === "crew" ? "작업 일정" : "공사 진행"].filter(Boolean).join(" · ")));
  head.append(el("h1", null, str(p.title, 60)));
  const sub = [str(p.subtitle, 80), timeText(p.asOf) ? timeText(p.asOf) + " 기준" : ""].filter(Boolean).join(" · ");
  if (sub) head.append(el("div", "sub", sub));
  main.append(head);
  if (data.kind === "crew") renderCrew(main, p); else renderSite(main, p);
  const foot = el("footer", "foot");
  const who = [str(company.name, 40), str(company.manager, 30)].filter(Boolean).join(" ");
  const phone = str(company.phone, 20).replace(/[^0-9-]/g, "");
  if (who || phone) {
    const line = el("p");
    line.append(document.createTextNode("문의 — " + who + " "));
    if (phone) { const a = el("a", null, phone); a.href = "tel:" + phone.replace(/-/g, ""); line.append(a); }
    foot.append(line);
  }
  foot.append(el("p", null, data.kind === "crew"
    ? "이 링크는 받으신 분 전용입니다 · 일정이 바뀌면 같은 링크에 새로 보입니다"
    : "이 링크는 이 현장 전용입니다 · 공사가 끝나고 30일 뒤 닫힙니다"));
  const privacy = el("a", null, "개인정보 처리방침");
  privacy.href = CONFIG.PRIVACY_URL;
  privacy.rel = "noopener";
  foot.append(privacy);
  main.append(foot);
}

/* 협력사 — 붙은 날 묶음마다 카드 · [확인] / [어려움 + 한 줄]. */
function renderCrew(main, p) {
  const groups = list(p.groups, 100);
  if (!groups.length) { main.append(el("div", "card muted", "앞으로 2주 동안 배정된 작업이 없어요.")); return; }
  for (const g of groups) {
    const id = str(g.id, 120);
    const ans = answerOf(id);
    const card = el("section", "card" + (ans && ans.a === "no" ? " warn" : ""));
    const top = el("div", "row");
    top.append(el("b", "big", rangeText(g.from, g.to)));
    top.append(el("span", "grow"));
    top.append(ans ? (ans.a === "ok" ? pill("확인함", "ok") : pill("어려움", "warn")) : pill("답 전"));
    card.append(top);
    card.append(el("div", "line strong", [str(g.site, 60), [str(g.trade, 20), Number(g.days) > 0 ? `${Number(g.days)}일` : ""].filter(Boolean).join(" ")].filter(Boolean).join(" · ")));
    const where = [str(g.address, 120), str(g.who, 30)].filter(Boolean).join(" · ");
    if (where) card.append(el("div", "line", where));
    const work = list(g.work, 12).map(w => str(w, 60)).filter(Boolean);
    if (work.length) card.append(el("div", "line", "할 일 — " + work.join(" · ")));
    const mats = list(g.materials, 12);
    if (mats.length) {
      const line = el("div", "line", "자재 — ");
      mats.forEach((m, i) => {
        if (i) line.append(document.createTextNode(" · "));
        line.append(document.createTextNode(str(m.name, 40) + " "));
        const state = str(m.state, 20);
        if (state) line.append(pill(state + (dayText(m.date) ? " " + dayText(m.date).replace(/ \(.\)$/, "") : ""), state.includes("입고") ? "ok" : ""));
      });
      card.append(line);
    }
    if (ans && ans.n) card.append(el("div", "line note", "보낸 내용 — " + str(ans.n, 300)));
    if (canAnswer(id, "ok")) card.append(answerButtons(id, ans));
    main.append(card);
  }
}

function answerButtons(id, ans) {
  const wrap = el("div", "answer");
  const row = el("div", "btns");
  const ok = el("button", "btn primary", ans && ans.a === "ok" ? "확인함 ✓" : "확인");
  ok.type = "button";
  const no = el("button", "btn", "어려움");
  no.type = "button";
  row.append(ok, no);
  wrap.append(row);
  const form = el("div", "form");
  form.hidden = true;
  const label = el("label", "line", "어떤 날이 어려운지 · 가능한 날(한 줄)");
  const area = el("textarea");
  area.maxLength = CONFIG.NOTE_MAX;
  area.rows = 2;
  area.id = "n-" + Math.random().toString(36).slice(2);
  label.htmlFor = area.id;
  if (ans && ans.a === "no") area.value = str(ans.n, CONFIG.NOTE_MAX);
  const send = el("button", "btn primary", "보내기");
  send.type = "button";
  const cancel = el("button", "btn", "취소");
  cancel.type = "button";
  const sendRow = el("div", "btns");
  sendRow.append(cancel, send);
  form.append(label, area, sendRow);
  wrap.append(form);
  ok.addEventListener("click", () => respond(id, "ok", "", ok));
  no.addEventListener("click", () => { form.hidden = false; row.hidden = true; area.focus(); });
  cancel.addEventListener("click", () => { form.hidden = true; row.hidden = false; });
  send.addEventListener("click", () => {
    if (!area.value.trim()) { toast("어려운 날이나 사정을 한 줄 적어 주세요.", true); area.focus(); return; }
    respond(id, "no", area.value.trim(), send);
  });
  return wrap;
}

/* 고객 — 공정 · 이번/다음 주 · 정해 주실 것 · 추가 공사 · 수금 일정. */
function renderSite(main, p) {
  const site = p.site && typeof p.site === "object" ? p.site : {};
  const tasks = list(p.tasks, 40);
  const card = el("section", "card");
  const top = el("div", "row");
  const progress = Number(site.progress);
  if (Number.isFinite(progress)) top.append(el("b", "huge", `${Math.max(0, Math.min(100, Math.round(progress)))}%`));
  top.append(el("span", "muted", ["공정", str(site.status, 30)].filter(Boolean).join(" · ")));
  top.append(el("span", "grow"));
  if (dayText(site.end)) top.append(pill("완공 예정 " + dayText(site.end)));
  card.append(top);
  const start = day(site.from), end = day(site.to);
  if (tasks.length && start && end && end >= start) {
    const span = (end - start) / 864e5 + 1;
    const grid = el("div", "bars");
    for (const t of tasks) {
      const a = day(t.from), b = day(t.to);
      grid.append(el("span", "bar-name", str(t.trade, 16)));
      const track = el("div", "track");
      if (a && b) {
        const bar = el("div", "bar " + (["done", "doing"].includes(t.state) ? t.state : "todo"));
        const left = Math.max(0, (a - start) / 864e5) / span * 100;
        const width = Math.max(2, ((b - a) / 864e5 + 1) / span * 100);
        bar.style.left = left.toFixed(2) + "%";
        bar.style.width = Math.min(100 - left, width).toFixed(2) + "%";
        bar.title = rangeText(t.from, t.to);
        track.append(bar);
      }
      grid.append(track);
    }
    card.append(grid);
    card.append(el("div", "muted small", "초록 끝남 · 파랑 진행 중 · 회색 예정"));
  }
  main.append(card);

  const weeks = list(p.weeks, 2).filter(w => list(w.items).length);
  if (weeks.length) {
    const wc = el("section", "card");
    for (const w of weeks) {
      wc.append(el("b", "title", str(w.title, 20)));
      for (const it of list(w.items, 20)) {
        const work = list(it.work, 6).map(x => str(x, 40)).filter(Boolean).join(" · ");
        wc.append(el("div", "line", `${str(it.trade, 20)} ${rangeText(it.from, it.to)}${work ? " — " + work : ""}`));
      }
    }
    main.append(wc);
  }

  const requests = list(p.requests, 30);
  const additions = list(p.additions, 10);
  if (requests.length || additions.length) {
    const dc = el("section", "card warn");
    const top2 = el("div", "row");
    top2.append(el("b", "title", `정해 주실 것 ${requests.length + additions.length}`));
    dc.append(top2);
    requests.forEach((r, i) => {
      if (i) dc.append(el("hr"));
      dc.append(requestBlock(r));
    });
    additions.forEach((a, i) => {
      if (i || requests.length) dc.append(el("hr"));
      dc.append(additionBlock(a));
    });
    main.append(dc);
  }

  const pays = list(p.payments, 12);
  if (pays.length) {
    const pc = el("section", "card");
    pc.append(el("b", "title", "수금 일정"));
    for (const x of pays) {
      const row = el("div", "pay");
      row.append(el("span", null, str(x.stage, 30)));
      const right = el("span", "right");
      right.append(document.createTextNode(won(x.amount) + " "));
      right.append(x.paid ? pill("입금", "ok") : pill(dayText(x.due) ? dayText(x.due).replace(/ \(.\)$/, "") + " 까지" : "기한 미정"));
      row.append(right);
      pc.append(row);
    }
    main.append(pc);
  }
}

function requestBlock(r) {
  const id = str(r.id, 120);
  const ans = answerOf(id);
  const box = el("div", "block");
  const head = el("div", "row");
  head.append(el("span", "strong", str(r.title, 80)));
  head.append(el("span", "grow"));
  if (dayText(r.due)) head.append(pill(dayText(r.due).replace(/ \(.\)$/, "") + " 까지", "warn"));
  box.append(head);
  if (str(r.reason, 200)) box.append(el("div", "line", str(r.reason, 200)));
  if (ans) box.append(el("div", "line note", `보낸 답 ${timeText(ans.at)} — ${str(ans.n, 300)}`));
  if (canAnswer(id, "reply")) {
    const area = el("textarea");
    area.maxLength = CONFIG.NOTE_MAX;
    area.rows = 2;
    area.placeholder = ans ? "답을 고쳐 보내기" : "답을 적어 주세요";
    area.setAttribute("aria-label", str(r.title, 80) + " 답");
    const send = el("button", "btn primary wide", ans ? "답 고쳐 보내기" : "답 보내기");
    send.type = "button";
    send.addEventListener("click", () => {
      if (!area.value.trim()) { toast("답을 적어 주세요.", true); area.focus(); return; }
      respond(id, "reply", area.value.trim(), send);
    });
    box.append(area, send);
  }
  return box;
}

function additionBlock(a) {
  const id = str(a.id, 120);
  const ans = answerOf(id);
  const box = el("div", "block");
  box.append(el("div", "strong", `${str(a.title, 60)} · ${won(a.total)}`));
  const lines = list(a.lines, 8).map(x => str(x, 40)).filter(Boolean);
  if (lines.length) box.append(el("div", "line", lines.join(" · ") + (a.vat ? " — 부가세 포함" : "")));
  if (ans) box.append(el("div", "line note", ans.a === "approve" ? `'진행해 주세요' 보냄 ${timeText(ans.at)}` : `'문의할게요' 보냄 ${timeText(ans.at)}${ans.n ? " — " + str(ans.n, 300) : ""}`));
  if (canAnswer(id, "approve")) {
    const row = el("div", "btns");
    const ask = el("button", "btn", "문의할게요");
    ask.type = "button";
    const ok = el("button", "btn primary", "진행해 주세요");
    ok.type = "button";
    row.append(ask, ok);
    const confirm = el("div", "confirm");
    confirm.hidden = true;
    confirm.append(el("div", "line", `${str(a.title, 60)} ${won(a.total)}을 진행할까요? 업체가 확인 뒤 일정을 잡습니다.`));
    const cRow = el("div", "btns");
    const no = el("button", "btn", "아니요");
    no.type = "button";
    const yes = el("button", "btn primary", "네, 진행");
    yes.type = "button";
    cRow.append(no, yes);
    confirm.append(cRow);
    ok.addEventListener("click", () => { confirm.hidden = false; row.hidden = true; });
    no.addEventListener("click", () => { confirm.hidden = true; row.hidden = false; });
    yes.addEventListener("click", () => respond(id, "approve", "", yes));
    ask.addEventListener("click", () => {
      // 대화 창(prompt)은 쓰지 않는다 — 한 줄 칸을 연다.
      const area = el("textarea");
      area.maxLength = CONFIG.NOTE_MAX;
      area.rows = 2;
      area.placeholder = "궁금한 점(선택)";
      area.setAttribute("aria-label", "추가 공사 문의 내용");
      const send = el("button", "btn primary wide", "보내기");
      send.type = "button";
      send.addEventListener("click", () => respond(id, "ask", area.value.trim(), send));
      row.replaceWith(area, send);
      area.focus();
    });
    box.append(row, confirm);
  }
  return box;
}

/* ── 시작 ─────────────────────────────────────────────────── */
function start() {
  const raw = location.hash.replace(/^#/, "").replace(/^t=/, "").trim().toLowerCase();
  if (!TOKEN_RE.test(raw)) return showStatus("링크 주소가 온전하지 않아요 — 카톡에서 받은 링크를 다시 눌러 주세요.");
  token = raw;
  if (framedByOther) return showStatus("이 페이지는 다른 사이트 안에서 열 수 없어요.");
  load();
}
window.addEventListener("hashchange", start);
start();
