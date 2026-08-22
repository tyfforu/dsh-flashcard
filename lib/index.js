var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// src/settings.ts
var settings_exports = {};
__export(settings_exports, {
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  getSettings: () => getSettings,
  updateSettings: () => updateSettings
});
import { readFile as readFile2, writeFile as writeFile2, mkdir as mkdir2 } from "node:fs/promises";
import { join as join2, dirname } from "node:path";
import { homedir as homedir2 } from "node:os";
async function getSettings() {
  if (cache !== void 0) return cache;
  try {
    const raw = await readFile2(PATH, "utf8");
    const parsed = JSON.parse(raw);
    cache = { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache;
}
async function updateSettings(patch) {
  const current = await getSettings();
  const next = {
    ...current,
    ...patch,
    // Normalize on the way in so the stored file is always clean.
    reviewOrder: patch.reviewOrder === "random" ? "random" : "due",
    lapseDelayMinutes: Number.isFinite(patch.lapseDelayMinutes) ? Math.max(1, Math.round(patch.lapseDelayMinutes)) : current.lapseDelayMinutes
  };
  await mkdir2(dirname(PATH), { recursive: true });
  await writeFile2(PATH, JSON.stringify(next, null, 2), "utf8");
  cache = next;
  return next;
}
var PATH, DEFAULT_SETTINGS, cache;
var init_settings = __esm({
  "src/settings.ts"() {
    "use strict";
    PATH = join2(homedir2(), ".dsh", "flashcards", "settings.json");
    DEFAULT_SETTINGS = {
      defaultDeck: "",
      reviewOrder: "due",
      showTags: true,
      autoAdvance: true,
      lapseDelayMinutes: 10
    };
  }
});

// src/storage.ts
import { homedir } from "node:os";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// src/sm2.ts
var MIN_EASE = 1.3;
var MAX_EASE = 3;
var DAY_MS = 24 * 60 * 60 * 1e3;
var LAPSE_DELAY_MS = 10 * 60 * 1e3;
function freshSched(now = Date.now()) {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now };
}
function review(state, rating, now = Date.now(), lapseDelayMs = LAPSE_DELAY_MS) {
  let { ease, interval, reps, lapses } = state;
  if (rating === "again") {
    lapses += 1;
    reps = 0;
    interval = 0;
    ease = Math.max(MIN_EASE, ease - 0.2);
    return { ease, interval, reps, lapses, due: now + lapseDelayMs };
  }
  reps += 1;
  if (reps === 1) {
    interval = 1;
  } else if (reps === 2) {
    interval = 6;
  } else if (rating === "hard") {
    ease = Math.max(MIN_EASE, ease - 0.15);
    interval = Math.max(1, Math.round(interval * 1.2));
  } else if (rating === "easy") {
    ease = Math.min(MAX_EASE, ease + 0.15);
    interval = Math.round(interval * ease * 1.3);
  } else {
    interval = Math.round(interval * ease);
  }
  return { ease, interval, reps, lapses, due: now + interval * DAY_MS };
}

// src/storage.ts
var ROOT = join(homedir(), ".dsh", "flashcards");
function deckNameOf(file) {
  if (!file.endsWith(".jsonl")) return void 0;
  return file.slice(0, -".jsonl".length);
}
function deckFileName(deck) {
  return join(ROOT, `${deck.replace(/[^\w\u4e00-\u9fa5-]+/g, "_")}.jsonl`);
}
var CardStore = class {
  cache = /* @__PURE__ */ new Map();
  async listDecks() {
    await mkdir(ROOT, { recursive: true });
    const files = await readdir(ROOT).catch(() => []);
    const decks = [];
    for (const file of files) {
      const deck = deckNameOf(file);
      if (deck === void 0) continue;
      const cards = await this.loadDeck(deck);
      const now = Date.now();
      let due = 0;
      let newCards = 0;
      let mastered = 0;
      for (const c of cards) {
        if (c.due <= now) due += 1;
        if (c.reps === 0) newCards += 1;
        if (c.interval >= 21) mastered += 1;
      }
      decks.push({ name: deck, total: cards.length, due, newCards, mastered });
    }
    decks.sort((a, b) => b.due - a.due);
    return decks;
  }
  async loadDeck(deck) {
    const cached = this.cache.get(deck);
    if (cached !== void 0) return cached;
    await mkdir(ROOT, { recursive: true });
    const file = deckFileName(deck);
    let cards = [];
    try {
      const raw = await readFile(file, "utf8");
      cards = raw.split("\n").filter((line) => line.trim() !== "").map((line) => JSON.parse(line));
    } catch {
      cards = [];
    }
    this.cache.set(deck, cards);
    return cards;
  }
  async persist(deck) {
    const cards = this.cache.get(deck) ?? [];
    await mkdir(ROOT, { recursive: true });
    const lines = cards.map((c) => JSON.stringify(c)).join("\n") + (cards.length > 0 ? "\n" : "");
    await writeFile(deckFileName(deck), lines, "utf8");
  }
  async addCards(deck, inputs, source) {
    const cards = await this.loadDeck(deck);
    const now = Date.now();
    const created = inputs.map((input) => ({
      id: randomUUID(),
      deck,
      front: input.front.trim(),
      back: input.back.trim(),
      tags: input.tags ?? [],
      source: input.source ?? source,
      createdAt: now,
      ...freshSched(now),
      history: []
    }));
    cards.push(...created);
    await this.persist(deck);
    return created;
  }
  async findCard(id) {
    for (const cards of this.cache.values()) {
      const found = cards.find((c) => c.id === id);
      if (found !== void 0) return found;
    }
    const decks = await this.listDecks();
    for (const d of decks) {
      const cards = await this.loadDeck(d.name);
      const found = cards.find((c) => c.id === id);
      if (found !== void 0) return found;
    }
    return void 0;
  }
  async grade(id, rating, now = Date.now(), lapseDelayMs = 10 * 60 * 1e3) {
    const card = await this.findCard(id);
    if (card === void 0) return void 0;
    const next = review(
      { ease: card.ease, interval: card.interval, reps: card.reps, lapses: card.lapses, due: card.due },
      rating,
      now,
      lapseDelayMs
    );
    Object.assign(card, next);
    card.history = [...card.history.slice(-19), { at: now, rating }];
    await this.persist(card.deck);
    return card;
  }
  /** Due cards for one deck, ordered by due time ascending. */
  async dueCards(deck, now = Date.now()) {
    const cards = await this.loadDeck(deck);
    return cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
  }
};

// src/tools.ts
import { defineTool } from "@deepseek-ai/dsh-tools";
var RATINGS = ["again", "hard", "good", "easy"];
function textRender(fn) {
  return (_args, value) => [{ type: "text", text: fn(value) }];
}
function registerTools(ctx, store) {
  const disposers = [];
  const register = (tool) => {
    disposers.push(ctx.tools.register(tool));
  };
  register(defineTool({
    name: "flashcard_add_cards",
    description: "Create flashcards in a deck so the user can review them later with spaced repetition (Anki-style). Use this when the user asks you to turn a document, note, or part of the conversation into study cards. Keep every card atomic: one question, one answer, one single concept. Write the front as a direct question and the back as a concise answer (prefer under 50 words).",
    parameters: {
      deck: {
        type: "string",
        required: true,
        description: 'Deck name, e.g. "embedded", "freertos", "english-vocab". Created automatically if missing.'
      },
      cards: {
        type: "array",
        required: true,
        description: "The cards to create.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            front: { type: "string", required: true, description: "The question / prompt side." },
            back: { type: "string", required: true, description: "The answer side." },
            tags: { type: "array", items: { type: "string" }, description: "Optional topic tags." }
          }
        }
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          deck: { type: "string", required: true },
          created: { type: "integer", required: true, description: "Number of cards actually created." }
        }
      },
      render: textRender(
        (v) => `Created ${v.created} card(s) in deck "${v.deck}". The user can review them in the right-sidebar "\u95EA\u5361" tab.`
      )
    },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted();
      const source = exec.agent?.session?.id;
      const created = await store.addCards(args.deck, args.cards, source);
      return { deck: args.deck, created: created.length };
    }
  }));
  register(defineTool({
    name: "flashcard_list_due",
    description: "List the flashcards that are due for review in a deck (or across all decks when no deck is given). Use this to tell the user what they should review right now.",
    parameters: {
      deck: { type: "string", description: "Optional deck name. When omitted, due cards across all decks are listed." },
      limit: { type: "integer", description: "Maximum number of cards to return (default 20)." }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          total: { type: "integer", required: true },
          cards: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                deck: { type: "string" },
                front: { type: "string" },
                back: { type: "string" }
              }
            }
          }
        }
      },
      render: textRender((v) => {
        if (v.total === 0) return "No cards are due for review right now.";
        const lines = v.cards.map((c) => `  [${c.deck}] Q: ${c.front}  A: ${c.back}`);
        return `${v.total} card(s) due:
${lines.join("\n")}`;
      })
    },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted();
      const limit = args.limit ?? 20;
      if (args.deck !== void 0) {
        const cards = await store.dueCards(args.deck);
        const slice = cards.slice(0, limit);
        return { total: cards.length, cards: slice.map((c) => ({ id: c.id, deck: c.deck, front: c.front, back: c.back })) };
      }
      const decks = await store.listDecks();
      const all = [];
      for (const d of decks) {
        const cards = await store.dueCards(d.name);
        for (const c of cards) all.push({ id: c.id, deck: c.deck, front: c.front, back: c.back });
        if (all.length >= limit) break;
      }
      return { total: all.length, cards: all.slice(0, limit) };
    }
  }));
  register(defineTool({
    name: "flashcard_grade",
    description: `Record the user's self-graded performance on one flashcard, updating its spaced-repetition schedule. rating: "again" = forgot it (relearn soon), "hard" = recalled with difficulty, "good" = recalled correctly, "easy" = trivially easy.`,
    parameters: {
      card_id: { type: "string", required: true, description: "The card id (from flashcard_list_due)." },
      rating: { type: "string", required: true, enum: [...RATINGS], description: "again | hard | good | easy" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          interval: { type: "integer", required: true, description: "Days until the card is next due (0 = relearn shortly)." },
          due: { type: "number", required: true, description: "Epoch ms of the next due time." }
        }
      },
      render: textRender(
        (v) => v.interval === 0 ? `Card marked for relearning (due again in 10 minutes).` : `Card scheduled: next due in ${v.interval} day(s).`
      )
    },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted();
      const { getSettings: getSettings2 } = await Promise.resolve().then(() => (init_settings(), settings_exports));
      const settings = await getSettings2();
      const card = await store.grade(args.card_id, args.rating, void 0, settings.lapseDelayMinutes * 60 * 1e3);
      if (card === void 0) throw new Error(`card "${args.card_id}" not found`);
      return { interval: card.interval, due: card.due };
    }
  }));
  register(defineTool({
    name: "flashcard_stats",
    description: "Read statistics for one deck, or a summary of all decks. Useful to report review progress to the user.",
    parameters: {
      deck: { type: "string", description: "Optional deck name; omit for all-deck summary." }
    },
    output: {
      schema: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            total: { type: "integer" },
            due: { type: "integer" },
            newCards: { type: "integer" },
            mastered: { type: "integer" }
          }
        }
      },
      render: textRender((v) => {
        if (v.length === 0) return "No decks yet.";
        return v.map((d) => `  ${d.name}: ${d.total} cards, ${d.due} due, ${d.mastered} mastered`).join("\n");
      })
    },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted();
      const decks = await store.listDecks();
      if (args.deck !== void 0) return decks.filter((d) => d.name === args.deck);
      return decks;
    }
  }));
  return () => {
    for (const dispose of disposers) dispose();
  };
}

