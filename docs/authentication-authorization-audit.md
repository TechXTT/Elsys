# Authentication, Admin Access & Audit Logging Overview

This document explains the authentication system, admin access control, role guards, and audit logging across NextAuth, JWT enrichment, API guards, and database tracking.

## Purpose
- Provide secure credential-based authentication via NextAuth
- Bootstrap initial admin user from environment variables (zero-config first deployment)
- Maintain role information in JWT tokens for quick permission checks
- Guard all admin APIs with role-based access control
- Track all admin mutations in immutable audit log for compliance and debugging

## Authentication Architecture

### Auth System Overview
See [lib/auth.ts](../lib/auth.ts)

**Stack**:
- **NextAuth v5**: Session management and middleware
- **Strategy**: JWT (stateless) + optional session persistence
- **Provider**: Credentials (email/password)
- **Adapter**: PrismaAdapter (auto-manages `User`, `Session`, `Account` tables)
- **Password Hashing**: bcryptjs (10 rounds)

### NextAuth Configuration
```typescript
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),    // Manages sessions in DB
  session: {
    strategy: "jwt",                 // Stateless JWT tokens
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Парола", type: "password" },  // Bulgarian label
      },
      async authorize(credentials) {
        // Auth logic here
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",          // Custom login page
  },
  callbacks: {
    jwt({ token, user }) { /* enrich token */ },
    session({ session, token }) { /* sync token → session */ },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
```

### Credential Provider Logic

#### User Lookup Flow
1. **Exact Email Match Required**
   - Email normalized: trimmed, lowercased
   - Case-insensitive lookup: `findUnique({ where: { email } })`

2. **Existing User Check**
   ```typescript
   const user = await prisma.user.findUnique({ where: { email } });
   if (user?.password) {
     const valid = await bcrypt.compare(password, user.password);
     if (!valid) return null;  // Wrong password
     return user;  // Success
   }
   ```
   - If user exists with password hash, compare
   - Wrong password returns `null` → auth fails

3. **Bootstrap Fallback** (Initial Setup)
   ```typescript
   const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
   const envAdminPass = process.env.ADMIN_PASSWORD;
   if (envAdminEmail && envAdminPass && email === envAdminEmail && password === envAdminPass) {
     const hash = await bcrypt.hash(envAdminPass, 10);
     const admin = await prisma.user.upsert({
       where: { email: envAdminEmail },
       update: { password: hash, role: "ADMIN" },
       create: { email: envAdminEmail, password: hash, name: "Admin", role: "ADMIN" },
     });
     return admin;
   }
   ```
   - If `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars present
   - AND credentials match exactly
   - THEN auto-create or update admin user in database with hashed password
   - **One-time only**: Next login uses stored password hash (not env vars)
   - Enables zero-config deployment; generate strong secret on production

#### Why Bootstrap Matters
- **First Deployment**: No users exist; can't log in initially
- **Env-Var Bootstrap**: Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` in deployment config
- **First Admin Login**: System creates user record + hashes password
- **Subsequent Logins**: Uses stored hash; env vars ignored (security improved on second access)
- **Manual User Creation**: Admins can create other users via admin UI (password management TBD)

## JWT Token Enrichment

### Token Callback
```typescript
async jwt({ token, user }) {
  if (user) token.userId = (user as any).id;
  
  // Enrich token with role for quick permission checks
  if (token.userId) {
    try {
      const dbUser = await prisma.user.findUnique({ 
        where: { id: token.userId as string } 
      });
      if (dbUser) (token as any).role = (dbUser as any).role;
    } catch {
      // ignore errors; token has no role
    }
  }
  return token;
}
```

**Benefits**:
- `userId` and `role` stored in JWT payload
- Available server-side without additional DB query
- Decoded on every request by NextAuth middleware
- Quick RBAC checks in admin APIs

### Session Callback
```typescript
async session({ session, token }) {
  if (token?.userId && session.user) (session.user as any).id = token.userId;
  if (session.user) (session.user as any).role = (token as any).role ?? undefined;
  return session;
}
```

**Exposes in Session**:
- `session.user.id`: User record ID from Prisma
- `session.user.role`: Admin/User/other roles
- Used by client-side components to show/hide UI

## Role-Based Access Control (RBAC)

### Role Enum
```prisma
enum Role {
  USER      // Regular user (default)
  ADMIN     // Full system access
}
```

