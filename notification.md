# Notification System Design

---

## Stage 1

### Core Actions

A notification platform for a student portal needs to support the following actions:

- Fetch all notifications for a logged-in student (paginated)
- Fetch a single notification by ID
- Mark a specific notification as read
- Mark all notifications as read
- Delete a notification
- Fetch unread notification count
- Fetch notifications filtered by type

---

### REST API Endpoints

#### 1. Get All Notifications

```
GET /api/notifications
```

**Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters**
| Parameter | Type | Required | Description |
|---|---|---|---|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 10) |
| notification_type | string | No | Filter: Event, Result, Placement |

**Response 200**
```json
{
  "notifications": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Result",
      "message": "mid-sem results are published",
      "timestamp": "2026-04-22T17:51:30Z",
      "isRead": false,
      "studentId": "1042"
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 10,
  "totalPages": 12
}
```

---

#### 2. Get Single Notification

```
GET /api/notifications/:id
```

**Headers**
```
Authorization: Bearer <token>
```

**Response 200**
```json
{
  "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
  "type": "Placement",
  "message": "CSX Corporation hiring",
  "timestamp": "2026-04-22T17:51:30Z",
  "isRead": false,
  "studentId": "1042"
}
```

**Response 404**
```json
{ "error": "Notification not found" }
```

---

#### 3. Mark One Notification as Read

```
PATCH /api/notifications/:id/read
```

**Headers**
```
Authorization: Bearer <token>
```

**Response 200**
```json
{ "success": true, "id": "d146095a-0d86-4a34-9e69-3900a14576bc" }
```

---

#### 4. Mark All Notifications as Read

```
PATCH /api/notifications/read-all
```

**Headers**
```
Authorization: Bearer <token>
```

**Response 200**
```json
{ "success": true, "updated": 45 }
```

---

#### 5. Delete a Notification

```
DELETE /api/notifications/:id
```

**Headers**
```
Authorization: Bearer <token>
```

**Response 200**
```json
{ "success": true }
```

---

#### 6. Get Unread Count

```
GET /api/notifications/unread-count
```

**Headers**
```
Authorization: Bearer <token>
```

**Response 200**
```json
{ "unreadCount": 12 }
```

---

#### 7. Get Priority Notifications

```
GET /api/notifications/priority?n=10
```

**Headers**
```
Authorization: Bearer <token>
```

**Query Parameters**
| Parameter | Type | Description |
|---|---|---|
| n | integer | Number of top notifications to return |

**Response 200**
```json
{
  "notifications": [
    {
      "id": "b283218f-ea5a-4b7c-93a9-1f2f240d64be",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "timestamp": "2026-04-22T17:51:18Z",
      "isRead": false,
      "score": 30.99
    }
  ]
}
```

---

### Real-Time Notifications

For real-time delivery, **Server-Sent Events (SSE)** is the recommended approach for this use case.

**Why SSE over WebSockets:**
- Notifications are server-to-client only — no need for bidirectional communication
- SSE is natively supported by browsers with automatic reconnection
- Lower infrastructure complexity than maintaining WebSocket connections at scale
- Works over standard HTTP/2 multiplexing

**SSE Endpoint**

```
GET /api/notifications/stream
Authorization: Bearer <token>
```

The server holds the connection open and pushes events as they arrive.

**Event Format**
```
event: notification
data: {"id":"abc123","type":"Placement","message":"TCS hiring","timestamp":"2026-04-22T18:00:00Z"}

event: ping
data: {"ts": 1745000000}
```

The frontend subscribes using the native `EventSource` API and appends incoming notifications to the local state without polling.

---

## Stage 2

### Recommended Database: PostgreSQL

**Reasoning:**

PostgreSQL is the right choice here for several reasons. Notifications have a well-defined, consistent schema — each record has a type, message, timestamp, student reference, and read state. This fits a relational model well. The queries needed (filter by studentId, filter by type, order by time, aggregate unread counts) are exactly what SQL databases are optimized for. PostgreSQL also supports partial indexes natively, which becomes critical for the unread query pattern. For a university portal where data integrity matters and the schema is stable, a relational database is a more reliable foundation than a document store.

---

