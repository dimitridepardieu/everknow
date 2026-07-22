# Flashcard Academy — MVP Design Spec

## Vision

**Pitch:** "AI generates, parents filter, children learn."

A flashcard app that uses AI to transform any learning material (text, photos, PDFs, URLs) into flashcards. Parents control the content, children learn through active recall and spaced repetition.

## Target Audience

- **Buyer:** Young parents (Instagram audience) looking for autonomous learning tools for their children
- **User:** Children aged 6-10 (primary school)
- **Secondary:** Students (university) learning for themselves
- **Acquisition channel:** Instagram (reels/posts about education)

## Account Model

### Account Types

At signup, the user chooses:

- **"I'm a parent"** → can create child profiles (name + avatar), has parent dashboard + child space
- **"I'm learning for myself"** → single unified interface combining creation and learning, no child profiles

### Authentication

- Google OAuth
- Apple OAuth
- No email/password for MVP (roadmap)

### Device Model

- Multi-device per account: each magic-link login creates an independent
  session. No upper bound enforced today.
- Self-service session control (see active devices, sign out remotely)
  is tracked under issue #3 — required before public launch.
- Child invitation links remain on the roadmap.

> Note: this section originally said "single device per account for MVP"
> but the implementation in #2 went multi-device by default. Decision
> assumed in 2026-05-15 because (a) modern users expect multi-device,
> (b) issue #3 will surface session control to users, and (c) magic-link
> only as the auth path makes single-device strict too friction-heavy
> (every device switch = new email round-trip).

## Core Flow

```
Parent uploads source material (text, photo, PDF, URL)
    → Chooses number of cards (5 to 30, step of 5, default 10)
    → AI generates flashcards (text/text format)
    → Parent reviews each card: accept / edit / reject / improve (AI)
    → Accepted cards appear in child's deck
    → Child reviews cards via active recall (typed or spoken answer)
    → AI validates the answer (semantic matching, tolerant)
    → Card rank evolves based on correctness
    → Spaced repetition schedules next review
```

## Flashcard Format

- **Front:** Question (text)
- **Back:** Answer (text)
- Images on cards in roadmap (format B)

## Answer Validation

The child answers by:

1. **Typing** their answer
2. **Speaking** their answer (speech-to-text then AI validation)

Both modes are in the MVP.

AI validates the answer with semantic matching against the card's back. The validation must be tolerant of:

- Spelling mistakes (especially for 6-year-olds)
- Rephrasing (same meaning, different words)
- Partial answers (key concepts present)

While rejecting:

- Off-topic answers
- Fundamentally wrong answers

Tolerance calibration is a key challenge — to be refined through testing.

## Spaced Repetition — Rank System

Cards progress through 5 ranks based on the Leitner system, gamified with competitive gaming-inspired rank names:

| Rank | Name    | Review Interval |
|------|---------|-----------------|
| 1    | Bronze  | 1 day           |
| 2    | Argent  | 3 days          |
| 3    | Or      | 7 days          |
| 4    | Diamant | 14 days         |
| 5    | Légende | 30 days         |

- **Correct answer** → card moves up one rank
- **Wrong answer** → card moves down one rank (not back to Bronze)
- New cards start at Bronze
- Rank names are in French (target audience)
- More ranks may be added later

## Monetization

### Freemium Model

- **Free tier:** 30 cards generated total per account (across all decks, all time). Once 30 cards are generated, paywall.
- **Paid plans:**
  - Monthly: price TBD
  - Annual: price TBD (with discount)

### Payment

- **Stripe** for all payment processing
  - Stripe Billing for subscription management
  - Stripe Tax for automatic VAT calculation
  - Stripe Customer Portal for self-service (invoices, plan changes, cancellation)

## AI / LLM Strategy

### Multi-Provider Architecture

Abstract LLM calls behind a provider interface to allow switching/mixing:

- **Card generation** (complex task, quality critical): Claude Sonnet
- **Answer validation** (simple task, high volume): Claude Haiku
- **Local development:** Ollama + Gemma 4

Providers can be swapped to optimize cost/quality (Mistral, OpenAI, Gemini, open-source self-hosted).

## Source Processing

The parent can provide learning material in 4 formats:

