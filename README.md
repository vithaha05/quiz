# AI-Powered Quiz REST API

A production-ready Quiz API built with Django, DRF, and Google Gemini AI.

## Tech Stack
- **Framework**: Django 4.x + Django REST Framework
- **Database**: PostgreSQL (Render)
- **Deployment**: Render
- **AI Integration**: Google Gemini API
- **Auth**: JWT (SimpleJWT)
- **Docs**: drf-spectacular (Swagger/Redoc)
- **Caching**: LocMemCache (default) / Redis (production)

## Database Schema
```text
+----------------+      +----------------+      +-------------------+
|      User      |      |      Quiz      |      |     Question      |
+----------------+      +----------------+      +-------------------+
| id (PK)        |      | id (PK)        |      | id (PK)           |
| username       |<----+| title          |      | quiz_id (FK)      |
| role (choice)  |      | topic          |      | question_text     |
| created_at     |      | difficulty     |      | option_a, b, c, d |
| updated_at     |      | question_count |      | correct_option    |
+----------------+      | created_by (FK)|      | explanation       |
        ^               | is_active      |      | order             |
        |               | created_at     |      +-------------------+
        |               +----------------+               ^
        |                       ^                        |
        |                       |                        |
+----------------+      +----------------+               |
| UserAnalytics  |      |  QuizAttempt   |<--------------+
+----------------+      +----------------+               |
| user_id (FK)   |      | id (PK)        |               |
| total_attempts |      | user_id (FK)   |       +-------------------+
| avg_score      |      | quiz_id (FK)   |       |   AttemptAnswer   |
| correct_ans    |      | started_at     |       +-------------------+
+----------------+      | completed_at   |       | id (PK)           |
                        | score          |       | attempt_id (FK)   |
                        | status         |       | question_id (FK)  |
                        +----------------+       | selected_option   |
                                ^                | is_correct        |
                                |                +-------------------+
                                +---------------------------+
```

## API Endpoints

### Auth
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/auth/register/` | Open | Register a new user |
| POST | `/api/auth/login/` | Open | Login and get JWT |
| POST | `/api/auth/token/refresh/` | JWT Refresh | Refresh access token |
| GET | `/api/auth/me/` | JWT | Get current user profile |

### Quizzes
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/quizzes/` | Admin | Create quiz + generate questions |
| GET | `/api/quizzes/` | JWT | List active quizzes (paginated) |
| GET | `/api/quizzes/{id}/` | JWT | Quiz detail |
| PATCH | `/api/quizzes/{id}/` | Admin | Update quiz |
| DELETE | `/api/quizzes/{id}/` | Admin | Soft delete quiz |
| GET | `/api/quizzes/{id}/questions/` | JWT | List questions for quiz |

### Attempts
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/attempts/start/{quiz_id}/` | JWT | Start new attempt |
| POST | `/api/attempts/{id}/answer/` | JWT | Submit answer for question |
| POST | `/api/attempts/{id}/submit/` | JWT | Submit quiz and calculate score |
| GET | `/api/attempts/` | JWT | List user's attempts |

### Analytics & Admin
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/api/analytics/me/` | JWT | User analytics |
| GET | `/api/analytics/quizzes/{id}/` | Admin | Quiz-level analytics |
| GET | `/api/admin/users/` | Admin | List all users |
| GET | `/api/admin/quizzes/` | Admin | List all quizzes |

## Local Setup

1. **Clone the repository**
2. **Create a virtual environment**: `python -m venv venv && source venv/bin/activate`
3. **Install dependencies**: `pip install -r requirements.txt`
4. **Copy .env.example**: `cp .env.example .env` and fill in your keys.
5. **Run migrations**: `python manage.py migrate`
6. **Start server**: `python manage.py runserver`
7. **Access Docs**: `http://localhost:8000/api/docs/swagger/`

## Design Decisions
- **JWT Authentication**: Selected for stateless scalability, allowing the API to handle high traffic without server-side sessions.
- **Denormalized Analytics**: User analytics are stored in a separate table and updated on quiz submission. This ensures high-performance reads for personal and admin dashboards.
- **AI Integration**: Questions are generated in real-time during quiz creation. We use a transaction to ensure that if AI fails, no partial quiz is saved.

## Trade-offs
- **Synchronous AI Calls**: For this version, AI generation is synchronous. While this simplifies the flow, it can lead to slow response times or timeouts for large quizzes. A Celery task queue would be the next step for improvement.
- **LocMemCache for Dev**: Used to avoid requiring Redis locally, though Redis is recommended and configured for production.

## AI Failure Handling
- Errors during AI generation are caught and will trigger a rollback of the Quiz creation.
- Users receive a 400/500 error with a clear message if the AI provider is down or unreachable.
- No "empty" quizzes are left in the database.