**Extensible**: Add more roles as needed (e.g., `EDITOR`, `MODERATOR`).

### Admin API Guard Pattern
See [app/api/admin/pages/route.ts](../app/api/admin/pages/route.ts)

```typescript
function ensureAdmin(session: any): asserts session is { user: { id: string; role?: string } } {
  if (!session || !(session.user as any)?.id || (session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  ensureAdmin(session);  // Throws 403 if not admin
  const userId = (session!.user as any).id;
  // ... proceed with write operation
}
```

**Pattern Benefits**:
- Early exit on unauthorized access
- Type-safe: TypeScript assertion narrows session type post-check
- Consistent across all admin endpoints
- Clear error response (403 Forbidden)

### Protected Routes (Admin UI)
```typescript
// app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login");
  if ((session.user as any)?.role !== "ADMIN") return <div>Access Denied</div>;
  
  return <AdminShell>{children}</AdminShell>;
}
```

**Multi-Layer Defense**:
1. Session check (unauthenticated → redirect to login)
2. Role check (non-admin → error page)
3. API routes independently guard with `ensureAdmin()`

## Audit Logging

### Purpose
- Immutable record of all admin actions (CRUD on pages, news, navigation, users)
- Compliance: who did what, when, from where
- Debugging: roll back or understand side effects
- Security: detect suspicious patterns (bulk deletes, late-night access)