// src/api.ts
init_settings();
function header(headers, name2) {
  const value = headers[name2];
  return typeof value === "string" ? value : void 0;
}
function parseAuthority(authority) {
  try {
    return new URL(`http://${authority}`);
  } catch {
    return void 0;
  }
}
function isLoopbackHostname(hostname) {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  const parts = hostname.split(".");
  return parts.length === 4 && parts[0] === "127" && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}
function isTrustedApiRequest(req, trustedHosts) {
  const host = header(req.headers, "host");
  if (host === void 0) return false;
  const hostUrl = parseAuthority(host);
  if (hostUrl === void 0) return false;
  if (!isLoopbackHostname(hostUrl.hostname)) {
    const trusted = trustedHosts.some((entry) => {
      const entryUrl = parseAuthority(entry);
      if (entryUrl === void 0) return false;
      return entryUrl.host === hostUrl.host || entryUrl.hostname === hostUrl.hostname;
    });
    if (!trusted) return false;
  }
  if (header(req.headers, "sec-fetch-site") === "cross-site") return false;
  const origin = header(req.headers, "origin");
  if (origin === void 0) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}
function writeJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" });
  res.end(JSON.stringify(body));
}
function ok(res, value) {
  writeJson(res, 200, { ok: true, value });
}
function fail(res, status, code, message) {
  writeJson(res, status, { ok: false, error: { code, message } });
}
async function readJsonBody(req) {
  const iterable = req;
  let raw = "";
  for await (const chunk of iterable) {
    raw += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
  }
  if (raw.trim() === "") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function registerApi(ctx, store) {
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/flashcard/api",
    handler: async (req, res) => {
      if (!isTrustedApiRequest(req, ctx.webRuntime.trustedHosts)) {
        fail(res, 403, "forbidden", "forbidden");
        return;
      }
      if (req.method !== "POST") {
        fail(res, 405, "method-error", "method not allowed");
        return;
      }
      const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
      const method = pathname.startsWith("/flashcard/api/") ? pathname.slice("/flashcard/api/".length) : void 0;
      if (method === void 0 || method.includes("/")) {
        fail(res, 404, "not-found", "unknown flashcard API method");
        return;
      }
      try {
        const payload = await readJsonBody(req);
        switch (method) {
          case "decks.list":
            return ok(res, await store.listDecks());
          case "deck.cards": {
            const deck = typeof payload.deck === "string" ? payload.deck : "";
            if (deck === "") return fail(res, 400, "bad-request", "deck is required");
            return ok(res, await store.dueCards(deck));
          }
          case "card.grade": {
            const id = typeof payload.card_id === "string" ? payload.card_id : "";
            const rating = payload.rating;
            if (id === "" || !["again", "hard", "good", "easy"].includes(rating)) {
              return fail(res, 400, "bad-request", "card_id and a valid rating are required");
            }
            const card = await store.grade(id, rating);
            if (card === void 0) return fail(res, 404, "not-found", "card not found");
            return ok(res, { interval: card.interval, due: card.due, ease: card.ease });
          }
          case "card.add": {
            const deck = typeof payload.deck === "string" ? payload.deck : "";
            const cards = Array.isArray(payload.cards) ? payload.cards : [];
            if (deck === "" || cards.length === 0) return fail(res, 400, "bad-request", "deck and cards are required");
            const created = await store.addCards(
              deck,
              cards.map((c) => ({
                front: String(c.front ?? ""),
                back: String(c.back ?? ""),
                tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
                source: "manual"
              }))
            );
            return ok(res, { created: created.length });
          }
          case "settings.get":
            return ok(res, await getSettings());
          case "settings.update": {
            const patch = {};
            for (const k of Object.keys(payload)) {
              if (["defaultDeck", "reviewOrder", "showTags", "autoAdvance", "lapseDelayMinutes"].includes(k)) {
                patch[k] = payload[k];
              }
            }
            return ok(res, await updateSettings(patch));
          }
          default:
            return fail(res, 404, "not-found", `unknown flashcard API method "${method}"`);
        }
      } catch (error) {
        fail(res, 500, "internal", error instanceof Error ? error.message : String(error));
      }
    }
  }), "dsh-flashcard: /flashcard/api routes");
}

// src/index.ts
var name = "dsh-flashcard";
var inject = ["webServer", "webRuntime", "tools"];
function apply(ctx) {
  const store = new CardStore();
  registerTools(ctx, store);
  registerApi(ctx, store);
  ctx.logger?.info("[dsh-flashcard] host ready \u2014 cards at ~/.dsh/flashcards/");
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
