# College Placement Assessment Platform

> Enterprise-grade, production-ready assessment and placement preparation management platform.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748.svg)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-orange.svg)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)

---

## 1. Project Overview

The **College Placement Assessment Platform** is designed to support institutions, students, and recruiters in conducting skill assessments, coding challenges, student performance tracking, and placement workflow automation.

### Current Implementation Scope: Phase 1
Phase 1 focuses exclusively on establishing a **production-grade foundation and architecture**:
- Robust, decoupled multi-tier architecture (Frontend, Backend REST API, MySQL Database, Docker 
Infrastructure)
- Strictly typed interfaces across all boundaries
- Server state caching and declarative loading/error management via TanStack React Query
- Secure Express setup with Helmet, CORS, centralized error handling, and structured request logging
- Database access abstraction via Prisma ORM for MySQL 8.x
- Docker containerization and Docker Compose orchestration
- Zero-domain-bloat: Application-specific domain features (Auth, Students, Question Bank, Exams) are isolated to subsequent phases.

---

## 2. Technology Stack

| Layer | Technology | Key Libraries / Frameworks |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite | Material UI v6, Emotion, React Router v7, TanStack React Query v5, Axios |
| **Backend** | Node.js, Express.js, TypeScript | Helmet, CORS, Dotenv, tsx, ESLint, Prettier |
| **Database** | MySQL 8.x | Prisma ORM v5.x |
| **Infrastructure** | Docker, Docker Compose | Multi-stage Alpine builds, Bridge network, Named volumes |

---

## 3. Project Structure

```
college-placement-platform/
├── .env.example                     # Global environment variables template
├── .gitignore                       # Git ignore configuration
├── docker-compose.yml               # Multi-container orchestration (MySQL, Backend, Frontend)
├── README.md                        # Project documentation
│
├── database/                        # Database initialization and documentation
│   ├── init.sql                     # Initial MySQL schema & connectivity check table
│   └── README.md                    # Database management guide
│
├── docs/                            # Architectural specifications
│   ├── architecture.md              # Detailed layered architecture document
│   └── api-contracts.md             # REST API specifications & schemas
│
├── backend/                         # Express + TypeScript REST API
│   ├── src/
│   │   ├── config/                  # Environment variables, Prisma client singleton, dbCheck
│   │   ├── controllers/             # HTTP controller handlers (HealthController)
│   │   ├── services/                # Business logic layer (HealthService)
│   │   ├── repositories/            # Database query layer via Prisma (HealthRepository)
│   │   ├── middleware/              # ErrorHandler, RequestLogger, NotFoundHandler
│   │   ├── routes/                  # API routing definitions (HealthRouter, ApiRouter)
│   │   ├── validators/              # Input schema validators
│   │   ├── utils/                   # Response helpers (sendSuccess, sendError), Logger
│   │   ├── types/                   # TypeScript DTOs and API interfaces
│   │   ├── app.ts                   # Express application configuration
│   │   └── server.ts                # Server startup & graceful shutdown
│   ├── prisma/
│   │   └── schema.prisma            # Prisma schema definition for MySQL 8.x
│   ├── Dockerfile                   # Multi-stage production container build
│   ├── .dockerignore                # Docker ignore rules
│   ├── .env.example                 # Backend environment template
│   ├── eslint.config.mjs            # ESLint flat configuration
│   ├── .prettierrc                  # Code style configuration
│   ├── tsconfig.json                # TypeScript compiler configuration
│   └── package.json                 # Backend dependencies and scripts
│
└── frontend/                        # React + TypeScript + Vite + Material UI
    ├── src/
    │   ├── api/                     # Pre-configured Axios client with interceptors
    │   ├── components/              # UI components (StatusCard, MetricCard, TechStackCard)
    │   ├── hooks/                   # React hooks (useHealthCheck with TanStack Query)
    │   ├── layouts/                 # RootLayout with glassmorphic navbar & footer
    │   ├── pages/                   # HealthStatusPage (integration dashboard)
    │   ├── routes/                  # React Router AppRoutes configuration
    │   ├── services/                # HealthService API calling layer
    │   ├── theme/                   # Material UI theme tokens, palette, and typography
    │   ├── types/                   # TypeScript interfaces (HealthResponse, ApiError)
    │   ├── utils/                   # Formatters and helper functions
    │   ├── validations/             # Data structure validation helpers
    │   ├── App.tsx                  # Root application component
    │   ├── main.tsx                 # React DOM mount point
    │   └── index.css                # Global CSS resets & modern scrollbar
    ├── Dockerfile                   # Multi-stage container build with Nginx
    ├── .dockerignore                # Frontend docker ignore rules
    ├── .env.example                 # Frontend environment template
    ├── eslint.config.js             # ESLint configuration
    ├── .prettierrc                  # Prettier formatting rules
    ├── tsconfig.json                # TypeScript bundler configuration
    ├── tsconfig.node.json           # Vite Node TypeScript configuration
    ├── vite.config.ts               # Vite configuration and dev server proxy
    └── package.json                 # Frontend dependencies and scripts
```