### DB Schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  roll_no     VARCHAR(50) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  message           TEXT NOT NULL,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_student_id ON notifications(student_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_unread_per_student ON notifications(student_id, created_at DESC) WHERE is_read = FALSE;
```

---

### Scalability Problems and Solutions

As the data grows to millions of rows, a few problems emerge:

**Problem 1 — Query slowdown on large tables:** Full table scans become expensive when filtering by student_id and is_read across 5M rows.

**Solution:** The partial index `idx_unread_per_student` limits the index to only unread rows, shrinking the index dramatically and making the common unread-fetch query fast.

**Problem 2 — Table bloat from old notifications:** Notifications from 2 years ago are rarely accessed but still consume storage and slow down vacuums.

**Solution:** Implement table partitioning by `created_at` (monthly or quarterly partitions). PostgreSQL's declarative partitioning allows queries to skip irrelevant partitions entirely. Old partitions can be archived or dropped.

**Problem 3 — Write pressure during bulk notifications:** Inserting 50,000 rows simultaneously overwhelms the DB.

**Solution:** Use a message queue (e.g. Redis + BullMQ) to batch inserts. The consumer writes in chunks of 500-1000 rows using bulk INSERT statements.

**Problem 4 — Repeated unread count queries:** Every page load hitting the DB for unread count is wasteful.

**Solution:** Cache unread counts per student in Redis with a short TTL. Invalidate on mark-read events.

---

### SQL Queries

**Fetch paginated notifications for a student**
```sql
SELECT id, notification_type, message, is_read, created_at
FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

**Fetch unread notifications for a student**
```sql
SELECT id, notification_type, message, created_at
FROM notifications
WHERE student_id = $1 AND is_read = FALSE
ORDER BY created_at DESC;
```

**Mark one notification as read**
```sql
UPDATE notifications
SET is_read = TRUE
WHERE id = $1 AND student_id = $2;
```

**Mark all notifications as read for a student**
```sql
UPDATE notifications
SET is_read = TRUE
WHERE student_id = $1 AND is_read = FALSE;
```

**Get unread count**
```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE student_id = $1 AND is_read = FALSE;
```

**Filter notifications by type**
```sql
SELECT id, notification_type, message, is_read, created_at
FROM notifications
WHERE student_id = $1 AND notification_type = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;
```

---

## Stage 3

### Query Analysis

**Original Query**
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

**Is this query accurate?**

Not entirely. The ordering should be `DESC` (newest first) for a notification inbox — users expect to see the most recent unread items first, not the oldest. Returning oldest-first is a poor UX default for notifications.

**Why is it slow?**

With 5,000,000 rows, this query is slow for two reasons. First, there is no index on `(studentID, isRead)` — the database performs a sequential scan across the entire table to find matching rows. Second, `SELECT *` fetches all columns including any large text fields, increasing I/O unnecessarily.

**What to change**

```sql
SELECT id, notification_type, message, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 50;
```

Changes made:
- Replaced `SELECT *` with only needed columns
- Changed `ASC` to `DESC`
- Added `LIMIT` to prevent unbounded result sets
- The partial index `idx_unread_per_student` defined in Stage 2 covers this query — it indexes only unread rows per student, making this a fast index scan instead of a sequential scan

**Computation cost after fix:** With the partial index, this query drops from O(N) sequential scan to an index range scan returning only the relevant student's unread rows. At 5M total rows but perhaps 200 unread per student, the effective scan is over ~200 rows, not 5M.

---

### Indexing Every Column — Is It Good Advice?

No, this is not effective advice. Indexes are not free — every index must be updated on every INSERT, UPDATE, and DELETE. Adding indexes on every column would:

- Drastically slow down write operations, especially the bulk notify-all scenario
- Consume significant additional disk space
- Cause PostgreSQL's query planner to spend more time evaluating which index to use, sometimes resulting in worse plans

The right approach is targeted indexing: index columns that appear in WHERE clauses, ORDER BY clauses, and JOIN conditions for the actual queries your application runs. Index selectivity matters too — indexing a boolean column like `is_read` alone is rarely useful since it has only two distinct values.

---

### Placement Notifications in Last 7 Days

