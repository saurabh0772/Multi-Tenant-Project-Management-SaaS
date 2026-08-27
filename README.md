# Multi-Tenant Project Management SaaS

A production-oriented full-stack MERN SaaS application demonstrating clean architecture, multi-tenancy isolation, role-based access control (RBAC), and scalable engineering practices.

---

## 📌 Implementation Status

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 01** | **Project Foundation & Architecture** | **Completed** |
| **Phase 02** | **Database Models & Database Layer** | **Completed** |
| **Phase 03** | **Authentication & Session Management** | **Completed** |
| **Phase 04** | **Multi-Tenancy & RBAC** | **Completed** |
| **Phase 05** | **Organization & Member Management** | **Completed** |
| **Phase 06** | **Projects & Project Management** | **Completed** |
| **Phase 07** | **Tasks & Task Management** | **Completed** |
| **Phase 08** | **Comments, Attachments & Activity Logs** | **Completed** |
| **Phase 09** | **Notifications + Redis + Background Jobs** | **Completed** |
| **Phase 10** | **Socket.IO Real-Time Features** | **Completed** |
| **Phase 11** | **Search, Filtering, Pagination & Analytics** | **Completed** |
| **Phase 12** | **Frontend UI/UX Integration** | **Completed** |
| **Phase 13** | **Security Hardening** | **Completed** |
| **Phase 14** | **Production Deployment, Observability & DevOps Infrastructure** | **Completed** |

> 📖 **Local Development Setup**: For step-by-step instructions on running the project locally, see [docs/15-local-development.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/15-local-development.md).

## 🚀 Tech Stack

### Frontend (`client/`)
- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State & Data**: TanStack Query (React Query), Zustand
- **Forms & Validation**: React Hook Form, Zod
- **Routing**: React Router DOM v6
- **Icons**: Lucide React

### Backend (`server/`)
- **Runtime**: Node.js 20, TypeScript
- **Framework**: Express.js
- **Database**: MongoDB via Mongoose ORM
- **Logging**: Pino structured logger
- **Security**: Helmet, CORS
- **Validation**: Zod schema validation

### Infrastructure (`docker/`)
- **Containers**: Multi-stage Docker build (`docker/Dockerfile.api`)
- **Orchestration**: Docker Compose (`docker-compose.yml`) for local MongoDB & Redis

---

## 🏗️ Architecture Overview

The system follows a **Modular Monolith** pattern with clear separation of concerns:

```text
Client (React + Vite)
        │
        ▼ HTTP / REST
Express Server Gateway (/api/v1)
        │
┌───────┴───────┐
▼               ▼
Middlewares     Controllers
                │
                ▼
                Services (Business Logic)
                │
                ▼
                Repositories (Data Access)
                │
                ▼
                MongoDB (Mongoose)
```

---

## 📁 Directory Structure

```text
Multi-Tenant Project Management SaaS/
├── client/                 # React + Vite Frontend Application
│   ├── src/
│   │   ├── api/            # Centralized API HTTP client
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Domain feature modules (auth, orgs, projects, tasks)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── layouts/        # Layout templates
│   │   ├── pages/          # Page components
│   │   ├── routes/         # Router configuration
│   │   ├── services/       # Client-side services
│   │   ├── stores/         # Zustand state stores
│   │   ├── types/          # Client TypeScript definitions
│   │   ├── utils/          # Client utilities
│   │   ├── App.tsx         # Main App component
│   │   └── main.tsx        # React entry point
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.json
├── server/                 # Node.js + Express Backend Service
│   ├── src/
│   │   ├── config/         # Environment (Zod) & DB connection setup
│   │   ├── controllers/    # HTTP controllers
│   │   ├── middlewares/    # Error handlers, 404, security middlewares
│   │   ├── models/         # Mongoose database models
│   │   ├── repositories/   # Data access layer
│   │   ├── routes/         # API routes (/health, /api/v1)
│   │   ├── services/       # Core business logic
│   │   ├── types/          # Backend TypeScript types
│   │   ├── utils/          # Logger (Pino), AppError utility
│   │   ├── app.ts          # Express app initialization
│   │   └── server.ts       # Server boot & graceful shutdown
│   ├── vitest.config.ts
│   └── tsconfig.json
├── shared/                 # Shared TypeScript Types & Contracts
│   ├── src/
│   │   └── index.ts        # Shared API response interfaces
│   └── tsconfig.json
├── docker/
│   └── Dockerfile.api      # Multi-stage production API Dockerfile
├── docs/                   # Full Technical Specifications
│   ├── 00-project-details.md
│   ├── 01-requirements.md
│   ├── 02-system-design.md
│   ├── 03-database-design.md
│   ├── 04-api-documentation.md
│   ├── 05-authentication-authorization.md
│   ├── 06-multi-tenancy.md
│   ├── 07-security.md
│   ├── 08-testing.md
│   ├── 09-deployment.md
│   └── phases/
│       └── final-flow-phases.md
├── .env.example            # Environment variables template
├── docker-compose.yml      # Local dev services (MongoDB + Redis)
└── package.json            # Root monorepo workspace configuration
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Docker & Docker Compose**: (Optional but recommended for local DB)

### Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Start local MongoDB & Redis containers:
   ```bash
   docker compose up -d mongodb redis
   ```

3. Install workspace dependencies:
   ```bash
   npm install
   ```

---

## 💻 Development & Execution Commands

### Development Mode
Start both server and client concurrently:
```bash
npm run dev
```

Or start individually:
```bash
npm run dev:server    # Starts backend on http://localhost:5000
npm run dev:client    # Starts frontend on http://localhost:5173
```

### Verification & Quality Commands

```bash
# Run ESLint across monorepo
npm run lint

# Run TypeScript strict typechecking
npm run typecheck

# Run Vitest test suite
npm run test

# Production build across packages
npm run build
```

---

## 📖 System Documentation

The architectural source of truth is located in [docs/](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs):

- [00-project-details.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/00-project-details.md) — Executive summary & tech stack overview
- [01-requirements.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/01-requirements.md) — Software Requirements Specification (SRS)
- [02-system-design.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/02-system-design.md) — High-level system architecture
- [03-database-design.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/03-database-design.md) — MongoDB schema specifications & indexing
- [04-api-documentation.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/04-api-documentation.md) — REST API specifications
- [05-authentication-authorization.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/05-authentication-authorization.md) — JWT & RBAC specifications
- [06-multi-tenancy.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/06-multi-tenancy.md) — Logical tenant isolation design
- [07-security.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/07-security.md) — Defense-in-depth security model
- [08-testing.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/08-testing.md) — Automated testing strategy
- [09-deployment.md](file:///home/saurabh/Documents/Multi-Tenant%20Project%20Management%20SaaS/docs/09-deployment.md) — Containerization & CI/CD deployment strategy
