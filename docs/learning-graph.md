# Learning Map: reverse-engineering report and implementation

## Summary

LearnHarness statically exposes an evidence-based learner assessment, a validated
prerequisite DAG, and progress derived from learning activity. Clario now has an
authenticated learner graph, editable evidence records, locally generated
prerequisite-first paths, question-to-node links, and a Learning Map page. The implementation uses
Clario's existing Express, Zod, Mongoose, JWT-cookie, React, and API-client
patterns. It does not add LLM calls or infer mastery from practice.

## Findings about LearnHarness

The supplied LearnHarness 0.7.0 AppImage has SHA-256
`772b5e04d380cbe8a72a75dbff269aeb6a47f4d4452711b1da8059a872067613`.
Its packaged ASAR has SHA-256
`9af0af59553ee78fefd9981ba3e47c43248baaac75f38e11c76accb3cb8e04a6`.

The following are static observations from selected Electron and Next.js
bundles, not runtime-confirmed behavior:

- The application has chat, activity, graph, graph-import, and graph-source API
  routes. Its graph store declares node, chain, session, coverage, source,
  position, and render-setting files.
- The learner assessment records strands and evidence about what a learner can
  reason from, where their reasoning ends, and what still needs checking.
  `probe_done` is a one-time handoff and does not finish while a question is
  open.
- `plan_init` accepts a Mermaid-like graph subset. A plan uses stable lowercase
  slugs; an edge means its source concept must be understood before its
  destination. Validation rejects malformed IDs, missing endpoints, self-loops,
  duplicate edges, and cycles. The prompt recommends 5–15 steps.
- Practice questions are tagged `predict` or `check` and link to plan-node and
  proposition IDs. The expected answer is committed before the question is
  shown. Current, visited, and upcoming plan states are derived from tagged
  questions and the plan tree.

Evidence references: AppImage `ev_581da48888c991a72bfd0dbd795eeaea37bb32b811c2a92989ce31f6f3e90d3f`;
ASAR inventory `ev_73dc13e027dceff70a49acc52ddf9361d6dffa4a8df93f6d14e6a07676c86d11`;
selected server chunks `ev_1e8de2b0f3034b1967fcec2a02013c33ff364ec33676ca3e5707e15fb842c9cb`;
selected Electron-shell files `ev_068132620e7e8c889b32c8a67718fdfcedbd16d4b4bb02d56c2f14269524b500`.
Both JavaScript analyses were partial; the server analysis reports thousands
of unknowns and the shell analysis left most inventoried files outside its
selected scope. The app was not launched. No interaction or runtime behavior
was observed.

## Clario implementation

Clario's existing tutor persists questions and answers, streams generated
responses over SSE, and already authenticates routes. The Learning Map is a
separate capability so it does not change question generation or treat a
question as proof of knowledge.

`LearnerGraph` stores concepts, evidence, assessment labels, and relationships
per authenticated user. Prerequisite edges are validated as a DAG. `LearningSession`
stores a proposed plan, an assessment snapshot, explicit acceptance, and
practice events. Existing saved tutor questions can be linked to a plan node as
`predict` or `check`; the API verifies question ownership. Every query is scoped
to the authenticated user.

The server builds a path from the goal's prerequisite ancestors. It orders
prerequisites first, excludes prerequisites marked `demonstrated`, and ignores
`related` edges for ordering. The goal remains in the path. This deterministic
planner is a Clario design choice; it does not reproduce LearnHarness's
model-authored 5–15 node plan or its `predict`/`check` question protocol.

Marking a step practiced advances session progress only. The learner must
separately update the concept assessment and its evidence. There is no numeric
mastery score, automatic grading, AI assessment, or inference from time spent.
Question links are stored as evidence but do not auto-advance the path. The user
can review a proposed path before accepting it.

### API

All endpoints require the existing authenticated user cookie:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/learning-graph` | Read or initialize the user's concept graph |
| `POST` | `/api/learning-graph/concepts` | Add a concept |
| `PATCH` | `/api/learning-graph/concepts/:conceptId/assessment` | Set status and evidence |
| `POST` | `/api/learning-graph/relationships` | Add a prerequisite or related edge |
| `GET` | `/api/learning-graph/sessions` | List the user's paths |
| `POST` | `/api/learning-graph/sessions` | Draft a path for a goal concept |
| `POST` | `/api/learning-graph/sessions/:id/accept` | Accept a proposed path |
| `POST` | `/api/learning-graph/sessions/:id/questions` | Link an owned tutor question to a plan node as `predict` or `check` |
| `POST` | `/api/learning-graph/sessions/:id/advance` | Mark only the current step as practiced |

Concept IDs are lowercase slugs. A prerequisite relationship is directed:
`from` must be understood before `to`. Cycles, missing endpoints, duplicate
edges, and self-edges are rejected. Assessment statuses are `unknown`,
`developing`, and `demonstrated`.

### Main files

- DAG checks and prerequisite planner:
  `server/services/learningGraphService.js:65,105`
- User graph and session persistence:
  `server/models/LearnerGraph.js:31`,
  `server/models/LearningSession.js:55`
- Authenticated API and route mount:
  `server/routes/learningGraphRoutes.js:26`,
  `server/server.js:105`,
  `server/controllers/learningGraphController.js:104,138,158,211`
- Client page and protected route:
  `client/src/pages/LearningGraph.jsx:264`,
  `client/src/App.jsx:32`
- Client API wrapper: `client/src/services/api.js:143`
- Focused domain tests: `server/test/learningGraph.test.js`
- Authenticated API and persistence test: `server/test/learningGraphApi.test.js`
