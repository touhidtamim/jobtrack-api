# JobTrack API

A REST API for tracking your own job search: applications, their status, and interview rounds.
Built with **Node.js, Express, MongoDB (Mongoose) and JWT**. Designed to be tested with Postman for the
*Talentry API Testing Fundamentals with Postman* assessment, and to be reused later as the backend of a real
job-tracking app.

## Features

- Register / login with **JWT** (bcrypt password hashing, token expiry, protected routes)
- **Roles:** `user` and `admin`. Users only ever see their own data.
- **Applications:** full CRUD, search, filters, sorting, pagination, stats, duplicate protection, status flow rules
- **Interviews:** nested under an application (`/applications/:applicationId/interviews`), full CRUD
- **Admin:** list/view users, change roles, delete users (with their data), platform stats
- Input validation (Joi), one consistent error format, no stack traces or DB errors leaked, helmet, CORS, rate limiting

## Quick start

Requirements: Node.js 18+ and a running MongoDB (local or Atlas).

```bash
npm install
cp .env.example .env        # then edit .env: set MONGO_URI and a long random JWT_SECRET
npm run seed                # creates admin + demo user + demo data (prints generated passwords once)
npm run dev                 # or: npm start
```

API base URL: `http://localhost:5000/api` &nbsp;|&nbsp; health check: `GET /api/health`

| Script | What it does |
|---|---|
| `npm start` / `npm run dev` | Start the API (dev uses nodemon) |
| `npm run seed` | Create admin, demo user, 8 demo applications, 4 interviews. Safe to run again. |
| `npm run seed:destroy` | Remove the seeded users and their data |
| `npm run token:expired` | Print an already-expired JWT (for the expired-token test) |

Seed passwords: set `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD` in `.env`, or leave them empty and a random password is
generated and printed **once** in the console. Existing users are never modified.

## Project structure

```
src/
  app.js, server.js
  config/        env, db connection, constants (statuses, enums, allowed transitions)
  models/        User, Application, Interview
  controllers/   auth, application, interview, admin
  routes/        auth, application, interview (nested), admin
  middleware/    auth (protect / restrictTo), validate, errorHandler, rateLimiters
  validators/    Joi schemas
  utils/         AppError, asyncHandler, helpers
scripts/         seed.js, generate-expired-token.js
postman/         collection + environment
```

## Endpoints

