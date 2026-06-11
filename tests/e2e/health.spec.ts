import { test, expect } from "@playwright/test";

// M0.5: /api/health is the target of an external free uptime monitor. It must
// be unauthenticated, fast, and report db/redis/blob status without throwing.
test.describe("health endpoint (M0.5)", () => {
  test("GET /api/health → 200 with db/redis/blob status", async ({ request }) => {
    // Warm up once so the timing assertion measures steady-state, not cold-start route compile.
    await request.get("/api/health");

    const started = Date.now();
    const res = await request.get("/api/health");
    const elapsed = Date.now() - started;

    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(500);

    const body = await res.json();
    expect(body).toMatchObject({
      db: expect.stringMatching(/^(ok|err)$/),
      redis: expect.stringMatching(/^(ok|err)$/),
      blob: expect.stringMatching(/^(ok|err)$/),
    });
    // DB must actually be up in CI (postgres service) — health is meaningless otherwise.
    expect(body.db).toBe("ok");
  });
});
