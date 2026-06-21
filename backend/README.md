# F1 Statistics Dashboard Backend

FastAPI backend for an F1 statistics dashboard. It stores Formula 1 seasons,
drivers, constructors, races, race results, standings, media, favorites, users,
and admin synchronization state in PostgreSQL.

## Stack

- Python 3.11+
- FastAPI
- PostgreSQL
- SQLAlchemy 2.0
- Alembic
- Pydantic v2
- JWT auth
- bcrypt password hashing
- httpx and tenacity for external API synchronization

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` and set `DATABASE_URL`, `SECRET_KEY`, and `CORS_ORIGINS`.
`DATABASE_URL` and `SECRET_KEY` are required; the API will not start without
them.

Generate a safe JWT secret:

```bash
openssl rand -hex 32
```

Create PostgreSQL database:

```sql
CREATE DATABASE f1_dashboard;
```

Run migrations:

```bash
alembic upgrade head
```

Useful Alembic commands:

```bash
alembic revision --autogenerate -m "initial migration"
alembic upgrade head
alembic downgrade -1
```

Run the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger: http://localhost:8000/docs

ReDoc: http://localhost:8000/redoc

## Main API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/seasons?skip=0&limit=50`
- `GET /api/seasons/{year}`
- `GET /api/drivers?season=2025&skip=0&limit=50`
- `GET /api/drivers/{id}`
- `GET /api/drivers/{id}/stats?season=2025`
- `GET /api/constructors?season=2025&skip=0&limit=50`
- `GET /api/constructors/{id}`
- `GET /api/constructors/{id}/stats?season=2025`
- `GET /api/standings/drivers?season=2025&skip=0&limit=50`
- `GET /api/standings/constructors?season=2025&skip=0&limit=50`
- `GET /api/standings/top-drivers?season=2025&limit=3`
- `GET /api/standings/top-constructors?season=2025&limit=3`
- `GET /api/races?season=2025&skip=0&limit=50`
- `GET /api/races/{id}`
- `GET /api/races/{id}/results`
- `GET /api/races/{id}/qualifying`
- `GET /api/races/{id}/practice`
- `GET /api/races/{id}/videos`
- `GET /api/races/{id}/gallery`
- `GET /api/videos?season=2025&skip=0&limit=50`
- `GET /api/videos?season=2025&race_id=1&skip=0&limit=50`
- `GET /api/videos/{id}`
- `GET /api/gallery?season=2025&skip=0&limit=50`
- `GET /api/gallery?season=2025&race_id=1&skip=0&limit=50`
- `GET /api/gallery/{id}`
- `GET /api/favorites`
- `POST /api/favorites/drivers/{driver_id}`
- `DELETE /api/favorites/drivers/{driver_id}`
- `POST /api/favorites/constructors/{constructor_id}`
- `DELETE /api/favorites/constructors/{constructor_id}`

Favorites require `Authorization: Bearer <token>`.

## Admin API

Admin CRUD endpoints are available under `/api/admin` for seasons, drivers,
constructors, races, videos, and gallery images.

Sync endpoints:

- `POST /api/admin/sync/seasons`
- `POST /api/admin/sync/drivers?season=2025`
- `POST /api/admin/sync/constructors?season=2025`
- `POST /api/admin/sync/races?season=2025`
- `POST /api/admin/sync/standings?season=2025`
- `POST /api/admin/sync/race/{race_id}`
- `GET /api/admin/sync/status`

Admin endpoints require a user with role `admin`.

## Create an Admin User

Register a normal user through `/api/auth/register`, then update the role in
PostgreSQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Then log in through `/api/auth/login` and use the returned JWT token.
