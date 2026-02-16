# Product Guide: SimpleLLMRouter

## Initial Concept
Intelligent LLM routing for OpenClaw - Free tier quota-optimized routing that automatically selects the best model while preserving your limited quotas.

## Target Users
The SimpleLLMRouter is primarily designed for:
*   **Developers building LLM-powered applications:** Providing tools and infrastructure to easily integrate and manage LLMs within their applications.
*   **Companies with limited budgets for AI models:** Offering a cost-effective solution by optimizing the use of free-tier LLM quotas.
*   **OpenClaw users seeking cost-effective LLM routing:** Seamlessly integrating with OpenClaw to provide intelligent and budget-friendly routing of LLM requests.

## Primary Goals and Benefits
The SimpleLLMRouter aims to achieve the following for its users:
*   **Optimize LLM costs and maximize free-tier usage:** Through smart routing and quota preservation strategies, users can significantly reduce their expenses on LLM API calls.
*   **Improve LLM response reliability and latency:** By intelligently selecting models and implementing auto-fallback mechanisms, the router ensures consistent and timely responses, even when certain providers face issues.
*   **Simplify LLM integration and management for developers:** Providing an OpenAI-compatible interface and abstracting away the complexities of multi-provider management, making it easier for developers to build and deploy LLM applications.

## Core Features
The key features that enable these benefits include:
*   **Intelligent LLM routing based on request complexity and model quotas:** The router analyzes incoming requests across 14 dimensions (e.g., prompt length, code presence, reasoning keywords) to classify them into tiers (SIMPLE, MEDIUM, COMPLEX, REASONING). It then selects the most appropriate LLM model based on this classification and available quotas.
*   **Real-time quota tracking and usage monitoring:** The system continuously monitors and displays quota usage for each configured provider, offering transparency and control over LLM consumption.
*   **Automatic fallback and rate limit awareness for increased reliability:** In case of rate limits or model failures, the router automatically falls back to the next best available model, ensuring uninterrupted service. It also tracks and avoids rate-limited providers with a cooldown period.

## Unique Value Proposition
The SimpleLLMRouter distinguishes itself through:
*   **A payment-free alternative optimized for free-tier LLM usage:** Unlike solutions that involve complex payment layers, SimpleLLMRouter focuses solely on maximizing the utility of free-tier models, making it an ideal choice for budget-conscious users.
*   **Enhanced usage monitoring and alert systems:** The router provides proactive warnings at 80% and 95% quota usage, allowing users to anticipate and manage their consumption effectively.
*   **Simplified setup and configuration compared to alternatives:** With its straightforward `.env` file configuration and OpenAI-compatible interface, it significantly reduces the overhead associated with setting up and managing multiple LLM providers.
