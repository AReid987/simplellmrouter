# SimpleLLMRouter v2 — Architecture, TUI & Intelligence Spec
**Version:** 2.0 | **Date:** 2026-03-03 | **Owner:** Antonio Reid
**Repo:** https://github.com/AReid987/simplellmrouter
**Status:** Design Complete — Implementation Ready

---

## 0. North Star

> A free, self-hosted, intelligent LLM gateway that multiplies your quota across every major
> free-tier provider, routes requests by complexity with sub-100ms decisions, and presents
> everything through a polished Textual TUI — beautiful enough to ship as a brand statement,
> powerful enough to run the Meta Code Squad autonomously for weeks.

This is not a side project. This is the **nervous system** of Aigency's autonomous operation.
Without it, the Meta Code Squad hits rate limits in hours. With it, you have ~1B free tokens/month
distributed intelligently across 8+ providers.

---

## 1. Architecture Decisions — All Questions Answered

### 1.1 TUI Framework: Textual (YES — strongly recommended)

**Use Textual (Python).** Reasons:

- Reactive widget system — variables drive UI automatically, no manual refresh
- CSS-like styling — professional look without low-level curses hell
- Runs in terminal AND browser (built-in web server mode for remote monitoring)
- Rich is the rendering engine under the hood — best-in-class text formatting
- MIT licensed, actively maintained by Textualize
- Can deploy the TUI as a web app with zero extra code (`textual serve router_tui.py`)

The router core stays TypeScript (Node.js). The TUI is a Python process that talks to the router
via a local WebSocket or HTTP stream. This separation of concerns is correct — don't rewrite
the router in Python just to add a TUI.

**Architecture:**
```
simplellmrouter (TypeScript/Node)
    ├── core router logic          ← stays here, unchanged
    ├── HTTP API (:8080)           ← OpenAI-compatible proxy
    └── /metrics stream (SSE)      ← new: Server-Sent Events for TUI

router-tui (Python/Textual)
    ├── connects to SSE stream
    ├── renders all screens
    └── sends config commands back via REST
```

### 1.2 Motia: OPTIONAL — Phase 3 only

**Don't integrate Motia now.** Here's why:

Motia is a unified backend framework for APIs + events + agent workflows. It's excellent and
relevant — but adding it now would mean rewriting the router's HTTP layer before the core gaps
(QuotaTracker wiring, classifier tests) are fixed. The right time for Motia is Phase 3 when you're
building the full aigency-squad orchestration layer and want the router to receive/emit workflow
events natively.

**Phase 3 integration:** Router becomes a Motia "step" — receives routing requests as events,
emits provider-selection events downstream. agor.live subscribes to those events for real-time
visualization.

### 1.3 OptiLLM: YES — high value, Phase 2

**Integrate as an optional inference layer.** OptiLLM is a drop-in proxy that adds 20+
inference-time optimization techniques (chain-of-thought reflection, self-consistency, MCTS,
planning search) and improves reasoning accuracy 2-10x with zero model retraining.

**Integration pattern:**
```
Request → SimpleLLMRouter (picks provider/model) → OptiLLM (enhances inference) → Provider
```

For the Meta Code Squad, route COMPLEX and REASONING tasks through OptiLLM automatically.
SIMPLE tasks skip it entirely (latency not worth it for quick lookups).

Config flag: `OPTILLM_ENABLED=true`, `OPTILLM_THRESHOLD=COMPLEX`

### 1.4 Caching: YES — implement now, this is critical

