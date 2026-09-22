---
name: week-1-dashboard
description: Guide for building the Personal Dashboard for Week 1 of the full-stack roadmap. Use when implementing full CRUD with TanStack Start Server Functions, TanStack Query, Supabase/PostgreSQL and Zod validation, when designing the normalized relational schema, or when reviewing the Week 1 definition of done.
license: MIT
compatibility: opencode
---

Week 1 — Personal Dashboard

Objective
Build a complete CRUD application using TanStack Start Server Functions, TanStack Query,
Supabase, strict validation, and a normalized relational schema.

Product options
Choose a small, personally useful domain:

Projects and tasks dashboard

Reading and listening queue

Home server maintenance tracker

Freelance leads tracker

Personal learning tracker

MVP scope
The authenticated user can create, read, update, and delete records.

Data is persisted in PostgreSQL.

Inputs are validated at the server boundary.

The UI has loading, empty, error, and pending-mutation states.

Successful mutations update or invalidate the relevant query cache.

The project is deployed.

Suggested flow
Component
→ TanStack Query mutation
→ TanStack Start Server Function
→ Zod validation
→ service/repository layer → Supabase/PostgreSQL
→ typed response
→ query invalidation or cache update
→ UI re-rendered

Do not add yet
Real-time features

Payments

AI

Third-party OAuth

Multi-user collaboration

Redux Toolkit, unless the UI has a genuine complex client-only state problem

Knowledge to assess
System design
Draw the complete flow from a UI event to the database and back.

Explain why Server Functions are appropriate for same-origin app actions.

Explain how query invalidation keeps the UI consistent after writes.

Data modeling
Design a normalized relational schema for the dashboard entities.

Identify primary keys, foreign keys, unique constraints, timestamps, and useful indexes.

Explain when you would denormalize and why.

Definition of done
CRUD works end to end.

The database schema is represented by migrations.

Input validation is server-side.

Queries and mutations are typed.

A deployment URL exists.

The PR, diagram, and design document are complete.