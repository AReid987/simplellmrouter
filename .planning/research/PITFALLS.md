# Domain Pitfalls

**Domain:** Externalizing Configuration in Node.js/TypeScript
**Researched:** 2024-05-22
**Project:** SimpleLLMRouter: Configuration Refactor

## Critical Pitfalls

### Pitfall 1: Leaking Secrets in Version Control
**What goes wrong:** Sensitive information like API keys, database credentials, or other secrets are accidentally committed to the Git repository.
**Why it happens:** Developers store secrets in `.env` files or other configuration files and forget to add them to `.gitignore`. It can also happen when secrets are hardcoded directly into a source file for "temporary" testing.
**Consequences:** Secrets are exposed to anyone with access to the repository, potentially leading to unauthorized access to services, data breaches, and significant financial and reputational damage. Once in Git history, they are difficult to fully purge.
**Prevention:**
-   **Immediate:** Add `.env`, `*.env.*`, `config.local.json`, and any other environment-specific or secret-containing files to `.gitignore` **before** creating the files.
-   **Best Practice:** Use a `.env.example` file that is checked into version control. This file should contain all the necessary environment variables with placeholder or non-sensitive default values.
-   **Secret Management:** For production, use a dedicated secret management service like AWS Secrets Manager, HashiCorp Vault, or Google Cloud Secret Manager. The application should fetch secrets at startup. For this project, environment variables are the stated approach, which is acceptable if managed correctly.
**Detection:**
-   **Code Review:** During code reviews, specifically look for changes to `.gitignore` and any new files that might contain secrets.
-   **Static Analysis:** Use pre-commit hooks (e.g., with `talisman` or `gitleaks`) to scan for secrets before they are committed.
-   **GitHub Scans:** Enable secret scanning in the GitHub repository settings.

### Pitfall 2: Missing or Weak Configuration Validation
**What goes wrong:** The application starts with an incomplete or malformed configuration, only to crash or misbehave during runtime when a missing value is accessed.
**Why it happens:** The application code implicitly trusts that the configuration file (e.g., `providers.yaml`) or environment variables are correct. There is no strict validation schema or check at application startup.
**Consequences:**
-   Runtime errors (e.g., `TypeError: Cannot read properties of undefined`) in seemingly unrelated parts of the application.
-   Unpredictable application behavior (e.g., routing all traffic to a default provider because specific provider configs failed to load).
-   Difficult debugging, as the root cause is a configuration issue, not a logic bug.
**Prevention:**
-   **Schema-based Validation:** Use a library like **Zod** or **Joi** to define a strict schema for the configuration.
-   **Fail-Fast:** The application should parse and validate the entire configuration at startup. If validation fails, the application should immediately exit with a clear error message indicating what is wrong with the configuration. This prevents the system from running in a broken state.
-   **Example using Zod:**
    ```typescript
    // src/config/schema.ts
    import { z } from 'zod';

    export const providerSchema = z.object({
      id: z.string(),
      apiKey: z.string(),
      models: z.array(z.string()),
      // ... other provider properties
    });

    export const configSchema = z.object({
      providers: z.array(providerSchema),
    });

    // In the main application entry point:
    // const unsafeConfig = loadConfigFromFile('providers.yaml');
    // const safeConfig = configSchema.parse(unsafeConfig);
    // use safeConfig throughout the app
    ```
**Detection:**
-   The application crashing on startup with a validation error is the *desired* outcome.
-   Warning signs of a lack of validation: defensive coding and optional chaining (`?.`) everywhere in the code when accessing configuration properties.

## Moderate Pitfalls

