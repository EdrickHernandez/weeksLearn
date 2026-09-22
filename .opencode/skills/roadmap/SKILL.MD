---
name: roadmap
description: Roadmap de 10 semanas para construir un starter full-stack con TanStack Start, TanStack Query, Redux Toolkit, Supabase y Zod. Usar para guiar el setup de la Semana 0 (repositorio base, migraciones, CI/CD), definir el alcance de features semanales, decidir si un estado va en TanStack Query, Redux Toolkit, estado de componente o base de datos, o al escribir el PR, diagrama de arquitectura y design doc de cada semana.
license: MIT
compatibility: opencode
---
## what i do

This roadmap bridges deep UI-development experience and full-stack system design. It is organized around reusable engineering capabilities: CRUD and data modeling, security and tenancy, third-party OAuth, real-time consistency, AI, webhooks, payments, and a cohesive capstone.

The goal is to produce production-oriented portfolio artifacts every week:

1. A pull request
2. An architecture diagram
3. A short design document

Core architecture rule:

Use TanStack Query for remote/server state, Redux Toolkit slices only for complex local client/UI state, TanStack Start Server Functions for authenticated same-origin application RPC, and public server routes for external webhooks and OAuth callbacks.

STATE AND BOUNDARY RULES

State ownership:

Database records, API results, authenticated user data:
TanStack Query

Mutation status, cached lists/details, optimistic data:
TanStack Query

Modal visibility, resizable panels, local player layout, command palette:
Redux Toolkit or component state

Form fields before submission:
Component-local state or a form library

Filters/search that should be shareable or bookmarkable:
URL search parameters

Durable business state, entitlements, permissions:
PostgreSQL / Supabase

OAuth refresh tokens and payment secrets:
Server/database only

REQUEST BOUNDARIES

Browser application:

Same-origin, authenticated app actions:
TanStack Start Server Functions

Page/API reads and mutations:
TanStack Query + Server Functions/routes

OAuth provider callbacks:
Public server routes

Telegram/Mercado Pago webhook callbacks:
Public server routes

Long-running work:
Job/worker/service layer when needed

WEEK 0 — FOUNDATION SETUP

Treat this as a preparatory week if possible. It prevents every later sprint from being consumed by boilerplate.

Goal:

Create a reusable full-stack starter repository with strong defaults.

Deliverables:

* TanStack Start project with strict TypeScript enabled.
* Supabase project and local/hosted environment configuration.
* Database migration workflow.
* Shared Zod schema conventions.
* TanStack Query client defaults for retries, errors, and cache behavior.
* Redux Toolkit configured but without premature slices.
* Typed environment-variable validation.
* ESLint, Prettier, and commit hooks.
* CI pipeline for linting, typechecking, and tests.
* Preview/production deployment path.
* /docs templates for architecture, design docs, and decisions.

Suggested repository structure:

src/
features/
example-feature/
components/
queries/
mutations/
schemas.ts
service.ts
server/
auth/
db/
services/
routes/
store/
docs/
supabase/
migrations/

Done when:

* A new feature can be created without revisiting base tooling.
* Environment variables fail fast if missing.
* A deployment preview can be produced from a pull request.
* A database migration can be applied and rolled back or superseded safely.

ARTIFACT-DRIVEN SPRINT SYSTEM

Each week is a sprint. Completion means the following three artifacts are finished.

1. Pull Request — Live Coding Validation

Develop each weekly feature in a feature branch. Merge the PR only after a self-review.

PR template:

Problem:
What user or technical problem does this solve?

Scope:
What is included? What is explicitly excluded?

Implementation:
What changed and why?

Data and migrations:
What schema changes, indexes, constraints, or migrations were added?

Security:
What authorization, validation, secret, or access-control concerns apply?

Test evidence:
How was this verified?

Screenshots or recording:
Attach evidence of the main flow.

Rollback plan:
How can the change be safely reverted?

Follow-up work:
What would you do with another week?

2. Architecture Diagram — Whiteboard Validation

Use Excalidraw or draw.io. Use the same visual language every week:

* Blue: browser/UI
* Green: server functions and server routes
* Purple: external providers
* Yellow: async/background work
* Red border: trust boundary
* Dashed arrows: webhooks or asynchronous events
* Every arrow: request type, auth context, and important data

3. Design Doc — Communication Validation

Use a small document at docs/week-N-[feature].md.

Week N — Feature Name

Problem:
What user problem is addressed?

Scope:
What is included and explicitly excluded?

Architecture:
What components participate and why?

Data model:
Tables, ownership, relationships, indexes, and constraints.

Security:
Authentication, authorization, RLS, secrets, validation, and rate limits.

State ownership:
What belongs to TanStack Query, Redux Toolkit, component state, URL state, or database state?

Failure modes:
What can fail? What does the user see? How does the system recover?

Trade-offs:
What alternative did you reject, and why?

Interview answers:
Answers to the week's knowledge-check questions.

FLEXIBLE WEEKLY CADENCE

Plan for two or three work blocks each week.

BLOCK 1 — SCOPE AND BACKEND FOUNDATION

* Define the MVP in a short bulleted list.
* Write the initial design doc.
* Sketch the architecture and data model.
* Create a feature branch.
* Implement migrations and core server/service logic.
* Implement Server Functions or public server routes as appropriate.

BLOCK 2 — FRONTEND INTEGRATION

* Build React components and TanStack Query hooks.
* Add an RTK slice only if complex local UI state truly requires it.
* Handle loading, empty, error, unauthorized, and pending states.
* Add focused tests or a repeatable manual test checklist.
* Open the pull request and conduct a self-review.

BLOCK 3 — INTERVIEW CHECKPOINT

* Deploy a live URL or preview.
* Update the final architecture diagram.
* Complete answers to the knowledge-check questions.
* Record key trade-offs and technical debt.
* Merge the PR.
