/* 계약서 링크 화면 — 원격 서명(2026-11-03 지시서 1030-03 · 시안 R1 · R2 · R2 완료 · 앱 약속 rs-contract).
   share.js 가 링크 종류가 contract 일 때만 이 파일을 불러 NFRWSign.start(ctx)를 부른다(s.html · CSP 그대로 — 같은 사이트 스크립트만).
   1단계(늘): 견적 요약 → 중요한 내용 → 결제 조건 → 계약서 전문(장마다 접고 펼침) · 아래 고정 [궁금해요] [확인했어요].
   2단계(링크 내용의 signable 이 참일 때만 — 앱 관리자 스위치 · 기본 꺼짐): [서명하기] → 읽고 체크 → 안내 · 본인 확인 → 손가락 서명.
   ⚠️ 받은 글은 모두 textContent 로만(innerHTML 금지) · 금액은 앱이 만든 글 그대로(여기서 셈하지 않음) · 서명 시각은 서버가 받은 시각.
   서명 좌표는 x · y 정수만(시간 · 압력 없음) · "1000x<H>/x,y x,y|…". 고칠 때 share.js 의 SIGN_JS 값(?v=)을 바꾼다. */
(function () {
  "use strict";

  /* 이 파일의 판 — share.js 의 SIGN_VER 와 같아야 한다(?v= 값 · 옛 판이 캐시에서 섞였는지 확인용). 고칠 때 둘 다 바꾼다. */
  const VERSION = "20261103b";

  const SIG_W = 1000;
  const SIG_MAX_POINTS = 2000;      // 글 20,000자 안(점 하나 ≈ 8자)
  const SIG_MIN_POINTS = 8;
  const SIG_MIN_SPAN = 80;          // 너무 작은 서명(점 · 짧은 줄)은 막음
  const NOTE_MAX = 300;
  const NAME_MAX = 20;
  const DRAFT_KEY = "nfrw-sign:";

  let ctx = null;        // { token, data, call, toast, showStatus, reload, privacyUrl, framed }
  let data = null;       // { kind, payload, answers, expires, signed }
  let P = null;          // payload
  let mode = "view";     // view · step1 · step2 · step3 · done · signed
  let askOpen = false;
  let sending = false;
  let sendError = "";
  let doneInfo = null;   // { at, code, name }
  const st = { consentAt: 0, checks: [], withdrawAt: 0, callAsked: false, name: "", last4: "" };
  const sig = { H: 0, w: 0, h: 0, strokes: [], points: 0, full: false };

  /* ── 작은 도우미 ─────────────────────────────────────────── */
  const $ = (s, root = document) => root.querySelector(s);
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }
  function str(v, max = 200) { return typeof v === "string" ? v.slice(0, max) : ""; }
  function list(v, max = 200) { return Array.isArray(v) ? v.slice(0, max) : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function button(cls, label, onClick) {
    const b = el("button", "btn" + (cls ? " " + cls : ""));
    b.type = "button";
    appendAll(b, label);
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }
  function appendAll(node, items) {
    for (const it of Array.isArray(items) ? items : [items]) {
      if (it == null || it === "") continue;
      node.append(typeof it === "string" ? document.createTextNode(it) : it);
    }
    return node;
  }
  /** 강조 조각 [{t, b}] → span 여러 개(b = 굵게 클래스) · 글이면 그대로. */
  function parts(v, max = 400) {
    const frag = document.createDocumentFragment();
    if (typeof v === "string") { frag.append(document.createTextNode(v.slice(0, max))); return frag; }
    for (const p of list(v, 40)) {
      const t = str(obj(p).t, max);
      if (!t) continue;
      frag.append(p.b === true ? el("b", "c-em", t) : document.createTextNode(t));
    }
    return frag;
  }
  function telOf(phone) { return str(phone, 20).replace(/[^0-9]/g, ""); }

  /* 아이콘 — 선 그림(createElementNS · innerHTML 없음) */
  const ICONS = {
    down: ["M6 9l6 6 6-6"], up: ["M6 15l6-6 6 6"], check: ["m5 12.5 4.5 4.5L19 7.5"],
    phone: ["M6.6 3.5h2.9l1.5 4-2 1.3a10.5 10.5 0 0 0 6.2 6.2l1.3-2 4 1.5v2.9a2 2 0 0 1-2 2A16 16 0 0 1 4.6 5.5a2 2 0 0 1 2-2z"],
    lock: ["M5 11h14v9.5H5z", "M8 11V8a4 4 0 0 1 8 0v3"], info: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 11v5.5", "M12 7.6v.4"],
    clock: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7.2V12l3.2 2"], erase: ["M8.5 5.5 4 10l4.5 4.5", "M4 10h10.5a5.5 5.5 0 0 1 0 11H11"],
    print: ["M7 8V3.5h10V8", "M3.5 8h17v8.5h-17z", "M7 14h10v6.5H7z"], warn: ["M12 3.8 21.2 19.6H2.8z", "M12 9.8v4.6", "M12 16.8v.4"],
  };
  function icon(name, size = 16, width = 2) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", size); svg.setAttribute("height", size); svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", width);
    svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round"); svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "c-ic");
    for (const d of ICONS[name] || []) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); svg.append(p); }
    return svg;
  }

  /* 시각 — 모두 서울 기준(서버 시각을 그대로 보임). */
  const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
  function seoul(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return null;
    const k = new Date(n + 9 * 3600e3);   // 서울은 서머타임 없음
    return { mo: k.getUTCMonth() + 1, d: k.getUTCDate(), w: WEEK[k.getUTCDay()], h: k.getUTCHours(), mi: k.getUTCMinutes() };
  }
  const pad2 = n => String(n).padStart(2, "0");
  function dayText(ms) { const s = seoul(ms); return s ? `${s.mo}/${s.d}(${s.w})` : ""; }
  function clockText(ms) { const s = seoul(ms); return s ? `${pad2(s.h)}:${pad2(s.mi)}` : ""; }
  function dayTime(ms) { return dayText(ms) ? `${dayText(ms)} ${clockText(ms)}` : ""; }
  function shortTime(ms) { const s = seoul(ms); return s ? `${s.mo}/${s.d} ${pad2(s.h)}:${pad2(s.mi)}` : ""; }
  function expiresAt() { return Number(data.expires) > 0 ? Number(data.expires) : Number(P.expires) || 0; }

  /* 고칠 수 있는 입력은 이 탭에만 잠깐 보관(카카오톡 안 브라우저가 새로 고쳐도 체크가 남게) — 서명 그림은 넣지 않는다. */
  function saveDraft() {
    try { sessionStorage.setItem(DRAFT_KEY + ctx.token, JSON.stringify(st)); } catch { /* 사적 모드 등 */ }
  }
  function loadDraft() {
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY + ctx.token) || "null");
      if (!d || typeof d !== "object") return;
      st.consentAt = Number(d.consentAt) || 0;
      st.checks = list(d.checks, 100).map(x => Number(x) || 0);
      st.withdrawAt = Number(d.withdrawAt) || 0;
      st.callAsked = d.callAsked === true;
      st.name = str(d.name, NAME_MAX);
      st.last4 = /^\d{0,4}$/.test(str(d.last4, 4)) ? str(d.last4, 4) : "";
    } catch { /* 없음 */ }
  }
  function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY + ctx.token); } catch { /* 없음 */ } }

  /* ── 틀 ───────────────────────────────────────────────────── */
  function shell() {
    const main = $("#main");
    main.replaceChildren();
    let fix = $("#c-fix");
    if (!fix) { fix = el("div", "c-fix"); fix.id = "c-fix"; document.body.append(fix); }
    fix.replaceChildren();
    fix.hidden = false;
    return { main, fix };
  }
  function head(eyebrow, title, sub) {
    const h = el("header", "head");
    h.append(el("div", "eyebrow", eyebrow), el("h1", null, title));
    if (sub) h.append(el("div", "sub", sub));
    return h;
  }
  function card(label, cls) {
    const c = el("section", "card" + (cls ? " " + cls : ""));
    if (label) c.setAttribute("aria-label", label);
    return c;
  }
  function secTitle(title, count) {
    const s = el("div", "c-sec");
    s.append(el("span", "title strong", title));
    if (count) s.append(el("span", "c-cnt", count));
    return s;
  }
  function meta(iconName, items) {
    const m = el("div", "c-meta");
    if (iconName) m.append(icon(iconName, 14));
    m.append(appendAll(el("span"), items));
    return m;
  }
  function boldText(t) { return el("b", "c-ink", t); }
  function company() { return obj(P.company); }
  function phoneLink(label, onTap) {
    const phone = str(company().phone, 20);
    const digits = telOf(phone);
    if (!digits) return null;
    const a = el("a", "c-more");
    a.href = "tel:" + digits;
    a.append(icon("phone", 16), document.createTextNode(label + phone));
    if (onTap) a.addEventListener("click", onTap);
    return a;
  }

  /* ── 1단계 — 폰으로 보기 ──────────────────────────────────── */
  function renderView() {
    mode = "view";
    const { main, fix } = shell();
    const co = company();
    main.append(head([str(co.name, 40), "계약서 확인"].filter(Boolean).join(" · "), str(P.title, 60) || "공사 도급 계약서",
      [str(P.client, 30) ? str(P.client, 30) + "님" : "", shortTime(P.sentAt) ? shortTime(P.sentAt) + " 보냄" : ""].filter(Boolean).join(" · ")));
    main.append(summaryCard(), importantCard(), payCard(), contractCard());
    main.append(viewFoot());
    if (askOpen) {
      main.append(askCard());
      fix.hidden = true;
    } else {
      fillViewFix(fix);
    }
  }

  function summaryCard() {
    const s = obj(P.summary);
    const c = card("견적 요약");
    const top = el("div", "row");
    top.append(el("span", "muted c-small15", "계약 금액"), el("span", "grow"));
    if (str(s.vatText, 20)) top.append(el("span", "pill", str(s.vatText, 20)));
    c.append(top, el("div", "huge c-total", str(s.totalText, 30)));
    const dl = el("dl", "c-dl");
    const row = (k, v) => { if (!v || (typeof v === "string" && !v)) return; dl.append(el("dt", null, k)); const dd = el("dd"); appendAll(dd, v); dl.append(dd); };
    const term = str(s.termText, 80);
    if (term) {
      const cut = term.lastIndexOf(" · ");
      row("공사 기간", cut > 0 ? [boldText(term.slice(0, cut)), term.slice(cut)] : [boldText(term)]);
    }
    row("현장", str(s.site, 120));
    row("공사 내용", str(s.scope, 160));
    const pays = list(P.payments, 12);
    if (pays.length) {
      const first = obj(pays[0]);
      const name = str(first.stage, 30).replace(/\s*\d+(\.\d+)?\s*%$/, "");
      row("결제", `${pays.length}회 · ${name} ${str(first.amountText, 30)}${str(first.when, 20) ? "(" + str(first.when, 20) + ")" : ""}`);
    }
    c.append(dl);
    const trades = list(s.trades, 60);
    if (trades.length) {
      const more = el("button", "c-more c-link");
      more.type = "button";
      more.setAttribute("aria-expanded", "false");
      const label = el("span", null, `견적 내역 보기 · ${trades.length}공종`);
      more.append(label, icon("down", 15, 2.4));
      const box = el("div", "c-trades");
      box.hidden = true;
      for (const t of trades) {
        const r = el("div", "pay");
        r.append(el("span", null, str(obj(t).name, 40)), el("b", null, str(obj(t).amountText, 30)));
        box.append(r);
      }
      more.addEventListener("click", () => {
        box.hidden = !box.hidden;
        more.setAttribute("aria-expanded", String(!box.hidden));
        label.textContent = box.hidden ? `견적 내역 보기 · ${trades.length}공종` : "견적 내역 접기";
        more.replaceChild(icon(box.hidden ? "down" : "up", 15, 2.4), more.lastChild);
      });
      c.append(box, more);
    }
    return c;
  }

  function importantItems(check) {
    const ul = el("ul", "c-imp" + (check ? " c-chk" : ""));
    list(P.important, 30).forEach((it, i) => {
      const li = el("li");
      const text = el("span", "c-lb");
      text.append(parts(obj(it).parts));
      const ref = str(obj(it).ref, 30);
      if (ref) { text.append(" "); text.append(el("span", "c-ref", ref)); }
      if (check) {
        const box = checkbox(`요약 ${i + 1}`, st.checks[i] > 0, on => {
          st.checks[i] = on ? Date.now() : 0;
          saveDraft();
          updateStepFix();
        });
        li.append(box.label);
        box.label.append(text);
      } else {
        li.append(el("span", "c-n", String(i + 1)), text);
      }
      ul.append(li);
    });
    return ul;
  }

  function importantCard() {
    const n = list(P.important, 30).length;
    const c = card(`중요한 내용 ${n}`);
    if (!n) return el("span");
    c.append(secTitle(`꼭 읽어 주세요 · 중요한 내용 ${n}`), importantItems(false));
    return c;
  }

  function payCard() {
    const pays = list(P.payments, 12);
    const account = str(P.account, 120);
    if (!pays.length && !account) return el("span");
    const c = card("결제 조건");
    c.append(secTitle("결제 조건", str(obj(P.summary).vatText, 20)));
    for (const x of pays) {
      const r = el("div", "pay");
      const left = el("span", null, str(obj(x).stage, 30));
      if (str(obj(x).when, 30)) left.append(el("small", "c-when", str(x.when, 30)));
      r.append(left, el("b", null, str(obj(x).amountText, 30)));
      c.append(r);
    }
    if (account) {
      const r = el("div", "pay");
      r.append(el("span", "muted", "입금 계좌"), el("span", "c-right", account));
      c.append(r);
    }
    return c;
  }

  function contractStats() {
    const k = obj(P.contract);
    let articles = 0, imp = 0;
    for (const ch of list(k.chapters, 40)) for (const a of list(obj(ch).articles, 80)) { articles++; if (obj(a).important === true || list(obj(a).items, 40).some(x => obj(x).important === true)) imp++; }
    return { articles, imp };
  }

  function articleNode(a) {
    const box = el("div", "c-art");
    const important = obj(a).important === true;
    const h = el("h3", null, str(obj(a).title, 80));
    if (important) h.append(el("span", "c-tag", "중요"));
    box.append(h);
    const items = list(obj(a).items, 40);
    const body = items.length > 1 ? el("ol") : el("div");
    for (const it of items) {
      const o = obj(it);
      const line = el(items.length > 1 ? "li" : "p");
      if (o.important === true) { line.className = "c-mark"; line.append(el("span", "c-tag", "중요"), " "); }
      line.append(parts(o.parts ? o.parts : str(o.text, 1200), 1200));
      const sub = list(o.sub, 20).map(x => str(x, 300)).filter(Boolean);
      if (sub.length) {
        const x = el("div", "c-x");
        sub.forEach((t, i) => { if (i) x.append(el("br")); x.append(document.createTextNode(t)); });
        line.append(x);
      }
      body.append(line);
    }
    if (important) body.classList.add("c-mark");
    box.append(body);
    return box;
  }

  function contractCard() {
    const k = obj(P.contract);
    const chapters = list(k.chapters, 40);
    if (!chapters.length) return el("span");
    const stats = contractStats();
    const c = card("계약서 전문");
    c.id = "c-full";
    c.append(secTitle("계약서 전문", [str(k.label, 20), stats.articles ? `${stats.articles}조` : "", stats.imp ? `중요 ${stats.imp}` : ""].filter(Boolean).join(" · ")));
    if (str(k.intro, 600)) c.append(el("p", "c-intro", str(k.intro, 600)));
    const acc = el("div", "c-acc");
    const toggles = [];
    chapters.forEach((ch, i) => {
      const arts = list(obj(ch).articles, 80);
      const nImp = arts.filter(a => obj(a).important === true || list(obj(a).items, 40).some(x => obj(x).important === true)).length;
      const hb = el("button", "c-ah");
      hb.type = "button";
      hb.setAttribute("aria-expanded", "false");
      hb.id = "c-ch-" + i;
      const t = el("span", "c-t", str(obj(ch).title, 80));
      if (str(obj(ch).range, 40)) t.append(el("small", null, str(ch.range, 40)));
      hb.append(t);
      if (nImp) hb.append(el("span", "c-tag", `중요 ${nImp}`));
      hb.append(icon("down", 18, 2.4));
      const body = el("div", "c-chbody");
      body.hidden = true;
      body.setAttribute("role", "region");
      body.setAttribute("aria-labelledby", hb.id);
      let built = false;
      const set = open => {
        if (open && !built) { arts.forEach(a => body.append(articleNode(a))); built = true; }
        body.hidden = !open;
        hb.setAttribute("aria-expanded", String(open));
        hb.replaceChild(icon(open ? "up" : "down", 18, 2.4), hb.lastChild);
      };
      hb.addEventListener("click", () => { set(body.hidden); syncAll(); });
      toggles.push({ set, isOpen: () => !body.hidden });
      acc.append(hb, body);
    });
    c.append(acc);
    const all = el("button", "c-more c-link");
    all.type = "button";
    const allLabel = el("span", null, "모두 펼치기");
    all.append(allLabel, icon("down", 15, 2.4));
    const syncAll = () => {
      const open = toggles.every(x => x.isOpen());
      allLabel.textContent = open ? "모두 접기" : "모두 펼치기";
      all.replaceChild(icon(open ? "up" : "down", 15, 2.4), all.lastChild);
    };
    all.addEventListener("click", () => { const open = !toggles.every(x => x.isOpen()); toggles.forEach(x => x.set(open)); syncAll(); });
    c.append(all);
    return c;
  }

  function respondItem(answer) {
    return list(P.respond, 10).map(obj).find(r => typeof r.id === "string" && list(r.answers).includes(answer)) || null;
  }
  function lastAnswer() {
    let best = null;
    for (const r of list(P.respond, 10)) {
      const a = obj(obj(data.answers)[obj(r).id]);
      if (a.a && (!best || Number(a.at) > Number(best.at))) best = a;
    }
    return best;
  }

  function viewFoot() {
    const co = company();
    const f = el("footer", "foot c-foot");
    f.id = "c-foot";
    const ans = lastAnswer();
    if (ans) {
      const s = el("div", "c-sent");
      if (ans.a === "seen") {
        const p = el("span", "pill ok");
        p.append(icon("check", 14, 2.6), " 확인했어요");
        s.append(p, el("span", null, `${shortTime(ans.at)} 보냄 · 업체가 봅니다`));
      } else {
        s.append(el("span", "pill warn", "궁금해요"), el("span", null, `${shortTime(ans.at)} 보냄${str(ans.n, NOTE_MAX) ? " — " + str(ans.n, NOTE_MAX) : ""}`));
      }
      f.append(s);
    }
    const who = [str(co.name, 40), str(co.manager, 30)].filter(Boolean).join(" ");
    const line = el("p", null, "문의 — " + who + " ");
    const tel = phoneLink("");
    if (tel) line.append(tel);
    f.append(line);
    const exp = expiresAt();
    if (exp) {
      const p = el("p");
      // 사실대로(교차 점검 V3 #3) — 끊음 · 교부는 바로, 기간이 끝나 닫히면 하루 안에(매일 새벽 정리) · 답 · 서명 기록은 30일.
      p.append("이 링크는 ", boldText(dayTime(exp)), "까지 열려요 · 닫히면 계약서 내용은 바로 지우고(기간이 끝나 닫히면 하루 안에), 답 · 서명 기록은 30일 뒤 지워요");
      f.append(p);
    }
    const n = obj(P.notice);
    const kept = list(n.kept, 20).map(x => str(x, 20)).filter(Boolean);
    const notKept = list(n.notKept, 20).map(x => str(x, 20)).filter(Boolean);
    if (kept.length || notKept.length) {
      const box = el("div", "c-priv");
      box.setAttribute("aria-label", "이 페이지의 개인정보");
      if (kept.length) { const r = el("div", "c-r"); r.append(el("b", null, "담은 것"), el("span", null, kept.join(" · "))); box.append(r); }
      if (notKept.length) { const r = el("div", "c-r"); r.append(el("b", null, "안 담은 것"), el("span", null, notKept.join(" · "))); box.append(r); }
      f.append(box);
    }
    f.append(el("p", null, "받으신 분 전용 링크예요 — 다른 분께 보내지 마세요"));
    const privacy = el("a", null, "개인정보 처리방침");
    privacy.href = ctx.privacyUrl;
    privacy.rel = "noopener";
    f.append(privacy);
    return f;
  }

  /** 서명 순서를 열 수 있나 — 링크 내용(앱 스위치)과 서버 전체 스위치(SIGN_ENABLED)가 둘 다 켜져 있을 때만. */
  function canSign() { return P.signable === true && data.signEnabled !== false; }

  function fillViewFix(fix) {
    const exp = expiresAt();
    const signable = canSign();
    const why = signable ? "까지 열림 · 서명은 3단계" : P.signable === true ? "까지 열림 · 지금은 링크로 서명을 받지 않아요" : "까지 열림 · 서명은 만나서 받아요";
    if (exp) fix.append(meta("clock", [boldText(dayText(exp)), why]));
    const row = el("div", "btns");
    const askBtn = respondItem("ask") ? button("", "궁금해요", () => { askOpen = true; renderView(); const ta = $("#c-ask-ta"); if (ta) { ta.scrollIntoView({ block: "center" }); ta.focus(); } }) : null;
    if (signable) {
      row.append(...[askBtn, button("primary", "서명하기", () => goStep(1))].filter(Boolean));
    } else {
      const seenItem = respondItem("seen");
      const seen = lastAnswer() && lastAnswer().a === "seen";
      const ok = seenItem ? button("primary", seen ? [icon("check", 18, 2.6), "확인했어요"] : "확인했어요", () => {
        if (seen) { ctx.toast("이미 보냈어요 — 업체가 확인 후 연락드립니다."); return; }
        respond(seenItem.id, "seen", "", ok);
      }) : null;
      row.append(...[askBtn, ok].filter(Boolean));
    }
    if (row.childElementCount) fix.append(row);
  }

  function askCard() {
    const c = el("section", "c-ans");
    c.setAttribute("aria-label", "궁금해요 — 한 줄");
    const label = el("label", "strong", "궁금한 점 한 줄");
    const ta = el("textarea");
    ta.id = "c-ask-ta";
    ta.maxLength = NOTE_MAX;
    ta.rows = 2;
    label.htmlFor = ta.id;
    const lim = el("div", "c-lim", `0 / ${NOTE_MAX}`);
    ta.addEventListener("input", () => { lim.textContent = `${ta.value.length} / ${NOTE_MAX}`; });
    const row = el("div", "btns");
    const cancel = button("", "취소", () => { askOpen = false; renderView(); });
    const send = button("primary", "보내기", () => {
      const v = ta.value.trim();
      if (!v) { ctx.toast("궁금한 점을 한 줄 적어 주세요.", true); ta.focus(); return; }
      const item = respondItem("ask");
      if (item) respond(item.id, "ask", v, send, () => { askOpen = false; });
    });
    row.append(cancel, send);
    c.append(label, ta, lim, row);
    return c;
  }

  async function respond(item, answer, note, btn, after) {
    if (ctx.framed) return;
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "보내는 중…"; }
    const json = await ctx.call({ action: "shareRespond", t: ctx.token, item, answer, note: str(note, NOTE_MAX) });
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "보내기"; }
    if (!json) return ctx.toast("보내지 못했어요 — 연결을 확인하고 다시 눌러 주세요.", true);
    if (json.error) return ctx.toast(str(json.message) || "보내지 못했어요 — 새로 열어 주세요.", true);
    data.answers = json.answers || data.answers;
    if (after) after();
    renderView();
    ctx.toast("보냈어요 — 업체가 확인 후 연락드립니다.");
  }

  /* ── 2단계 — 서명 순서(동의 · 요약 체크 → 안내 · 본인 확인 → 손가락 서명) ── */
  function goStep(n) {
    if (!canSign()) return;
    mode = "step" + n;
    sendError = "";
    renderStep();
    window.scrollTo(0, 0);
  }

  function stepsBar(cur) {
    const names = ["읽고 체크", "안내 · 본인 확인", "서명"];
    const bar = el("div", "c-steps");
    bar.setAttribute("role", "list");
    bar.setAttribute("aria-label", `서명 순서 3단계 중 ${cur}`);
    names.forEach((n, i) => {
      const d = el("div", i + 1 < cur ? "d" : i + 1 === cur ? "c" : "");
      d.setAttribute("role", "listitem");
      if (i + 1 === cur) d.setAttribute("aria-current", "step");
      d.append(el("i"), document.createTextNode(n));
      bar.append(d);
    });
    return bar;
  }

  function checkbox(name, on, onChange) {
    const label = el("label", "c-cbrow");
    const input = el("input", "c-cb");
    input.type = "checkbox";
    input.checked = !!on;
    input.setAttribute("aria-label", name);
    input.addEventListener("change", () => onChange(input.checked));
    label.append(input);
    return { label, input };
  }

  function stepHead(n) {
    const s = obj(P.summary);
    const exp = expiresAt();
    return head([str(company().name, 40), "계약서 서명"].filter(Boolean).join(" · "), `서명하기 ${n} / 3`,
      [str(P.client, 30) ? str(P.client, 30) + "님" : "", str(s.totalText, 30), exp ? dayText(exp) + "까지" : ""].filter(Boolean).join(" · "));
  }

  function needChecks() { return list(P.important, 30).length; }
  function checksDone() { let n = 0; for (let i = 0; i < needChecks(); i++) if (st.checks[i] > 0) n++; return n; }
  function step1Ok() { return st.consentAt > 0 && checksDone() === needChecks(); }
  function step2Ok() { return (!P.withdrawal || st.withdrawAt > 0) && !!st.name.trim() && /^\d{4}$/.test(st.last4); }
  function sigOk() {
    if (sig.points < SIG_MIN_POINTS) return false;
    let min = Infinity, max = -Infinity;
    for (const s of sig.strokes) for (let i = 0; i < s.length; i += 2) { min = Math.min(min, s[i]); max = Math.max(max, s[i]); }
    return max - min >= SIG_MIN_SPAN;
  }

  function renderStep() {
    const { main, fix } = shell();
    if (mode === "step1") {
      main.append(stepHead(1), stepsBar(1));
      const c1 = card("전자 방식 계약 동의");
      c1.append(secTitle("전자 방식 계약 동의"));
      const ul = el("ul", "c-imp c-chk");
      const li = el("li");
      const box = checkbox("전자 방식 계약 동의", st.consentAt > 0, on => { st.consentAt = on ? Date.now() : 0; saveDraft(); updateStepFix(); });
      box.label.append(appendAll(el("span", "c-lb"), parts(typeof P.consent === "string" || Array.isArray(P.consent) ? P.consent
        : "이 화면의 손가락 서명을 계약서 서명으로 쓰고, 계약서와 서명본을 전자 문서(PDF)로 받는 데 동의합니다.")));
      li.append(box.label);
      ul.append(li);
      c1.append(ul);
      main.append(c1);
      const n = needChecks();
      if (n) {
        const c2 = card("요약을 읽고 이해함 — 항목마다 체크");
        const cnt = el("span", "c-cnt", `체크 ${checksDone()} / ${n}`);
        cnt.id = "c-chk-cnt";
        const sec = secTitle("아래 요약을 읽고 이해했습니다");
        sec.append(cnt);
        c2.append(sec, el("div", "muted small c-hint", "항목마다 체크 · 전문은 앞 화면 '계약서 전문'"), importantItems(true));
        main.append(c2);
      }
      const call = phoneLink("설명을 전화로 듣기 — ", () => { st.callAsked = true; saveDraft(); });
      if (call) { call.classList.add("c-pad4"); main.append(call); }
    } else if (mode === "step2") {
      main.append(stepHead(2), stepsBar(2));
      const w = P.withdrawal && typeof P.withdrawal === "object" ? P.withdrawal : null;
      if (w) {
        const c = card("청약철회 · 착공 안내");
        c.append(secTitle("청약철회 · 착공 안내"));
        if (w.draft === true) { const d = el("div", "row c-tight"); d.append(el("span", "pill c-draft", "[임시] 변호사 확인 전 문구")); c.append(d); }
        const ul = el("ul", "c-imp");
        list(w.items, 10).forEach((it, i) => { const li = el("li"); li.append(el("span", "c-n", String(i + 1)), appendAll(el("span", "c-lb"), parts(obj(it).parts))); ul.append(li); });
        c.append(ul);
        const digits = telOf(w.phone) || telOf(company().phone);
        if (digits) {
          const a = el("a", "c-more");
          a.href = "tel:" + digits;
          a.append(icon("phone", 16), document.createTextNode("철회 · 문의 " + (str(w.phone, 20) || str(company().phone, 20))));
          c.append(a);
        }
        const ul2 = el("ul", "c-imp c-chk c-topline");
        const li2 = el("li");
        const box = checkbox("위 안내를 읽었습니다", st.withdrawAt > 0, on => { st.withdrawAt = on ? Date.now() : 0; saveDraft(); updateStepFix(); });
        box.label.append(appendAll(el("span", "c-lb"), boldText("위 안내를 읽었습니다")));
        li2.append(box.label);
        ul2.append(li2);
        c.append(ul2);
        main.append(c);
      }
      const c2 = card("본인 확인");
      c2.append(secTitle("본인 확인"));
      const f1 = el("div", "c-fld");
      const nameIn = el("input", "c-inp");
      nameIn.id = "c-name"; nameIn.type = "text"; nameIn.maxLength = NAME_MAX; nameIn.autocomplete = "name"; nameIn.value = st.name;
      const l1 = el("label", null, "이름"); l1.htmlFor = nameIn.id;
      nameIn.addEventListener("input", () => { st.name = nameIn.value.slice(0, NAME_MAX); saveDraft(); updateStepFix(); });
      f1.append(l1, nameIn);
      const f2 = el("div", "c-fld");
      const pin = el("input", "c-inp c-pin");
      pin.id = "c-last4"; pin.type = "text"; pin.inputMode = "numeric"; pin.maxLength = 4; pin.autocomplete = "off"; pin.pattern = "[0-9]*"; pin.value = st.last4;
      const l2 = el("label", null, "휴대폰 번호 끝 4자리"); l2.htmlFor = pin.id;
      pin.addEventListener("input", () => { const v = pin.value.replace(/\D/g, "").slice(0, 4); if (v !== pin.value) pin.value = v; st.last4 = v; saveDraft(); updateStepFix(); });
      const r = el("div", "row c-pinrow");
      r.append(pin, el("small", null, "이 링크를 받은 번호"));
      f2.append(l2, r);
      c2.append(f1, f2);
      main.append(c2);
    } else {
      main.append(stepHead(3), stepsBar(3));
      const s = obj(P.summary);
      const c1 = card("서명할 계약");
      const top = el("div", "row");
      top.append(el("b", "c-17", str(P.title, 60) || "공사 도급 계약서"), el("span", "grow"), el("b", "c-17", str(s.totalText, 30)));
      const term = str(s.termText, 80);
      const cut = term.lastIndexOf(" · ");
      c1.append(top, el("div", "muted c-small14 c-tight", [cut > 0 ? term.slice(0, cut) : term, st.name.trim() ? "서명자 " + st.name.trim() : ""].filter(Boolean).join(" · ")));
      main.append(c1);
      const c2 = card("손가락 서명 칸");
      c2.append(secTitle("손가락으로 서명"), padNode());
      const n1 = el("div", "c-note");
      n1.append(icon("clock", 16), appendAll(el("span"), ["서명 시각은 ", boldText("서버가 받은 시각"), "으로 남아요"]));
      const n2 = el("div", "c-note");
      n2.append(icon("lock", 16), el("span", null, "서명하면 이 링크는 서명을 더 받지 않아요 · 서명본(PDF)은 업체가 보내 드려요"));
      c2.append(n1, n2);
      main.append(c2);
      if (sendError) {
        const e = card("보내지 못함", "warn");
        const n = el("div", "c-note c-warnnote");
        n.append(icon("warn", 16), el("span", null, sendError));
        e.append(n);
        main.append(e);
      }
    }
    updateStepFix(fix);
  }

  function updateStepFix(fixArg) {
    const fix = fixArg || $("#c-fix");
    if (!fix || !/^step/.test(mode)) return;
    fix.replaceChildren();
    const cnt = $("#c-chk-cnt");
    if (cnt) cnt.textContent = `체크 ${checksDone()} / ${needChecks()}`;
    let ok = false, metaNode = null, nextLabel = "다음";
    if (mode === "step1") {
      ok = step1Ok();
      const left = (st.consentAt > 0 ? 0 : 1) + (needChecks() - checksDone());
      metaNode = ok ? meta("check", ["동의 · 체크 ", boldText("모두 됨")]) : meta("info", ["남은 체크 ", boldText(String(left)), " — 모두 체크하면 다음"]);
    } else if (mode === "step2") {
      ok = step2Ok();
      if (!ok) {
        const need = [];
        if (P.withdrawal && !(st.withdrawAt > 0)) need.push("안내 체크");
        if (!st.name.trim()) need.push("이름");
        if (!/^\d{4}$/.test(st.last4)) need.push("끝 4자리");
        metaNode = meta("info", ["남은 것 — ", boldText(need.join(" · "))]);
      }
    } else {
      ok = sigOk() && !sending;
      nextLabel = sending ? "보내는 중…" : sendError ? "다시 보내기" : "서명하기";
      const items = ["동의 · 체크 " + needChecks(), P.withdrawal ? "철회 안내" : "", "본인 확인"].filter(Boolean).join(" · ");
      metaNode = sigOk() ? meta("check", [items + " — ", boldText("모두 됨")]) : meta("info", [items + " 됨 · ", boldText("서명 칸에 서명")]);
    }
    if (metaNode) fix.append(metaNode);
    const row = el("div", "btns");
    const prev = button("c-prev", "이전", () => {
      if (sending) return;
      if (mode === "step1") { renderView(); window.scrollTo(0, 0); return; }
      goStep(mode === "step2" ? 1 : 2);
    });
    const next = button("primary", nextLabel, () => {
      if (mode === "step1" && step1Ok()) goStep(2);
      else if (mode === "step2" && step2Ok()) { st.name = st.name.trim(); goStep(3); }
      else if (mode === "step3" && sigOk() && !sending) submit();
    });
    next.disabled = !ok;
    if (!ok) next.setAttribute("aria-disabled", "true");
    row.append(prev, next);
    fix.append(row);
  }

  /* ── 손가락 서명 칸 ───────────────────────────────────────── */
  let padCanvas = null;
  function padNode() {
    const wrap = el("div", "c-pad");
    const canvas = el("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "서명 칸 — 손가락으로 이름을 써 주세요");
    const x = el("span", "c-pad-x", "✕");
    x.setAttribute("aria-hidden", "true");
    const base = el("span", "c-pad-base");
    const ph = el("span", "c-pad-ph", "칸 안에서는 화면이 움직이지 않아요");
    const clr = button("c-pad-clr", [icon("erase", 16, 2.2), "지우고 다시"], () => { clearSig(); redraw(); updateStepFix(); });
    wrap.append(canvas, x, base, ph, clr);
    padCanvas = canvas;
    let active = null, last = null;
    const pt = e => {
      const r = canvas.getBoundingClientRect();
      const px = Math.min(Math.max(e.clientX - r.left, 0), r.width), py = Math.min(Math.max(e.clientY - r.top, 0), r.height);
      return [Math.round(px / r.width * SIG_W), Math.round(py / r.height * sig.H)];
    };
    const add = (p, first) => {
      const s = sig.strokes[sig.strokes.length - 1];
      if (!first && last && Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 3) return;
      if (sig.points >= SIG_MAX_POINTS) { if (!sig.full) { sig.full = true; ctx.toast("서명 칸이 가득 찼어요 — 지우고 다시 써 주세요.", true); } return; }
      s.push(p[0], p[1]);
      sig.points++;
      drawSeg(last, p);
      last = p;
    };
    canvas.addEventListener("pointerdown", e => {
      if (sending || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      if (!sig.H) fitPad();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* 없음 */ }
      active = e.pointerId; last = null;
      sig.strokes.push([]);
      add(pt(e), true);
    });
    canvas.addEventListener("pointermove", e => {
      if (e.pointerId !== active) return;
      e.preventDefault();
      const evs = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
      for (const ev of evs.length ? evs : [e]) add(pt(ev), false);
    });
    const end = e => {
      if (e.pointerId !== active) return;
      active = null; last = null;
      const s = sig.strokes[sig.strokes.length - 1];
      if (s && !s.length) sig.strokes.pop();
      updateStepFix();
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    // 옛 iOS 에서 칸 안 끌기가 화면을 움직이지 않게(touch-action 보강).
    canvas.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
    canvas.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
    requestAnimationFrame(fitPad);
    return wrap;
  }
  function clearSig() { sig.strokes = []; sig.points = 0; sig.full = false; }
  function fitPad() {
    if (!padCanvas || !padCanvas.isConnected) return;
    const r = padCanvas.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return;
    const H = Math.min(1000, Math.max(100, Math.round(SIG_W * h / w)));
    if (sig.points && (sig.w !== w || sig.H !== H)) { clearSig(); ctx.toast("화면 크기가 바뀌어 서명을 지웠어요 — 다시 써 주세요.", true); updateStepFix(); }
    sig.w = w; sig.h = h; sig.H = H;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    padCanvas.width = Math.round(w * dpr); padCanvas.height = Math.round(h * dpr);
    redraw();
  }
  function inkColor() { try { return getComputedStyle(document.body).color || "#000"; } catch { return "#000"; } }
  function pen(c2d, scale) {
    c2d.lineWidth = 3.2 * scale; c2d.lineCap = "round"; c2d.lineJoin = "round"; c2d.strokeStyle = inkColor(); c2d.fillStyle = c2d.strokeStyle;
  }
  function toPx(p) { const dpr = padCanvas.width / sig.w; return [p[0] / SIG_W * sig.w * dpr, p[1] / sig.H * sig.h * dpr]; }
  function drawSeg(a, b) {
    if (!padCanvas) return;
    const c2d = padCanvas.getContext("2d");
    pen(c2d, padCanvas.width / sig.w);
    const B = toPx(b);
    c2d.beginPath();
    if (!a) { c2d.arc(B[0], B[1], c2d.lineWidth / 2, 0, Math.PI * 2); c2d.fill(); return; }
    const A = toPx(a);
    c2d.moveTo(A[0], A[1]); c2d.lineTo(B[0], B[1]); c2d.stroke();
  }
  function paintStrokes(c2d, w, h, H, scale) {
    for (const s of sig.strokes) {
      if (!s.length) continue;
      c2d.beginPath();
      c2d.moveTo(s[0] / SIG_W * w, s[1] / H * h);
      if (s.length === 2) { c2d.arc(s[0] / SIG_W * w, s[1] / H * h, c2d.lineWidth / 2, 0, Math.PI * 2); c2d.fill(); continue; }
      for (let i = 2; i < s.length; i += 2) c2d.lineTo(s[i] / SIG_W * w, s[i + 1] / H * h);
      c2d.stroke();
    }
    return scale;
  }
  function redraw() {
    if (!padCanvas || !sig.w) return;
    const c2d = padCanvas.getContext("2d");
    c2d.clearRect(0, 0, padCanvas.width, padCanvas.height);
    pen(c2d, padCanvas.width / sig.w);
    paintStrokes(c2d, padCanvas.width, padCanvas.height, sig.H, 1);
  }
  function sigText() {
    return `${SIG_W}x${sig.H}/` + sig.strokes.filter(s => s.length).map(s => { const o = []; for (let i = 0; i < s.length; i += 2) o.push(s[i] + "," + s[i + 1]); return o.join(" "); }).join("|");
  }
  /** 인쇄용 서명 그림 — 흰 바탕 검은 줄(다크 모드 글자색과 무관). 서명 직후 이 화면에서만(다시 열면 서버가 좌표를 주지 않음). */
  function sigImage() {
    if (!sig.points || !sig.H) return "";
    try {
      const w = 600, h = Math.round(600 * sig.H / SIG_W);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const c2d = c.getContext("2d");
      c2d.lineWidth = 4; c2d.lineCap = "round"; c2d.lineJoin = "round"; c2d.strokeStyle = "#111"; c2d.fillStyle = "#111";
      paintStrokes(c2d, w, h, sig.H, 1);
      return c.toDataURL("image/png");
    } catch { return ""; }
  }
  window.addEventListener("resize", () => { if (mode === "step3") fitPad(); });
  try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (mode === "step3") redraw(); }); } catch { /* 옛 브라우저 */ }

  function envText() {
    const ua = navigator.userAgent || "";
    const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    const dev = /iPad/.test(ua) || touchMac ? "iPad" : /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Macintosh/.test(ua) ? "Mac" : "기타";
    let m, br = "기타 브라우저";
    if ((m = /KAKAOTALK[ /]?([\d.]*)/i.exec(ua))) br = "카카오톡 안" + (m[1] ? " " + m[1].split(".")[0] : "");
    else if (/NAVER\(inapp/.test(ua)) br = "네이버 앱 안";
    else if ((m = /SamsungBrowser\/(\d+)/.exec(ua))) br = "삼성 인터넷 " + m[1];
    else if ((m = /(?:CriOS|Chrome)\/(\d+)/.exec(ua))) br = "Chrome " + m[1];
    else if ((m = /(?:FxiOS|Firefox)\/(\d+)/.exec(ua))) br = "Firefox " + m[1];
    else if ((m = /Version\/(\d+)[\d.]* .*Safari/.exec(ua))) br = "Safari " + m[1];
    let size = "";
    try { size = `${screen.width}x${screen.height}`; } catch { /* 없음 */ }
    return [dev, br, size, navigator.language || ""].filter(Boolean).join(" · ").slice(0, 120);
  }

  async function submit() {
    if (sending || ctx.framed || !step1Ok() || !step2Ok() || !sigOk()) return;
    sending = true;
    sendError = "";
    updateStepFix();
    const body = {
      action: "signRespond", t: ctx.token, name: st.name.trim().slice(0, NAME_MAX), last4: st.last4,
      consentAt: st.consentAt, checks: st.checks.slice(0, needChecks()), withdrawAt: P.withdrawal ? st.withdrawAt : 0,
      callAsked: st.callAsked === true, clientNow: Date.now(), sig: sigText(), env: envText(),
    };
    const json = await ctx.call(body, 25000);
    sending = false;
    if (json && json.ok) {
      doneInfo = { at: Number(json.at) || 0, code: str(json.code, 12), name: body.name, image: sigImage() };
      data.signed = { at: doneInfo.at, code: doneInfo.code, applied: false };
      clearDraft();
      renderDone();
      window.scrollTo(0, 0);
      return;
    }
    const err = json && json.error;
    if (err === "signed") { ctx.toast("이미 서명을 마친 링크예요."); removeFix(); ctx.reload(); return; }
    if (err === "expired") { ctx.showStatus("기간이 지난 링크예요 — 보낸 업체에 새 링크를 요청해 주세요."); removeFix(); return; }
    if (err === "notFound") { ctx.showStatus("닫힌 링크예요 — 보낸 업체에 문의해 주세요."); removeFix(); return; }
    // 연결 끊김 · 잠시 바쁨 · 하루 상한 · 형식 오류 — 쓴 내용 · 체크 · 서명은 그대로 두고 그 자리에서 다시.
    sendError = !json ? "보내지 못했어요 — 연결을 확인하고 [다시 보내기]를 눌러 주세요 · 쓴 내용과 서명은 그대로예요"
      : str(json.message, 120) || "보내지 못했어요 — 잠시 뒤 [다시 보내기]를 눌러 주세요";
    renderStep();
    const warn = $(".card.warn");
    if (warn) warn.scrollIntoView({ block: "nearest" });
  }

  function removeFix() { const f = $("#c-fix"); if (f) f.remove(); }

  /* ── 서명 뒤 — 완료 · 다시 열면 ─────────────────────────── */
  function recordCard(rows) {
    const c = card("서명 기록");
    const dl = el("dl", "c-dl c-dl-rec");
    for (const [k, v] of rows) { dl.append(el("dt", null, k)); dl.append(appendAll(el("dd"), v)); }
    c.append(dl);
    return c;
  }
  function signedAtNode(at) { return [boldText(dayTime(at)), " ", el("span", "muted small", "서버 시각")]; }

  function renderDone() {
    mode = "done";
    const { main, fix } = shell();
    const co = company();
    const ic = el("div", "c-done");
    ic.append(icon("check", 34, 2.6));
    main.append(ic, head(str(co.name, 40), "서명을 보냈어요", "업체가 확인하면 계약이 확정돼요"));
    main.append(recordCard([
      ["서명 시각", signedAtNode(doneInfo.at)], ["확인 번호", [el("span", "c-code", doneInfo.code)]],
      ["계약", [[str(P.title, 60), str(obj(P.summary).totalText, 30)].filter(Boolean).join(" · ")]], ["서명자", [doneInfo.name]],
    ]));
    const next = card("다음 순서");
    next.append(secTitle("다음 순서"));
    const ul = el("ul", "c-imp");
    const steps = [["업체가 서명을 확인하고 계약을 확정해요"], [boldText("서명본(PDF)을 문자로 보내 드려요"), " — 꼭 보관해 주세요"]];
    const first = obj(list(P.payments, 1)[0]);
    if (str(first.amountText, 30)) steps.push([`${str(first.stage, 30).replace(/\s*\d+(\.\d+)?\s*%$/, "") || "계약금"} ${str(first.amountText, 30)} — 입금 계좌는 계약서 결제 조건에 있어요`]);
    steps.forEach((s, i) => { const li = el("li"); li.append(el("span", "c-n", String(i + 1)), appendAll(el("span", "c-lb"), s)); ul.append(li); });
    next.append(ul);
    main.append(next);
    const f = el("footer", "foot");
    const line = el("p", null, "문의 — " + str(co.name, 40) + " ");
    const tel = phoneLink("");
    if (tel) line.append(tel);
    f.append(line, el("p", null, "이 링크는 서명으로 닫혔어요 · 화면을 닫아도 서명은 그대로예요"));
    main.append(f);
    fillPrintFix(fix);
  }

  function renderSigned() {
    mode = "signed";
    const { main, fix } = shell();
    const co = company();
    const s = obj(data.signed);
    main.append(head(str(co.name, 40), "서명을 마친 링크예요", [str(P.client, 30) ? str(P.client, 30) + "님" : "", str(P.title, 60)].filter(Boolean).join(" · ")));
    main.append(recordCard([
      ["서명 시각", signedAtNode(s.at)], ["확인 번호", [el("span", "c-code", str(s.code, 12))]],
      ["상태", [s.applied ? "업체 확인 끝 · 서명본을 보내 드려요" : "업체 확인 기다림"]],
    ]));
    const n = el("div", "c-note c-pad12");
    n.append(icon("info", 16), el("span", null, "업체가 서명본을 보내면 이 페이지의 내용은 지워져요 — 그 뒤에는 문자로 받은 서명본을 보세요"));
    main.append(n);
    const f = el("footer", "foot");
    const line = el("p", null, "문의 — " + str(co.name, 40) + " ");
    const tel = phoneLink("");
    if (tel) line.append(tel);
    f.append(line);
    main.append(f);
    fillPrintFix(fix);
  }

  function fillPrintFix(fix) {
    const inApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV/i.test(navigator.userAgent || "");
    fix.append(meta("info", inApp ? ["앱 안 화면에서는 저장이 안 될 수 있어요 — ⋯ → ", boldText("다른 브라우저로 열기")] : ["인쇄 화면에서 'PDF로 저장'을 고르세요"]));
    fix.append(button("primary wide", [icon("print", 20), "계약서 저장(PDF)"], printContract));
  }

  /* ── 계약서 저장(인쇄 · PDF) — 화면 밖 인쇄용 문서를 만들고 window.print() ── */
  function printContract() {
    let doc = $("#c-print");
    if (!doc) { doc = el("div", "c-print"); doc.id = "c-print"; document.body.append(doc); }
    doc.replaceChildren();
    const co = company(), s = obj(P.summary), k = obj(P.contract);
    doc.append(el("h1", null, str(P.title, 60) || "공사 도급 계약서"));
    doc.append(el("p", "c-p-sub", [str(co.name, 40), str(P.client, 30) ? "발주자 " + str(P.client, 30) : "", str(P.estimateNo, 30) ? "견적 " + str(P.estimateNo, 30) : "",
      shortTime(P.sentAt) ? shortTime(P.sentAt) + " 보냄" : ""].filter(Boolean).join(" · ")));
    const sec = (title) => { const x = el("section"); x.append(el("h2", null, title)); doc.append(x); return x; };
    const sum = sec("계약 요약");
    const dl = el("dl");
    [["계약 금액", [str(s.totalText, 30), str(s.vatText, 20)].filter(Boolean).join(" ")], ["공사 기간", str(s.termText, 80)], ["현장", str(s.site, 120)], ["공사 내용", str(s.scope, 160)]]
      .forEach(([a, b]) => { if (b) { dl.append(el("dt", null, a), el("dd", null, b)); } });
    sum.append(dl);
    const pays = list(P.payments, 12);
    if (pays.length || str(P.account, 120)) {
      const p = sec("결제 조건");
      for (const x of pays) p.append(el("p", null, [str(obj(x).stage, 30), str(obj(x).when, 30), str(obj(x).amountText, 30)].filter(Boolean).join(" · ")));
      if (str(P.account, 120)) p.append(el("p", null, "입금 계좌 · " + str(P.account, 120)));
    }
    if (list(P.important, 30).length) {
      const imp = sec("중요한 내용");
      const ol = el("ol");
      for (const it of list(P.important, 30)) { const li = el("li"); li.append(parts(obj(it).parts)); if (str(obj(it).ref, 30)) li.append(" (" + str(it.ref, 30) + ")"); ol.append(li); }
      imp.append(ol);
    }
    const chapters = list(k.chapters, 40);
    if (chapters.length) {
      const full = sec(["계약서 전문", str(k.label, 20)].filter(Boolean).join(" · "));
      if (str(k.intro, 600)) full.append(el("p", null, str(k.intro, 600)));
      for (const ch of chapters) {
        full.append(el("h3", null, [str(obj(ch).title, 80), str(obj(ch).range, 40)].filter(Boolean).join(" · ")));
        for (const a of list(obj(ch).articles, 80)) full.append(articleNode(a));
      }
    }
    if (P.consent) { const c = sec("전자 방식 계약 동의"); c.append(appendAll(el("p"), parts(P.consent))); }
    if (P.withdrawal && typeof P.withdrawal === "object") {
      const w = sec("청약철회 · 착공 안내" + (P.withdrawal.draft === true ? " [임시]" : ""));
      const ol = el("ol");
      for (const it of list(P.withdrawal.items, 10)) { const li = el("li"); li.append(parts(obj(it).parts)); ol.append(li); }
      w.append(ol);
    }
    const signed = obj(data.signed);
    const rec = sec("서명 기록");
    const rdl = el("dl");
    const add = (a, b) => { if (b) rdl.append(el("dt", null, a), el("dd", null, b)); };
    add("서명자", doneInfo ? doneInfo.name : "");
    add("서명 시각", dayTime(signed.at) ? dayTime(signed.at) + " (서버 시각)" : "");
    add("확인 번호", str(signed.code, 12));
    rec.append(rdl);
    if (doneInfo && doneInfo.image) {
      const img = el("img", "c-p-sig");
      img.alt = "서명";
      img.src = doneInfo.image;
      rec.append(img);
    }
    doc.append(el("p", "c-p-foot", "이 문서는 서명 링크 화면에서 저장한 사본입니다 · 정식 서명본(PDF)은 업체가 보내 드립니다"));
    try { window.print(); } catch { ctx.toast("이 화면에서는 저장할 수 없어요 — 다른 브라우저로 열어 주세요.", true); }
  }

  /* ── 시작 ─────────────────────────────────────────────────── */
  window.NFRWSign = {
    version: VERSION,
    start(c) {
      const sameLink = ctx && ctx.token === c.token;
      ctx = c;
      data = c.data;
      P = obj(data.payload);
      document.body.classList.add("contract");
      try { document.title = [str(company().name, 40), "계약서"].filter(Boolean).join(" · "); } catch { /* 없음 */ }
      // 다른 링크(주소 # 바뀜)로 넘어오면 앞 링크의 체크 · 이름 · 서명이 섞이지 않게 처음부터.
      Object.assign(st, { consentAt: 0, checks: [], withdrawAt: 0, callAsked: false, name: "", last4: "" });
      if (!sameLink) { clearSig(); doneInfo = null; }
      loadDraft();
      askOpen = false;
      sending = false;
      sendError = "";
      if (data.signed && Number(data.signed.at) > 0) {
        if (doneInfo && doneInfo.at === Number(data.signed.at)) renderDone(); else renderSigned();
      } else {
        renderView();
      }
    },
  };
})();
