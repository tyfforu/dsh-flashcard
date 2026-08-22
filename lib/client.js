window.__ModuleLoader__.load({ id: "dsh-flashcard", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/FlashcardView.tsx
var import_react2 = require("react");

// src/client/FlashcardSettings.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var DEFAULTS = {
  defaultDeck: "",
  reviewOrder: "due",
  showTags: true,
  autoAdvance: true,
  lapseDelayMinutes: 10
};
async function apiGet() {
  const res = await fetch("/flashcard/api/settings.get", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  const data = await res.json();
  if (!data.ok || data.value === void 0) throw new Error(data.error?.message ?? "load failed");
  return { ...DEFAULTS, ...data.value };
}
async function apiUpdate(patch) {
  const res = await fetch("/flashcard/api/settings.update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch)
  });
  const data = await res.json();
  if (!data.ok || data.value === void 0) throw new Error(data.error?.message ?? "save failed");
  return data.value;
}
var s = {
  body: { padding: "4px 4px 16px" },
  intro: { fontSize: "13px", color: "var(--color-text-secondary, #666)", marginBottom: "12px" },
  row: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    padding: "12px 0",
    borderBottom: "0.5px solid var(--color-border-tertiary, #eee)"
  },
  label: { fontSize: "13px", fontWeight: "500", color: "var(--color-text-primary, #1a1a1a)" },
  desc: { fontSize: "12px", color: "var(--color-text-secondary, #666)", marginTop: "2px" },
  control: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", minWidth: "180px" },
  input: {
    padding: "5px 9px",
    fontSize: "13px",
    borderRadius: "6px",
    border: "0.5px solid var(--color-border-secondary, #ccc)",
    background: "var(--color-background-primary, #fff)",
    color: "inherit",
    minWidth: "180px"
  },
  status: { fontSize: "11px" },
  ok: { color: "var(--color-text-success, #1e7a1e)" },
  err: { color: "var(--color-text-danger, #b91c1c)" },
  switch: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }
};
function FlashcardSettings() {
  const [settings, setSettings] = (0, import_react.useState)(null);
  const [err, setErr] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    apiGet().then(setSettings).catch((e) => setErr(e.message));
  }, []);
  async function commit(patch) {
    try {
      const next = await apiUpdate(patch);
      setSettings(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  if (settings === null) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.body, children: err === "" ? "\u52A0\u8F7D\u4E2D\u2026" : `\u52A0\u8F7D\u5931\u8D25: ${err}` });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: s.body, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.intro, children: "\u95EA\u5361\u590D\u4E60\u63D2\u4EF6\u7684\u504F\u597D\u8BBE\u7F6E\u3002\u6240\u6709\u6539\u52A8\u81EA\u52A8\u4FDD\u5B58\u5230 ~/.dsh/flashcards/settings.json\uFF1BSM-2 \u91CD\u6765\u95F4\u9694\u5728\u4E0B\u6B21\u8BC4\u5206\u65F6\u7ACB\u5373\u751F\u6548\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: s.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.label, children: "\u9ED8\u8BA4\u724C\u7EC4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.desc, children: "\u6253\u5F00\u95EA\u5361\u65F6\u81EA\u52A8\u9009\u4E2D\u7684\u724C\u7EC4\uFF1B\u7559\u7A7A\u5219\u9009\u7B2C\u4E00\u4E2A\u724C\u7EC4" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.control, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          style: s.input,
          value: settings.defaultDeck,
          placeholder: "\u4F8B\u5982 embedded",
          onChange: (e) => setSettings({ ...settings, defaultDeck: e.target.value }),
          onBlur: () => {
            if (settings.defaultDeck !== DEFAULTS.defaultDeck) commit({ defaultDeck: settings.defaultDeck });
          }
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: s.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.label, children: "\u590D\u4E60\u987A\u5E8F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.desc, children: "\u5230\u671F\u5361\u7247\u5728\u961F\u5217\u4E2D\u7684\u6392\u5E8F\u65B9\u5F0F" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.control, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "select",
        {
          style: s.input,
          value: settings.reviewOrder,
          onChange: (e) => {
            const v = e.target.value;
            setSettings({ ...settings, reviewOrder: v });
            commit({ reviewOrder: v });
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "due", children: "\u5230\u671F\u4F18\u5148" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "random", children: "\u968F\u673A" })
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: s.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.label, children: "\u663E\u793A\u6807\u7B7E" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.desc, children: "\u5728\u5361\u7247\u4E0A\u663E\u793A\u77E5\u8BC6\u70B9\u6807\u7B7E" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.control, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: s.switch, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: settings.showTags,
            onChange: (e) => {
              const v = e.target.checked;
              setSettings({ ...settings, showTags: v });
              commit({ showTags: v });
            }
          }
        ),
        settings.showTags ? "\u5F00" : "\u5173"
      ] }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: s.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.label, children: "\u8BC4\u5206\u540E\u81EA\u52A8\u4E0B\u4E00\u9898" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.desc, children: "\u8BC4\u5206\u540E\u81EA\u52A8\u5207\u6362\u5230\u4E0B\u4E00\u5F20\u5361\u7247\uFF1B\u5173\u95ED\u5219\u4FDD\u7559\u5F53\u524D\u5361\u7247\u53EF\u624B\u52A8\u4E0B\u4E00\u9898" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.control, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: s.switch, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: settings.autoAdvance,
            onChange: (e) => {
              const v = e.target.checked;
              setSettings({ ...settings, autoAdvance: v });
              commit({ autoAdvance: v });
            }
          }
        ),
        settings.autoAdvance ? "\u5F00" : "\u5173"
      ] }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: s.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.label, children: "SM-2 \u91CD\u6765\u95F4\u9694\uFF08\u5206\u949F\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.desc, children: "\u8BC4\u5206\u300C\u91CD\u6765\u300D\u540E\u591A\u5C11\u5206\u949F\u91CD\u65B0\u52A0\u5165\u590D\u4E60\u961F\u5217\uFF08Anki \u98CE\u683C lapsed delay\uFF09" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: s.control, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "number",
          min: 1,
          max: 1440,
          style: s.input,
          value: settings.lapseDelayMinutes,
          onChange: (e) => {
            const v = Math.max(1, Math.min(1440, Math.round(Number(e.target.value) || 1)));
            setSettings({ ...settings, lapseDelayMinutes: v });
          },
          onBlur: () => commit({ lapseDelayMinutes: settings.lapseDelayMinutes })
        }
      ) })
    ] })
  ] });
}