**Three-layer cache (steal from DSPy's architecture):**

| Layer | Tech | TTL | Use case |
|-------|------|-----|----------|
| L1 In-memory | `node-lru-cache` | 5 min | Identical prompts within a session |
| L2 On-disk | `better-sqlite3` | 24h | Repeated prompts across restarts |
| L3 Semantic | `hnswlib-node` + embeddings | 72h | Similar (not identical) prompts |

Semantic caching is the killer feature — if a prompt is semantically >0.92 similar to a cached
response, return the cached result. This collapses repeat coding tasks (same patterns, slightly
different variable names) that the Meta Code Squad will generate constantly.

**Expected savings:** 30-60% of tokens for agentic workloads with repetitive patterns.

Cache key: `hash(model + normalized_prompt)` for L1/L2, embedding vector for L3.

### 1.5 Prompt Templates & Partials: YES — lightweight implementation

**Don't add DSPy or LangChain for this.** Implement natively:

```typescript
// Template registry
templates/
  ├── code-review.md        ← {{language}} {{context}} {{code}}
  ├── bug-fix.md
  ├── architecture.md
  └── partials/
      ├── system-base.md    ← shared system prompt fragment
      ├── code-context.md
      └── safety-rules.md
```

Templates use Handlebars-style `{{variable}}` syntax. Partials get composed at request time.
This is 200 lines of TypeScript, not a framework dependency.

**Why not DSPy for templates:** DSPy shines for prompt *optimization* (automated few-shot
example selection, instruction tuning via MIPROv2). That's Phase 3. For now you need
deterministic templates, not a training loop.

### 1.6 DSPy: Phase 3 only

DSPy's value is in the MIPROv2 optimizer — it automatically finds better prompts by exploring
instruction variations and synthesizing few-shot examples. This is genuinely powerful but requires:
- A labeled dataset of good/bad outputs from your system
- Compute budget for the optimization runs
- Stable templates to optimize (you need Phase 2 templates first)

**Verdict:** Build templates in Phase 2. Run DSPy optimization in Phase 3 once you have real
usage data from the Meta Code Squad runs.

### 1.7 What to Steal from Each Reference Project

#### ClawRouter (your base)
You already have the core. Keep: classification dimensions, provider config structure.
Fix: QuotaTracker wiring, add tests for classifier.

#### RouteLLM (lm-sys)
**STEAL: The cascading fallback pattern.**
RouteLLM's strongest idea is routing on quality-cost *curves* — try cheap model first, escalate
to expensive model only if quality threshold not met. This is perfect for your free-tier strategy:
- Attempt with Gemini Flash → if confidence < threshold → retry with GPT-4o-mini
- Costs 0 tokens on the upgrade if the fast model works

Also steal: the threshold calibration system. RouteLLM lets you set "I want 95% of GPT-4 quality
at minimum cost" and it calibrates the routing threshold automatically.

#### NotDiamond
**STEAL: The three optimization modes.**
NotDiamond routes in three modes: Quality, Cost, Latency. Surface these as a first-class setting
in your TUI. For Meta Code Squad:
- `quality` mode during architecture/planning phases
- `cost` mode during rapid iteration loops
- `latency` mode during interactive debugging

Also from their open source work: the **R2-ROUTER paradigm** — reason about how quality varies
with output length before routing. Long responses need stronger models; short confirmations don't.

#### Semantic Router (Aurelio Labs)
**STEAL: Intent-based routing with utterance examples.**
Their semantic routing is ~100ms vs 5000ms for LLM-based routing because it uses embeddings
instead of model calls. Add a semantic intent layer on top of your 14-dimension classifier:

```
Request → Semantic Intent Detection (100ms, local embeddings)
       → Maps to: code_review | bug_fix | architecture | docs | chat | tool_call
       → Each intent has preferred providers + model tier
       → 14-dimension classifier refines within the intent bucket
```

Safety filtering is free with this approach — add a "jailbreak" and "harmful" intent route that
rejects before hitting any provider.

#### LiteLLM
**STEAL: The routing strategies enum.**
LiteLLM has 5 named strategies: simple-shuffle, least-busy, usage-based, latency-based,
cost-based. Implement all 5 as selectable modes. This is ~100 lines each and the TUI can let
users switch strategies live.

#### Portkey
**STEAL: Guardrails + canary testing.**
Portkey's canary testing (route X% of traffic to a new model to A/B test quality) is brilliant
for evaluating new free-tier providers without committing all traffic. Add a `canary_weight`
field to provider config.

Also: circuit breaker per provider. If a provider fails 3 requests in 60s, mark it circuit-open
and exclude it from routing until it recovers. This is already partially in your codebase —
finish it.

#### Langflow Smart Router
Langflow's smart router uses intent classification + semantic similarity. You're already doing
this with your 14 dimensions. Nothing new to steal here, but it validates your approach.

#### Zep Intent Router
**STEAL: Memory-augmented routing.**
Zep's pattern: store the *history of routing decisions* and use past decisions for similar
prompts. If prompt X was routed to provider Y and got a high quality score, future similar
prompts should prefer Y. This is a lightweight learned routing layer that improves over time
without DSPy's complexity.

---

## 2. TUI Screen Map

### Screen Architecture
```
SimpleLLMRouter TUI
├── BOOT SEQUENCE          ← animated startup, full verbose logs
├── MAIN DASHBOARD         ← runtime home screen  
├── LIVE INFERENCE         ← real-time request stream
├── QUOTA MANAGER          ← per-provider usage and limits
├── METRICS DEEP DIVE      ← all stats, charts, breakdowns
├── PROVIDER CONFIG        ← add/edit/remove providers
├── ROUTER CONFIG          ← strategy, thresholds, caching
├── CACHE INSPECTOR        ← browse/flush cache layers
└── LOGS                   ← filterable log viewer
```

### Navigation
- `Tab` / `Shift+Tab` — cycle screens
- Number keys `1-9` — jump to screen directly
- `?` — help overlay
- `q` — quit (with confirmation)
- `Ctrl+R` — force refresh
- `Esc` — back / close modal

---

## 3. Screen Specifications

### Screen 0: Boot Sequence

**Purpose:** Dramatic, branded startup experience. Shows verbose initialization logs.
Every step of the boot sequence is a narrative — this IS the brand statement for open source.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│          ░░░░    ░░░░    ░░░░    ░░░░    ░░░░    ░░░░           │
│         ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░         │
│         ░░░░░░  ░░  ░░  ░░░░░░  ░░  ░░  ░░      ░░░░░░         │
│              [  AIGENCY  SIMPLELLMROUTER  v2  ]                 │
│         Free-tier intelligent routing for autonomous AI         │
│                                                                 │
│  ████████████████████████████████░░░░░░░░░░░░░░  72%           │
│                                                                 │
│  [✓] Loading provider registry          (8 providers)          │
│  [✓] Initializing quota tracker         (1.2B tokens/mo)       │
│  [✓] Starting semantic intent cache     (hnswlib ready)        │
│  [✓] Connecting L1/L2 cache             (warm: 234 entries)    │
│  [→] Building routing index...                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Animation sequence:**
1. ASCII logo fades in letter by letter (Rich animation, 1.2s)
2. Tagline types out character by character (typewriter effect, 0.8s)
3. Progress bar fills as each subsystem initializes (real progress, not fake)
4. Each system check appears with a spinner → checkmark transition
5. On completion: brief flash animation, then auto-transitions to Main Dashboard

**Implementation notes:**
- Use Textual's `LoadingIndicator` + custom `AnimatedLabel` widget
- Boot log lines are real — each line is an actual system event
- If a provider fails to connect, show `[!]` in yellow with reason
- Total boot time target: <3 seconds

---

### Screen 1: Main Dashboard

**Purpose:** Runtime home screen. Everything important at a glance.

**Layout (4-quadrant grid):**
```
┌──────────────────────────────────────────────────────────────────┐
│  SimpleLLMRouter  ●LIVE    Requests: 1,247   Uptime: 4h 32m  [?]│
├─────────────────────┬────────────────────┬───────────────────────┤
│  SYSTEM STATUS      │  QUOTA OVERVIEW     │  ROUTING STRATEGY     │
│                     │                     │                       │
│  Router: ● ACTIVE   │  Gemini:  ████░  73%│  Mode: QUALITY        │
│  Cache:  ● WARM     │  GPT-4o:  ██░░░  41%│  Strategy: SEMANTIC   │
│  OptiLLM:● ENABLED  │  Claude:  █░░░░  18%│  Cascade: ON          │
│  Queue:  12 pending │  DeepSeek:░░░░░   2%│  Cache: L1+L2+L3      │
│                     │  Together:████░  68%│                       │
├─────────────────────┴────────────────────┼───────────────────────┤
│  LAST 60 SECONDS                          │  RECENT REQUESTS      │
│                                           │                       │
│  Req/s  ▁▂▃▅▃▂▄▆▅▃▂▁▂▃▄▅▆▄▃▂▁▂▃▄▅▆▇▆▅▄  │  [✓] code-review     │
│         0              30s          60s   │      gemini-2.0-flash │
│                                           │      142ms  1.2k tok  │
│  Latency (p50/p95):  89ms / 340ms         │                       │
│  Cache Hit Rate:     61%                  │  [✓] bug-fix         │
│  Error Rate:         0.2%                 │      gpt-4o-mini      │
│  Tokens Saved (cache):  48,320 today      │      203ms  890 tok   │
│                                           │                       │
│  [1]Status [2]Live [3]Quota [4]Metrics [5]Config [6]Cache [9]Log│
└───────────────────────────────────────────┴───────────────────────┘
```

**Key widgets:**
- `SystemStatusPanel` — reactive, updates every 2s
- `QuotaSparklines` — mini bar charts per provider, color-coded (green/yellow/red)
- `RequestRateGraph` — ASCII sparkline of req/s over 60s rolling window
- `RecentRequestFeed` — last 10 requests, scrollable, shows provider + latency + tokens
- `StrategyBadge` — clickable, opens config modal

---

### Screen 2: Live Inference Stream

**Purpose:** Real-time window into every routing decision as it happens.
This is the most visually compelling screen — watching the router think in real time.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  LIVE INFERENCE STREAM                    [PAUSE] [FILTER▼] [↑] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  14:32:07.441  ● NEW REQUEST                                     │
│  ├─ Intent:    CODE_REVIEW (confidence: 0.94)                    │
│  ├─ Complexity: MEDIUM (score: 0.61)                             │
│  ├─ Dimensions: logic↑ context↑ code↑ creative↓ safety↓         │
│  ├─ Cache:     MISS (semantic similarity: 0.71 < 0.92 threshold) │
│  ├─ Strategy:  QUALITY → candidates: gemini-2.0-pro, gpt-4o      │
│  ├─ Quota:     gemini OK (73%), gpt-4o OK (41%)                  │
│  ├─ Selected:  gemini-2.0-pro  (score: 0.87)                     │
│  └─ Dispatched → 89ms TTFB → 1,247 tokens → [✓] SUCCESS         │
│                                                                  │
│  14:32:06.102  ● NEW REQUEST (CACHE HIT L2)                      │
│  ├─ Intent:    SIMPLE_CHAT (confidence: 0.98)                    │
│  ├─ Cache:     HIT L2 (similarity: 1.00) → serving cached        │
│  └─ Served in 2ms  [✓] 890 tokens saved                         │
│                                                                  │
│  14:32:04.891  ● NEW REQUEST                                     │
│  ├─ Intent:    ARCHITECTURE (confidence: 0.89)                   │
│  ├─ Complexity: REASONING (score: 0.88)                          │
│  ├─ OptiLLM:   ENABLED (threshold met) → technique: MCTS         │
│  ├─ Selected:  deepseek-r1 (reasoning specialist)                │
│  └─ Dispatched → 1,203ms TTFB → 4,891 tokens → [✓] SUCCESS      │
│                                                                  │
│  ─── 3 requests in last 5s ───────────────────────────────────── │
└──────────────────────────────────────────────────────────────────┘
```

**Key features:**
- Each request is a collapsible tree — click to expand/collapse decision path
- Color coding: green = success, yellow = fallback used, red = error
- `[PAUSE]` freezes the stream for inspection
- `[FILTER▼]` dropdown: All / Errors / Cache Hits / By Intent / By Provider
- Scroll up to review history (last 500 requests in memory)

---

### Screen 3: Quota Manager

**Purpose:** Full visibility into every provider's quota state.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  QUOTA MANAGER                          Reset: daily at 00:00 UTC│
├──────────────────────────────────────────────────────────────────┤
│  Provider          Tier    Used Today      Limit      Status     │
│  ────────────────────────────────────────────────────────────── │
│  Gemini 2.0 Flash  free    ████████░░░  812K/1M tok   ● HEALTHY  │
│  Gemini 2.0 Pro    free    ██░░░░░░░░   201K/1M tok   ● HEALTHY  │
│  GPT-4o-mini       free    ████░░░░░░   411K/1M tok   ● HEALTHY  │
│  Claude Haiku      free    █░░░░░░░░░    89K/unlimited ● HEALTHY  │
│  DeepSeek Chat     free    ░░░░░░░░░░    12K/unlimited ● HEALTHY  │
│  Together.ai       free    █████░░░░░   512K/1M tok   ● HEALTHY  │
│  Groq Llama        free    ██████████   999K/1M tok   ⚠ WARNING  │
│  Mistral           free    ░░░░░░░░░░     8K/unlimited ● HEALTHY  │
│                                                                  │
│  MONTHLY AGGREGATE                                               │
│  ├─ Total capacity:    ~1.04B tokens/month (all providers)       │
│  ├─ Used this month:   247M tokens (23.8%)                       │
│  ├─ Saved via cache:   89M tokens  (8.6%)                        │
│  └─ Projected end-of-month: 891M / 1.04B (86% — safe)           │
│                                                                  │
│  [Add Provider]  [Edit Selected]  [Disable Selected]  [Test]     │
└──────────────────────────────────────────────────────────────────┘
```

---

### Screen 4: Metrics Deep Dive

**Purpose:** Full analytics. Everything you want to measure.

**Sub-views (tabs within screen):**

**Tab A — Overview:**
- Request volume over time (hourly/daily toggle)
- Success rate, error rate, fallback rate
- Cache hit rate breakdown (L1 / L2 / L3 semantic)
- Token consumption vs tokens saved (ROI view)

**Tab B — 14-Dimension Breakdown:**
```
  ROUTING DIMENSION ANALYSIS (last 1000 requests)

  Dimension          Match Rate   Avg Score   Impact Weight
  ─────────────────────────────────────────────────────────
  code               87%          0.81        HIGH
  logic              74%          0.69        HIGH
  context_length     92%          0.91        MEDIUM
  reasoning          61%          0.58        HIGH
  creative           43%          0.39        LOW
  safety             99%          0.99        CRITICAL
  tool_calling       55%          0.51        MEDIUM
  multilingual       12%          0.09        LOW
  math               38%          0.34        MEDIUM
  vision             8%           0.06        LOW
  speed              78%          0.74        MEDIUM
  cost               91%          0.88        HIGH
  context_window     67%          0.62        MEDIUM
  instruction_follow 83%          0.79        HIGH
```

**Tab C — Provider Performance:**
- Per-provider: avg latency, error rate, token throughput, quality score (if feedback enabled)
- Latency percentiles (p50/p95/p99) per provider
- Best provider by intent type (auto-learned from history)

**Tab D — Inference Performance:**
- Tokens per second per provider
- Time to first byte (TTFB) distribution
- OptiLLM overhead vs quality gain (when enabled)
- Cascade escalation rate (how often first-choice model fails quality threshold)

---

### Screen 5: Provider Config

Form-based editor for provider settings. Fields: name, base_url, api_key (masked), models,
quota_limit, canary_weight, circuit_breaker settings, enabled toggle.

Modal-based — opens over current screen when editing.

---

### Screen 6: Router Config

**Purpose:** Live configuration of routing behavior without restart.

Sections:
- **Routing Strategy** — dropdown: quality / cost / latency / balanced
- **Cascade Settings** — enable/disable, quality threshold slider (0.0-1.0)
- **Cache Settings** — enable L1/L2/L3 independently, TTL sliders, max size
- **OptiLLM** — enable/disable, threshold (SIMPLE/MEDIUM/COMPLEX/REASONING)
- **Intent Detection** — sensitivity slider, custom intent routes
- **Quota Guards** — warning threshold (default 80%), hard cutoff (default 95%)

All changes apply live via REST PATCH to the router — no restart required.

---

### Screen 7: Cache Inspector

Browse cache contents, see hit/miss stats, flush individual layers or all.
Shows: key preview, cached response preview (truncated), TTL remaining, hit count.

---

### Screen 8: Log Viewer

Full log stream with filters: level (DEBUG/INFO/WARN/ERROR), component, provider, time range.
Search box. Export to file. Auto-scroll toggle.

---

## 4. What SimpleLLMRouter v2 Needs (Complete Gap Analysis)

### Critical — Must fix before Meta Code Squad can use it

| Gap | What's Needed | Effort |
|-----|--------------|--------|
| QuotaTracker not wired | Connect QuotaTracker to `server.ts` request handler | 4h |
| Classifier untested | Tests for all 14 dimensions + edge cases | 6h |
| No circuit breaker completion | Finish the partial circuit breaker impl | 3h |
| No semantic caching | Add hnswlib + embedding cache layer | 8h |

### High Priority — Week 1

| Feature | Source Inspiration | Effort |
|---------|-------------------|--------|
| Cascade fallback routing | RouteLLM | 1 day |
| Intent-based semantic routing | Aurelio Semantic Router | 1 day |
| L1/L2 disk cache | DSPy cache pattern | 0.5 day |
| Routing strategy modes (5) | LiteLLM strategies | 1 day |
| SSE metrics stream (for TUI) | New endpoint | 0.5 day |

### Week 2 — TUI + Intelligence Layer

| Feature | Notes | Effort |
|---------|-------|--------|
| Textual TUI — all 9 screens | Python process, connects via SSE | 3 days |
| Boot animation | Branded intro sequence | 0.5 day |
| Memory-augmented routing | Zep pattern — learn from history | 1 day |
| OptiLLM integration | Optional inference enhancement | 1 day |
| Prompt templates + partials | Native Handlebars-style | 0.5 day |

### Week 3 — Polish & Package

| Feature | Notes | Effort |
|---------|-------|--------|
| Canary testing | Portkey pattern | 0.5 day |
| Quality-cost curve routing | R2-ROUTER / NotDiamond pattern | 1 day |
| `aigency-squad` package integration | Wires into one-command install | 1 day |
| DSPy prompt optimization | Requires usage data first | Phase 3 |

---

## 5. The Motia Question — Full Answer

**Don't integrate Motia into the router now. Do integrate it at the orchestration layer.**

Here's the exact future architecture:

```
aigency-squad (Motia workflows)
    ├── Step: agor-task-monitor        ← watches agor zones for new tasks
    ├── Step: simplellmrouter-client   ← sends requests, receives responses
    ├── Step: quota-check              ← queries router /quota before big tasks
    ├── Step: sugar-task-executor      ← Sugar agent execution
    └── Step: results-aggregator       ← collects, stores, reports

simplellmrouter (standalone service)
    └── Exposes REST + SSE
    └── Motia calls it as an external service, not a Step
```

The router should be a dumb-but-brilliant service that any system can call via HTTP.
Motia is the workflow orchestrator. Don't couple them — let the router be portable.

---

## 6. Complete Tech Stack for v2

```
simplellmrouter/
├── src/                           TypeScript — router core
│   ├── router/
│   │   ├── classifier.ts          14-dimension scoring
│   │   ├── intent-detector.ts     NEW: semantic intent routing
│   │   ├── cascade.ts             NEW: RouteLLM-style cascade
│   │   ├── strategies/            NEW: 5 routing strategies
│   │   │   ├── quality.ts
│   │   │   ├── cost.ts
│   │   │   ├── latency.ts
│   │   │   ├── balanced.ts
│   │   │   └── simple-shuffle.ts
│   │   └── memory.ts              NEW: history-augmented routing
│   ├── cache/
│   │   ├── l1-memory.ts           NEW: node-lru-cache
│   │   ├── l2-disk.ts             NEW: better-sqlite3
│   │   └── l3-semantic.ts         NEW: hnswlib embeddings
│   ├── quota/
│   │   ├── tracker.ts             FIX: wire into server.ts
│   │   └── circuit-breaker.ts     FIX: complete implementation
│   ├── templates/
│   │   ├── registry.ts            NEW: template loader
│   │   └── partials/              NEW: reusable prompt fragments
│   ├── metrics/
│   │   ├── collector.ts           NEW: aggregates all metrics
│   │   └── sse-stream.ts          NEW: SSE endpoint for TUI
│   ├── optillm/
│   │   └── client.ts              NEW: optional OptiLLM proxy
│   └── server.ts                  FIX: wire QuotaTracker, add new routes
│
├── tui/                           Python — Textual TUI
│   ├── app.py                     Main Textual app
│   ├── screens/
│   │   ├── boot.py
│   │   ├── dashboard.py
│   │   ├── live_inference.py
│   │   ├── quota.py
│   │   ├── metrics.py
│   │   ├── provider_config.py
│   │   ├── router_config.py
│   │   ├── cache.py
│   │   └── logs.py
│   ├── widgets/
│   │   ├── sparkline.py
│   │   ├── quota_bar.py
│   │   ├── request_tree.py
│   │   ├── dimension_table.py
│   │   └── animated_logo.py
│   └── client/
│       └── router_client.py       SSE + REST client for router API
│
├── tests/                         TypeScript — Vitest
│   ├── classifier.test.ts         FIX: add comprehensive tests
│   ├── intent-detector.test.ts    NEW
│   ├── cascade.test.ts            NEW
│   ├── cache/                     NEW
│   └── quota/                     NEW: QuotaTracker integration tests
│
└── docker-compose.yml             Router + OptiLLM + optional Redis
```

---

## 7. Brand & Open Source Strategy

The boot animation is a **brand moment**. Every developer who installs this sees Aigency before
they see anything else. Design principles:

1. **Fast but memorable** — 2-3 seconds max, no artificial delays
2. **Informative** — every animation frame shows real system state
3. **Professional** — use Rich's color system deliberately: deep purple/violet for Aigency brand,
   cyan for active states, green for success, amber for warnings
4. **Portable** — works in 80-column terminals, degrades gracefully in minimal environments
5. **Skippable** — `--no-animation` flag for CI/CD contexts

ASCII art logo should be the Aigency wordmark rendered at multiple fidelity levels:
- Full fidelity: 132+ columns
- Standard: 80 columns
- Minimal: single-line banner

Open source positioning: "Built by Aigency — free forever, MIT licensed."
Include in README: "This powers [Aigency's] autonomous Meta Code Squad running 24/7 on free tiers."
That's the case study that makes developers star and fork.

---

## 8. Implementation Sequence

### Week 1: Fix the Foundation
1. Wire QuotaTracker into server.ts (4h)
2. Write classifier tests — all 14 dimensions (6h)
3. Complete circuit breaker (3h)
4. Add L1 + L2 cache (4h)
5. Add SSE metrics stream endpoint (4h)

### Week 2: Intelligence Upgrades
1. Semantic intent detection layer (1 day)
2. Cascade fallback routing — RouteLLM pattern (1 day)
3. 5 routing strategy modes (1 day)
4. Memory-augmented routing (1 day)
5. OptiLLM integration (0.5 day)

### Week 3: TUI
1. Textual app skeleton + navigation (0.5 day)
2. Boot screen + animation (0.5 day)
3. Main dashboard + live inference screens (1 day)
4. Quota + metrics screens (1 day)
5. Config screens + cache inspector (1 day)

### Week 4: Package + Integrate
1. Prompt templates system (0.5 day)
2. Canary testing (0.5 day)
3. Quality-cost curve routing (1 day)
4. Wire into aigency-squad install package (1 day)
5. README, examples, open source prep (1 day)

**Total: ~4 weeks to production-ready, brand-polished, open-sourceable v2.**

---

## 9. One-Line Summary Per Decision

| Question | Answer |
|----------|--------|
| TUI framework | **Textual (Python)** — reactive, beautiful, runs in browser too |
| Motia integration | **Phase 3** — router stays a standalone service, Motia orchestrates around it |
| OptiLLM | **YES, Phase 2** — COMPLEX/REASONING tasks route through it automatically |
| Caching | **YES, 3 layers** — memory + disk + semantic, target 30-60% token savings |
| Prompt templates | **YES, native** — Handlebars-style, no framework needed |
| DSPy | **Phase 3** — needs usage data first, then MIPROv2 optimization |
| Semantic Router (Aurelio) | **STEAL the pattern** — embed locally, 100ms intent detection |
| RouteLLM | **STEAL cascade + threshold calibration** — quality-cost curve routing |
| NotDiamond | **STEAL 3 optimization modes + R2-ROUTER reasoning** |
| LiteLLM | **STEAL 5 routing strategies** — implement all as selectable modes |
| Portkey | **STEAL canary testing + circuit breaker design** |
| Langflow Smart Router | **Validates your approach** — nothing new to steal |

---

## 10. `@aigency/forge-quality` — The Commit-Quality Package

### 10.1 What This Is

A standalone, open-sourceable Turborepo package that encodes the entire commit lifecycle:
git initialization, GitHub repo creation, conventional commits, pre-commit hooks, linting,
type checking, test running, coverage enforcement, and security scanning — all wired into a
single `pnpm add @aigency/forge-quality` install.

**Design philosophy:**
- Zero config to start, full config when needed
- Every hook auto-fixes what it can; only blocks on what it cannot fix
- Shift-left: the commit IS the quality gate, not a CI afterthought
- Small, frequent PRs by design — hooks actively discourage large commits
- Sensitive data never leaves the machine

**Open source positioning:** "Drop this into any Node/TypeScript monorepo or install globally.
Your entire commit hygiene, from first `git init` to a merged PR, is handled."

---

### 10.2 Package Location in Turborepo

```
aigency/                              ← root monorepo
├── packages/
│   └── forge-quality/               ← THIS PACKAGE
│       ├── package.json             name: "@aigency/forge-quality"
│       ├── src/
│       │   ├── init/                git + GitHub setup scripts
│       │   ├── hooks/               pre-commit, commit-msg, pre-push hook definitions
│       │   ├── configs/             shareable lint/type/test/security configs
│       │   └── cli/                 `forge` CLI — init, check, fix, audit
│       ├── templates/               per-language/framework config templates
│       └── README.md
├── apps/
│   └── simplellmrouter/            ← consumes forge-quality
└── turbo.json
```

The package exports:
- A `forge` CLI binary
- Shareable configs (ESLint, Prettier, TypeScript, commitlint, etc.)
- A programmatic API for use in CI pipelines

---

### 10.3 The Init System — `forge init`

Running `forge init` in any new or existing project performs the full setup sequence:

```
forge init [--github] [--template=ts|py|fullstack] [--public|--private]
```

**Step-by-step sequence:**

```
1. DETECT CONTEXT
   ├─ Is this inside a Turborepo? → configure as a package
   ├─ Is this standalone? → configure as a root project
   └─ Language detection: TypeScript / Python / Both

2. GIT INIT
   ├─ git init (if not already a repo)
   ├─ Write .gitignore (comprehensive — env files, secrets, node_modules, build dirs)
   ├─ Set default branch to 'main'
   └─ Set commit.gpgsign if GPG key detected

3. GITHUB REPO CREATION (--github flag)
   ├─ Require: GitHub CLI (gh) — auto-prompt install if missing
   ├─ gh repo create <name> --[public|private] --source=. --remote=origin
   ├─ Set branch protection rules via gh API:
   │   ├─ Require PR reviews (1 reviewer min)
   │   ├─ Require status checks to pass
   │   ├─ Require branches to be up to date before merging
   │   └─ Disable direct pushes to main
   └─ gh repo view --web (opens in browser)

4. INSTALL HOOK TOOLCHAIN
   ├─ Install: husky, lint-staged, @commitlint/cli, @commitlint/config-conventional
   ├─ Install: lefthook (alternative to husky — faster, no Node dependency in hooks)
   ├─ npx husky init  (creates .husky/ dir)
   └─ Copy hook scripts into .husky/

5. INSTALL LINTERS
   ├─ TypeScript projects:
   │   ├─ ESLint + @typescript-eslint/parser + @typescript-eslint/eslint-plugin
   │   ├─ eslint-plugin-import, eslint-plugin-unicorn, eslint-plugin-sonarjs
   │   ├─ Prettier + eslint-config-prettier
   │   └─ Write .eslintrc.json + .prettierrc linking to @aigency/forge-quality configs
   ├─ Python projects:
   │   ├─ Ruff (linter + formatter — replaces flake8, isort, black)
   │   ├─ Mypy (type checking)
   │   └─ Write pyproject.toml [tool.ruff] + [tool.mypy] sections
   └─ Both: editorconfig for cross-editor consistency

6. INSTALL TYPE CHECKERS
   ├─ TypeScript: tsc --noEmit via lint-staged
   └─ Python: mypy via pre-commit hook

7. INSTALL TEST RUNNER + COVERAGE
   ├─ TypeScript: Vitest + @vitest/coverage-v8
   ├─ Python: pytest + pytest-cov
   └─ Write coverage thresholds: lines 80%, functions 80%, branches 70%

8. INSTALL SECURITY SCANNERS
   ├─ gitleaks (secret scanning — blocks commits with credentials)
   ├─ detect-secrets (Yelp's tool — alternative/complement to gitleaks)
   ├─ audit-ci (wraps npm audit / pip audit for dep vulnerability checks)
   ├─ semgrep (SAST — static application security testing, ruleset: p/typescript)
   └─ Write .gitleaks.toml allowlist (false-positive suppression)

9. INSTALL COMMIT TOOLCHAIN
   ├─ Write commitlint.config.js → extends: @commitlint/config-conventional
   ├─ Install commitizen + cz-conventional-changelog
   └─ Write .cz-config.js with Aigency-specific scopes (see §10.6)

10. WRITE LEFTHOOK / HUSKY CONFIG (see §10.4 for full hook definitions)

11. FIRST COMMIT
    ├─ git add .
    ├─ git commit -m "chore: initialize forge-quality toolchain"
    └─ git push -u origin main
```

---

### 10.4 The Hook Architecture

All hooks run through **Lefthook** (primary) with **Husky** fallback for environments where
Lefthook cannot run. Lefthook is parallel by default — hooks that don't depend on each other
run concurrently.

#### pre-commit hook

Runs on every `git commit`. Pipeline:

```
pre-commit
├── [PARALLEL GROUP: format-and-lint]
│   ├── prettier --write {staged_files}           ← auto-fix formatting
│   ├── eslint --fix {staged_files.ts,tsx,js}     ← auto-fix lint issues
│   ├── ruff check --fix {staged_files.py}        ← auto-fix Python lint
│   └── ruff format {staged_files.py}             ← auto-format Python
│
├── [SEQUENTIAL GROUP: type-check]
│   ├── tsc --noEmit --incremental                ← TypeScript type check
│   │   └── On error: print specific file+line, EXIT 1 (cannot auto-fix)
│   └── mypy {staged_files.py}                   ← Python type check
│       └── On error: print specific file+line, EXIT 1
│
├── [PARALLEL GROUP: security]
│   ├── gitleaks protect --staged                 ← SECRET SCAN — hard block
│   │   └── On detect: print matched pattern, EXIT 1, NEVER auto-fix
│   ├── detect-secrets scan {staged_files}        ← secondary secret scan
│   └── semgrep --config=p/typescript {staged_files.ts}  ← SAST
│
├── [GROUP: test-changed]
│   ├── vitest run --changed HEAD                 ← only tests related to staged files
│   │   └── On fail: print failing tests, EXIT 1
│   └── pytest --testpaths=. -x {changed_test_files}
│
└── [GROUP: coverage-check]
    └── vitest run --coverage --changed HEAD
        └── If coverage drops below threshold: print delta, EXIT 1
```

**Auto-fix cascade rule:** The hook re-stages auto-fixed files before proceeding.
If a fix modifies a file that then fails type-check, the loop exits with a clear message:
`"Auto-fix applied but type error remains. Fix manually: <file>:<line>"`

#### commit-msg hook

```
commit-msg
└── commitlint --edit $1
    ├── Validates: type(scope): subject
    ├── On fail: print exact error + valid types list + example, EXIT 1
    └── Does NOT auto-fix (commit messages are semantic, not syntactic)
```

#### pre-push hook

Runs before `git push`. More thorough than pre-commit:

```
pre-push
├── [PARALLEL: full type check]
│   ├── tsc --noEmit                              ← full project (not just staged)
│   └── mypy src/                                ← full project
│
├── [PARALLEL: full test suite]
│   ├── vitest run --coverage                    ← full suite with coverage
│   └── pytest --cov=src --cov-fail-under=80
│
├── [SECURITY: full audit]
│   ├── audit-ci --moderate                      ← npm/pip audit
│   ├── gitleaks detect                          ← full history scan
│   └── semgrep --config=p/typescript src/
│
└── [PR SIZE CHECK]
    └── Count files changed vs main branch
        └── If > 20 files: WARN "Large PR detected. Consider splitting."
        └── If > 50 files: ERROR "PR too large. Forge encourages small PRs. Use --no-verify to override."
```

#### post-commit hook (informational, non-blocking)

```
post-commit
└── Print commit summary:
    "✓ Committed: feat(router): add cascade fallback
     Files: 4 changed | Tests: 23 passed | Coverage: 87% | Security: clean
     Next: git push  or  forge pr (creates PR with auto-generated description)"
```

---

### 10.5 Conventional Commit Configuration

commitlint config with Aigency-specific scopes:

```javascript
// commitlint.config.js (generated by forge init)
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // new feature
      'fix',      // bug fix
      'docs',     // documentation only
      'style',    // formatting, no logic change
      'refactor', // code change, not feat or fix
      'perf',     // performance improvement
      'test',     // adding or fixing tests
      'build',    // build system / dependency changes
      'ci',       // CI configuration
      'chore',    // maintenance tasks
      'revert',   // revert a commit
      'security', // security fix (non-feat)
      'wip',      // work in progress (never on main)
    ]],
    'scope-enum': [1, 'always', [
      // project-specific scopes — customizable
      'router', 'tui', 'cache', 'quota', 'classifier',
      'provider', 'auth', 'api', 'db', 'infra', 'deps', 'config',
      'tests', 'docs', 'ci', 'release',
    ]],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 100],
    'footer-max-line-length': [1, 'always', 100],
  },
};
```

**Commitizen integration** — `forge commit` (alias: `pnpm commit`) launches an interactive
prompt instead of requiring users to remember the format:

```
$ forge commit

? Select commit type:
  ❯ feat:     A new feature
    fix:      A bug fix
    docs:     Documentation only
    refactor: Code change, no feature/fix
    test:     Adding or fixing tests
    ...

? Select scope (optional):
  ❯ router
    tui
    cache
    ...

? Short description (max 72 chars):
  ❯ add cascade fallback with quality threshold

? Is this a breaking change? No

→ Staged: feat(router): add cascade fallback with quality threshold
? Confirm? Yes  → commits
```

---

### 10.6 Linter / Code Quality Configuration

#### TypeScript / JavaScript

`packages/forge-quality/configs/eslint.js` — the shared ESLint config:

```javascript
// @aigency/forge-quality/configs/eslint.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: true },
  plugins: ['@typescript-eslint', 'import', 'unicorn', 'sonarjs'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:unicorn/recommended',
    'plugin:sonarjs/recommended',
    'prettier',                            // ALWAYS LAST — disables conflicting rules
  ],
  rules: {
    // TypeScript strictness
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',

    // Import hygiene
    'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'import/no-cycle': 'error',
    'import/no-unused-modules': 'warn',

    // Code quality (SonarJS)
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],

    // Unicorn (modern JS patterns)
    'unicorn/prevent-abbreviations': 'off',  // too aggressive for most teams
    'unicorn/filename-case': ['error', { cases: { kebabCase: true, camelCase: true } }],
  },
};
```

`packages/forge-quality/configs/typescript.json` — base tsconfig:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true
  }
}
```

#### Python

`packages/forge-quality/configs/ruff.toml`:

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = [
  "E", "W",     # pycodestyle
  "F",          # pyflakes
  "I",          # isort
  "B",          # flake8-bugbear
  "C4",         # flake8-comprehensions
  "UP",         # pyupgrade
  "SIM",        # flake8-simplify
  "TCH",        # flake8-type-checking
  "ANN",        # flake8-annotations
  "S",          # bandit (security)
  "RUF",        # ruff-specific
]
ignore = ["ANN101", "ANN102"]  # self/cls annotations

[tool.ruff.lint.isort]
known-first-party = ["src"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

---

### 10.7 Security Scanning

#### Secret Detection — Gitleaks

`packages/forge-quality/configs/gitleaks.toml`:

```toml
[extend]
useDefault = true   # includes all built-in rules (AWS, GCP, GitHub, Stripe, etc.)

