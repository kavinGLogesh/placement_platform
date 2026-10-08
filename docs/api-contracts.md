# API Contracts & REST Standards

## 1. REST Conventions

All API routes are prefixed with `/api`. Standard HTTP status codes are utilized:
- `200 OK`: Successful retrieval or action
- `201 Created`: Resource successfully created
- `400 Bad Request`: Validation failure or invalid parameters
- `404 Not Found`: Resource or endpoint does not exist
- `500 Internal Server Error`: Unhandled server exception

## 2. Standard Response Envelope

All API endpoints follow a consistent JSON response contract:

### Success Response Format:
```json
{
  "success": true,
  "message": "Human-readable status or message",
  "data": {} // Optional payload
}
```

### Error Response Format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Optional field-level validation errors
}
```

---

## 3. Phase 1 Endpoints

### 3.1 Health Check

Retrieves the current operational status of the Backend REST API.

- **Method**: `GET`
- **Path**: `/api/health`
- **Authentication**: None
- **Headers**: `Accept: application/json`

#### Response:
- **Status**: `200 OK`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": true,
  "message": "API is running"
}
```

---

### 3.2 Database Diagnostics (Optional Diagnostic Endpoint)

Retrieves the connection status between the Backend and MySQL via Prisma.

- **Method**: `GET`
- **Path**: `/api/health/db`
- **Authentication**: None
- **Headers**: `Accept: application/json`

#### Response:
- **Status**: `200 OK`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": true,
  "message": "Database is connected",
  "data": {
    "database": "MySQL 8.x",
    "status": "CONNECTED",
    "timestamp": "2026-09-08T21:30:00.000Z"
  }
}
```
