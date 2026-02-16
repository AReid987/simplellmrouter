# v1 Prototype: TUI Dashboard (Textual)

**Feature:** Interactive Terminal User Interface (TUI) Dashboard  
**Framework:** [Textual](https://textual.textualize.io/) (Python)  
**Type:** v1 Prototype Enhancement  
**Status:** Planning  
**Priority:** Medium  
**Estimated Effort:** 3-5 days

---

## Overview

A terminal-based dashboard for SimpleLLMRouter built with Textual (Python) that provides real-time system monitoring, interactive configuration management, live log streaming, and runtime control interface.

### Why Textual?

| Feature | Textual | Blessed | Ink |
|---------|---------|---------|-----|
| Modern API | ✅ Reactive | ❌ Callbacks | ✅ React |
| Rich Widgets | ✅ Built-in | ⚠️ Limited | ⚠️ Basic |
| CSS Styling | ✅ CSS-like | ❌ No | ❌ No |
| Data Tables | ✅ Excellent | ⚠️ Basic | ⚠️ Basic |
| Tree Views | ✅ Built-in | ❌ No | ⚠️ Basic |
| Charts/Plots | ✅ Built-in | ⚠️ Contrib | ❌ No |
| Python Ecosystem | ✅ Rich | ❌ Node | ⚠️ Node |
| Async Support | ✅ Native | ⚠️ Callbacks | ✅ Promise |
| Active Development | ✅ Very active | ⚠️ Stalled | ✅ Active |

**Key Advantages:**
- **Reactive Programming**: Built-in reactive state management
- **Rich Widget Set**: DataTable, Tree, Log, Progress bars out of the box
- **CSS Styling**: Style widgets with CSS-like syntax
- **Python Data Ecosystem**: Easy integration with data analysis tools

---

## Architecture

### Cross-Language Communication

Since Textual is Python and the router is Node.js, communication happens via HTTP API:

```
Dashboard (Python/Textual)
    │ HTTP/JSON
    ▼
Router API (Node.js)
    GET    /health          → Health status
    GET    /quota           → Quota usage
    GET    /logs            → SSE log stream
    GET    /config          → Current configuration
    POST   /config/reload   → Reload configuration
    POST   /providers/{id}/toggle → Enable/disable provider
```

---

## Widget Specifications

### 1. Header Widget

**Purpose:** System status at a glance

```python
class Header(Static):
    status = reactive("unknown")
    uptime = reactive("0s")
    version = reactive("1.0.0")
```

**Display:**
```
┌────────────────────────────────────────────────────────────────┐
│ SimpleLLMRouter Dashboard                    Status: ● Healthy │
│ Uptime: 2d 4h 32m                          v1.0.0              │
└────────────────────────────────────────────────────────────────┘
```

---

### 2. Metrics Widget

**Purpose:** Real-time performance metrics with sparklines

```python
class MetricsWidget(Static):
    requests_per_sec = reactive(0.0)
    avg_latency = reactive(0)
    rps_history = reactive([0.0] * 60)  # 60 seconds
```

**Display:**
```
┌─ Metrics ──────────────────────────────────────────────────────┐
│  Requests/sec        Avg Latency        Active Providers       │
│  ┌─────────┐        ┌─────────┐        ┌─────────────────┐    │
│  │   45    │        │  234ms  │        │  5/9 available  │    │
│  │ spark   │        │ spark   │        │                 │    │
│  └─────────┘        └─────────┘        └─────────────────┘    │
│  Quota: [████░░░░░░] 23%                                       │
└────────────────────────────────────────────────────────────────┘
```

---

### 3. Log Widget

**Purpose:** Real-time log streaming with filtering

```python
class LogWidget(Static):
    filter_level = reactive("INFO")
    search_term = reactive("")
    paused = reactive(False)
```

**Features:**
- Auto-scroll with new entries
- 1000-line buffer
- Log level filtering (DEBUG, INFO, WARN, ERROR)
- Keyword search/highlight
- Pause/resume
- Color-coded levels

**Display:**
```
┌─ Logs [INFO] [Search: "rate limit"] ───────────────────────────┐
│ 2026-02-16 14:32:10 INFO Request classified: tier=MEDIUM       │
│ 2026-02-16 14:32:10 INFO Selected: mistral/mistral-large       │
│ 2026-02-16 14:32:11 INFO Request completed: 200 OK (234ms)    │
│ 2026-02-16 14:32:15 WARN Rate limit detected: groq/llama-3.3  │
│ [▲ Scroll] [F: Filter] [S: Search] [P:Pause]                   │
└────────────────────────────────────────────────────────────────┘
```

---

### 4. Configuration Widget

**Purpose:** Interactive configuration management

```python
class ConfigWidget(Static):
    config_tree = reactive(None)
    unsaved_changes = reactive(False)
```

**Features:**
- Tree view of configuration
- Provider toggle on/off
- Model enable/disable
- Threshold editing
- Save/Reload/Reset

**Display:**
```
┌─ Configuration ────────────────────────────────────────────────┐
│ ┌─ Config Tree ───────────┐ ┌─ Editor ──────────────────────┐ │
│ │ ▼ providers             │ │ Provider: Mistral              │ │
│ │   ● mistral     [Edit]  │ │ [✓] Enabled                    │ │
│ │   ○ groq        [Edit]  │ │ Base URL: [________________]   │ │
│ │   ○ gemini      [Edit]  │ │ Models:                        │ │
│ └─────────────────────────┘ │   [✓] mistral-large            │ │
│                             │   [✓] mistral-small            │ │
│                             │ [Save] [Reload] [Reset]         │ │
└───────────────────────────────────────────────────────────────┘
```

---

### 5. Provider Status Widget

**Purpose:** Real-time provider health monitoring

```python
class ProviderWidget(Static):
    providers = reactive([])
```

**Display:**
```
┌─ Provider Status ──────────────────────────────────────────────┐
│ Provider      Status        Quota    Rate Limit    Last        │
│ ───────────────────────────────────────────────────────────    │
│ Mistral       ● OK          23%      -             2s ago      │
│ Groq          ● OK          45%      45s left      1m ago      │
│ Gemini        ● OK          89%      -             5m ago      │
│ [Refresh] [Enable All] [Disable All]                          │
└────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Project Setup (Day 1)

**Create Python Dashboard Project:**

```
dashboard/
├── pyproject.toml
├── requirements.txt
└── src/
    └── dashboard/
        ├── __init__.py
        ├── main.py              # CLI entry point
        ├── app.py               # Textual App
        ├── api/
        │   ├── client.py        # HTTP client
        │   └── models.py        # Pydantic models
        ├── widgets/
        │   ├── header.py
        │   ├── metrics.py
        │   ├── logs.py
        │   ├── config.py
        │   └── providers.py
        └── styles/
            └── dashboard.tcss
```

**Dependencies:**
```toml
[project]
name = "simplellmrouter-dashboard"
dependencies = [
    "textual>=0.47.0",
    "httpx>=0.25.0",
    "pydantic>=2.0.0",
    "pyyaml>=6.0.0",
]
```

**Deliverable:** Dashboard launches with placeholder content

---

### Phase 2: API Client & Data Layer (Day 1)

**Pydantic Models:**

```python
# dashboard/src/dashboard/api/models.py
from pydantic import BaseModel
from datetime import datetime
from typing import Literal

class HealthStatus(BaseModel):
    status: Literal["healthy", "degraded", "error"]
    providers: int
    models: int
    uptime: int

class QuotaInfo(BaseModel):
    provider_id: str
    model_id: str
    percent_used: float

class LogEntry(BaseModel):
    timestamp: datetime
    level: Literal["DEBUG", "INFO", "WARN", "ERROR"]
    message: str
```

**HTTP Client:**

```python
# dashboard/src/dashboard/api/client.py
import httpx
from .models import HealthStatus, QuotaInfo

class RouterClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def health(self) -> HealthStatus:
        resp = await self.client.get(f"{self.base_url}/health")
        return HealthStatus(**resp.json())
    
    async def quota(self) -> list[QuotaInfo]:
        resp = await self.client.get(f"{self.base_url}/quota")
        return [QuotaInfo(**q) for q in resp.json()]
    
    async def stream_logs(self, level: str = "INFO"):
        async with self.client.stream(
            "GET",
            f"{self.base_url}/logs",
            params={"level": level, "follow": "true"},
            timeout=None
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    yield json.loads(line[6:])
```

**Deliverable:** API client working, data models defined

---

### Phase 3: Header Widget (Day 1)

```python
# dashboard/src/dashboard/widgets/header.py
from textual.widgets import Static
from textual.reactive import reactive

class Header(Static):
    status = reactive("unknown")
    uptime = reactive("0s")
    
    def compose(self):
        yield Label("SimpleLLMRouter Dashboard", classes="title")
        yield Label(self.status, classes=f"status-{self.status}")
        yield Label(f"Uptime: {self.uptime}")
```

**CSS (dashboard.tcss):**
```css
Header {
    height: 3;
    background: $surface-darken-1;
}

Header .status-healthy { color: $success; }
Header .status-degraded { color: $warning; }
Header .status-error { color: $error; }
```

---

### Phase 4: Metrics Widget (Day 2)

```python
# dashboard/src/dashboard/widgets/metrics.py
from textual.widgets import Static, ProgressBar
from textual.reactive import reactive

class MetricsWidget(Static):
    requests_per_sec = reactive(0.0)
    avg_latency = reactive(0)
    quota_usage = reactive(0.0)
    
    def compose(self):
        with Grid(classes="metrics-grid"):
            yield Label("Requests/sec")
            yield Label(str(self.requests_per_sec))
            yield Label("Avg Latency")
            yield Label(f"{self.avg_latency}ms")
            yield Label("Quota Usage")
            yield ProgressBar(total=100, progress=self.quota_usage)
```

**Deliverable:** Live metrics with auto-refresh

---

### Phase 5: Logs Widget (Day 2-3)

```python
# dashboard/src/dashboard/widgets/logs.py
from textual.widgets import Static, RichLog, Input, Select, Button
from textual.reactive import reactive

class LogWidget(Static):
    filter_level = reactive("INFO")
    paused = reactive(False)
    
    def compose(self):
        with Horizontal(classes="log-controls"):
            yield Select([
                ("DEBUG", "DEBUG"),
                ("INFO", "INFO"),
                ("WARN", "WARN"),
                ("ERROR", "ERROR"),
            ], value=self.filter_level, id="level-filter")
            yield Input(placeholder="Search...", id="log-search")
            yield Button("Pause", id="pause-btn")
        
        self.log_display = RichLog(classes="log-display")
        yield self.log_display
    
    async def stream_logs(self):
        async for entry in self.client.stream_logs(self.filter_level):
            if not self.paused:
                self.log_display.write(self.format_entry(entry))
```

**Deliverable:** Live log streaming with filtering

---

### Phase 6: Configuration Widget (Day 3-4)

```python
# dashboard/src/dashboard/widgets/config.py
from textual.widgets import Static, Tree, Checkbox, Button
from textual.reactive import reactive

class ConfigWidget(Static):
    unsaved_changes = reactive(False)
    
    def compose(self):
        with Horizontal():
            self.tree = Tree("Configuration")
            yield self.tree
            
            with Vertical(classes="config-editor"):
                yield Label("Select item to edit")
                self.editor = Vertical()
                yield self.editor
                
                with Horizontal():
                    yield Button("Save", id="save-btn")
                    yield Button("Reload", id="reload-btn")
```

**Deliverable:** Interactive config editing

---

### Phase 7: Provider Widget (Day 4)

```python
# dashboard/src/dashboard/widgets/providers.py
from textual.widgets import Static, DataTable, Button
from textual.reactive import reactive

class ProviderWidget(Static):
    providers = reactive([])
    
    def compose(self):
        yield Label("Provider Status", classes="title")
        
        self.table = DataTable()
        self.table.add_columns(
            "Provider", "Status", "Quota", "Rate Limit", "Last Request"
        )
        yield self.table
        
        with Horizontal():
            yield Button("Refresh", id="refresh-btn")
            yield Button("Enable All", id="enable-all-btn")
    
    def watch_providers(self, providers):
        self.table.clear()
        for p in providers:
            status = "🟢" if p.status == "healthy" else "🟡"
            self.table.add_row(p.name, f"{status} {p.status}", 
                             f"{p.quota_percent}%", ...)
```

**Deliverable:** Provider status table

---

### Phase 8: Router API Extensions (Day 4-5)

Add to Node.js router (`src/server.ts`):

**1. GET /logs (SSE)**

```typescript
app.get('/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  const level = req.query.level as string || 'INFO';
  
  const unsubscribe = logger.on('log', (entry) => {
    if (shouldIncludeLevel(entry.level, level)) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    }
  });
  
  req.on('close', unsubscribe);
});
```

**2. GET /providers (detailed)**

```typescript
app.get('/providers', (req, res) => {
  const providers = getEnabledProviders().map(p => ({
    id: p.id,
    name: p.name,
    status: getProviderStatus(p),
    quota_percent: calculateQuotaPercent(p),
    // ...
  }));
  res.json(providers);
});
```

**3. POST /providers/:id/toggle**

```typescript
app.post('/providers/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;
  toggleProvider(id, enabled);
  res.json({ success: true });
});
```

**Deliverable:** Router API supports dashboard

---

### Phase 9: Main App & Integration (Day 5)

```python
# dashboard/src/dashboard/app.py
from textual.app import App, ComposeResult
from textual.widgets import Footer, Header
from textual.containers import TabbedContent, TabPane