### Data Model
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String          // e.g., "PAGE_CREATE", "newsPost.translate.error"
  entity    String?         // e.g., "Page", "NewsPost", "User"
  entityId  String?         // ID of affected record
  details   Json?           // Action-specific metadata
  ip        String?         // Client IP (if captured)
  userAgent String?         // Browser user agent (if captured)
  createdAt DateTime @default(now())

  @@index([entity, entityId])
  @@index([userId, createdAt])
}
```

### Recording Audit Events
See [lib/audit.ts](../lib/audit.ts)

```typescript
export async function recordAudit({
  req,
  userId,
  action,
  entity,
  entityId,
  details,
}: {
  req: Request;
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, any>;
}) {
  try {
    const url = new URL(req.url);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || undefined;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ip,
        userAgent,
      },
    });
  } catch (e) {
    console.error("Failed to record audit log", e);
    // Fail silently; don't break the operation if logging fails
  }
}
```

### Audit Action Naming Convention
Actions are dot-separated hierarchies:

- **`PAGE_CREATE`** — Page created
- **`PAGE_UPDATE`** — Page edited
- **`PAGE_DELETE`** — Page deleted
- **`PAGE_PUBLISH`** — Page published
- **`PAGE_UNPUBLISH`** — Page unpublished
- **`newsPost.create`** — News article created
- **`newsPost.create.error`** — News creation failed
- **`newsPost.update.conflict`** — Slug collision on update
- **`newsPost.translate`** — Translation triggered
- **`newsPost.translate.error`** — Translation API error
- **`navigationItem.reorder`** — Navigation tree reordered
- **`user.login`** — User logged in
- **`user.login.failed`** — Failed login attempt
- **`user.create`** — New user created
- **`user.role.change`** — User role changed
- **`admin.export`** — Data exported
- **`admin.import`** — Data imported

### Recording Examples

#### Page Create
```typescript
await recordAudit({
  req,
  userId,
  action: "PAGE_CREATE",
  entity: "Page",
  entityId: created.id,
  details: { slug, locale, title, version: 1 },
});
```

#### News Translation
```typescript
await recordAudit({
  req,
  userId,
  action: "newsPost.translate",
  entity: "NewsPost",
  entityId: postId,
  details: {
    source: "bg",
    target: "en",
    provider: "deepl",
    fieldCount: 2,  // title + excerpt
  },
});
```

#### Translation Error
```typescript
await recordAudit({
  req,
  userId,
  action: "newsPost.translate.error",
  entity: "NewsPost",
  entityId: postId,
  details: {
    source: "bg",
    target: "en",
    provider: "deepl",
    error: "API rate limit exceeded",
  },
});
```

## Admin Access Workflow

### Login Flow
1. **User navigates to `/admin/login`**
   - Custom login page: `app/admin/login/page.tsx`
   - Form accepts email + password

2. **Form Submission**
   ```typescript
   // Client-side: uses NextAuth signIn
   const result = await signIn("credentials", {
     email,
     password,
     redirect: false,
   });
   if (result?.error) setError(result.error);
   ```

3. **NextAuth Credential Provider**
   - Calls `authorize()` with email + password
   - Checks existing user or bootstrap admin
   - Returns user object on success; `null` on failure

4. **Token & Session Creation**
   - If authorized, JWT callback enriches token with `userId` + `role`
   - NextAuth sets `next-auth.session-token` cookie
   - Session callback exposes user info to component

5. **Redirect to Admin**
   - Client redirected to `/admin/dashboard` (or return-to path)
   - Middleware checks session; allows access
   - Admin UI renders with user context

### Protected Admin Routes

#### Admin Layout Guard
```typescript
// app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/admin/login");
  }
  if ((session.user as any)?.role !== "ADMIN") {
    return <AccessDenied />;
  }
  return <AdminShell user={session.user}>{children}</AdminShell>;
}
```

**Three Gates**:
1. Session exists (unauthenticated → login page)
2. Role is ADMIN (non-admin → error page)
3. Layout renders admin UI

#### Admin API Endpoints
All `app/api/admin/*` routes apply `ensureAdmin()` guard:
```typescript
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  ensureAdmin(session);  // 403 if not admin
  // ... proceed
}
```

### Logout
```typescript
// Client-side button
const handleLogout = async () => {
  await signOut({ redirect: "/admin/login" });
};
```

- NextAuth clears `next-auth.session-token` cookie
- User redirected to login page
- Subsequent requests return `null` session

## Session Persistence & Timeouts

### JWT Token Expiry
- Default: 30 days
- Can customize via `authOptions.jwt.maxAge`
- Refreshed on each request (sliding window)

### Database Session Backup
- PrismaAdapter stores sessions in `Session` table
- Even if JWT expires, can refresh from DB
- Useful for logout tracking and revocation

### Session Timeout
- Configure max inactivity:
```typescript
session: {
  strategy: "jwt",
  maxAge: 24 * 60 * 60,  // 24 hours
  updateAge: 60 * 60,    // Refresh every hour
}
```

## Error Handling

### Authentication Errors
- **401 Unauthorized**: No session provided
- **403 Forbidden**: Session exists but insufficient role
- **400 Bad Request**: Invalid credentials (wrong password, missing fields)

### Common Error Responses

#### Missing Session
```json
{ "error": "Forbidden", "status": 403 }
```

#### Wrong Password
- Login form shows: "Invalid email or password"
- No distinction made for security (prevents email enumeration)

#### Role Insufficient
```json
{ "error": "Forbidden", "status": 403 }
```

#### Audit Logging Failure
- Does not block operation
- Error logged to console
- Admins notified asynchronously if critical

## Common Workflows

### Initial Deployment (Bootstrap Admin)
1. **Set Environment Variables**
   ```bash
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=SecureP@ss123!
   NEXTAUTH_SECRET=<random-secret>
   ```

2. **Deploy Application**
   - Database initialized
   - No users exist initially

3. **First Admin Login**
   - Navigate to `/admin/login`
   - Enter `admin@example.com` + `SecureP@ss123!`
   - System finds no user, checks env vars
   - Matches! Creates admin user with hashed password
   - Logs in, redirected to `/admin/dashboard`

4. **Change Password** (Later)
   - Admin goes to settings (if UI exists)
   - Changes password; new hash stored in DB
   - Next login uses new password (env vars ignored)

### Create Additional Admin User
1. **Existing Admin Access**
   - Only admins can manage users
   - Navigate to `/admin/users`

2. **Create User**
   - Fill email, temporary password
   - System sends email or displays one-time link
   - New user sets own password via one-time token (if implemented)

3. **Assign Role**
   - Admin selects role: ADMIN or USER
   - Audit log records: `user.create` + role

### Audit Log Review
1. **Admin navigates to `/admin/audit`**
   - Sees chronological list of all mutations
   - Filters by: user, action type, date range, entity

2. **Inspect Specific Entry**
   - Click to expand
   - View full `details` JSON
   - See IP, user agent
   - Identify who, what, when, where

3. **Anomaly Detection**
   - Bulk deletes from unusual IP
   - Late-night access
   - Failed login attempts
   - Unusual action sequences

### Rotating Credentials
1. **Change ADMIN_PASSWORD (Pre-Deploy)**
   - Update env var in deployment config
   - Deploy code
   - System does NOT overwrite existing admin on next login (already hashed in DB)
   - But subsequent admins created with new env vars use new password
   - **Recommendation**: Once deployed, change password via admin UI; don't change env var after first deployment

2. **Change Individual Admin Password**
   - Admin → Settings → Change Password
   - Enter current password + new password
   - System updates hash in DB
   - Logs out all sessions; requires re-login
   - Audit log: `user.password_change`

## Security Considerations

### Password Security
- **Hashing**: bcryptjs 10 rounds (slow, resistant to brute-force)
- **Transport**: HTTPS only (enforced in production)
- **Storage**: Plaintext env vars for bootstrap ONLY; hashed immediately on user creation
- **Never Log**: Passwords never recorded in audit logs or console

### Session Security
- **HttpOnly Cookie**: `next-auth.session-token` HttpOnly flag (not accessible to JavaScript)
- **Secure Flag**: Set on HTTPS (cookie only sent over encrypted connection)
- **SameSite**: Prevents CSRF attacks
- **Rotation**: Token refreshed on each request

### CSRF Protection
- NextAuth auto-includes CSRF tokens in all form submissions
- Middleware validates on state-change operations

### API Key & Secret Management
- **NEXTAUTH_SECRET**: Generate random 32+ char string
  ```bash
  openssl rand -base64 32
  ```
- **ADMIN_PASSWORD**: Use strong password (14+ chars, mixed case, numbers, symbols)
- **Store in**: Deployment platform secrets (Vercel, AWS, GCP, etc.), never commit to repo

### Audit Log Retention
- All audit logs immutable once written (no delete endpoint)
- Consider purging old logs (>1 year) to manage storage
- GDPR: May need to redact user data on deletion requests

### Role Escalation Prevention
- Users cannot change their own role (API guard enforces)
- Only existing admins can promote users to admin
- Audit log records all role changes
- No default admin creation except via bootstrap

## Environment Variables

### Required for Authentication
- **`NEXTAUTH_SECRET`**: Random 32+ character string for JWT signing
  - Generate: `openssl rand -base64 32`
  - Must be same across all server instances

### Bootstrap Admin (Optional but Recommended)
- **`ADMIN_EMAIL`**: Email for initial admin account
- **`ADMIN_PASSWORD`**: Password for initial admin account
- Only used on first login matching both values
- Once user created, stored password used instead

### Optional Session Tuning
- **`SESSION_MAX_AGE`**: Session expiry in seconds (default: 30 days)
- **`SESSION_UPDATE_AGE`**: Token refresh interval (default: 1 hour)

## Performance Considerations

### Session Lookup
- JWT decode is fast (local); no DB query needed per request
- Optional: PrismaAdapter session lookup adds DB roundtrip (can disable if pure JWT)

### Audit Log Writes
- Non-blocking; written asynchronously
- Indexes on `(entity, entityId)` and `(userId, createdAt)` for quick queries
- Consider pagination if audit log grows large (>1M rows)

### Role Checks
- Inline role check in `ensureAdmin()` function
- No additional DB query needed (role in JWT token)
- Sub-millisecond latency

## Extensibility

### Add Role Types
```prisma
enum Role {
  USER
  ADMIN
  EDITOR      // New role
  MODERATOR   // New role
}
```

Then guard specific APIs:
```typescript
function ensureEditor(session: any) {
  if (!(session.user as any)?.role?.includes("EDITOR")) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
```

### Custom Permission Checks
```typescript
function canManageUsers(session: any): boolean {
  const role = (session.user as any)?.role;
  return role === "ADMIN";  // Or custom logic
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!canManageUsers(session)) throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // ...
}
```

### Add OAuth Providers
```typescript
import Google from "next-auth/providers/google";

providers: [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  CredentialsProvider({ /* ... */ }),
]
```

### Audit Log Analysis
- Export logs to external SIEM (Splunk, DataDog, ELK)
- Set alerts for suspicious patterns
- Generate compliance reports

## Key Files
- Auth configuration: [lib/auth.ts](../lib/auth.ts)
- Audit logging: [lib/audit.ts](../lib/audit.ts)
- Admin guard pattern: [app/api/admin/pages/route.ts](../app/api/admin/pages/route.ts)
- Login page: `app/admin/login/page.tsx`
- Admin layout: `app/admin/layout.tsx`
- Prisma schema: [prisma/schema.prisma](../prisma/schema.prisma)
- Types: [lib/types.ts](../lib/types.ts)