[[rules]]
id = "custom-private-key"
description = "Detects any private key material"
regex = '''(?i)-----BEGIN[ A-Z0-9_-]{0,100}PRIVATE KEY-----'''
severity = "CRITICAL"

[[rules]]
id = "custom-env-file"
description = "Detects .env file content in commits"
regex = '''(?i)(DATABASE_URL|SECRET_KEY|API_KEY|PASSWORD|TOKEN)\s*=\s*\S+'''
severity = "HIGH"

[allowlist]
description = "Allowlist for tests/fixtures"
paths = [
  '''tests/fixtures/.*''',
  '''.*\.example\..*''',  # .env.example etc.
]
regexes = [
  '''EXAMPLE_TOKEN_123''',  # known test fixtures
]
```

#### Dependency Vulnerabilities — audit-ci

```json
// packages/forge-quality/configs/audit-ci.json
{
  "moderate": true,
  "allowlist": [],
  "report-type": "important",
  "retry-on-network-failure": true
}
```

#### SAST — Semgrep

Default ruleset: `p/typescript` + `p/secrets` + `p/owasp-top-ten`.
Custom rules can be added to `packages/forge-quality/configs/semgrep/`.

---

### 10.8 Test Coverage Enforcement

#### Vitest config (TypeScript)

```typescript
// packages/forge-quality/configs/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/types/**',
        '**/__mocks__/**',
      ],
    },
    globals: true,
    environment: 'node',
  },
});
```

#### Coverage delta enforcement

Pre-push hook checks not just absolute threshold but *delta*:
if a push would drop coverage by more than 2%, it warns. If it drops by more than 5%, it blocks.

```
Coverage: 87.3% → 84.1% (delta: -3.2%)
⚠ Coverage dropped more than 2%. Add tests before pushing.
Run: forge coverage --report to see uncovered lines
```

---

### 10.9 PR Size Control

The `forge pr` command (wraps `gh pr create`) enforces small PR discipline:

```
forge pr [--title "..."] [--body "..."] [--draft]
```

Before creating the PR it runs:

```
1. Count files changed vs target branch
   ├─ 1-5 files:   ✓ Perfect PR size
   ├─ 6-15 files:  ✓ Acceptable
   ├─ 16-30 files: ⚠ Large PR — consider splitting
   └─ 31+ files:   ✗ BLOCKED — "Split this into multiple PRs. Use --force to override."