1. **Text** — paste or type content
2. **Image/Photo** — photograph a notebook page, textbook, etc.
3. **PDF** — upload a document
4. **URL** — link to a web page

Each source type is extracted/parsed into content that the LLM processes to generate flashcards.

## Data Model (Draft)

```
Account
├── id
├── type (parent | self)
├── email
├── oauth_provider (google | apple)
├── plan (free | monthly | annual)
├── cards_generated (counter, max 30 for free)
│
├── Profile (1..N)
│   ├── id
│   ├── name
│   ├── avatar
│   │
│   ├── Deck (1..N)
│   │   ├── id
│   │   ├── title
│   │   ├── source_type (text | image | pdf | url)
│   │   ├── source_content
│   │   │
│   │   ├── Card (1..N)
│   │   │   ├── id
│   │   │   ├── front (question)
│   │   │   ├── back (answer)
│   │   │   ├── status (pending | accepted | rejected)
│   │   │   ├── rank (1-5)
│   │   │   ├── next_review_at
│   │   │   │
│   │   │   ├── ReviewLog (0..N)
│   │   │   │   ├── id
│   │   │   │   ├── answered_at
│   │   │   │   ├── answer
│   │   │   │   ├── is_correct
│   │   │   │   ├── rank_before
│   │   │   │   ├── rank_after
```

## Screens (MVP)

1. **Landing page** — product presentation, CTA to sign up
2. **OAuth** — Google / Apple sign-in
3. **Account type choice** — "I'm a parent" / "I'm learning for myself"
4. **Create child profile** — name + avatar (parent mode only)
5. **Home (parent/self)** — list of decks, child profiles, new deck button
6. **New deck** — source input (text/photo/PDF/URL) + card count selector (−/+, step 5) + generate
7. **Card filtering** — review generated cards one by one: accept / edit / reject / improve (AI)
8. **Home (child)** — decks, cards to review today, "Review!" button
9. **Review session** — question displayed, child types or speaks answer, submit
10. **Result** — correct/incorrect, correct answer shown if wrong, rank evolution
11. **Parent stats** — cards per rank per deck, cards reviewed today
12. **Settings** — account, subscription management, child profiles
13. **Paywall** — triggered at 30 cards, monthly/annual plan choice

## User Flow

```
Instagram reel/post
    → Landing page
    → OAuth (1 tap)
    → "Parent" or "For myself"
    → Create child profile (if parent)
    → "Paste or photograph a lesson" (first generation — WOW moment)
    → Home
```

## Tech Stack

- **Backend:** Go 1.26.2 — stdlib only, procedural, minimal dependencies
- **Database:** Postgres 18
- **Frontend:** React 19.2 PWA, Vite 8.0.8, shadcn (base-ui), Tailwind 4.2, Zod 4.3.6
- **Runtime:** Bun 1.3.11
- **Reverse proxy / HTTPS:** Caddy (automatic Let's Encrypt)
- **Deployment:** Docker Compose on OVH VPS, Cloudflare DNS (flashcardacademy.io)
- **CI/CD:** Makefile (inspired by Kamal Deploy)
- **Payments:** Stripe

## Design Principles

- **Mobile-first:** All screens designed for mobile viewports first. This is the primary target (parents and children on smartphones).
- **Online required (MVP):** WiFi/internet connection required to use the app. No offline support.

## Roadmap (Post-MVP)

- Offline-first for review sessions (Service Worker + local cache + sync queue)
- Multi-device support (child invitation links)
- Images on flashcards (format B)
- Casual mode ("I knew it" / "I didn't know it")
- Email/password authentication
- iOS app (Swift)
- Advanced stats + streaks
- Pre-built deck catalog (aligned with French curriculum)
- Cost optimization (provider switching, self-hosted models)

## Approach

1. **Wireframe prototype (frontend)** — basic shadcn components, no styling, fake JSON data. Goal: validate the complete user flow interactively.
2. **Build the Go API + Postgres + Deploy** — functional prototype with real data.
3. **UI Design** — once the flow is validated and all features work end-to-end, design the visual identity and polish the interface.
4. **Iterate** — adjust features based on real usage.

Each screen is implemented and validated one by one, allowing adjustments along the way.
