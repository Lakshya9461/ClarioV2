# Clario — AI-Powered Concept Learning Portal

Clario is an engineering learning platform built on the MERN stack with Redis caching, server-sent events (SSE) streaming, interactive slide generation, dynamic data visualization, and an AI-curated vertical video feed ("Shorts Mode").

---

## 🛠️ Architecture & Tech Stack

- **Frontend (`/client`)**: React 18, Vite, Tailwind CSS, Lucide React, Chart.js, React Markdown.
- **Backend (`/server`)**: Node.js, Express (ES Modules), MongoDB & Mongoose (with in-memory fallback), Redis / Upstash (with in-memory fallback), Zod validation, JWT authentication.
- **AI & LLM Services**: Strata / OpenAI / Anthropic compatible endpoints, dynamic prompt refinement, structured JSON generation, and heuristic fallback prompt engine.
- **Shorts Pipeline**: YouTube Data API v3 & live YouTube search with LLM curation and 24-hour Redis caching (`shorts:{slug}`).

---

## 🚀 Quick Start & Development

### 1. Installation
```bash
# In repository root
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Development Servers
```bash
# Start backend (Port 5000)
npm run dev:server
# Or: cd server && npm run dev

# Start frontend (Port 5173)
npm run dev:client
# Or: cd client && npm run dev
```

### 3. Database Seeding & Demo Accounts
```bash
npm run seed
# Default Accounts:
# - Student: student@clario.edu / student123
# - Teacher: teacher@clario.edu / teacher123
# - Admin:   admin@clario.edu   / admin123
```

### 4. Running Tests & Verifications
```bash
# Run full backend test suite (Integration, Viva, Shorts, Caching, Auth)
npm run test:server
# Or: cd server && npm test

# Run frontend production build
npm run build:client
# Or: cd client && npm run build
```

---

## 📂 Project Structure

```
cuttlefish/
├── client/
│   ├── src/
│   │   ├── components/      # UI Components (AnswerPanel, ShortCard, SlideDeckView, Navbar, etc.)
│   │   ├── context/         # AuthContext & global providers
│   │   ├── hooks/           # useShorts, useStreamAnswer
│   │   ├── pages/           # Home, Shorts, QuestionDetail, History, StudyLists, Analytics, Login
│   │   ├── reducers/        # answerReducer for multi-phase SSE state
│   │   └── services/        # api.js fetch wrappers (Auth, Questions, Shorts, StudyLists)
│   └── vite.config.js       # Vite configuration with proxy to :5000
├── server/
│   ├── config/              # db.js (MongoDB), redis.js (Redis/in-memory)
│   ├── controllers/         # questionController, shortsController, authController, etc.
│   ├── middleware/          # auth.js (JWT/RBAC), rateLimiter.js, validation.js, errorHandler.js
│   ├── models/              # User, Question, StudyList, Feedback schemas
│   ├── routes/              # questionRoutes, shortsRoutes, authRoutes, studyListRoutes
│   ├── services/            # llmService.js, shortsService.js
│   ├── test/                # api.test.js, shorts.test.js
│   └── validators/          # schemas.js (Zod schemas)
└── package.json             # Workspace root scripts
```

---

## 🔑 Key Environment Variables (`server/.env`)

```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database (Leave blank to use automatic in-memory MongoDB)
MONGODB_URI=

# Redis (Leave blank to use automatic in-memory Redis fallback)
REDIS_URL=

# Auth
JWT_SECRET=replace_with_a_secure_random_secret
JWT_EXPIRE=7d

# LLM Engine
LLM_API_URL=https://strata.lakshya9461.in/v1/chat/completions
LLM_API_KEY=your_llm_key
LLM_MODEL=qwen3.8-flash-next-gyro-gyro-m

# YouTube Data API v3 (for Shorts Mode)
YOUTUBE_API_KEY=dummy_youtube_api_key_here
```

---

## 🛡️ Coding Conventions & System Invariants

1. **Layered Architecture**: Strict separation of concerns:
   `Routes` → `Controllers` → `Services` → `Models`.
2. **Schema Validation**: All incoming requests must be validated using Zod schemas in `server/validators/schemas.js`.
3. **Graceful Fallbacks**:
   - If external LLM is offline or times out, the local knowledge base engine responds.
   - If external YouTube API key is missing or dummy, live web search and curated fallback lists take over.
   - If MongoDB or Redis connections are absent, in-memory instances run automatically.
4. **Quota & Rate Limits**:
   - Questions: 30 questions/day per student (`rl:ask:{userId}`).
   - Shorts: 30 shorts queries/day per student (`rl:shorts:{userId}`).
5. **Shorts Mode Standards**:
   - Full 100vh viewport (`100dvh`), 9:16 vertical player.
   - Infinite video looping with `loop=1&playlist=${videoId}` and postMessage auto-restart.
   - Unmuted audio by default with single-tap toggle.