### Pitfall 3: Loss of Type Safety
**What goes wrong:** The configuration object loaded from a YAML/JSON file is treated as `any` or a weak `Record<string, any>`, effectively disabling TypeScript's static analysis for all configuration-related code.
**Why it happens:** Loading external files at runtime is an IO operation that TypeScript cannot statically analyze. Developers often take the easy path of casting the result to `any` instead of properly parsing and validating it into a typed object.
**Consequences:**
-   No IntelliSense/autocomplete for configuration properties.
-   Typographical errors in property names are not caught at compile time (e.g., `config.provider.defualtModel` instead of `config.provider.defaultModel`).
-   Refactoring becomes risky and error-prone.
**Prevention:**
-   **Single Source of Truth for Types:** Use a validation schema (like Zod) to both validate the runtime data and infer a static TypeScript type. This ensures the type and the validation rules never drift apart.
    ```typescript
    // src/config/types.ts
    import { z } from 'zod';
    import { configSchema } from './schema';

    export type AppConfig = z.infer<typeof configSchema>;
    ```
-   **Avoid `as`:** Do not use type assertions like `as AppConfig`. Let the validation library's `parse` method return the correctly typed object.
**Detection:**
-   The presence of `any`, `Object`, or `Record<string, any>` for configuration objects.
-   Usage of `as` keyword when casting loaded configuration.
-   Lack of a `z.infer<...>` or equivalent type inference from a schema.

## Minor Pitfalls

### Pitfall 4: Scattered and Inconsistent Configuration Access
**What goes wrong:** Configuration values are accessed directly from `process.env` or from the file-reading utility in multiple places throughout the codebase.
**Why it happens:** There is no centralized module or service responsible for providing configuration. Each part of the application fetches what it needs independently.
**Consequences:**
-   Difficult to get a holistic view of all configuration dependencies.
-   Violates the DRY (Don't Repeat Yourself) principle.
-   Makes it hard to change configuration sources in the future (e.g., moving from a file to a database or a config service).
**Prevention:**
-   **Centralized Config Module:** Create a singleton or injectable service that is the single source of truth for all configuration. This module is responsible for loading, validating, and providing the typed configuration object to the rest of the application.
    ```typescript
    // src/config/index.ts
    import { AppConfig, configSchema } from './schema';
    // ... logic to load YAML/JSON file ...

    class ConfigService {
      private static instance: ConfigService;
      public readonly config: AppConfig;

      private constructor() {
        const unsafeConfig = this.loadFromFile('providers.yaml');
        this.config = configSchema.parse(unsafeConfig);
      }

      public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
          ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
      }
    }

    export const configService = ConfigService.getInstance();
    ```
**Detection:**
-   Seeing `process.env` used outside of a dedicated configuration setup file.
-   Multiple calls to `fs.readFileSync` or `yaml.parse` for configuration files.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Implementation** | Leaking Secrets in Version Control | Add `.env` and other secret files to `.gitignore` **before** any code is written. Implement a pre-commit hook to scan for secrets. |
| **Implementation** | Missing or Weak Configuration Validation | The first step of implementation should be to define the Zod schema. All configuration loading logic must use this schema to parse the data. |
| **Implementation** | Loss of Type Safety | Use `z.infer<...>` to create the `AppConfig` type from the Zod schema. Ensure this type is used throughout the application and that no `any` types are used for config objects. |
| **Testing** | Inconsistent Environments | Ensure the test suite can run with a mock or test-specific configuration file. This decouples tests from developer-specific `.env` files. |

## Sources

- [arunangshudas.com - Best Practices for Handling Environment Variables in Node.js](https://arunangshudas.com/best-practices-for-handling-environment-variables-in-nodejs/)
- [vertexaisearch.cloud.google.com - Grounding API Redirect](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGmQUCLS6I4Dg49xrBwJcmFlGcqb-cWo475rbL86hXHiTODVO7PiZbOfe4YbfadKCStbA34M-mRAM6kXqugfOe4Hgbv2YDHkcTJUDPI1v6-uf3Qa9rPmKWngxz2hk5JIX-liMC7hD07FHn86FjH0HxBItXIQxete1MztBUnSYGyQjS-9_bjss-Hwj1U0f4pJjAggoejs2cAA0qnCA==) (General best practices)
- Community wisdom and experience with Node.js/TypeScript projects.
