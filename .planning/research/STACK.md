# Technology Stack

**Project:** LLM Router Dynamic Configuration
**Researched:** 2024-10-27

## Recommended Stack

The recommended stack for configuration management is a composable approach, prioritizing type-safety, maintainability, and modern best practices. It combines best-in-class libraries for parsing, environment variable management, and validation.

### Core Configuration Libraries
| Library | Version | Purpose | Why | Confidence |
|---|---|---|---|---|
| `zod` | `~3.23.0` | Schema validation and type inference | **The modern standard for type-safe validation in TypeScript.** It allows defining a single schema that serves as the runtime validator and the source for a static TypeScript type (`z.infer`), eliminating duplication and preventing type/validation drift. | HIGH |
| `yaml` | `~2.4.0` | Parsing YAML configuration files | A modern, actively maintained YAML parser with full YAML 1.2 support. It robustly handles complex data structures and, unlike other parsers, can preserve comments, which is useful for annotating configuration files. | HIGH |
| `dotenv` | `~16.4.0` | Loading environment variables | The de-facto industry standard for loading secrets and environment-specific variables from `.env` files. It's simple, has zero dependencies, and is universally understood. | HIGH |

## Implementation Strategy

This approach uses a layered and validated method to build the application's configuration object.

1.  **Define a Zod Schema**: Create a `schema.ts` file that exports a Zod object schema. This is the single source of truth for your configuration's shape and types.
2.  **Load Configuration Sources**:
    - In a `config.ts` file, use `dotenv` to load `.env` variables into `process.env`.
    - Use `fs.readFileSync` and the `yaml` library to parse your `config.yaml`.
3.  **Merge and Validate**: Merge the loaded YAML object with environment variables. A simple helper function can be used to override YAML values with environment variables if they exist (e.g., `process.env.DB_PORT` overrides `database.port`).
4.  **Parse and Export**: Pass the final merged object to your Zod schema's `.parse()` method. This will throw a detailed error on mismatch, causing a fast-fail on application startup.
5.  **Export Typed Config**: The return value of `.parse()` is a fully-typed configuration object. Export this for use throughout your application to get full IntelliSense and type-checking.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|---|---|---|---|
| **Validation** | `zod` | `joi` | `joi` is a mature and powerful library, but it is "JavaScript-first." Achieving type safety in TypeScript requires extra tools (e.g., `joi-to-typescript`) or manual type definition, creating two sources of truth. Zod's `z.infer` feature makes it a superior choice for modern TypeScript projects. |
| **YAML Parsing** | `yaml` | `js-yaml` | `js-yaml` is extremely popular and a perfectly valid choice. However, the `yaml` library is more modern, more actively maintained (as of late 2024), and has better support for the complete YAML specification, including comment preservation. For a new project, starting with the more modern tool is a slight advantage. |
| **Integrated Libraries** | (Composable) | `convict`, `config` | These libraries attempt to provide an all-in-one solution for configuration. While useful, they are often less flexible than a composable stack and may have less powerful or less ergonomic TypeScript/validation support compared to a dedicated library like Zod. The composable approach ensures you are using the best tool for each specific job. |

## Installation

```bash
# Core dependencies for configuration
npm install zod yaml dotenv

# Types for yaml if needed, though yaml has good built-in types
# No types needed for zod or dotenv
```

## Sources

- **Zod vs. Joi:** Multiple sources confirm Zod's superiority for TypeScript projects due to its type-inference capabilities. [BetterStack](https://betterstack.com/community/guides/code-infrastructure/joi-vs-zod/), [LogRocket](https://blog.logrocket.com/deep-dive-into-zod-for-real-world-validation/).
- **YAML Parsers:** `npm-compare` and `npmjs.com` show `yaml` (`eemeli/yaml`) as a modern, actively maintained alternative to `js-yaml`. [npm](https://www.npmjs.com/package/yaml).
- **Dotenv:** Official documentation and community consensus confirm its status as the standard for `.env` file management. [dotenv.org](https://dotenv.org).
- **Node.js `--env-file`:** While Node.js >= 20.6.0 has native support, it is still experimental and lacks features found in the `dotenv` library, making `dotenv` the more robust choice for now.