---

## 4. Environment Configuration

1. Copy `.env.example` in root (or directly configure in `backend/.env` and `frontend/.env`):
   ```bash
   cp .env.example .env
   ```

2. Configuration variables:
   | Key | Description | Default |
   | :--- | :--- | :--- |
   | `PORT` | Backend HTTP Port | `5000` |
   | `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
   | `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |
   | `DB_HOST` | MySQL Server Host | `localhost` |
   | `DB_PORT` | MySQL Server Port | `3306` |
   | `DB_USER` | MySQL Username | `root` |
   | `DB_PASSWORD` | MySQL User Password | *Set in .env* |
   | `DB_NAME` | MySQL Database Name | `college_placement_db` |
   | `DATABASE_URL` | Prisma Connection String (`mysql://USER:PWD@HOST:PORT/DB`) | Configured via env |
   | `VITE_API_BASE_URL` | Base REST API URL for Frontend | `http://localhost:5000/api` |

---

## 5. Local Installation & Development

### Prerequisites
- Node.js (v20.x or higher)
- npm (v9.x or higher)
- MySQL 8.x (running locally or via Docker)

### Step 1: Install Backend Dependencies & Generate Prisma Client
```bash
cd backend
npm install
npm run prisma:generate
```

### Step 2: Install Frontend Dependencies
```ba
cd frontend
npm install
```

---

## 6. Running the Services Locally

### Start Backend API Server
```bash
cd backend
npm run dev
```
* Backend runs at: `http://localhost:5000`
* Health Check Endpoint: `http://localhost:5000/api/health`

### Start Frontend Application
```bash
cd frontendsh
npm run dev
```
* Frontend runs at: `http://localhost:5173`

---

## 7. Docker Orchestration

Run the entire platform (MySQL 8.x, Backend API, Frontend Nginx) in isolated containers:

```bash
# Build and start all services in detached mode
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop all services

docker compose down
```

---

## 8. Verification Commands

Run the following commands to validate Phase 1 code quality and functionality:

| Scope | Check | Command |
| :--- | :--- | :--- |
| **Backend** | TypeScript Type Check | `cd backend && npm run typecheck` |
| **Backend** | ESLint Code Analysis | `cd backend && npm run lint` |
| **Backend** | Production TypeScript Build | `cd backend && npm run build` |
| **Backend** | Database Connectivity Check | `cd backend && npm run db:check` |
| **Frontend** | TypeScript Type Check | `cd frontend && npm run typecheck` |
| **Frontend** | ESLint Code Analysis | `cd frontend && npm run lint` |
| **Frontend** | Production Bundle Build | `cd frontend && npm run build` |
| **Integration** | Health Endpoint Verification | `curl http://localhost:5000/api/health` |

---

## 9. API Specification (Phase 1)

### `GET /api/health`
Checks API operational status.

**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "API is running"
}
```

### `GET /api/health/db` (Optional Diagnostics)
Checks MySQL connection via Prisma.

**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Database is connected",
  "data": {
    "database": "MySQL 8.x",
    "status": "CONNECTED",
    "latencyMs": 4,
    "timestamp": "2026-09-08T21:30:00.000Z"
  }
}
```