// src/client/FlashcardView.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
async function apiCall(method, payload) {
  const res = await fetch(`/flashcard/api/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.message ?? "api error");
  return data.value;
}
function appendToDraft(ctx, sessionId, text) {
  try {
    const actx = ctx.sessions.scope(sessionId);
    if (actx === void 0) return false;
    const conversation = ctx.get("conversation");
    if (conversation === void 0) return false;
    const input = conversation.input.for(actx);
    const draft = input.state.getSnapshot().draft;
    input.setDraft(draft.trim() === "" ? text : `${draft} ${text}`);
    return true;
  } catch (error) {
    console.warn("[dsh-flashcard] draft insert failed:", error);
    return false;
  }
}
var GRADE_BUTTONS = [
  { rating: "again", label: "\u91CD\u6765", hint: "10\u5206\u949F", bg: "#fdeaea", fg: "#b91c1c" },
  { rating: "hard", label: "\u56F0\u96BE", hint: "1\u5929", bg: "#fdf3e0", fg: "#9a6700" },
  { rating: "good", label: "\u826F\u597D", hint: "\u6309\u8BA1\u5212", bg: "#e8f4e8", fg: "#1e7a1e" },
  { rating: "easy", label: "\u7B80\u5355", hint: "\u62C9\u957F", bg: "#e6f1fb", fg: "#185fa5" }
];
function FlashcardView(props) {
  const ctx = props.ctx;
  const scope = props.scope;
  const [defaultDeck, setDefaultDeck] = (0, import_react2.useState)("");
  const [reviewOrder, setReviewOrder] = (0, import_react2.useState)("due");
  const [showTags, setShowTags] = (0, import_react2.useState)(true);
  const [autoAdvance, setAutoAdvance] = (0, import_react2.useState)(true);
  (0, import_react2.useEffect)(() => {
    apiCall("settings.get", {}).then((s3) => {
      if (s3 && typeof s3 === "object") {
        if (typeof s3.defaultDeck === "string") setDefaultDeck(s3.defaultDeck);
        if (s3.reviewOrder === "random") setReviewOrder("random");
        if (s3.showTags === false) setShowTags(false);
        if (s3.autoAdvance === false) setAutoAdvance(false);
      }
    }).catch(() => {
    });
  }, []);
  const [decks, setDecks] = (0, import_react2.useState)([]);
  const [deck, setDeck] = (0, import_react2.useState)("");
  const [queue, setQueue] = (0, import_react2.useState)([]);
  const [idx, setIdx] = (0, import_react2.useState)(0);
  const [flipped, setFlipped] = (0, import_react2.useState)(false);
  const [toast, setToast] = (0, import_react2.useState)("");
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [showSettings, setShowSettings] = (0, import_react2.useState)(false);
  (0, import_react2.useEffect)(() => {
    apiCall("decks.list", {}).then((ds) => {
      setDecks(ds);
      if (ds.length === 0) return;
      const target = defaultDeck !== "" && ds.some((d) => d.name === defaultDeck) ? defaultDeck : ds[0].name;
      setDeck(target);
    }).catch((e) => setToast(`\u52A0\u8F7D\u724C\u7EC4\u5931\u8D25: ${e.message}`));
  }, [defaultDeck]);
  (0, import_react2.useEffect)(() => {
    if (deck === "") {
      setQueue([]);
      setIdx(0);
      return;
    }
    apiCall("deck.cards", { deck }).then((cs) => {
      const list = reviewOrder === "random" ? [...cs].sort(() => Math.random() - 0.5) : cs;
      setQueue(list);
      setIdx(0);
      setFlipped(false);
    }).catch((e) => setToast(`\u52A0\u8F7D\u5361\u7247\u5931\u8D25: ${e.message}`));
  }, [deck]);
  const card = queue[idx];
  const dueCount = decks.find((d) => d.name === deck)?.due ?? queue.length;
  function next() {
    if (queue.length === 0) return;
    setIdx((i) => (i + 1) % queue.length);
    setFlipped(false);
    setToast("");
  }
  function prev() {
    if (queue.length === 0) return;
    setIdx((i) => (i - 1 + queue.length) % queue.length);
    setFlipped(false);
    setToast("");
  }
  function grade(rating) {
    if (card === void 0 || busy) return;
    setBusy(true);
    apiCall("card.grade", { card_id: card.id, rating }).then(() => {
      const label = rating === "again" ? "\u91CD\u6765" : rating === "hard" ? "\u56F0\u96BE" : rating === "good" ? "\u826F\u597D" : "\u7B80\u5355";
      if (autoAdvance) {
        const nextQueue = queue.filter((c) => c.id !== card.id);
        setQueue(nextQueue);
        setFlipped(false);
        if (nextQueue.length > 0) setIdx((i) => Math.min(i, nextQueue.length - 1));
        setToast(`\u5DF2\u8BB0\u300C${label}\u300D`);
      } else {
        setFlipped(true);
        setToast(`\u5DF2\u8BB0\u300C${label}\u300D\uFF08\u4FDD\u6301\u5F53\u524D\u5361\uFF0C\u53EF\u624B\u52A8\u4E0B\u4E00\u9898\uFF09`);
      }
    }).catch((e) => setToast(`\u8BC4\u5206\u5931\u8D25: ${e.message}`)).finally(() => setBusy(false));
  }
  function mark(okMark) {
    grade(okMark ? "good" : "again");
  }
  function askAI() {
    if (card === void 0) return;
    const text = `\u8BF7\u89E3\u91CA\u8FD9\u5F20\u95EA\u5361\uFF0C\u6211\u6807\u8BB0\u4E3A\u300C\u4E0D\u61C2\u300D\u2014\u2014\u95EE\u9898\uFF1A${card.front} \u6807\u51C6\u7B54\u6848\uFF1A${card.back}\u3002\u8BF7\u8BB2\u5F97\u66F4\u901A\u4FD7\u4E9B\uFF0C\u5E76\u4E3E\u4E00\u4E2A\u5B9E\u9645\u4F8B\u5B50\u3002`;
    appendToDraft(ctx, scope.sessionId, text);
    setToast("\u5DF2\u628A\u5361\u7247\u4E0A\u4E0B\u6587\u6CE8\u5165\u804A\u5929\u6846\uFF08\u81EA\u52A8\u63D0\u95EE\uFF09");
  }
  function generateCards() {
    appendToDraft(ctx, scope.sessionId, "\u628A\u5F53\u524D\u6587\u6863/\u7B14\u8BB0\u505A\u6210\u95EA\u5361\u3002\u8BF7\u6309\u5185\u5BB9\u8D77\u4E00\u4E2A\u5408\u9002\u7684 deck \u540D\uFF0C\u6BCF\u5F20\u5361\u4E00\u95EE\u4E00\u7B54\u3001\u53EA\u8003\u4E00\u4E2A\u77E5\u8BC6\u70B9\uFF0C\u7528 flashcard_add_cards \u5EFA\u5361\u3002");
    setToast("\u5DF2\u6CE8\u5165\u300C\u751F\u6210\u95EA\u5361\u300D\u6307\u4EE4\u5230\u804A\u5929\u6846");
  }
  const s2 = {
    wrap: { display: "flex", flexDirection: "column", gap: "10px", padding: "12px", fontFamily: "var(--font-sans, system-ui)", color: "var(--color-text-primary, #1a1a1a)" },
    row: { display: "flex", gap: "6px", alignItems: "center" },
    select: { flex: 1, padding: "6px 8px", borderRadius: "8px", border: "0.5px solid var(--color-border-secondary, #ccc)", background: "var(--color-background-primary, #fff)", color: "inherit", fontSize: "13px" },
    progress: { fontSize: "12px", color: "var(--color-text-secondary, #666)", display: "flex", justifyContent: "space-between" },
    bar: { height: "4px", borderRadius: "2px", background: "var(--color-background-tertiary, #eee)", overflow: "hidden" },
    card: { border: "0.5px solid var(--color-border-secondary, #ccc)", borderRadius: "12px", padding: "18px 16px", minHeight: "150px", cursor: "pointer", background: "var(--color-background-secondary, #fafafa)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" },
    tag: { fontSize: "11px", color: "var(--color-text-tertiary, #999)", marginBottom: "8px" },
    q: { fontSize: "15px", fontWeight: "500", lineHeight: "1.6" },
    a: { fontSize: "14px", lineHeight: "1.65", color: "var(--color-text-primary, #1a1a1a)" },
    btn: { flex: 1, padding: "6px 8px", borderRadius: "8px", border: "0.5px solid var(--color-border-secondary, #ccc)", background: "var(--color-background-primary, #fff)", color: "inherit", fontSize: "12px", cursor: "pointer" },
    gradeGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" },
    toast: { fontSize: "12px", color: "var(--color-text-secondary, #666)", minHeight: "16px" },
    empty: { padding: "40px 12px", textAlign: "center", fontSize: "13px", color: "var(--color-text-secondary, #666)" }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: s2.wrap, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: s2.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("select", { style: s2.select, value: deck, onChange: (e) => setDeck(e.target.value), children: [
        decks.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "", children: "\uFF08\u6682\u65E0\u724C\u7EC4\uFF09" }),
        decks.map((d) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("option", { value: d.name, children: [
          d.name,
          "\uFF08",
          d.total,
          "\uFF09"
        ] }, d.name))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          style: { ...s2.btn, flex: "none", padding: "4px 10px" },
          title: "\u8BBE\u7F6E",
          onClick: () => setShowSettings(true),
          children: "\u2699 \u8BBE\u7F6E"
        }
      )
    ] }),
    showSettings && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 2147483e3,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px"
        },
        onClick: () => setShowSettings(false),
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "div",
          {
            onClick: (e) => e.stopPropagation(),
            style: {
              background: "var(--color-background-primary, #fff)",
              color: "var(--color-text-primary, #1a1a1a)",
              borderRadius: "12px",
              padding: "16px 18px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: "15px", fontWeight: "500" }, children: "\u95EA\u5361\u8BBE\u7F6E" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { onClick: () => setShowSettings(false), style: { ...s2.btn, flex: "none" }, children: "\u5173\u95ED" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(FlashcardSettings, {})
            ]
          }
        )
      }
    ),
    deck !== "" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: s2.progress, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: card ? `${idx + 1} / ${queue.length}` : "0 / 0" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
        "\u4ECA\u65E5\u5230\u671F ",
        dueCount
      ] })
    ] }),
    deck !== "" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: s2.bar, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { height: "100%", width: queue.length === 0 ? "0%" : `${Math.round((idx + 1) / queue.length * 100)}%`, background: "var(--color-text-info, #185fa5)" } }) }),
    card === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: s2.empty, children: deck === "" ? "\u8FD8\u6CA1\u6709\u724C\u7EC4\u3002\u53BB\u804A\u5929\u6846\u8BF4\u300C\u628A XX \u505A\u6210\u95EA\u5361\u300D\uFF0C\u6216\u70B9\u4E0B\u9762\u7684\u300C\u751F\u6210\u95EA\u5361\u300D\u3002" : "\u672C\u724C\u7EC4\u6682\u65E0\u5230\u671F\u5361\u7247\uFF0C\u4F11\u606F\u4E00\u4E0B\u6216\u590D\u4E60\u5176\u4ED6\u724C\u7EC4\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: s2.card, onClick: () => setFlipped((f) => !f), children: [
        showTags && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: s2.tag, children: card.tags.length > 0 ? card.tags.join(" \xB7 ") : "\u95EA\u5361" }),
        flipped ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: s2.a, children: card.back }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: s2.q, children: card.front }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            style: { ...s2.btn, flex: "none", marginTop: "12px", padding: "4px 14px" },
            onClick: (e) => {
              e.stopPropagation();
              setFlipped((f) => !f);
            },
            children: flipped ? "\u6536\u8D77\u7B54\u6848" : "\u663E\u793A\u7B54\u6848"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: s2.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: s2.btn, onClick: prev, children: "\u2190 \u4E0A\u4E00\u9898" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: s2.btn, onClick: next, children: "\u4E0B\u4E00\u9898 \u2192" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: s2.gradeGrid, children: GRADE_BUTTONS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          disabled: busy,
          onClick: () => grade(g.rating),
          style: { padding: "8px 2px", borderRadius: "8px", border: "0.5px solid var(--color-border-secondary, #ccc)", background: g.bg, color: g.fg, fontSize: "12px", cursor: "pointer" },
          children: [
            g.label,
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("br", {}),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { fontSize: "10px", opacity: 0.8 }, children: g.hint })
          ]
        },
        g.rating
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: s2.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: { ...s2.btn, color: "#1e7a1e" }, onClick: () => mark(true), children: "\u2713 \u5BF9" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: { ...s2.btn, color: "#b91c1c" }, onClick: () => mark(false), children: "\u2717 \u9519" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: { ...s2.btn, flex: 1.6, background: "var(--color-background-secondary, #f0f0f0)" }, onClick: askAI, children: "\u95EE AI \u89E3\u91CA \u2197" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: s2.row, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: { ...s2.btn, background: "var(--color-background-secondary, #f0f0f0)" }, onClick: generateCards, children: "\uFF0B \u4ECE\u6587\u6863\u751F\u6210\u95EA\u5361" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: s2.toast, children: toast })
  ] });
}

// src/client/icons.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var IconFlashcard16 = ({ size = 16, className }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: size, height: size, className, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [
  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "1.6", y: "2.8", width: "9.6", height: "7.6", rx: "1.6", stroke: "currentColor", strokeWidth: "1.2", opacity: "0.4" }),
  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "4.2", y: "5.2", width: "9.8", height: "8", rx: "1.6", stroke: "currentColor", strokeWidth: "1.5" }),
  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M9.7 7.3 8.5 9.9h1.7L8.8 12.4", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" })
] });

// src/client/index.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var inject = ["betterSidebar", "slots"];
function apply(ctx) {
  ctx.betterSidebar.registerTab({
    id: "dsh-flashcard",
    title: "\u95EA\u5361",
    icon: (size) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconFlashcard16, { size }),
    single: true,
    order: 50,
    component: (props) => FlashcardView(props)
  });
  ctx.slots.inject("settings.section", () => ctx.slots.register(
    {
      name: "settings.section",
      id: "flashcard",
      order: 200,
      label: () => "\u95EA\u5361"
    },
    FlashcardSettings
  ));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
