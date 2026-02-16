# Codebase Structure

**Analysis Date:** 2024-07-16

## Directory Layout

```
aigency-router/
├── .claude/                # Claude agent's configuration and operational files
├── .claude-flow/           # Claude agent's operational state, logs, etc.
├── .git/                   # Git version control files
├── .planning/              # Generated documentation and plans
│   └── codebase/           # Codebase analysis documents
├── .swarm/                 # Swarm-related memory and schema
├── conductor/              # Potential internal project management/state files
├── docs/                   # General project documentation
├── node_modules/           # Installed npm packages
├── src/                    # Main application source code
└── ...other config files   # project-level configuration
```

## Directory Purposes

**`.claude/`**:
- Purpose: Contains configuration, agents, commands, helpers, and skills for the Claude agent itself. Not part of the application's runtime.
- Contains: `agents/`, `commands/`, `helpers/`, `skills/` directories, `memory.db`, `settings.json`, etc.
- Key files: `.claude/memory.db`, `.claude/settings.json`

**`.claude-flow/`**:
- Purpose: Stores runtime data, logs, and metrics related to the Claude agent's operations.
- Contains: `agents/`, `data/`, `hive-mind/`, `logs/`, `memory/`, `metrics/`, `sessions/`, `workflows/` directories.
- Key files: `.claude-flow/config.yaml`, `.claude-flow/daemon-state.json`, `.claude-flow/metrics/codebase-map.json`

**`.planning/`**:
- Purpose: Stores generated project planning and analysis documents.
- Contains: `codebase/` directory.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STACK.md`, etc.

**`src/`**:
- Purpose: Contains all the TypeScript source code for the SimpleLLMRouter application. This is the core logic.
- Contains: `.ts` files implementing the CLI, server, routing logic, and provider definitions.
- Key files: `src/cli.ts`, `src/server.ts`, `src/router.ts`, `src/providers.ts`, `src/quickstart-config.yaml`, `src/quota-tracker.ts`

## Key File Locations

**Entry Points:**
- `src/cli.ts`: The main command-line interface entry point.
- `src/server.ts`: The core HTTP server implementation, initialized by `cli.ts`.

**Configuration:**
- `package.json`: Project metadata, scripts, and dependencies.
- `tsconfig.json`: TypeScript compiler configuration.
- `src/quickstart-config.yaml`: Example or default configuration for the router.
- `.env`: Environment variables (not tracked by git, used for API keys).

**Core Logic:**
- `src/router.ts`: The "intelligent" routing logic and request classification.
- `src/providers.ts`: Definitions and loading mechanism for all LLM providers and their models.
- `src/quota-tracker.ts`: Logic related to tracking and managing quotas (though not fully explored, likely integrates with router/providers).

**Testing:**
- `package.json` script: `"test": "echo 'No tests yet'"`. No dedicated test files or directory observed.

## Naming Conventions

**Files:**
- `kebab-case.ts` for implementation files (e.g., `router.ts`, `providers.ts`).
- `UPPERCASE.md` for documentation files (e.g., `README.md`, `ARCHITECTURE.md`).

**Directories:**
- `kebab-case/` (e.g., `node_modules/`, `codebase/`).

## Where to Add New Code

**New Feature (e.g., a new routing strategy):**
- Primary code: A new function or class in `src/router.ts` (or a new file in `src/` if significant).
- Integration: Update `src/router.ts` to use the new strategy.

**New LLM Provider Integration:**
- Primary code: Add a new entry to `PROVIDER_DEFINITIONS` in `src/providers.ts`.
- If a custom API client is needed beyond `fetch`, a new file in `src/` (e.g., `src/custom-api-client.ts`) might be necessary, then integrated into `src/server.ts:makeProviderRequest`.

**New CLI Command:**
- Implementation: Extend the `if/else if` block in `src/cli.ts` to handle the new command.

**New Shared Utility:**
- Implementation: A new file in `src/` (e.g., `src/utils.ts` or a more specific name like `src/helpers/token-calculator.ts`).

## Special Directories

**`dist/`:**
- Purpose: Output directory for compiled TypeScript files.
- Generated: Yes, by `npm run build` (`tsc`).
- Committed: No, typically ignored by `.gitignore`.

---

*Structure analysis: 2024-07-16*