All routes are under `/api`. "Auth" = needs `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | - | Health check |
| POST | `/auth/register` | - | Register (always creates role `user`) |
| POST | `/auth/login` | - | Login, returns token |
| GET | `/auth/me` | user | Current user |
| GET | `/applications` | user | List own applications. Query: `status`, `workType`, `jobType`, `source`, `priority`, `search`, `page`, `limit` (max 50), `sort` |
| POST | `/applications` | user | Create application |
| GET | `/applications/stats` | user | Counts per status + interview totals |
| GET | `/applications/:id` | user | One application + its interviews |
| PUT | `/applications/:id` | user | Replace (company and position required) |
| PATCH | `/applications/:id` | user | Partial update (at least one field) |
| DELETE | `/applications/:id` | user | Delete application and its interviews |
| GET | `/applications/:applicationId/interviews` | user | List interviews. Query: `result`, `type` |
| POST | `/applications/:applicationId/interviews` | user | Create interview |
| GET | `/applications/:applicationId/interviews/:interviewId` | user | One interview |
| PATCH | `/applications/:applicationId/interviews/:interviewId` | user | Update interview |
| DELETE | `/applications/:applicationId/interviews/:interviewId` | user | Delete interview |
| GET | `/admin/users` | admin | List users. Query: `role`, `search`, `page`, `limit` |
| GET | `/admin/users/:id` | admin | One user + application count |
| PATCH | `/admin/users/:id` | admin | Change role (`{ "role": "admin" }`) |
| DELETE | `/admin/users/:id` | admin | Delete user and all their data |
| GET | `/admin/stats` | admin | Platform-wide totals |

`sort` accepts `createdAt`, `updatedAt`, `appliedAt`, `deadline`, `company`, `position`; prefix with `-` for descending
(default `-createdAt`).

### Application fields

`company*`, `position*`, `jobUrl`, `location`, `workType` (remote/hybrid/onsite, default onsite),
`jobType` (full-time/part-time/internship/contract/freelance), `source` (linkedin/bdjobs/company-website/referral/other),
`status` (default `saved`), `salaryMin`, `salaryMax`, `currency` (3 letters, default BDT), `priority` (low/medium/high),
`appliedAt`, `deadline`, `notes`. (* required)

### Interview fields

`round*` (1-20), `type*` (phone/technical/hr/behavioral/onsite/other), `scheduledAt*` (ISO date),
`mode` (online/onsite/phone), `locationOrLink`, `notes`, `result` (pending/passed/failed/cancelled, default pending).

### Response format

```jsonc
// success
{ "success": true, "message": "Application created", "data": { ... } }
// list
{ "success": true, "count": 2, "pagination": { "page": 1, "limit": 10, "total": 12, "totalPages": 2 }, "data": [ ... ] }
// error
{ "success": false, "message": "Validation failed", "errors": [ { "field": "position", "message": "position is required" } ] }
```

## Business rules and design decisions

These are the behaviours you will see (and test) in Postman. They are choices, not the only possible ones.

| Topic | Behaviour |
|---|---|
| Status flow | `saved` -> `applied` -> `assessment` / `interview` -> `offer` -> `accepted`. `rejected`, `withdrawn`, `accepted` are final. Invalid move = **400**. |
| `appliedAt` | Set automatically the first time an application leaves `saved`. Cannot be in the future (400). |
| Duplicates | Same user + company + position (case-insensitive) = **409**. Different users may track the same job. |
| Interviews | A round number can be used once per application (409). Cannot add an interview while status is `saved` (400). |
| Other users' data | Returns **404**, not 403, so the existence of other users' records is not revealed. |
| Admin | Admin routes: normal user = **403**, no token = **401**. Admin cannot change their own role or delete themselves (400). Admins do not see other users' applications through `/applications`. |
| Delete | Returns **200** with a JSON message (not 204) so the response body can be tested. Deleting an application deletes its interviews; deleting a user deletes all their data. |
| PUT | Replaces all editable fields. `status` and `appliedAt` are kept if omitted; other omitted optional fields go back to defaults. |
| Register | Unknown fields (for example `role`, `_id`, `user`) are stripped, so role escalation and owner override are ignored. |
| Login errors | Unknown email and wrong password return the same 401 message (no user enumeration). |
| Errors | Malformed JSON = 400, invalid ObjectId = 400, unknown route = 404 (JSON), unexpected errors = 500 with a generic message. Stack traces and database error details are only written to the server log. |

Status code summary: 200 OK, 201 Created, 400 validation/business rule, 401 missing/invalid/expired token,
403 insufficient role, 404 not found, 409 duplicate, 429 rate limit, 500 unexpected.

## Postman

Files in `postman/`:

- `Talentry - API Testing - JobTrack.postman_collection.json` - 112 requests with automated tests
- `JobTrack - Local.postman_environment.json` - environment template (no secrets inside)

Folders: **Authentication Tests, POST Requests, GET Requests, PUT & PATCH Requests, Negative & Error Handling Tests,
DELETE Requests**. They run in that order because later folders reuse data created earlier (IDs and tokens are saved to
environment variables by the test scripts), and the destructive DELETE folder runs last. Request names start with a test
ID (for example `[NEG-07]`) so they match the report.

### How to run

1. Start MongoDB and the API, then run `npm run seed` once. Note the admin password it prints (or the one you set).
2. In Postman: **Import** both JSON files, select the **JobTrack - Local** environment.
3. In the environment, set `baseUrl` if your port differs and fill **`adminPassword`** (current value only; never save real passwords into a file you submit).
4. Optional: run `npm run token:expired`, paste the result into `expiredToken`. Without it, `AUTH-09` is skipped.
5. Right-click the collection -> **Run collection**. All 112 requests should pass on a fresh database.

Command line (optional): `npm i -g newman`, then
`newman run "postman/Talentry - API Testing - JobTrack.postman_collection.json" -e "postman/JobTrack - Local.postman_environment.json" --env-var adminPassword=<your admin password>`

Notes:

- Test users are generated by the collection on every run (random emails and passwords created in pre-request scripts)
  and removed again by the DELETE folder, so the collection can be run repeatedly.
- If you run the whole collection many times quickly, the auth rate limit (50 per 15 minutes per IP by default) can
  return 429. Raise `AUTH_RATE_LIMIT_MAX` or set `RATE_LIMIT_ENABLED=false` in `.env` for testing.
- If `adminPassword` is wrong or the admin was not seeded, the admin-dependent tests fail. Mark these as **Blocked** in the
  report, not as bugs.
- Before exporting or submitting an environment, use the clean template from this repo. Postman exports "current values"
  of variables, which would include tokens and generated passwords from your run.

## Security notes

- Passwords are hashed with bcrypt and are never returned (`select: false` + `toJSON` transform).
- JWT is HS256 with a secret from `.env` (minimum 16 characters, use a long random value in real use) and expires after
  `JWT_EXPIRES_IN` (default 1 day). The user is re-loaded on every request, so deleted users lose access immediately.
- Body size limit 10 kb, helmet headers, CORS configurable via `CORS_ORIGIN`, rate limiting on the API and a stricter
  limit on register/login.
- Input is validated with Joi (strings only for query/body fields, so MongoDB operator injection is rejected).
- Never commit `.env`. Only `.env.example` (placeholders) belongs in the repository.

## Known limitations / ideas for later

- No refresh tokens, password reset, email verification or file uploads (kept out of scope on purpose).
- Deleting an application/user removes related documents with separate queries, not a transaction
  (MongoDB transactions need a replica set).
- Ideas: reminders for deadlines/follow-ups, CV attachments, tags, a React/Next.js frontend, Dockerfile + docker-compose,
  automated tests with Jest + Supertest.
