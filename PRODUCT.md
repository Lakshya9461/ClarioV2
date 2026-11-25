# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Undergraduate Computer Science and Engineering students (B.Tech / B.S. CSE) studying core systems (algorithms, data structures, operating systems, computer architecture) and preparing for technical viva examinations, lab evaluations, and engineering interviews.
- **Secondary:** Faculty members and lab instructors reviewing aggregated student conceptual struggle points and class cohort analytics.

## Product Purpose

Clario is a first-principles cognitive engineering workstation for computer science. It replaces shallow text answers and rote summaries with observable execution traces, hardware memory hierarchy models, and an active Socratic learning harness that diagnostically verifies prerequisite understanding before advancing.

Success means a student can mentally simulate how code executes, explain low-level invariants (call stack frames, cache lines, pointer references), and defend algorithmic trade-offs under oral viva examination.

## Positioning

Unlike conversational AI wrappers or static textbook readers, Clario grounds understanding in observable state machines:
1. **Executable Trace Simulation:** Step-by-step array bars, call stack frames, and CPU vs. RAM hardware architecture diagrams synchronized with highlighted pseudocode.
2. **Socratic Invariant Diagnostic Loop:** A four-phase learning harness (`MEASURE → PLAN → TEACH → PRACTICE`) that models student belief states and constructs verifiable proposition chains in `./knowledge-graph.md`.
3. **Structured Viva Concept Decks:** Auto-synthesized presentation slides detailing time/space complexity proofs and edge cases.

## Operating Context

- **Environment:** Web-based technical workstation accessed on desktop, laptop, and lab machines during study sessions, problem sets, and pre-exam cramming.
- **Workflow:**
  - Fast inquiry via the Query Console for immediate algorithmic dissection.
  - Interactive scrubbing through state machine steps and pseudocode lines.
  - Multi-phase guided mastery in the Learning Harness (`/harness`) targeting specific weak concepts.
  - Reviewing saved concept decks in Study Lists and watching curated video shorts on mobile.

## Capabilities and Constraints

- **Confirmed Capabilities:**
  - Streaming SSE first-principles explanations with Markdown, Math, and Chart telemetry.
  - Client-side and server-generated deterministic algorithm traces (Quicksort, Binary Search, Bubble Sort, Recursion/Fibonacci call stacks, Graph BFS/DFS, CPU vs. RAM architecture).
  - Diagnostic Socratic harness with student confidence scoring, reasoning evaluation, and disk-persisted knowledge graph (`./knowledge-graph.md`).
  - Redis-backed rate limiting and response caching for low-latency viva drills.
  - Multi-tier role-based access control (Student, Teacher, Admin).
- **Constraints:**
  - Zero tolerance for AI hallucination in complexity proofs or hardware execution orders.
  - Must operate cleanly under low network conditions (Redis answer cache fallback).
  - No decorative status animations or distracting UI fluff; strict adherence to engineering workbench ergonomics.

## Brand Commitments

- **Name:** Clario (`clario // cs-lab`)
- **Tone & Voice:** Technical-utilitarian, precise, objective, authentic UNIX/MIT lab aesthetic. Monospace telemetry, direct explanations, zero marketing jargon.
- **Visual Identity:** High-contrast dark workbench palette (`#06090f`, `#0b101b`, `#111827`), crisp 1px borders (`#1e293b`, `#334155`), blue/amber/emerald functional accents, strict `:focus-visible` accessibility.

## Evidence on Hand

- Complete working full-stack implementation: React 18 client + Express.js backend + MongoDB + Redis.
- Active knowledge graph file: `knowledge-graph.md` tracking validated propositions and dependency chains.
- 48 passing integration and unit tests across 11 test suites verifying auth, SSE streaming, Redis caching, algorithm traces, and Socratic diagnostic scoring.

## Product Principles

1. **State Over Summary:** Never tell a student what an algorithm does in prose when you can demonstrate its exact memory and register state transitions step-by-step.
2. **Diagnose Before Explaining:** Assess whether prerequisites are sound before teaching advanced concepts. Ground student mastery in verified invariants.
3. **Viva-Ready Rigor:** Teach the "why" and the failure boundaries (cache misses, stack overflows, worst-case pivots), not just the happy path.
4. **Utilitarian Speed & Ergonomics:** High information density, fast keyboard navigation, instant focus indicators, zero decorative friction.

## Accessibility & Inclusion

- Conformance to WCAG 2.1 AA standards: high contrast text on dark surfaces, full keyboard navigability (`Space`, `Arrows`, `Home`, `End`, `Esc`), zero horizontal overflow, and respect for `prefers-reduced-motion: reduce`.
