# Database Architecture & Configuration

This directory contains database initialization scripts and schema documentation for the **College Placement Assessment Platform**.

## Technology

- **Database Engine**: MySQL 8.x
- **ORM**: Prisma ORM (v5.x+)
- **Default Database**: `college_placement_db`
- **Character Set**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`

## Phase 1 Scope

In Phase 1, only the connection foundation and connectivity verification are established. Complete application schemas (users, roles, question bank, assessments, coding submissions) will be defined in subsequent phases.

## Local vs. Containerized Setup

### Option 1: Docker (Recommended)
When running `docker compose up -d mysql`, MySQL 8.0 will automatically execute `init.sql` to initialize the database and verification table.

### Option 2: Local MySQL Instance
If you are running a local MySQL 8.0 server (e.g. Windows service `MySQL80`):
1. Connect via MySQL Workbench or CLI:
   ```bash
   mysql -u root -p < database/init.sql
   ```
2. Update the `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/college_placement_db"
   ```

## Prisma Commands

All Prisma commands are run from the `backend/` directory:

```bash
# Generate Prisma Client
npm run prisma:generate

# Verify database connection and push schema
npm run db:check
```
