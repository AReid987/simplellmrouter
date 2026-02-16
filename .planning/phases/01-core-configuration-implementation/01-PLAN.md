---
wave: 1
autonomous: true
gap_closure: false
---

# Plan 01-1: Foundation Setup

**Phase:** 1 - Core Configuration Implementation
**Plan:** 01-1
**Wave:** 1
**Estimated:** 30 minutes

## Objective

Install dependencies, configure security settings (.gitignore), and create example environment files. Establishes the foundation for the configuration system.

## Must Haves

- ✅ Zod, YAML, and dotenv packages installed
- ✅ .gitignore configured to exclude sensitive files
- ✅ .env.example template created with all provider keys
- ✅ package.json updated with new dependencies

## Context

### Parallel Work Awareness

The Conductor team (Gemini CLI) is simultaneously implementing a logging system. This wave creates only NEW files with no conflicts.

### Locked Implementation Decisions

From CONTEXT.md:
- Secrets: Env vars only, never in config files
- File Location: config/ directory in project root

## Tasks

### Task 1: Install Dependencies

**Priority:** P0 (Blocking)
**Estimated:** 5 minutes
**Dependencies:** None

**Actions:**
```bash
pnpm add zod yaml dotenv
pnpm add -D @types/yaml
```

**Commit:** `feat(01-1): install zod yaml dotenv dependencies`

**Verification:**
- [ ] package.json contains zod, yaml, dotenv
- [ ] pnpm list zod yaml dotenv succeeds

---

### Task 2: Security Setup (.gitignore)

**Priority:** P0 (Blocking)
**Estimated:** 2 minutes
**Dependencies:** None

**Actions:**
1. Create .gitignore if it doesn't exist
2. Add these patterns:
   ```
   # Environment variables with secrets
   .env
   .env.local
   .env.*.local

   # Config files with sensitive data
   config/production.yaml
   config/*.production.yaml

   # But keep example files
   !.env.example
   !config/*.example.yaml
   ```

**Commit:** `chore(01-1): configure gitignore for secrets`

**Verification:**
- [ ] .gitignore exists with above patterns
- [ ] git check-ignore .env returns .env

---

### Task 3: Create Example Environment File

**Priority:** P0 (Blocking)
**Estimated:** 5 minutes
**Dependencies:** Task 2

**File:** `.env.example`

**Content:**
```bash
# Provider API Keys
# Get keys from: https://docs.example.com/keys
MISTRAL_API_KEY=your_mistral_key_here
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
CEREBRAS_API_KEY=your_cerebras_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
VOIDAI_API_KEY=your_voidai_key_here
ZAI_API_KEY=your_zai_key_here
KIMI_API_KEY=your_kimi_key_here

# Server Configuration
PORT=8402
NODE_ENV=development
```

**Commit:** `docs(01-1): create env.example template`

**Verification:**
- [ ] .env.example exists with all providers listed
- [ ] File is tracked by git (git ls-files shows it)

## Success Criteria

- [ ] All dependencies installed and listed in package.json
- [ ] .gitignore properly excludes .env and production configs
- [ ] .env.example provides template for all 9 providers
- [ ] Each task committed individually with proper format
- [ ] No conflicts with Conductor team's work (only creates new files)
