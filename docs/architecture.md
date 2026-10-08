# College Placement Assessment Platform — Architecture Overview

## 1. System Vision & Purpose

The **College Placement Assessment Platform** is an enterprise-ready, scalable web application designed to manage student evaluations, placement preparation, online assessments, coding challenges, and reporting.

Phase 1 establishes the foundational architecture:
- Layered backend separation of concerns
- Modern, accessible, theme-driven frontend with React Query & Material UI
- Strictly typed end-to-end interfaces
- Dockerized local and production orchestration
- Scalable Prisma ORM database connectivity with MySQL 8.x

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│   React 18 + TypeScript + Material UI + React Query + Axios │
└──────────────────────────────┬──────────────────────────────┘
                               │
                        HTTP / REST API
                       (Port 5000 /api)
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend REST Service                     │
│               Node.js + Express + TypeScript                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Middlewares: Helmet, CORS, JSON Parser, ErrorHandler   │ │
│  └───────────────────────────┬────────────────────────────┘ │
│  │ Routes & Validators       │                            │ │
│  └───────────────────────────┼────────────────────────────┘ │
│  │ Controllers (HTTP Logic)  │                            │ │
│  └───────────────────────────┼────────────────────────────┘ │
│  │ Services (Business Logic) │                            │ │
│  └───────────────────────────┼────────────────────────────┘ │
│  │ Repositories (Data Access)│                            │ │
│  └───────────────────────────┼────────────────────────────┘ │
│  │ Prisma Client ORM         │                            │ │
│  └───────────────────────────┴────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       TCP / MySQL Protocol
                          (Port 3306)
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  MySQL 8.x Database Engine                  │
│       Storage: college_placement_db (InnoDB, utf8mb4)       │
└─────────────────────────────────────────────────────────────┘
```

## 3. Backend Architecture (Layered N-Tier)

The backend follows the Controller-Service-Repository pattern to enforce single responsibility:

```
src/
├── config/        # Environment and 3rd party clients (Prisma, Logger)
├── controllers/   # Request/Response orchestration, status codes
├── services/      # Core business rules and orchestration
├── repositories/  # Direct database access via Prisma Client
├── middleware/    # Global error handling, logging, security headers
├── routes/        # Route declarations and router composition
├── validators/    # Input schema validation
├── utils/         # Standard response wrappers and utility functions
└── types/         # TypeScript types, interfaces, and DTOs
```

### Key Principles:
1. **Zero Domain Logic in Controllers**: Controllers only parse requests and format responses.
2. **Repository Decoupling**: Database calls are encapsulated in repositories.
3. **Centralized Error Handling**: Unhandled exceptions and custom `AppError` instances flow through `errorHandler` middleware to return uniform JSON payloads.
4. **Environment Isolation**: All configuration is loaded and validated in `src/config/env.config.ts`.

## 4. Frontend Architecture

The frontend uses Vite with React, TypeScript, Material UI, and TanStack React Query:

```
src/
├── api/           # Pre-configured Axios instance with interceptors
├── components/    # Reusable, design-system-aligned UI components
├── hooks/         # Custom React hooks encapsulating queries/mutations
├── layouts/       # Shell layouts (Navigation, Header, Container)
├── pages/         # Page-level route views
├── routes/        # Route configuration with React Router
├── services/      # API communication methods (invoking Axios)
├── theme/         # Material UI theme tokens, typography, and palette
├── types/         # Domain and API response type definitions
├── utils/         # Formatting and helper utilities
└── validations/   # Input validation schemas
```

### Key Principles:
1. **Server State Management**: Server state is managed via TanStack React Query, ensuring automatic caching, background re-fetching, and declarative error/loading states.
2. **Consistent Design System**: Material UI is configured with tailored colors, Google Fonts typography, glassmorphism, and responsive breakpoints.
3. **Strict Type Safety**: All API requests and responses are strictly typed via shared TypeScript contracts.

## 5. Security & Production Hardening

- **Helmet**: Secures HTTP response headers against clickjacking, XSS, and sniffing.
- **CORS**: Configurable origin restriction via `CORS_ORIGIN`.
- **Environment Isolation**: Real secrets are never checked into git. `.env.example` provides documentation templates.
- **Graceful Shutdown**: Node.js processes handle `SIGTERM` and `SIGINT` to cleanly close database connections and active sockets.
