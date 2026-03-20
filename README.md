# AI-Powered Quiz REST API

A production-ready Quiz API built with Django REST Framework, JWT authentication, and AI-powered question generation via the Groq API (LLaMA 3.1).

## 🚀 Live Deployment
| Service | URL |
|---------|-----|
| **Frontend App** | https://quiz-frontend-xsrw.onrender.com |
| **Backend API** | https://quiz-api-suta.onrender.com |
| **Swagger Docs** | https://quiz-api-suta.onrender.com/api/docs/swagger/ |
| **Redoc Docs** | https://quiz-api-suta.onrender.com/api/docs/redoc/ |
| **GitHub Repo** | https://github.com/vithaha05/quiz |


## Tech Stack
- **Framework**: Django 4.x + Django REST Framework
- **Database**: PostgreSQL (Render) / SQLite (local dev)
- **Deployment**: Render
- **AI Integration**: Groq API (LLaMA 3.1 8B Instant)
- **Auth**: JWT via SimpleJWT (access: 1hr, refresh: 7 days, blacklist enabled)
- **Docs**: drf-spectacular (Swagger + Redoc)
- **Caching**: LocMemCache (dev) / Redis (production)
- **Static Files**: WhiteNoise

## Database Schema
```text
+----------------+      +----------------+      +-------------------+
|      User      |      |      Quiz      |      |     Question      |
+----------------+      +----------------+      +-------------------+
| id (PK)        |      | id (PK)        |      | id (PK)           |
| email (unique) |<----+| title          |      | quiz_id (FK)      |
| role (choice)  |      | topic          |      | question_text     |
| created_at     |      | difficulty     |      | option_a, b, c, d |
| updated_at     |      | question_count |      | correct_option    |
+----------------+      | created_by (FK)|      | explanation       |
        ^               | is_active      |      | order             |
        |               | ai_provider    |      +-------------------+
        |               | created_at     |               ^
        |               +----------------+               |
        |                       ^                        |
+----------------+      +----------------+               |
| UserAnalytics  |      |  QuizAttempt   |<--------------+
+----------------+      +----------------+               |
| user_id (FK)   |      | id (PK)        |               |
| total_attempts |      | user_id (FK)   |       +-------------------+
| avg_score      |      | quiz_id (FK)   |       |   AttemptAnswer   |
| correct_ans    |      | started_at     |       +-------------------+
| best_score     |      | completed_at   |       | id (PK)           |
| total_q_ans    |      | score          |       | attempt_id (FK)   |
+----------------+      | status         |       | question_id (FK)  |
                        +----------------+       | selected_option   |
                                                 | is_correct        |
                                                 | answered_at       |
                                                 +-------------------+
```

## API Endpoints

### Auth
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/auth/register/` | Open | Register a new user |
| POST | `/api/auth/login/` | Open | Login and get JWT tokens |
| POST | `/api/auth/logout/` | JWT | Logout and blacklist refresh token |
| POST | `/api/auth/token/refresh/` | JWT Refresh | Refresh access token |
| GET | `/api/auth/me/` | JWT | Get current user profile |

### Quizzes
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/quizzes/` | JWT | Create quiz + AI-generate questions (scoped to your account) |
| GET | `/api/quizzes/` | JWT | List your quizzes (paginated, data-isolated) |
| GET | `/api/quizzes/{id}/` | JWT | Quiz detail |
| PATCH | `/api/quizzes/{id}/` | JWT (owner) | Update your own quiz metadata |
| DELETE | `/api/quizzes/{id}/` | JWT (owner) | Soft delete (deactivate) your quiz |
| GET | `/api/quizzes/{id}/questions/` | JWT | List questions for a quiz |

### Attempts
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/attempts/start/{quiz_id}/` | JWT | Start a new attempt |
| POST | `/api/attempts/{id}/answer/` | JWT | Submit answer for a question |
| POST | `/api/attempts/{id}/submit/` | JWT | Submit quiz and calculate score |
| GET | `/api/attempts/` | JWT | List current user's attempts |
| GET | `/api/attempts/{id}/` | JWT | Attempt detail with all answers |

### Analytics & Admin
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/api/analytics/me/` | JWT | Personal analytics dashboard |
| GET | `/api/analytics/quizzes/{id}/` | Admin | Quiz-level stats (avg score, attempts) |
| GET | `/api/admin/users/` | Admin | List all users |
| GET | `/api/admin/quizzes/` | Admin | List all quizzes (including inactive) |

## Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/vithaha05/quiz.git && cd quiz
   ```
2. **Create a virtual environment**
   ```bash
   python -m venv venv && source venv/bin/activate
   ```
3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Fill in SECRET_KEY, AI_API_KEY (Groq), and optionally DATABASE_URL
   ```
5. **Run migrations**
   ```bash
   python manage.py migrate
   ```
6. **Create a superuser (admin)**
   ```bash
   python manage.py createsuperuser
   ```
7. **Start the server**
   ```bash
   python manage.py runserver
   ```
8. **Access API docs**: [http://localhost:8000/api/docs/swagger/](http://localhost:8000/api/docs/swagger/)

## Design Decisions
- **JWT Authentication**: Chosen for stateless scalability. No server-side sessions means the API can scale horizontally without sticky sessions.
- **Email as Username**: More modern UX — users don't need to remember a separate username. The `AbstractUser` model was extended with `username = None` and `USERNAME_FIELD = 'email'`.
- **Denormalized Analytics**: `UserAnalytics` is a separate model updated on every quiz submission. This trades write cost for fast, O(1) reads on analytics dashboards — essential if many users check their stats frequently.
- **Atomic AI Generation**: Quiz creation and question generation run inside a single `transaction.atomic()` block. If the AI call fails, the quiz is deleted and no orphaned records are left in the database.
- **Soft Delete on Quizzes**: Quizzes are never hard-deleted. `is_active=False` hides them from students but preserves historical attempt and analytics data.
- **AI Throttling**: Quiz creation is rate-limited to 5 requests/hour per user to prevent AI API cost abuse.

## Trade-offs
- **Synchronous AI Calls**: AI generation is synchronous and blocks the HTTP response. This is simple but can time out for `question_count > 15`. A Celery + Redis task queue would be the production-grade fix.
- **LocMemCache for Dev**: No Redis required locally. The cache is in-process memory, which resets on server restart but keeps the dev setup simple.
- **SQLite for Dev / PostgreSQL for Prod**: `DATABASE_URL` defaults to SQLite locally, switching automatically to Postgres on Render via the environment variable.

## AI Integration
Questions are generated using the **Groq API** (LLaMA 3.1 8B Instant model) — a free, high-speed inference API.

**Flow:**
1. Admin POSTs to `/api/quizzes/` with `topic`, `difficulty`, `question_count`
2. A structured prompt is sent to Groq requesting a JSON array of questions
3. The response is parsed and `Question` objects are bulk-created in the database
4. If the AI call fails (timeout, bad JSON, API error), the quiz is rolled back and a `503` error is returned

**Prompt format:**
```
Generate {count} MCQs on '{topic}' at {difficulty} difficulty.
Return ONLY a JSON array with keys: question_text, option_a/b/c/d, correct_option (a-d), explanation, order.
```

## Challenges & How They Were Solved

| Challenge | Solution |
|-----------|----------|
| **Custom User model with email login** | Extended `AbstractUser`, set `username = None`, `USERNAME_FIELD = 'email'`, and set `AUTH_USER_MODEL` before the first migration to avoid migration conflicts |
| **AI returns conversational text, not pure JSON** | The parser scans for the first `[` and last `]` in the response and extracts the JSON substring, gracefully handling any preamble the model adds |
| **No N+1 queries on quiz list** | Used `select_related('created_by')` and `prefetch_related('questions')` on the queryset so all related data is fetched in 2 SQL queries regardless of page size |
| **Quiz cache invalidation on create/delete** | After every write operation, `cache.delete_pattern("quiz_list_page_*")` is called (with a fallback to `cache.clear()` for LocMemCache in development) |
| **Preventing duplicate attempts** | The `start` endpoint queries for an existing `in_progress` attempt before creating a new one, returning a `409 Conflict` with the existing `attempt_id` |
| **Refresh token blacklisting on logout** | `rest_framework_simplejwt.token_blacklist` is installed and the `LogoutView` calls `RefreshToken(token).blacklist()` to invalidate the token server-side |
| **Production static files** | WhiteNoise middleware is added in production settings with `CompressedManifestStaticFilesStorage` for efficient, gzip-compressed static file serving |

## API Docs
- **Swagger UI**: `/api/docs/swagger/`
- **Redoc**: `/api/docs/redoc/`
- **OpenAPI Schema**: `/api/schema/`