2. Count lines changed
   ├─ < 400 lines: ✓
   └─ > 400 lines: ⚠ with suggestion to split

3. Check: are all tests passing? (runs vitest + pytest)

4. Check: coverage threshold met?

5. Generate PR description automatically:
   ├─ Summarizes conventional commits in the branch
   ├─ Lists files changed by category
   ├─ Links to any Linear/GitHub issues mentioned in commits
   └─ Adds coverage delta + test count to PR body

6. Create PR via gh pr create --title "..." --body "..."
```

**Auto-generated PR description template:**

```markdown
## What
<derived from feat/fix commit subjects in branch>

## Why
<derived from commit bodies>

## Changes
- `router/cascade.ts` — new cascade fallback logic
- `tests/cascade.test.ts` — 12 new tests

## Test Coverage
- Before: 84.1% | After: 87.3% (+3.2%)
- New tests: 12 | Passing: 47/47

## Checklist
- [x] Tests passing
- [x] Coverage threshold met
- [x] No secrets detected
- [x] Conventional commits
- [x] Types checked
```

---

### 10.10 The `forge` CLI — Full Command Reference

```
forge init              Full project setup (git, GitHub, hooks, linters, tests, security)
forge commit            Interactive commitizen prompt
forge check             Run all checks without committing (lint + types + tests + security)
forge fix               Run all auto-fixable checks (lint --fix, prettier, ruff --fix)
forge test              Run tests with coverage report
forge audit             Run security audit (gitleaks + semgrep + audit-ci)
forge pr                Create PR with auto-generated description + size check
forge coverage          Show coverage report with uncovered lines highlighted
forge status            Print hook/tool status — what's installed, what's outdated
forge update            Update all forge-quality toolchain dependencies
forge eject             Remove forge-quality hooks (keeps config files)
forge config            Edit forge-quality settings (opens .forge.json)
```

---

### 10.11 Configuration File — `.forge.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/aigency/forge-quality/main/schema.json",
  "language": ["typescript", "python"],
  "github": {
    "createRepo": true,
    "visibility": "private",
    "branchProtection": true,
    "requireReviews": 1,
    "requireStatusChecks": ["test", "lint", "type-check", "security"]
  },
  "hooks": {
    "preCommit": {
      "lint": true,
      "typeCheck": true,
      "testChanged": true,
      "secretScan": true,
      "sast": "warn"
    },
    "prePush": {
      "fullTestSuite": true,
      "coverageCheck": true,
      "dependencyAudit": true,
      "prSizeCheck": true
    }
  },
  "coverage": {
    "lines": 80,
    "functions": 80,
    "branches": 70,
    "deltaWarning": 2,
    "deltaBlock": 5
  },
  "pr": {
    "maxFiles": 30,
    "maxLines": 400,
    "autoDescription": true,
    "draftByDefault": false
  },
  "commits": {
    "conventional": true,
    "scopes": ["router", "tui", "cache", "quota", "auth", "deps"],
    "signoff": false,
    "gpgSign": false
  },
  "security": {
    "gitleaks": true,
    "semgrep": true,
    "auditLevel": "moderate",
    "allowlist": []
  }
}
```

---

### 10.12 Turborepo Integration

In the root `turbo.json`, forge-quality hooks into the pipeline:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "lint": {
      "dependsOn": [],
      "outputs": []
    },
    "type-check": {
      "dependsOn": [],
      "outputs": ["dist/**", ".tsbuildinfo"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "security:audit": {
      "dependsOn": [],
      "outputs": []
    }
  }
}
```