from .widgets.header import Header
from .widgets.metrics import MetricsWidget
from .widgets.logs import LogWidget
from .widgets.config import ConfigWidget
from .widgets.providers import ProviderWidget

class DashboardApp(App):
    CSS_PATH = "styles/dashboard.tcss"
    BINDINGS = [
        ("f1", "help", "Help"),
        ("f2", "metrics", "Metrics"),
        ("f3", "logs", "Logs"),
        ("f4", "config", "Config"),
        ("q", "quit", "Quit"),
    ]
    
    def __init__(self, router_url: str, **kwargs):
        super().__init__(**kwargs)
        self.router_url = router_url
        self.client = RouterClient(router_url)
    
    def compose(self) -> ComposeResult:
        yield Header()
        
        with TabbedContent():
            with TabPane("Dashboard", id="tab-dashboard"):
                yield MetricsWidget()
                yield ProviderWidget()
            
            with TabPane("Logs", id="tab-logs"):
                yield LogWidget()
            
            with TabPane("Configuration", id="tab-config"):
                yield ConfigWidget()
        
        yield Footer()
```

**CLI Entry Point:**

```python
# dashboard/src/dashboard/main.py
import click
from .app import DashboardApp

@click.command()
@click.option("--url", default="http://localhost:8402")
def main(url: str):
    """Launch SimpleLLMRouter TUI Dashboard."""
    app = DashboardApp(router_url=url)
    app.run()

