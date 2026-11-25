# Clario — Presentation Slides & Viva Demonstration Guide
## Full Stack Application Development
### Course Project Presentation

---

## Slide 1: Title & Team Overview
- **Project Title:** Clario — AI-Powered Concept Learning Portal
- **Stack:** MERN (MongoDB Atlas, Express.js, React SPA with Vite & Tailwind, Node.js) + Redis (Upstash) + SSE Streaming + Local LLM Layer
- **Team Split (3 Members):**
  - **Member 1 (Auth & User Management):** JWT in httpOnly cookies, bcrypt hashing, Role-Based Access Control (Student, Teacher, Admin), user schemas, and protected routing.
  - **Member 2 (AI Engine & Question Pipeline):** Local LLM prompt refinement (`/v1/messages`), structured JSON schema generation, graceful chart fallback, SSE word-by-word streaming, and ELI5 simplification.
  - **Member 3 (Redis Caching, Analytics & Frontend SPA):** Redis daily rate limiting (10 queries/day via `INCR`+`EXPIRE`), Redis SHA-256 question caching, MongoDB aggregation pipelines for Teacher Analytics, revision study lists, Chart.js integration with `useMemo`, and `useReducer` state machine.

---

## Slide 2: Problem Statement & Motivation
- **Context:** B.Tech Computer Science and Engineering students encounter complex, abstract concepts (recursion call stacks, asymptotic complexity, algorithmic trade-offs, biochemical cycles).
- **The Core Problem:**
  - Standard LLMs output dense walls of text or conversational fluff.
  - Students learn across different cognitive modalities: some need visual trends, some need structured takeaways, others need intuitive analogies (ELI5).
  - High LLM query costs and server loads lead to quota exhaustion without proper caching and rate limiting.
- **Clario's Solution:**
  - Type any plain language question.
  - Automatic prompt engineering layer rewrites it into an undergraduate-level pedagogical prompt.
  - Generates structured concept breakdown with auto-generated empirical charts.
  - SSE real-time streaming delivers text at a comfortable reading pace.
  - Automatic subject tagging and Redis caching for 0ms repeat queries.

---

## Slide 3: System Architecture
```
┌──────────────┐  POST /api/questions     ┌─────────────────────────┐
│  React SPA   │ ────────────────────────▶ │  Node.js + Express API  │
│  (Vercel)    │ ◀──── SSE streamed ────── │  (Render)               │
└──────────────┘       answer              │  ├─ Auth (JWT + bcrypt) │
      │ polls history/analytics           │  ├─ Rate limit (Redis)  │
      ▼                                   │  ├─ Answer cache (Redis)│
┌──────────────┐                          │  ├─ LLM service         │
│  History /   │                          │  │  (local API calls)    │
│  Analytics   │                          │  └─ Mongoose models     │
└──────────────┘                          └──────────┬──────────────┘
                                                     │
                          ┌──────────────────────────┼───────────────┐
                          ▼                          ▼               ▼
                    ┌───────────┐           ┌────────────┐   ┌────────────┐
                    │ MongoDB   │           │ Redis      │   │ Local LLM  │
                    │ (Atlas)   │           │ (Upstash)  │   │ API        │
                    └───────────┘           └────────────┘   └────────────┘
```

---

## Slide 4: Database Design (4 Relational Mongoose Collections)
1. **Users Collection:**
   - Fields: `name`, `email` (unique), `passwordHash`, `role` (`student` | `teacher` | `admin`), `createdAt`.
2. **Questions Collection (Core):**
   - Fields: `userId` (ref), `rawQuestion`, `refinedPrompt`, `explanation`, `keyPoints[]`, `chartData { type, labels, values, datasetLabel }`, `subjectTag`, `isSimplified`, `simplifiedVersion`.
   - **Indexes:** Compound `{ userId: 1, createdAt: -1 }`, Single `{ subjectTag: 1 }`, Full Text `{ rawQuestion: 'text', explanation: 'text' }`.
3. **StudyLists Collection:**
   - Fields: `userId` (ref), `name`, `description`, `questionIds[]` (refs to Question), `createdAt`.
4. **Feedback Collection:**
   - Fields: `userId` (ref), `questionId` (ref), `rating` (1–5), `comment`, `createdAt`.
   - Compound Unique Index: `{ userId: 1, questionId: 1 }`.