`forge check` maps to `turbo run lint type-check test security:audit --affected` — only runs
for packages touched by the current branch. This means pre-push checks on a large monorepo
complete in seconds, not minutes.

---

### 10.13 Package.json Scripts (consumer project)

When `forge init` runs in a project, it adds these scripts:

```json
{
  "scripts": {
    "commit": "cz",
    "lint": "eslint . --max-warnings=0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "security:secrets": "gitleaks detect",
    "security:sast": "semgrep --config=p/typescript src/",
    "security:audit": "audit-ci --moderate",
    "security:all": "pnpm security:secrets && pnpm security:sast && pnpm security:audit",
    "check": "pnpm lint && pnpm type-check && pnpm test:coverage && pnpm security:all",
    "fix": "pnpm lint:fix && pnpm format",
    "pr": "forge pr"
  }
}
```

---

### 10.14 Installation — Three Modes

#### Mode 1: Per-project (Turborepo package)
```bash
pnpm add -D @aigency/forge-quality
npx forge init
```

#### Mode 2: Global developer environment
```bash
npm install -g @aigency/forge-quality
forge init   # in any new project directory
```

#### Mode 3: One-liner bootstrap (new projects from scratch)
```bash
npx @aigency/forge-quality init --name my-project --github --template=ts
# Creates directory, git init, GitHub repo, full toolchain — in one command
```