if __name__ == "__main__":
    main()
```

---

## Installation & Usage

### Installation

```bash
cd simplellmrouter/dashboard
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

### Usage

```bash
# Launch dashboard
simplellmrouter-dashboard

# Custom router URL
simplellmrouter-dashboard --url http://router.example.com:8402

# Development mode with hot reload
textual run --dev dashboard/main.py
```

---

## File Structure

```
simplellmrouter/
├── src/                          # Node.js Router
│   ├── config/
│   ├── router.ts
│   ├── server.ts
│   └── ...
├── dashboard/                    # Python Textual Dashboard
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── src/
│       └── dashboard/
│           ├── __init__.py
│           ├── main.py
│           ├── app.py
│           ├── api/
│           │   ├── client.py
│           │   └── models.py
│           ├── widgets/
│           │   ├── header.py
│           │   ├── metrics.py
│           │   ├── logs.py
│           │   ├── config.py
│           │   └── providers.py
│           └── styles/
│               └── dashboard.tcss
└── config/
    └── providers.yaml
```

---

## Success Criteria

- [ ] Dashboard launches with `simplellmrouter-dashboard`
- [ ] Header shows live router status with 5s refresh
- [ ] Metrics update every 2 seconds with sparklines
- [ ] Logs stream in real-time with filtering (DEBUG/INFO/WARN/ERROR)
- [ ] Configuration can be edited and saved
- [ ] Provider status table shows real-time health
- [ ] Keyboard shortcuts work (F1-F5, Tab, Q)
- [ ] Handles connection errors gracefully
- [ ] Works on macOS, Linux, Windows (with Python)

---

## Comparison Summary

| Aspect | Textual (Python) | Blessed (Node) |
|--------|------------------|----------------|
| Lines of Code | ~30% less | Baseline |
| Widget Richness | Excellent | Basic |
| Async Support | Native asyncio | Callbacks |
| Learning Curve | Moderate | Low |
| Cross-Language | Requires HTTP API | Same codebase |

**Trade-off:** Textual requires HTTP communication but provides significantly richer widgets and better developer experience.

---

*Planned by: Execution Agent*  
*Date: 2026-02-16*  
*Framework: Textual (Python)*