```sql
SELECT DISTINCT s.id, s.name, s.email, s.roll_no
FROM students s
JOIN notifications n ON n.student_id = s.id
WHERE n.notification_type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

### Caching Notifications to Reduce DB Load

The core problem is that every page load triggers a DB query, and with 50,000 students, this is significant repeated load, especially for data that changes infrequently.

**Strategy 1 — Application-Level Cache with Redis**

Cache the result of each student's notification fetch in Redis with a TTL of 60-120 seconds.

```
Key: notifications:student:{studentId}:page:{page}:type:{type}
TTL: 90 seconds
```

On a cache hit, serve from Redis. On a miss, query PostgreSQL and populate the cache.

Tradeoffs: Very fast reads, near-zero DB load for repeated fetches. The downside is staleness — a student might see a 90-second-old list. For notifications, this is usually acceptable. Cache invalidation on write events (mark-read, new notification) keeps the data reasonably fresh.

**Strategy 2 — Unread Count Cache**

The unread count is fetched on every page load and shown in the navbar badge. This is the most frequent query and one of the cheapest to cache.

```
Key: unread_count:student:{studentId}
TTL: 30 seconds
Invalidate on: mark-read events
```

Tradeoffs: Effectively eliminates the COUNT query from the DB. The 30-second staleness is acceptable since badge counts are inherently approximate in most products.

**Strategy 3 — Client-Side Caching with ETags or Last-Modified**

The backend can return an `ETag` or `Last-Modified` header with each notification response. The frontend sends `If-None-Match` or `If-Modified-Since` on subsequent requests. If nothing changed, the server returns `304 Not Modified` with no body — saving bandwidth and rendering time.

Tradeoffs: Requires a consistent way to compute or store a version/hash per student's notification list. Works best combined with server-side caching.

**Strategy 4 — SSE-Driven Local State**

If real-time SSE is active, the client already receives new notifications as they arrive. The frontend can maintain its own local notification list in state and only makes the initial fetch on login — subsequent updates come through the event stream. Page navigation does not trigger new API calls.

Tradeoffs: Requires SSE infrastructure. State is lost on hard refresh, so a lightweight initial fetch is still needed. This is the most scalable approach for reducing read pressure at high concurrency.

---

## Stage 5

### Problems with the Original Implementation

```python
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message)
    save_to_db(student_id, message)
    push_to_app(student_id, message)
```

This implementation has several serious problems:

**1. Synchronous sequential processing:** Iterating through 50,000 students one at a time is extremely slow. If each iteration takes 100ms (email API + DB insert + push), the total runtime is over 83 minutes.

**2. No error isolation:** If `send_email` fails for one student, the remaining students may not be notified. The loop breaks or skips silently.

**3. No retry mechanism:** Failed email sends (as happened for 200 students) are lost permanently. There is no record of which sends failed.

**4. Tightly coupled operations:** Email sending and DB insertion happen together in sequence. If the DB insert fails after the email was sent, the student has no in-app notification but received an email — inconsistent state.

**5. No observability:** There is no logging or tracking of progress.

---

### Should DB save and email send happen together?

No. These are two independent side effects with different failure modes. The email service is an external third-party API that can fail, rate-limit, or time out. The DB write is an internal operation. Coupling them means a transient email failure blocks the DB write, and vice versa. They should be decoupled.

---

### Redesigned Approach: Queue-Based Fan-Out

```python
function notify_all(student_ids: array, message: string):
  batch_id = generate_uuid()
  
  for chunk in split(student_ids, size=500):
    enqueue("notification_jobs", {
      "batch_id": batch_id,
      "student_ids": chunk,
      "message": message,
      "created_at": now()
    })
  
  log(INFO, "notify_all enqueued", { batch_id, total: len(student_ids) })


worker function process_notification_job(job):
  for student_id in job.student_ids:
    
    db_result = save_to_db(student_id, job.message)
    if db_result.error:
      log(ERROR, "DB insert failed", { student_id, batch_id: job.batch_id })
      mark_failed(job.batch_id, student_id, reason="db")
      continue
    
    push_to_app(student_id, job.message)
    
    email_result = send_email_async(student_id, job.message)
    if email_result.error:
      log(WARN, "Email send failed", { student_id, batch_id: job.batch_id })
      enqueue("email_retry_jobs", {
        "student_id": student_id,
        "message": job.message,
        "attempts": 1,
        "batch_id": job.batch_id
      })
```

**Key changes:**
- Work is chunked and enqueued — multiple workers process chunks in parallel
- DB write happens first and independently of email — in-app notification is guaranteed even if email fails
- Failed emails are placed on a retry queue with attempt tracking
- All failures are logged with batch_id for full traceability
- The original API call returns immediately; processing happens asynchronously

---

## Stage 6

### Priority Inbox Approach

**Scoring Function**

Each notification is scored using a combination of type weight and recency:

```
score = type_weight + recency_score

type_weight:
  Placement = 30
  Result     = 20
  Event      = 10

recency_score = max(0, 100 - age_in_hours)
```

This ensures that a very recent Event can outrank a days-old Placement, preserving temporal relevance while still privileging high-priority types.

**Data Structure: Min-Heap**

To maintain the top N notifications efficiently as new ones arrive, a min-heap of size N is used. The heap maintains the minimum-scored item at its root.

For each incoming notification:
- If the heap has fewer than N items, push unconditionally
- If the heap is full and the new notification's score exceeds the root (minimum), pop the root and push the new one

This gives O(log N) insertion per notification and O(N log N) for the initial build — far better than sorting the full list on every update.

**Handling Continuous Incoming Notifications**

When new notifications arrive via SSE, each one is scored and compared against the current minimum in the heap. If it qualifies, the heap updates in O(log N) time. The frontend re-renders the priority list after each update without re-fetching everything from the server.

The full implementation is in `notification_app_be/src/priority.ts`.
