# Torta Lab --- Agent Guidelines

## Project Overview

Torta Lab is a bilingual Arabic/English platform for personalized
homemade cakes.

### Business Background

The cake market often combines high prices with inconsistent quality,
excessive cream, and repetitive designs that do not reflect the occasion
or the person being celebrated.

### Objective

Make every cake personal to the customer and the occasion, combining: -
Personalized design - High-quality ingredients - Great taste - Homemade
quality - Fair pricing

**Different person. Different occasion. Different cake.**

## Architecture

``` text
Next.js Frontend
        ↓
NestJS REST API
        ↓
Supabase Auth + PostgreSQL
```

### Responsibilities

-   **Next.js:** UI, routing, forms, localization, RTL/LTR, API calls.
-   **NestJS:** business logic, authentication, authorization,
    validation, admin APIs, privileged Supabase access.
-   **Supabase:** authentication identities and PostgreSQL persistence.

Never expose privileged Supabase credentials to the frontend.

## Current Scope

Current focus: **Users and Authentication**

Preserve: - Guest browsing - Cake customization - WhatsApp ordering -
Arabic/English - RTL/LTR

Do not build until requested: - Product backend - Order backend -
Payments - Portfolio backend - Full admin dashboard - Microservices,
queues, or caching infrastructure

## Target Structure

``` text
app/
  (auth)/
    sign-in/
    sign-up/
  admin/
    login/
    users/
  customize/

lib/
  api/

backend/
  src/
    auth/
    users/
    supabase/
    config/
    common/
      guards/
      decorators/
      utils/

supabase/
  migrations/
```

Do not create empty or speculative modules just to match this structure.

## Engineering Principles

### Keep It Simple

Build for growth without building features before they are needed.
Prefer the simplest solution that is clean, secure, and maintainable.

### Naming

Use intention-revealing names. Avoid vague names, unnecessary
abbreviations, and misleading terminology.

### Functions

-   Give each function one clear responsibility.
-   Keep functions focused and readable.
-   Prefer early returns over deep nesting.
-   Extract logic only when the extracted concept has a meaningful
    responsibility.
-   Avoid boolean parameters that fundamentally change behavior.

### Comments

Explain **why**, not what the code already makes obvious. Prefer
expressive code over comments.

### DRY

Avoid duplicated knowledge, not every repeated line. Prefer small
duplication over the wrong abstraction.

### SOLID

Apply SOLID pragmatically. Use it to improve maintainability, not to
justify unnecessary layers.

### Avoid Over-Engineering

Do not introduce without a concrete requirement: - CQRS -
Microservices - Event buses - Generic CRUD frameworks - Unnecessary
repositories or interfaces - Redis - Queues - Factories with no clear
value

## Backend Rules

-   Controllers handle HTTP concerns only.
-   Services contain application/business logic.
-   DTOs define and validate request contracts.
-   Guards handle authentication and authorization.
-   Decorators handle reusable request metadata.
-   Utilities should be pure and genuinely reusable.
-   Never put substantial business or database logic in controllers.

## Frontend Rules

-   Keep components focused.
-   Extract components when reused or difficult to understand.
-   Do not componentize trivial markup unnecessarily.
-   Centralize API communication.
-   Keep Supabase implementation details out of UI code.
-   Preserve responsiveness, AR/EN, and RTL/LTR.
-   Reuse the existing design system.
-   Do not change existing UX unless required.

## TypeScript Rules

-   Keep TypeScript strict.
-   Avoid `any`.
-   Prefer explicit domain types.
-   Do not use type assertions only to silence errors.
-   Handle nullability intentionally.
-   Use unions/enums for finite domain states where appropriate.

## Security

Never: - Commit secrets or real `.env` files. - Expose
`SUPABASE_SECRET_KEY`. - Store or log plaintext passwords. - Log access
or refresh tokens. - Trust roles or authorization decisions from the
frontend. - Disable validation to bypass an error.

Authentication and authorization must be enforced server-side.

## Database Rules

-   Version schema changes through migrations.
-   Enforce critical uniqueness and integrity at database level.
-   Use foreign keys where relationships require them.
-   Add indexes for real query patterns, not hypothetical ones.
-   Use `timestamptz` consistently for timestamps.
-   Normalize identifiers consistently in application and database
    layers.
-   Require explicit approval for destructive migrations.

## Error Handling

Use predictable HTTP semantics: - `400` Invalid request - `401`
Unauthenticated - `403` Unauthorized - `404` Not found - `409`
Conflict - `500` Unexpected server error

Never expose stack traces, secrets, or infrastructure internals to
clients.

## Testing & Definition of Done

For each phase:

``` text
Implement → Lint → Build → Test → Regression Check → Review Diff → Stop
```

A task is complete when: - Requested behavior works. - Existing behavior
remains working. - No unrelated changes were made. - Validation and
error handling are appropriate. - Security boundaries are respected. -
Relevant lint/build/tests pass. - Git diff contains no secrets.

Do not automatically start the next phase.

## Git Rules

-   Never commit secrets or real environment files.
-   Never force-push unless explicitly requested.
-   Never delete or revert unrelated work.
-   Keep commits focused and reviewable.
-   Prefer one implementation phase per commit.

## Agent Rules

### Before Coding

1.  Read this file.
2.  Inspect only files relevant to the task.
3.  Check existing implementations before creating new ones.
4.  Preserve the established architecture.

### While Coding

-   Implement only the requested scope.
-   Reuse existing code before adding abstractions.
-   Do not refactor unrelated code.
-   Do not create speculative features.
-   Do not add dependencies unless necessary.
-   Prefer framework capabilities over extra packages.

### Token Efficiency

Use the shortest reliable workflow:

**Inspect relevant files → Implement → Test → Concise report**

Avoid: - Re-reading the whole repository. - Repeating requirements. -
Long implementation explanations. - Unrequested documentation. -
Unrelated refactors. - Re-running successful checks without reason.

Final reports should contain only: - Files created/modified - Tests
performed - Important decisions - Manual steps - Remaining issues

## Instruction Priority

1.  Follow the user's current explicit request.
2.  Follow this file.
3.  Preserve the established architecture.
4.  Prefer the simplest clean solution.

If a request conflicts with security, data integrity, or the established
architecture, explain the conflict before implementation. Never silently
change the architecture.
