# Flashcard Academy MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working MVP of Flashcard Academy — an AI-powered flashcard app for young parents and their children (6-10 years old).

**Architecture:** Monorepo with Go API backend (stdlib), React 19 PWA frontend, Postgres 18 database. Wireframe-first approach: validate user flow before building backend, design UI last.

**Tech Stack:** Go 1.26.2 (stdlib), Postgres 18, React 19, Vite 8, shadcn, Tailwind 4, Zod 4, Stripe, Claude API, Docker Compose

**Design principle:** Mobile-first. All screens designed for mobile viewports first.

**Spec:** `docs/superpowers/specs/2026-04-09-flashcard-academy-mvp-design.md`

---

## Phase 1: Project Setup

### Task 1: Initialize the monorepo

**Goal:** Git repo, Go module, React project, basic tooling.

- [ ] Initialize git repo at the root
- [ ] Initialize Go module in `api/`
- [ ] Scaffold React + Vite + TypeScript project in `web/`
- [ ] Install and configure Tailwind 4, shadcn, Zod 4
- [ ] Create base Makefile with commands: `make dev-web`, `make dev-api`, `make build`
- [ ] Commit

---

## Phase 2: Interactive Wireframe (no backend, no styling)

The goal of this phase is to build every screen as a functional wireframe using basic shadcn components, fake JSON data, and no custom styling. The sole objective is to validate the complete user flow interactively. Mobile-first viewports.

### Task 2: Fake data & routing setup

**Goal:** Mock JSON data and React Router structure so all screens can be navigated.

- [ ] Create mock data file (accounts, profiles, decks, cards, review logs)
- [ ] Set up React Router with all routes
- [ ] Basic layout shell (minimal navigation)
- [ ] Commit

### Task 3: Landing page wireframe

**Goal:** Minimal landing — pitch text and sign-up buttons.

- [ ] Hero text with app pitch
- [ ] Google / Apple sign-in buttons (mock — navigate to onboarding)
- [ ] Commit

### Task 4: Onboarding flow wireframe

**Goal:** OAuth → Account type → Child profile → First generation prompt.

- [ ] OAuth screen (mock buttons, navigate on click)
- [ ] Account type choice ("I'm a parent" / "I'm learning for myself")
- [ ] Create child profile (name + avatar input)
- [ ] "Paste or photograph a lesson" prompt
- [ ] Wire screens together with navigation
- [ ] Commit

### Task 5: Home screen wireframe (parent/self)

**Goal:** Dashboard with decks and profiles.

- [ ] List of decks (from mock data)
- [ ] Child profile selector (if parent mode)
- [ ] "New deck" button
- [ ] Navigation to settings and stats
- [ ] Commit

### Task 6: New deck screen wireframe

**Goal:** Source input and card generation trigger.

- [ ] Source type selector (text / photo / PDF / URL)
- [ ] Input area per source type (text area, file upload zone, URL field)
- [ ] Card count selector (−/+ buttons, step 5, range 5-30, default 10)
- [ ] "Generate" button (navigates to filtering with fake generated cards)
- [ ] Commit

### Task 7: Card filtering screen wireframe

**Goal:** Parent reviews cards one by one.

- [ ] Card display (front and back)
- [ ] 4 action buttons: accept, edit, reject, improve (AI)
- [ ] Edit mode (inline editing of front and back)
- [ ] Card counter ("Card 3/10")
- [ ] Navigation between cards
- [ ] Summary at the end (X accepted, X rejected, X improved)
- [ ] Commit

### Task 8: Home screen wireframe (child)

**Goal:** Child's entry point for review.

- [ ] List of decks
- [ ] "Cards to review today" counter
- [ ] Big "Review!" button
- [ ] Rank badges visible per deck
- [ ] Commit

### Task 9: Review session wireframe

**Goal:** Core learning interaction.

- [ ] Question card displayed
- [ ] Text input for typed answer
- [ ] Microphone button (UI placeholder, non-functional)
- [ ] "Submit" button
- [ ] Progress indicator (card X of Y)
- [ ] Commit

### Task 10: Result screen wireframe

**Goal:** Answer feedback and rank evolution.

- [ ] Correct state: show success + rank name change
- [ ] Incorrect state: show correct answer + rank name change
- [ ] Rank display (Bronze → Légende)
- [ ] "Next card" button
- [ ] Session summary at the end
- [ ] Commit

### Task 11: Parent stats screen wireframe

**Goal:** Simple progress view.

- [ ] Profile selector (if multiple children)
- [ ] Per-deck breakdown: cards count per rank
- [ ] "Cards reviewed today" counter
- [ ] Commit

### Task 12: Settings screen wireframe

**Goal:** Account management.

- [ ] Account info
- [ ] Manage subscription link
- [ ] Child profiles management
- [ ] Sign out button
- [ ] Commit

### Task 13: Paywall screen wireframe

**Goal:** Conversion screen.

- [ ] "You've used your 30 free cards" message
- [ ] Two plan options (monthly / annual)
- [ ] CTA buttons
- [ ] Commit

### Task 14: Full flow walkthrough & adjustments

**Goal:** Test the complete wireframe end-to-end, identify gaps.

