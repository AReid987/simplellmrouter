# Coding Conventions

**Analysis Date:** 2024-07-28

## Naming Patterns

**Files:**
- TypeScript files use `kebab-case`.
- Example: `src/quota-tracker.ts`

**Functions:**
- Functions use `camelCase`.
- Example: `classifyRequest`, `routeRequest` from `src/router.ts`

**Variables:**
- Variables use `camelCase`.
- Example: `const conversationLength = messages.length;` in `src/router.ts`
- Constants exported at the module level use `UPPER_SNAKE_CASE`.
- Example: `export const DEFAULT_ROUTER_CONFIG: RouterConfig = { ... };` in `src/router.ts`

**Types:**
- Type aliases and interfaces use `PascalCase`.
- Example: `export interface RoutingDecision { ... }` in `src/router.ts`
- Classes use `PascalCase`.
- Example: `export class RateLimitTracker { ... }` in `src/router.ts`

## Code Style

**Formatting:**
- **Tool:** Not detected. No Prettier or other formatter configuration found.
- **Key settings (inferred):**
  - Indentation: 2 spaces.
  - Semicolons: Used at the end of statements.
  - Braces: Opening braces are on the same line as the statement (`if (condition) {`).

**Linting:**
- **Tool:** Not detected. No ESLint or other linter configuration found.
- **Key rules:** No enforced rules. Conventions are followed by discipline.

## Import Organization

**Order:**
- No specific ordering is enforced by tooling.
- Imports are grouped at the top of the file.
- Example from `src/router.ts`:
  ```typescript
  import type { Provider, ModelConfig } from './providers.js';
  ```

**Path Aliases:**
- Path aliases (e.g., `@/components`) are not used. All imports are relative.
- Example: `from './providers.js'`

**Module Specifiers:**
- Imports include the `.js` extension, which is required for native ESM support in Node.js.
- Example: `import type { Provider, ModelConfig } from './providers.js';`

## Error Handling

**Patterns:**
- For synchronous, unrecoverable errors, functions throw a `new Error()`.
  ```typescript
  // From src/router.ts
  if (availableModels.length === 0) {
    throw new Error('No models available (all rate-limited). Wait before retrying.');
  }
  ```
- For warnings or recoverable issues, `console.warn` is used.
  ```typescript
  // From src/router.ts
  if (tierCompatible.length === 0) {
    // Fallback to any available model if no tier match
    console.warn(`⚠️  No models match tier ${tier}, using any available model`);
  }
  ```

## Logging

**Framework:** `console`
- The native `console` object (`console.log`, `console.warn`) is used for all logging. No external logging library is present.

**Patterns:**
- Logging is used to indicate important state changes or warnings.
- Example from `src/router.ts`:
  ```typescript
  console.log(`⚠️  Rate limited: ${modelId} (cooldown: ${this.cooldownMs / 1000}s)`);
  ```
- A dedicated formatting function exists for logging routing decisions.
  - `formatRoutingDecision` in `src/router.ts`

## Comments

**When to Comment:**
- Comments are used to explain complex logic, the purpose of a file, or the reasoning behind a piece of code.

**JSDoc/TSDoc:**
- JSDoc-style block comments (`/** ... */`) are used extensively to document classes, functions, interfaces, and type aliases.
- Example from `src/router.ts`:
  ```typescript
  /**
   * Classify request into tier using 14-dimension scoring
   * Based on ClawRouter's proven classification system
   */
  export function classifyRequest(messages: Array<{ role: string; content: string }>): RequestClassification {
    // ...
  }
  ```

## Function Design

**Size:**
- Functions are generally small and focused on a single responsibility (e.g., `getNextFallback`, `estimateQuotaUsage`).
- The `classifyRequest` function is larger but contains a cohesive scoring algorithm.

**Parameters:**
- Function parameters are fully typed using TypeScript.
- Configuration objects are used for functions with multiple options (e.g., `routeRequest` takes a `config: RouterConfig`).

**Return Values:**
- Return values are fully typed.
- Functions are mostly pure, returning new data structures rather than modifying inputs. The `RateLimitTracker` class is an exception, as it manages state.

## Module Design

**Exports:**
- The `export` keyword is used to expose functions, types, constants, and classes.
- There is no `export default`. All exports are named.

**Barrel Files:**
- Barrel files (e.g., `index.ts` re-exporting other modules) are not used.

---
*Convention analysis: 2024-07-28*