---

### 10.15 What This Package Does NOT Do

Clear scope boundaries to keep it lean and focused:

- **Not a CI/CD system** — hooks are local. GitHub Actions integration is a separate step
  (though `forge init --ci` can scaffold the Actions workflows)
- **Not opinionated about your framework** — works with Next.js, Express, FastAPI, anything
- **Not a test generator** — runs your tests, enforces coverage, but doesn't write them
- **Not a code review AI** — that's what SimpleLLMRouter + the Meta Code Squad is for
- **Not a release manager** — use `release-it` or `changesets` for that (forge can scaffold it)

---

### 10.16 Open Source Packaging Strategy

**Repo:** `github.com/aigency/forge-quality` (separate public repo, mirrored from monorepo)
**License:** MIT
**NPM:** `@aigency/forge-quality` (public package)
**PyPI:** `aigency-forge-quality` (Python hook configs + CLI)

README headline: *"Your entire commit hygiene in one package. Conventional commits, auto-linting,
type checking, test coverage enforcement, secret scanning, and small-PR discipline — installed
in 30 seconds."*

The killer demo in the README:
```bash
# New project, zero to production-grade commit hygiene
npx @aigency/forge-quality init --name my-project --github

# Output:
# ✓ git init
# ✓ GitHub repo created: github.com/you/my-project
# ✓ Branch protection enabled
# ✓ ESLint + Prettier configured
# ✓ TypeScript strict mode
# ✓ Vitest + coverage thresholds (80%)
# ✓ Gitleaks secret scanning
# ✓ Semgrep SAST
# ✓ Commitlint (conventional commits)
# ✓ Commitizen interactive prompt
# ✓ Pre-commit + pre-push hooks
# ✓ PR size enforcement
# Ready. Make your first commit: forge commit
```

**30-second install. Day-0 quality. That's the pitch.**