- [ ] Walk through onboarding flow
- [ ] Walk through parent flow: create deck → filter cards → view stats
- [ ] Walk through child flow: home → review → results
- [ ] Walk through paywall trigger
- [ ] List adjustments needed
- [ ] Implement fixes
- [ ] Commit

---

## Phase 3: Backend API + Database

### Task 15: Database setup

**Goal:** Postgres schema matching the data model.

- [ ] SQL migration for all tables: account, profile, deck, card, review_log
- [ ] Docker Compose config for local Postgres 18
- [ ] Migration tooling (simple SQL files, applied in order)
- [ ] Commit

### Task 16: Authentication (Google + Apple OAuth)

**Goal:** OAuth flow, JWT sessions, auth middleware.

- [ ] Google OAuth endpoint
- [ ] Apple OAuth endpoint
- [ ] JWT token generation and validation
- [ ] Auth middleware for protected routes
- [ ] Account creation on first login
- [ ] Commit

### Task 17: Account & Profile API

**Goal:** CRUD for accounts and child profiles.

- [ ] GET /account
- [ ] POST /profiles
- [ ] GET /profiles
- [ ] PUT /profiles/:id
- [ ] DELETE /profiles/:id
- [ ] Account type handling (parent vs self)
- [ ] Commit

### Task 18: Deck & Card generation API

**Goal:** Source upload, LLM generation, card management.

- [ ] POST /decks — create deck with source material
- [ ] Source processing: text, image, PDF, URL extraction
- [ ] LLM integration with multi-provider interface
- [ ] Card count parameter (5-30)
- [ ] Free tier check (30 cards total)
- [ ] GET /decks, GET /decks/:id
- [ ] Commit

### Task 19: Card filtering API

**Goal:** Parent actions on generated cards.

- [ ] PUT /cards/:id — update card (edit, change status)
- [ ] POST /cards/:id/improve — AI improvement
- [ ] Card statuses: pending → accepted / rejected
- [ ] Commit

### Task 20: Review session API

**Goal:** Spaced repetition engine + AI answer validation.

- [ ] GET /profiles/:id/reviews/today — cards due for review
- [ ] POST /cards/:id/answer — submit answer (text)
- [ ] AI validation (semantic matching, tolerant)
- [ ] Rank update logic (correct = up, incorrect = down)
- [ ] Next review date calculation
- [ ] ReviewLog creation
- [ ] Commit

### Task 21: Speech-to-text integration

**Goal:** Oral answer support.

- [ ] POST /speech — receive audio, return transcription
- [ ] Speech-to-text provider integration
- [ ] Pipe into answer validation flow
- [ ] Commit

### Task 22: Stats API

**Goal:** Parent dashboard data.

- [ ] GET /profiles/:id/stats — cards per rank per deck, reviews today
- [ ] Commit

### Task 23: Stripe integration

**Goal:** Subscription management.

- [ ] POST /checkout — Stripe checkout session
- [ ] POST /webhooks/stripe — payment events
- [ ] Plan management (free → monthly/annual)
- [ ] Stripe Customer Portal, Billing, Tax
- [ ] Commit

---

## Phase 4: Connect Wireframe to Backend

### Task 24: Wire authentication

- [ ] Replace mock OAuth with real Google + Apple auth
- [ ] Token storage and auth headers
- [ ] Protected routes
- [ ] Commit

### Task 25: Wire all screens to API

- [ ] Replace all mock data with real API calls
- [ ] Loading and error states
- [ ] Commit

### Task 26: Wire speech-to-text

- [ ] Real microphone capture in browser
- [ ] Send audio to API, display transcription
- [ ] Commit

### Task 27: Wire Stripe

- [ ] Paywall triggers real checkout
- [ ] Subscription status in UI
- [ ] Settings links to Stripe Customer Portal
- [ ] Commit

---

## Phase 5: Deployment

### Task 28: Dockerize

- [ ] Dockerfile for Go API
- [ ] Dockerfile for React PWA (build + static serve)
- [ ] Docker Compose: API + Web + Postgres
- [ ] Commit

### Task 29: Deploy to OVH VPS

- [ ] Server setup
- [ ] Cloudflare DNS for flashcardacademy.io
- [ ] HTTPS
- [ ] Makefile deploy commands
- [ ] Commit

### Task 30: PWA configuration

- [ ] Service worker, manifest
- [ ] Installable on mobile home screen
- [ ] Commit

---

## Phase 6: UI Design & Polish

### Task 31: Design system

**Goal:** Now that the flow is validated, design the visual identity.

- [ ] Color palette, typography, spacing
- [ ] Rank visuals (Bronze → Légende with colors/badges)
- [ ] Configure shadcn theme
- [ ] Commit

### Task 32: Apply design to all screens

- [ ] Style every screen with the design system
- [ ] Animations and transitions (rank evolution, card flip, etc.)
- [ ] Mobile-first responsive refinements
- [ ] Commit

### Task 33: End-to-end testing

- [ ] Full user journey with final design
- [ ] Payment flow
- [ ] Edge cases (free tier limit, empty states, errors)
- [ ] Commit

### Task 34: Launch preparation

- [ ] Landing page polish (Instagram conversion optimized)
- [ ] Stripe pricing configuration
- [ ] Production LLM provider keys
- [ ] Go live
