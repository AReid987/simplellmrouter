# Architecture

**Analysis Date:** 2024-07-16

## Pattern Overview

**Overall:** 3-Layer (Tier) Architecture

**Key Characteristics:**
- **Modular Design:** The application is cleanly separated into three distinct layers: Presentation/Execution (`server.ts`), Business Logic (`router.ts`), and Data/Configuration (`providers.ts`).
- **Strategy Pattern:** The core routing logic in `router.ts` implements a "Quota Preservation Strategy" to select the optimal LLM provider, making the routing decision process swappable.
- **Environment-driven Configuration:** The available providers are not hardcoded but are dynamically loaded at runtime based on the presence of specific environment variables (e.g., `MISTRAL_API_KEY`), allowing for flexible deployment.

## Layers

**1. Presentation/Execution Layer:**
- **Purpose:** Handles incoming network requests, orchestrates the routing and execution flow, and streams responses back to the client.
- **Location:** `src/server.ts`
- **Contains:** Native Node.js HTTP server, request/response handling, error handling, and fallback logic execution.
- **Depends on:** `router.ts` (for decision-making) and `providers.ts` (for model details).
- **Used by:** The `src/cli.ts` entry point to start the application.

**2. Business Logic (Router) Layer:**
- **Purpose:** Contains the core intelligence of the application. It decides which LLM provider and model to use for a given request.
- **Location:** `src/router.ts`
- **Contains:** Request classification logic (based on a 14-dimension scoring system), the "Quota Preservation Strategy" for model selection, and fallback chain generation.
- **Depends on:** `providers.ts` (for model capabilities and quota data).
- **Used by:** The `server.ts` layer to get a routing decision.

**3. Data (Provider) Layer:**
- **Purpose:** Acts as a static and dynamic database for all supported LLM providers and their models.
- **Location:** `src/providers.ts`
- **Contains:** A hardcoded list of provider definitions (`PROVIDER_DEFINITIONS`) with detailed metadata on models, including their capabilities, context windows, and relative free tier quota sizes. It also contains the logic to load and enable only those providers for which an API key is present in the environment.
- **Depends on:** Node.js `process.env` for configuration.
- **Used by:** All other layers to get information about available models.

## Data Flow

**Standard Chat Completion Request:**

1.  The `simplellmrouter start` command executes `src/cli.ts`, which in turn calls `startServer()` in `src/server.ts`.
2.  An external client (e.g., OpenClaw) sends a POST request to the `/v1/chat/completions` endpoint on the running server.
3.  The `server.ts` layer receives the request, parses the body, and extracts the user prompt.
4.  `server.ts` calls `router.ts:classifyRequest` to analyze the prompt and assign it a complexity tier ('SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING').
5.  `server.ts` then calls `router.ts:routeRequest`, passing in the classification. `routeRequest` uses the "Quota Preservation Strategy" to select the best model, prioritizing those with the largest free quotas. It returns a `RoutingDecision` object containing the chosen model and a fallback chain.
6.  `server.ts` receives the decision and enters a loop to try the selected model and its fallbacks.
7.  For the primary model, `server.ts` uses the built-in `fetch` API to make a request to the external LLM provider's endpoint (e.g., `https://api.mistral.ai/v1/chat/completions`).
8.  If the request is successful, `server.ts` streams the response directly back to the original client.
9.  If the request fails (e.g., due to a rate limit or server error), `server.ts` consults the fallback chain from the `RoutingDecision` and repeats the `fetch` call with the next model in the chain.
10. If all models in the chain fail, a final error is returned to the client.

## Key Abstractions

**`RoutingDecision`:**
- **Purpose:** A central data structure that represents the output of the routing logic. It decouples the decision-making from the execution.
- **Examples:** `src/router.ts`
- **Pattern:** A simple data object (DTO) that carries the selected model, the reason for the choice, and a pre-calculated fallback chain.

**`Provider`:**
- **Purpose:** Represents a configured and available LLM provider, including its models and API key.
- **Examples:** `src/providers.ts`
- **Pattern:** A data structure hydrated at runtime by combining static definitions (`PROVIDER_DEFINITIONS`) with dynamic configuration (`process.env`).

## Entry Points

**CLI Entry Point:**
- **Location:** `src/cli.ts`
- **Triggers:** Executing `simplellmrouter` in the shell.
- **Responsibilities:** Parsing command-line arguments (`start`, `help`), and initializing and starting the HTTP server via `src/server.ts`.

**Server Entry Point:**
- **Location:** `src/server.ts`
- **Triggers:** A `startServer()` call from `src/cli.ts`.
- **Responsibilities:** Binding to a port, listening for HTTP requests, and dispatching them to the correct handlers (`/v1/chat/completions`, `/v1/models`, `/health`).

## Error Handling

**Strategy:** A combination of retries with fallbacks and graceful degradation.

**Patterns:**
- **Provider Errors:** In `src/server.ts`, errors from `fetch` calls are caught. A helper function `isProviderError` inspects the HTTP status code and body to determine if the error is transient (e.g., 500, 429 rate limit). If it is, the server automatically tries the next model in the fallback chain.
- **Rate Limiting:** A `RateLimitTracker` class in `src/router.ts` is used to temporarily disqualify models that have returned a 429 error, preventing repeated calls to an unavailable service.
- **Fatal Errors:** If all models in the fallback chain fail, or if a non-transient error occurs, a final HTTP error (e.g., 502 Bad Gateway) is sent to the client with a descriptive message.

## Cross-Cutting Concerns

**Logging:** Basic `console.log`, `console.warn`, and `console.error` are used throughout the application to provide visibility into routing decisions, provider loading, and errors.
**Validation:** Basic validation is present, such as checking for an empty provider list at startup or ensuring a request body is valid JSON.
**Authentication:** The server itself does not require authentication from the client. It authenticates with the downstream LLM providers by reading API keys from environment variables and passing them as Bearer tokens in the `Authorization` header.

---

*Architecture analysis: 2024-07-16*
