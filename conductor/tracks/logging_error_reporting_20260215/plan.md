# Plan: Implement a robust logging and error reporting system for LLM routing decisions and failures.

This plan outlines the steps to implement a comprehensive logging and error reporting system for the SimpleLLMRouter. Each task adheres to a Test-Driven Development (TDD) approach, focusing on writing tests before implementation and ensuring high code coverage.

## Phase 1: Logging Infrastructure Setup

### Tasks:

*   [ ] Task: Setup logging framework and configuration
    *   [x] Task: Write Failing Tests: Define tests for logger initialization and basic log emission.
    *   [x] Task: Implement to Pass Tests: Integrate a logging library (e.g., Winston, Pino) and configure basic logging levels.
    *   [x] Task: Verify Coverage: Ensure new logging setup is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Conductor - User Manual Verification 'Logging Infrastructure Setup' (Protocol in workflow.md)

## Phase 2: Routing Decision Logging

### Tasks:

*   [ ] Task: Log incoming request details with correlation ID
    *   [ ] Task: Write Failing Tests: Define tests to verify logging of request ID and prompt content.
    *   [ ] Task: Implement to Pass Tests: Modify server.ts to generate and log a unique correlation ID for each incoming request and relevant prompt data (sanitized).
    *   [ ] Task: Verify Coverage: Ensure new logging is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Log classification tier and confidence score
    *   [ ] Task: Write Failing Tests: Define tests to verify logging of classification details from router.ts.
    *   [ ] Task: Implement to Pass Tests: Update router.ts to log the classified tier and confidence score for each request.
    *   [ ] Task: Verify Coverage: Ensure new logging is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Log selected model and fallback details
    *   [ ] Task: Write Failing Tests: Define tests to verify logging of model selection and fallback events.
    *   [ ] Task: Implement to Pass Tests: Enhance router.ts to log the initial selected model, reasons for selection, and any fallback models used.
    *   [ ] Task: Verify Coverage: Ensure new logging is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Conductor - User Manual Verification 'Routing Decision Logging' (Protocol in workflow.md)

## Phase 3: Quota and Rate Limit Logging

### Tasks:

*   [ ] Task: Log quota usage before and after LLM calls
    *   [ ] Task: Write Failing Tests: Define tests for accurate logging of quota status changes.
    *   [ ] Task: Implement to Pass Tests: Modify quota-tracker.ts and router.ts to log quota before and after each LLM API call.
    *   [ ] Task: Verify Coverage: Ensure new logging is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Log quota warnings and critical alerts
    *   [ ] Task: Write Failing Tests: Define tests to trigger and verify logging of quota alerts.
    *   [ ] Task: Implement to Pass Tests: Update quota-tracker.ts to log warnings (80%) and critical alerts (95%).
    *   [ ] Task: Verify Coverage: Ensure new logging is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Log rate limit events and cooldowns
    *   [ ] Task: Write Failing Tests: Define tests to simulate rate limits and verify logging of these events.
    *   [ ] Task: Implement to Pass Tests: Modify router.ts to log rate limit events, including model, cooldown, and fallback actions.
    *   [ ] Task: Verify Coverage: Ensure new logging is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Conductor - User Manual Verification 'Quota and Rate Limit Logging' (Protocol in workflow.md)

## Phase 4: Error Interception and Reporting

### Tasks:

*   [ ] Task: Intercept and log LLM API errors
    *   [ ] Task: Write Failing Tests: Define tests for capturing and logging various LLM API error types.
    *   [ ] Task: Implement to Pass Tests: Implement error interception within the LLM API call wrapper to capture exceptions, status codes, and error messages.
    *   [ ] Task: Verify Coverage: Ensure new error handling is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Integrate external error reporting service (optional, e.g., Sentry)
    *   [ ] Task: Write Failing Tests: Define tests for sending mock error reports to an external service.
    *   [ ] Task: Implement to Pass Tests: Implement a configurable integration for an external error reporting service, focusing on critical errors.
    *   [ ] Task: Verify Coverage: Ensure new error reporting is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Conductor - User Manual Verification 'Error Interception and Reporting' (Protocol in workflow.md)

## Phase 5: Performance Metrics Collection

### Tasks:

*   [ ] Task: Collect and log LLM API call latency
    *   [ ] Task: Write Failing Tests: Define tests for accurately measuring and logging API call durations.
    *   [ ] Task: Implement to Pass Tests: Implement timing mechanisms around LLM API calls to record latency.
    *   [ ] Task: Verify Coverage: Ensure new metric collection is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Collect and log token usage per LLM call
    *   [ ] Task: Write Failing Tests: Define tests for extracting and logging token usage from LLM responses.
    *   [ ] Task: Implement to Pass Tests: Parse LLM responses to extract and log input/output token counts.
    *   [ ] Task: Verify Coverage: Ensure new metric collection is covered by tests.
    *   [ ] Task: Commit Code Changes
    *   [ ] Task: Attach Task Summary with Git Notes
    *   [ ] Task: Get and Record Task Commit SHA
    *   [ ] Task: Commit Plan Update
*   [ ] Task: Conductor - User Manual Verification 'Performance Metrics Collection' (Protocol in workflow.md)
