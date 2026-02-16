# Technology Stack

**Analysis Date:** 2024-07-25

## Languages

**Primary:**
- TypeScript 5.3+ - Used for all source code in `src/`.

**Secondary:**
- YAML - Used for a quickstart configuration file `src/quickstart-config.yaml`.

## Runtime

**Environment:**
- Node.js >=18.0.0

**Package Manager:**
- pnpm - Inferred from `pnpm-lock.yaml`.
- Lockfile: present

## Frameworks

**Core:**
- None. The application uses the vanilla `node:http` module to implement its server in `src/server.ts`.

**Testing:**
- None detected. The `test` script in `package.json` is a placeholder: `echo 'No tests yet'`.

**Build/Dev:**
- `tsc` (TypeScript Compiler) - Used for compiling TypeScript to JavaScript (`"build": "tsc"`).
- `tsx` - Used for running TypeScript directly during development (`"dev": "tsx src/cli.ts"`).

## Key Dependencies

**Critical:**
- The project has **zero** production npm dependencies listed in `package.json`. It relies exclusively on built-in Node.js APIs.

**Core APIs Used:**
- `node:http` - For creating the HTTP server (`src/server.ts`).
- `fetch` (global) - For making outbound API requests to LLM providers (`src/server.ts`).
- `node:process` - For environment variables and process control.

**Development:**
- `@types/node`: "~20.0.0" - Provides TypeScript type definitions for Node.js.
- `typescript`: "~5.3.0" - The TypeScript compiler.
- `tsx`: "~4.7.0" - For running TypeScript files directly.

## Configuration

**Environment:**
- API keys and provider settings are configured via environment variables (e.g., `MISTRAL_API_KEY`, `GROQ_API_KEY`). This pattern is defined in `src/providers.ts`.

**Build:**
- `tsconfig.json`: Configures the TypeScript compiler to target `ES2022` and `Node16` module resolution, with output to the `./dist` directory.

## Platform Requirements

**Development:**
- Node.js >= 18.0.0
- pnpm package manager

**Production:**
- Node.js >= 18.0.0. The application is a self-contained Node.js process.

---

*Stack analysis: 2024-07-25*
