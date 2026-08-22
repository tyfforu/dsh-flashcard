# dsh-flashcard

DeepSeek Harness（DSH）的 **Anki 式闪卡复习插件**。

在右侧栏新增一个「闪卡」Tab：把聊天里、文档里、笔记里的内容一键变成可复习的卡片，用
**SM-2 间隔重复算法**自动安排复习时间，像 Anki 一样「越熟越久不出现、越生越快回来」。
支持模型自动建卡、对/错快捷标记、四键评分，以及「不懂就问 AI」——把当前卡片上下文直接注入聊天框提问。

> 适合：备考（STM32 / FreeRTOS / 英语单词 / 考研）、把长文档压成问答卡、复盘聊天结论。

---

## 目录

- [功能特性](#功能特性)
- [架构总览](#架构总览)
- [前置依赖](#前置依赖)
- [安装](#安装)
- [配置](#配置)
- [使用说明](#使用说明)
- [模型可调用工具](#模型可调用工具)
- [HTTP API](#http-api)
- [卡片存储格式](#卡片存储格式)
- [SM-2 调度算法](#sm-2-调度算法)
- [开发 / 构建](#开发--构建)
- [目录结构](#目录结构)
- [已知限制与注意事项](#已知限制与注意事项)
- [许可证](#许可证)

---

## 功能特性

- **翻卡复习**：显示题目（front）→ 点击翻面看答案（back）→ 上一题 / 下一题导航。
- **Anki 四键评分（SM-2）**：`重来 / 困难 / 良好 / 简单`，自动计算下次复习间隔。
- **对 / 错 快捷标记**：
  - `错` → 等价于「重来」（约 10 分钟后重练）；
  - `对` → 等价于「良好」。
- **问 AI 解释**：一键把卡片内容（题目 + 答案 + 标签）注入当前会话的聊天输入框，复用 DSH 原生模型追问细节。
- **AI 自动建卡**：在聊天里说「把这段做成闪卡」「总结成问答卡」，Agent 调用 `flashcard_add_cards` 工具直接入库。
- **本地优先存储**：卡片存于 `~/.dsh/flashcards/<牌组>.jsonl`，一行一张，**不联网、不上传**，纯本地文件可随时用文本编辑器查看/备份。
- **设置入口**：在 DSH 设置页注册「闪卡」分类（左侧导航），并提供 Tab 内 `⚙` 弹窗作为保底配置入口；5 项配置即时保存。

---

## 架构总览

单个 npm 包内包含**双端**，由 DSH 的 profile 机制分别加载：

| 半 | 源码入口 | 运行时 | 职责 |
|---|---|---|---|
| **Host（Node 端）** | `src/index.ts` | Node（web profile） | 注册 4 个 Agent 工具、注册 `/flashcard/api/*` HTTP 路由、JSONL 卡片存储、调用 SM-2 调度 |
| **Client（浏览器端）** | `src/client/index.tsx` | 浏览器 | 通过 `ctx.betterSidebar.registerTab` 注册「闪卡」Tab（依赖 `dsh-better-sidebar`）；通过 `ctx.slots` 注册设置页分类 |

```
聊天框 (Agent)
   │  调用工具 flashcard_add_cards / list_due / grade / stats
   ▼
Host 端 (Node)  ───  JSONL 存储 (~/.dsh/flashcards/*.jsonl)
   ▲
   │  fetch /flashcard/api/*（带信任围栏，防 DNS 重绑定 / 跨站）
   │
Client 端 (浏览器)  ──  右侧栏「闪卡」Tab 渲染
```

**关键设计**：浏览器端无法直接读写本地文件系统，因此所有卡片读写都走 Host 端的
`/flashcard/api` 路由（照搬 `dsh-better-sidebar` 的信任围栏实现，仅做同源 / loopback 校验，
**不是鉴权**——任何能访问本机 DSH 端口的进程都可调用）。

---

## 前置依赖

- **DeepSeek Harness**（DSH）`0.1.0-rc.x` 及以上（开发者预览版，可能有破坏性变更）。
- **`dsh-better-sidebar`**：本插件通过它挂载右侧栏 Tab，属于**硬依赖**。
  - 推荐方式：安装聚合包（如 `@linxin666/dsh-web-ui-all`）一并挂载；或单独安装 `dsh-better-sidebar`。
  - 二者需处于**同一个 web profile** 中，Cordis 才能按拓扑顺序解析依赖。
- Node `>= 20`（CLI 与构建均需要）。

---

## 安装

### 方式一：从源码构建后安装（推荐，可改代码）

```bash
# 1. 安装依赖并构建（产物输出到 lib/）
cd dsh-flashcard
pnpm install
node build.mjs          # 生成 lib/index.js（Host ESM）与 lib/client.js（Client CJS）

# 2. 安装到 web profile（前置：dsh-better-sidebar 已安装启用）
dsh plugin --profile web add <本目录绝对路径>

# 3. 重启 web
dsh restart web
```

> `dsh plugin add` 走官方 `dsh.bundle.patch` 机制：读取 `package.json` 中的
> `dsh.bundle.patch` → `cordis.patch.yml`，把 `dsh-flashcard` 追加进 bundle 栈；profile 启动时
> 将该 patch（`- insert` 一行插件记录）合并进加载器入口列表。

### 方式二：从 GitHub 直接安装

```bash
dsh plugin --profile web add github:tyfforu/dsh-flashcard
dsh restart web
```

> 仓库已包含构建产物 `lib/`，因此可跳过本地 `node build.mjs` 直接安装。

### 手动兜底安装（当自动安装被同步盘 / 权限拦截时）

若 `dsh plugin add` 因同步盘锁文件、`pnpm` EPERM 等原因失败，可手动复制产物：

1. 把构建好的目录复制到 `~/.dsh/profiles/web/node_modules/dsh-flashcard/`；
2. 编辑该 profile 的 `package.json`，在 `dependencies` 增加 `"dsh-flashcard": "link:./dsh-flashcard"`；
3. 在 `dsh.profile.bundles` 数组中追加 `"dsh-flashcard"`；
4. 重启 `dsh restart web`。

---

## 配置

配置存于 Host 端单个 JSON 文件：`~/.dsh/flashcards/settings.json`。
Host 持有权威副本，Client 端通过 `settings.get` / `settings.update` 路由读写。

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `defaultDeck` | string | `''` | Tab 打开时自动选中的牌组；`''` = 第一个牌组 |
| `reviewOrder` | `'due' \| 'random'` | `'due'` | 复习队列排序：`due` 按到期时间升序，`random` 随机 |
| `showTags` | boolean | `true` | 是否在每张卡上显示标签行 |
| `autoAdvance` | boolean | `true` | 评分后自动跳到下一张；`false` 则停留在当前卡直到手动下一题 |
| `lapseDelayMinutes` | number | `10` | 「重来」后的重新学习间隔（分钟），范围 1–∞ |

**配置入口（两处，互为保底）：**

- **DSH 设置页**：左侧导航出现「闪卡」分类，右侧 body 由 `FlashcardSettings` 渲染。
  - ⚠️ 在 DSH `0.1.0-rc.7` 中 `settings.section` 的 **body 不会渲染**（上游限制，`dsh-better-sidebar` 同症状）。此时用下面的弹窗入口。
- **Tab 内 `⚙` 弹窗**：在右侧栏「闪卡」Tab 右上角点齿轮图标，弹窗同样提供这 5 项配置，修改即时保存。

---

## 使用说明

1. **打开复习**：右侧栏点击「闪卡」图标（两叠卡 + 闪电）打开 Tab，默认载入 `defaultDeck` 的到期卡。
2. **复习一张卡**：
   - 看 `front`（题目），点卡片或「显示答案」翻面看 `back`；
   - 按掌握程度点四键之一（`重来 / 困难 / 良好 / 简单`），间隔随之更新并自动跳下一张（受 `autoAdvance` 控制）；
   - 或用 `对 / 错` 两键快速标记（映射见上）。
3. **切牌组 / 上下题**：顶部切换牌组，`<` `>` 在队列内前后移动。
4. **不懂就问 AI**：点「问 AI」把「题目 + 答案 + 标签」写入当前会话输入框，回车即让模型展开讲解。
5. **让模型建卡**：在聊天里说「把这段总结成闪卡 / 做成问答卡」，Agent 会自动调用
   `flashcard_add_cards` 写入指定牌组，无需手动录入。
6. **看进度**：Tab 内展示各牌组 `total / due / newCards / mastered`；也可让模型调用 `flashcard_stats`。

---

## 模型可调用工具

Agent（聊天里的模型）通过以下工具读写卡片：

| 工具 | 入参 | 作用 |
|---|---|---|
| `flashcard_add_cards` | `deck: string`, `cards: {front, back, tags?}[]` | 新建卡片（牌组不存在则自动创建） |
| `flashcard_list_due` | `deck?: string`, `limit?: number` | 列出到期卡（不给 deck 则跨所有牌组） |
| `flashcard_grade` | `card_id: string`, `rating: 'again'\|'hard'\|'good'\|'easy'` | 提交一次评分，更新调度 |
| `flashcard_stats` | `deck?: string` | 牌组统计（不给则汇总所有牌组） |

> 工具 JSON Schema 中**所有 `type: 'object'` 均已显式声明 `additionalProperties: false`**，
> 否则 DSH 在插件启动时会抛 `JsonSchemaError`（这是本插件早期踩过的坑）。

---

## HTTP API

Client 端通过前缀路由 `POST /flashcard/api/<method>` 与 Host 通信，统一返回
`{ ok: true, value }` 或 `{ ok: false, error: { code, message } }`。

| method | 说明 |
|---|---|
| `decks.list` | 列出所有牌组及其统计 |
| `deck.cards` | `{ deck }` → 该牌组到期卡（按 due 升序） |
| `card.grade` | `{ card_id, rating }` → 更新调度，返回 `{ interval, due, ease }` |
| `card.add` | `{ deck, cards[] }` → 批量建卡，返回 `{ created }` |
| `settings.get` | 读取配置 |
| `settings.update` | `{ ...patch }` → 只接受 5 个白名单字段，返回更新后的配置 |

---

## 卡片存储格式

每张卡一行 JSON（JSONL），文件位于 `~/.dsh/flashcards/<deck>.jsonl`，`<deck>` 中非法文件名
字符会被替换为 `_`。示例：

```json
{"id":"3f1c…","deck":"freertos","front":"FreeRTOS 中 task 的栈在哪分配？","back":"由 xTaskCreate 的 pxStack 参数指定，通常静态数组或 pvPortMalloc 从堆分配。","tags":["rtos","stack"],"source":"session:abc","createdAt":1724300000000,"ease":2.5,"interval":0,"reps":0,"lapses":0,"due":1724300000000,"history":[]}
```

字段含义见 `src/types.ts` 的 `Card` 接口：`ease` 难度因子、`interval` 间隔（天）、
`reps` 连续答对次数、`lapses` 遗忘次数、`due` 下次到期时间戳（ms）、`history` 最近 20 次评分。

---

## SM-2 调度算法

实现位于 `src/sm2.ts`，采用 Anki 简化的 SM-2（`review(state, rating, now, lapseDelayMs)`），纯函数、无 I/O。

| 评分 | 行为 |
|---|---|
| `again`（重来） | 遗忘：`reps` 归零、`interval` 归零、`ease -= 0.2`（`>=1.3`），`due` 设为 `now + lapseDelayMs`（默认 10 分钟） |
| `hard`（困难） | `interval = round(interval * 1.2)`、`ease -= 0.15`（`>=1.3`） |
| `good`（良好） | `interval = round(interval * ease)` |
| `easy`（简单） | `interval = round(interval * ease * 1.3)`、`ease += 0.15`（`<=3.0`） |

前两次成功复习使用固定间隔：**第 1 次 → 1 天，第 2 次 → 6 天**，之后才由 `ease` 因子接管。
「已掌握（mastered）」统计口径：`interval >= 21` 天。

---

## 开发 / 构建

构建脚本 `build.mjs` 使用 [esbuild](https://esbuild.github.io/) 产出两份产物：

1. **Host 端** `lib/index.js`：标准 **ESM**，`platform: node`，external 列表含
   `@deepseek-ai/*`、`ws`、`schemastery`、`zod`（运行时从 web profile 的 `node_modules` 解析，
   与 `dsh-better-sidebar` 一致）。
2. **Client 端** `lib/client.js`：**CJS** 包裹在 DSH 模块加载握手
   `window.__ModuleLoader__.load({ id, factory })` 中，使运行时能通过模块表解析 `react` 等依赖。
   banner / footer 三段（`var module = { exports: {} } … return module.exports`）照抄官方
   `tsdown.client.ts` 的 `clientBundle` 预设。

```bash
pnpm install
node build.mjs          # 同时产出 lib/index.js 与 lib/client.js（含 sourcemap）
node build.mjs && dsh restart web   # 改完代码后重新构建并重启验证
```

`package.json` 关键字段：

- `dsh.bundle.patch` → `./cordis.patch.yml`（bundle 注入声明）
- `dsh.client.inject` → `["dsh-better-sidebar", "@deepseek-ai/dsh-client-ui-slots", "@deepseek-ai/dsh-client-runtime"]`
- `peerDependencies` → `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`dsh-better-sidebar`、`react`

TypeScript 严格模式（`tsconfig.json`），第三方插件解析的是**另一个** Cordis 实例，因此
`types.ts` 用结构化 interface 镜像运行时实际接触的类型（与 `dsh-better-sidebar` 同源做法）。

---

## 目录结构

```
dsh-flashcard/
├── package.json          # dsh.bundle.patch / dsh.client.inject / peerDeps
├── cordis.patch.yml      # bundle 注入声明（- insert: flashcard）
├── build.mjs             # esbuild 双端构建
├── tsconfig.json
├── .npmrc                # npmmirror 源 + auto-install-peers=false
├── src/
│   ├── index.ts          # Host 入口：inject webServer/webRuntime/tools
│   ├── tools.ts          # 4 个 Agent 工具（含 additionalProperties:false）
│   ├── api.ts            # /flashcard/api 路由 + 信任围栏
│   ├── storage.ts        # JSONL 卡存储（CardStore）
│   ├── sm2.ts            # SM-2 调度（纯函数）
│   ├── settings.ts       # ~/dsh/flashcards/settings.json 读写
│   ├── types.ts          # Host/Client 共享类型
│   └── client/
│       ├── index.tsx              # registerTab + settings.section
│       ├── FlashcardView.tsx      # 翻卡/导航/四键/对错/问 AI/生成卡/⚙弹窗
│       ├── FlashcardSettings.tsx  # 设置页 body + ⚙弹窗共用
│       └── icons.tsx              # IconFlashcard16（16×16 SVG）
└── lib/                  # 构建产物（已随仓库提交，可直接安装）
```

---

## 已知限制与注意事项

- **设置页 body 渲染**：DSH `0.1.0-rc.7` 的 `settings.section` body 不渲染（上游限制），请使用 Tab 内 `⚙` 弹窗配置；预计随 DSH 升级修复。
- **开发者预览期**：DSH `0.1.0-rc.x` 可能有破坏性变更，升级后需重新构建并验证。
- **信任围栏非鉴权**：`/flashcard/api` 仅做同源 / loopback 校验，不鉴权；不要在不可信网络暴露本机 DSH 端口。
- **同步盘冲突**：`~/.dsh` 被坚果云等同步盘锁文件占用时，`dsh plugin add` / 启动可能失败，需临时暂停同步或用手动安装兜底。

---

## 许可证

[MIT](./LICENSE)