---

## Slide 5: Advanced Engineering Features

| Feature | Technical Implementation | Why It Matters |
|---|---|---|
| **Local LLM API Integration** | Dual-stage pipeline: (1) Prompt Refinement, (2) Strict JSON Generation | Turns vague questions into structured educational units with charts and auto-tags |
| **Graceful Schema Fallback** | `sanitizeChartData()` validates label-value parity and chart type | If chart data is missing or malformed, text explanation renders without UI crashes |
| **Redis Rate Limiting** | Redis atomic `INCR` + `EXPIRE` (86400s) for 10 queries/user/day | Prevents quota exhaustion before any expensive LLM call is executed |
| **Redis Answer Caching** | Keyed by SHA-256 hash of normalized text (`cache:answer:<hash>`) | Repeat queries cost 0 LLM calls, returning cached answers in milliseconds |
| **Server-Sent Events (SSE)** | `text/event-stream` with custom events: `status`, `refined_prompt`, `chunk`, `done` | Zero wait-time perception; students read explanations as they stream |
| **Frontend State Machine** | React `useReducer` with states: `IDLE`, `ASKING`, `STREAMING`, `DONE`, `ERROR` | Eliminates state synchronization bugs across streaming and error conditions |
| **Memoized Chart Visuals** | Chart.js wrapped in `useMemo` | Re-reading or toggling views never causes canvas flickering or recomputation |
| **Teacher Analytics** | MongoDB `$aggregate` pipelines with `$group`, `$sort`, and `$lookup` | Real-time curriculum oversight: subject distribution and average ratings |

---

## Slide 6: Live Viva Demonstration Script (5-Minute Walkthrough)

### Step 1: Login & Role-Based Access Control
- Navigate to `/login`.
- Click **"Student"** demo button -> logs in as Alex Rivera.
- Attempt to navigate to `/analytics` -> Demonstrates 403 Forbidden protection and restricted screen.

### Step 2: Asking a Concept Question & AI Refinement
- On Home page, click quick suggestion: *"explain recursion"*.
- Observe **Refined Prompt Banner**: AI immediately rewrites query with university-level context, call stack depth, and visual parameters.
- Watch **SSE Real-time Streaming**: Explanation streams smoothly with blinking cursor.
- Inspect **Visual Chart**: "Call Stack Depth vs Input Size (n)" line chart appears, along with bulleted Key Takeaways.

### Step 3: Cache Hit Demonstration
- Ask *"explain recursion"* a second time.
- Watch **Redis Cache Hit Badge** light up: Answer loads instantly with zero external LLM latency!

### Step 4: Multi-Modal Learning (ELI5 Toggle) & Study Lists
- Click **"Simplify (ELI5)"** button: Concept is instantly re-explained using friendly Russian doll and mirror analogies.
- Click **"Save"**: Add question to "Data Structures & Algorithms Prep" revision list.
- Navigate to `/study-lists` to show exam collection view.

### Step 5: Rating & Teacher Analytics Dashboard
- Click **"Rate"**: Submit 5 stars with comment *"Call stack visualization made the concept click!"* -> Confetti animation fires.
- Sign out and click **"Teacher"** demo button (Prof. Robert Chen).
- Navigate to `/analytics`:
  - Review live MongoDB aggregation charts: Questions by Subject Tag, Average Ratings, Most-Asked Topics, and Student Feedback Feed.

---

## Slide 7: Conclusion & Rubric Compliance Summary
- **Core MERN (25%):** Full React SPA + Express REST + Mongoose CRUD (4 collections) + Search + Pagination.
- **Advanced Features (20%):** Local LLM API (`/v1/messages`) + Redis Caching & Rate Limiting + SSE streaming.
- **Auth & Security (10%):** JWT in httpOnly cookies, bcrypt hashing, RBAC middleware, Helmet, CORS, and Zod input validation.
- **UI/UX (10%):** Responsive modern design, interactive Chart.js, empty/loading/error states.
- **Deployment & Code Quality (10%):** Modular directory structure, zero build errors, comprehensive integration tests (10/10 passing).
- **Presentation & Viva (15%):** Seed data pre-loaded, live demo scripts ready for examiner evaluation.
