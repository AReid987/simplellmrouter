# External Integrations

**Analysis Date:** 2024-07-25

## APIs & External Services

The application acts as a proxy and load balancer for various Large Language Model (LLM) providers. It communicates with them via direct REST API calls using the global `fetch` API. No third-party SDKs are used.

**LLM Providers:**
- **Mistral** - Used for general-purpose AI tasks.
  - Endpoint: `https://api.mistral.ai/v1`
  - Auth: `MISTRAL_API_KEY` environment variable.
  - Implementation: `src/providers.ts`

- **Groq** - Used for high-speed AI tasks.
  - Endpoint: `https://api.groq.com/openai/v1`
  - Auth: `GROQ_API_KEY` environment variable.
  - Implementation: `src/providers.ts`

- **Google Gemini** - Used for multimodal and large-context tasks.
  - Endpoint: `https://generativelanguage.googleapis.com/v1beta`
  - Auth: `GEMINI_API_KEY` environment variable.
  - Implementation: `src/providers.ts`

- **Cerebras** - Used as a fallback LLM provider.
  - Endpoint: `https://api.cerebras.ai/v1`
  - Auth: `CEREBRAS_API_KEY` environment variable.
  - Implementation: `src/providers.ts`

- **OpenRouter** - Used as a meta-provider for accessing various free-tier models.
  - Endpoint: `https://openrouter.ai/api/v1`
  - Auth: `OPENROUTER_API_KEY` environment variable.
  - Implementation: `src/providers.ts`

- **VoidAI** - Used as a lower-tier fallback.
  - Endpoint: `https://api.voidai.com/v1`
  - Auth: `VOIDAI_API_KEY` environment variable.
  - Implementation: `src/providers.ts`

- **Kimi (Moonshot AI)** - Used for specialized coding tasks.
  - Endpoint: `https://api.moonshot.cn/v1`
  - Auth: `KIMI_API_KEY` environment variable.
  - Implementation: `src/providers.ts`

- **z.ai** - Used for specialized coding tasks.
  - Endpoint: `https://api.z.ai/v1` (Note: URL may be a placeholder)
  - Auth: `ZAI_API_KEY` environment variable.
  - Implementation: `src/providers.ts`

## Data Storage

**Databases:**
- None detected. The application is stateless regarding persistent data.

**File Storage:**
- Local filesystem only. The application does not seem to read or write user data to disk, other than logging to standard output.

**Caching:**
- In-memory only. The `RateLimitTracker` class in `src/router.ts` holds rate-limiting status in memory. This state is ephemeral and lost on restart.

## Authentication & Identity

**Auth Provider:**
- Custom / None. The server itself does not implement user authentication. It is designed to be run in a trusted environment. It accepts requests without an incoming `Authorization` header.

**Outgoing Authentication:**
- The application authenticates with external LLM providers using API keys passed as Bearer Tokens in the `Authorization` header. These keys are loaded from environment variables.

## Monitoring & Observability

**Error Tracking:**
- None. Errors are logged to `console.error`.

**Logs:**
- Logging is done via `console.log` and `console.error` directly within the source code (e.g., in `src/server.ts` and `src/router.ts`).

## CI/CD & Deployment

**Hosting:**
- Not specified. The application is a standard Node.js process that can be run anywhere Node.js is installed.

**CI Pipeline:**
- None detected. There are no GitHub Actions, CircleCI, or other CI configuration files in the repository.

## Environment Configuration

**Required env vars:**
- At least one provider API key is required to run the application.
- `MISTRAL_API_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `CEREBRAS_API_KEY`
- `OPENROUTER_API_KEY`
- `VOIDAI_API_KEY`
- `KIMI_API_KEY`
- `ZAI_API_KEY`

**Secrets location:**
- Secrets (API keys) are expected to be present as environment variables in the shell where the application is run.

---

*Integration audit: 2024-07-25*
