const assert = require("node:assert/strict");
const test = require("node:test");

const jwt = require("jsonwebtoken");
const request = require("supertest");

const TEST_JWT_SECRET = "backend-test-secret";
const EXISTING_USER = {
  id: 101,
  email: "existing@example.test",
};

const modulePaths = {
  app: require.resolve("../src/app"),
  authRoutes: require.resolve("../src/routes/authRoutes"),
  authenticateToken: require.resolve(
    "../src/middleware/authenticateToken"
  ),
  db: require.resolve("../src/database/db"),
  aiService: require.resolve("../src/services/aiService"),
  analysisService: require.resolve(
    "../src/services/analysisService"
  ),
  rateLimiters: require.resolve("../src/middleware/rateLimiters"),
  quotaService: require.resolve("../src/services/quotaService"),
  passwordResetService: require.resolve(
    "../src/services/passwordResetService"
  ),
  accountRoutes: require.resolve("../src/routes/accountRoutes"),
};

function mockModule(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function createHarness({
  aiFailure = false,
  existingUserIds = [EXISTING_USER.id],
  invalidAiResponse = false,
  quotaAllowed = true,
  registrationEmailExists = false,
  resetRequestFailure = false,
  resetPasswordResult = true,
  saveFailure = false,
  tokenVersion = 0,
} = {}) {
  Object.values(modulePaths).forEach((modulePath) => {
    delete require.cache[modulePath];
  });

  process.env.JWT_SECRET = TEST_JWT_SECRET;

  const calls = {
    database: [],
    analyzeLog: [],
    saveAnalysis: [],
    getHistory: [],
    deleteAnalysis: [],
    getAnalysisUsage: [],
    runWithAnalysisQuota: [],
    requestPasswordReset: [],
    resetPassword: [],
  };

  const pool = {
    async query(sql, parameters = []) {
      calls.database.push({ sql, parameters });

      if (/SELECT token_version FROM users WHERE id/i.test(sql)) {
        return {
          rows: existingUserIds.includes(parameters[0])
            ? [{ token_version: tokenVersion }]
            : [],
        };
      }

      if (/SELECT id[\s\S]*FROM users[\s\S]*WHERE email = \$1/i.test(sql)) {
        return { rows: registrationEmailExists ? [{ id: 101 }] : [] };
      }

      if (/INSERT INTO users/i.test(sql)) {
        return {
          rows: [{
            id: 202,
            name: parameters[0],
            email: parameters[1],
            token_version: 0,
            created_at: "2026-08-29T00:00:00.000Z",
          }],
        };
      }

      if (/SELECT\s+id,\s+name,\s+email,\s+plan,/i.test(sql)) {
        return {
          rows: [
            {
              id: EXISTING_USER.id,
              name: "Existing User",
              email: EXISTING_USER.email,
              plan: "free",
              subscription_status: "inactive",
              current_period_end: null,
              created_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        };
      }

      throw new Error("Unexpected database query in isolated test.");
    },
  };

  const aiService = {
    async analyzeLog(log) {
      calls.analyzeLog.push(log);
      if (aiFailure) {
        throw new Error("Provider failed.");
      }

      if (invalidAiResponse) {
        throw new Error("Provider returned an invalid response.");
      }

      return {
        severity: "High",
        summary: "Service unavailable",
        evidence: ["upstream returned 503"],
        rootCause: "A dependency failure is likely.",
        confidence: "Medium",
        recommendation: "Restore the dependency",
        steps: ["Check dependency health"],
      };
    },
  };

  const analysisService = {
    async saveAnalysis(...parameters) {
      calls.saveAnalysis.push(parameters);
      if (saveFailure) {
        throw new Error("Persistence failed.");
      }

      return {
        id: 501,
        severity: parameters[0].severity,
        summary: parameters[0].summary,
        evidence: parameters[0].evidence,
        root_cause: parameters[0].rootCause,
        confidence: parameters[0].confidence,
        recommendation: parameters[0].recommendation,
        steps: parameters[0].steps,
        original_log: parameters[1],
        created_at: "2026-08-10T00:00:00.000Z",
      };
    },
    async getHistory(...parameters) {
      calls.getHistory.push(parameters);
      return [];
    },
    async deleteAnalysis(...parameters) {
      calls.deleteAnalysis.push(parameters);
      return null;
    },
  };

  const quotaService = {
    async runWithAnalysisQuota(userId, operation) {
      calls.runWithAnalysisQuota.push(userId);

      if (!quotaAllowed) {
        return { allowed: false, limit: 50, plan: "free", used: 50 };
      }

      const value = await operation({ query() {} });
      return {
        allowed: true,
        limit: 50,
        plan: "free",
        used: 1,
        value,
      };
    },
    async getAnalysisUsage(userId) {
      calls.getAnalysisUsage.push(userId);
      return quotaAllowed
        ? { limit: 50, plan: "free", remaining: 50, used: 0 }
        : { limit: 50, plan: "free", remaining: 0, used: 50 };
    },
  };

  const passwordResetService = {
    async requestPasswordReset(email) {
      calls.requestPasswordReset.push(email);
      if (resetRequestFailure) {
        throw new Error("Email delivery failed.");
      }
    },
    async resetPassword(...parameters) {
      calls.resetPassword.push(parameters);
      return resetPasswordResult;
    },
  };

  mockModule(modulePaths.db, pool);
  mockModule(modulePaths.aiService, aiService);
  mockModule(modulePaths.analysisService, analysisService);
  mockModule(modulePaths.quotaService, quotaService);
  mockModule(modulePaths.passwordResetService, passwordResetService);

  return {
    app: require(modulePaths.app),
    calls,
  };
}

function createToken(payload = EXISTING_USER, options = { expiresIn: "5m" }) {
  return jwt.sign(
    {
      userId: payload.id,
      email: payload.email,
    },
    TEST_JWT_SECRET,
    options
  );
}

function authorize(token) {
  return `Bearer ${token}`;
}

test("authentication accepts a valid token for an existing user", async () => {
  const { app } = createHarness();

  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", authorize(createToken()));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    user: EXISTING_USER,
  });
});

test("authentication rejects a valid token for a nonexistent user", async () => {
  const { app } = createHarness();
  const token = createToken({
    id: 999999,
    email: "missing@example.test",
  });

  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", authorize(token));

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, {
    message: "Invalid or expired authentication token.",
  });
});

test("authentication rejects an expired token", async () => {
  const { app, calls } = createHarness();
  const token = createToken(EXISTING_USER, { expiresIn: -1 });

  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", authorize(token));

  assert.equal(response.status, 401);
  assert.equal(calls.database.length, 0);
});

test("authentication rejects a malformed token", async () => {
  const { app, calls } = createHarness();

  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", "Bearer malformed.token.value");

  assert.equal(response.status, 401);
  assert.equal(calls.database.length, 0);
});

test("authentication rejects a missing Authorization header", async () => {
  const { app, calls } = createHarness();

  const response = await request(app).get("/api/auth/me");

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, {
    message: "Authentication token is required.",
  });
  assert.equal(calls.database.length, 0);
});

test("authentication rejects tokens revoked by a password reset", async () => {
  const { app } = createHarness({ tokenVersion: 1 });
  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", authorize(createToken()));

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, {
    message: "Invalid or expired authentication token.",
  });
});

test("HTTP hardening hides Express and sets security headers", async () => {
  const { app } = createHarness();
  const response = await request(app).get("/");

  assert.equal(response.status, 200);
  assert.equal(response.headers["x-powered-by"], undefined);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "SAMEORIGIN");
});

test("malformed JSON receives a safe JSON error", async () => {
  const { app } = createHarness();
  const response = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send('{"email":');

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    message: "Request body must contain valid JSON.",
  });
});

test("oversized request bodies receive a safe JSON error", async () => {
  const { app } = createHarness();
  const response = await request(app)
    .post("/api/auth/login")
    .send({ padding: "x".repeat(257 * 1024) });

  assert.equal(response.status, 413);
  assert.deepEqual(response.body, {
    message: "Request body is too large.",
  });
});

test("login validates required credentials before querying the database", async (t) => {
  for (const body of [
    {},
    { email: "user@example.test" },
    { password: "password123" },
  ]) {
    await t.test(JSON.stringify(body), async () => {
      const { app, calls } = createHarness();
      const response = await request(app).post("/api/auth/login").send(body);

      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        message: "Email and password are required.",
      });
      assert.equal(calls.database.length, 0);
    });
  }
});

test("registration validates input before querying the database", async (t) => {
  const cases = [
    {
      name: "missing fields",
      body: {},
      message: "Name, email and password are required.",
    },
    {
      name: "short name",
      body: {
        name: "A",
        email: "user@example.test",
        password: "safe-long-password",
      },
      message: "Name must contain between 2 and 100 characters.",
    },
    {
      name: "invalid email",
      body: {
        name: "Test User",
        email: "invalid-email",
        password: "safe-long-password",
      },
      message: "A valid email address is required.",
    },
    {
      name: "short password",
      body: {
        name: "Test User",
        email: "user@example.test",
        password: "short",
      },
      message: "Password must contain at least 10 characters.",
    },
    {
      name: "common password",
      body: {
        name: "Test User",
        email: "user@example.test",
        password: "password123",
      },
      message: "Choose a password that is not common or based on your name or email.",
    },
    {
      name: "password based on email",
      body: {
        name: "Test User",
        email: "exampleuser@example.test",
        password: "example-user",
      },
      message: "Choose a password that is not common or based on your name or email.",
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const { app, calls } = createHarness();
      const response = await request(app)
        .post("/api/auth/register")
        .send(testCase.body);

      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        message: testCase.message,
      });
      assert.equal(calls.database.length, 0);
    });
  }
});

test("login rate limiting returns JSON after 10 requests in 15 minutes", async () => {
  const { app, calls } = createHarness();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request(app).post("/api/auth/login").send({});
    assert.equal(response.status, 400);
  }

  const response = await request(app).post("/api/auth/login").send({});

  assert.equal(response.status, 429);
  assert.deepEqual(response.body, {
    message: "Too many requests. Please try again later.",
  });
  assert.equal(calls.database.length, 0);
});

test("registration returns only safe user fields and stores a password hash", async () => {
  const { app, calls } = createHarness();
  const response = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email: "new@example.test",
    password: "correct-horse-battery",
  });

  assert.equal(response.status, 201);
  assert.equal(typeof response.body.token, "string");
  assert.deepEqual(response.body.user, {
    id: 202,
    name: "Test User",
    email: "new@example.test",
    createdAt: "2026-08-29T00:00:00.000Z",
  });
  assert.equal(response.body.password, undefined);
  assert.equal(response.body.passwordHash, undefined);
  const insert = calls.database.find(({ sql }) => /INSERT INTO users/i.test(sql));
  assert.match(insert.parameters[2], /^\$2[aby]\$12\$/);
  assert.notEqual(insert.parameters[2], "correct-horse-battery");
});

test("duplicate registration does not disclose account existence", async () => {
  const { app } = createHarness({ registrationEmailExists: true });
  const response = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email: "existing@example.test",
    password: "correct-horse-battery",
  });

  assert.equal(response.status, 409);
  assert.deepEqual(response.body, {
    message: "Unable to create an account with the provided details.",
  });
});

test("registration rate limiting returns JSON after 5 requests in one hour", async () => {
  const { app, calls } = createHarness();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request(app).post("/api/auth/register").send({});
    assert.equal(response.status, 400);
  }

  const response = await request(app).post("/api/auth/register").send({});

  assert.equal(response.status, 429);
  assert.deepEqual(response.body, {
    message: "Too many requests. Please try again later.",
  });
  assert.equal(calls.database.length, 0);
});

test("password recovery returns the same response without exposing account existence", async (t) => {
  for (const testCase of [
    { email: "existing@example.test", expectedCall: true },
    { email: "invalid-email", expectedCall: false },
  ]) {
    await t.test(testCase.email, async () => {
      const { app, calls } = createHarness();
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: testCase.email });

      assert.equal(response.status, 202);
      assert.deepEqual(response.body, {
        message:
          "If an account exists for that email, a password reset link will be sent.",
      });
      assert.equal(
        calls.requestPasswordReset.length,
        testCase.expectedCall ? 1 : 0
      );
    });
  }
});

test("password recovery preserves its generic response when delivery fails", async () => {
  const { app, calls } = createHarness({ resetRequestFailure: true });
  const response = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "existing@example.test" });

  assert.equal(response.status, 202);
  assert.deepEqual(response.body, {
    message:
      "If an account exists for that email, a password reset link will be sent.",
  });
  assert.deepEqual(calls.requestPasswordReset, ["existing@example.test"]);
});

test("password reset accepts a valid token without external services", async () => {
  const { app, calls } = createHarness();
  const token = "a".repeat(64);
  const response = await request(app)
    .post("/api/auth/reset-password")
    .send({ password: "new-password-123", token });

  assert.equal(response.status, 200);
  assert.deepEqual(calls.resetPassword, [[token, "new-password-123"]]);
});

test("password reset rejects an expired or used token", async () => {
  const { app } = createHarness({ resetPasswordResult: false });
  const response = await request(app)
    .post("/api/auth/reset-password")
    .send({ password: "new-password-123", token: "b".repeat(64) });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    message: "The password reset link is invalid or has expired.",
  });
});

test("password reset enforces the server-side password policy", async () => {
  const { app, calls } = createHarness();
  const response = await request(app)
    .post("/api/auth/reset-password")
    .send({ password: "password123", token: "c".repeat(64) });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    message: "Choose a password that is not common or based on your name or email.",
  });
  assert.deepEqual(calls.resetPassword, []);
});

test("analysis rejects missing, blank, and non-string logs without external calls", async (t) => {
  const cases = [
    { name: "missing log", body: {} },
    { name: "empty log", body: { log: "" } },
    { name: "whitespace log", body: { log: "   \n\t" } },
    { name: "object log", body: { log: {} } },
    { name: "array log", body: { log: [] } },
    { name: "numeric log", body: { log: 42 } },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const { app, calls } = createHarness();
      const response = await request(app)
        .post("/api/analyze")
        .set("Authorization", authorize(createToken()))
        .send(testCase.body);

      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        message: "A log is required.",
      });
      assert.equal(calls.analyzeLog.length, 0);
      assert.equal(calls.saveAnalysis.length, 0);
    });
  }
});

test("analysis rate limiting returns JSON after 20 requests without external calls", async () => {
  const { app, calls } = createHarness();
  const authorization = authorize(createToken());

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await request(app)
      .post("/api/analyze")
      .set("Authorization", authorization)
      .send({});
    assert.equal(response.status, 400);
  }

  const response = await request(app)
    .post("/api/analyze")
    .set("Authorization", authorization)
    .send({});

  assert.equal(response.status, 429);
  assert.deepEqual(response.body, {
    message: "Too many requests. Please try again later.",
  });
  assert.equal(calls.analyzeLog.length, 0);
  assert.equal(calls.saveAnalysis.length, 0);
});

test("successful analysis is persisted within the quota transaction", async () => {
  const { app, calls } = createHarness();
  const response = await request(app)
    .post("/api/analyze")
    .set("Authorization", authorize(createToken()))
    .send({ log: "production service unavailable" });

  assert.equal(response.status, 201);
  assert.equal(response.body.id, 501);
  assert.deepEqual(calls.getAnalysisUsage, [EXISTING_USER.id]);
  assert.deepEqual(calls.analyzeLog, ["production service unavailable"]);
  assert.deepEqual(calls.runWithAnalysisQuota, [EXISTING_USER.id]);
  assert.equal(calls.saveAnalysis.length, 1);
  assert.equal(calls.saveAnalysis[0][2], EXISTING_USER.id);
  assert.ok(calls.saveAnalysis[0][3]);
});

test("provider failure does not enter the quota transaction or persist", async () => {
  const { app, calls } = createHarness({ aiFailure: true });
  const response = await request(app)
    .post("/api/analyze")
    .set("Authorization", authorize(createToken()))
    .send({ log: "production service unavailable" });

  assert.equal(response.status, 500);
  assert.deepEqual(calls.runWithAnalysisQuota, []);
  assert.equal(calls.saveAnalysis.length, 0);
});

test("analysis preserves plain text, stack traces, and JSON formatting", async (t) => {
  const inputs = {
    "plain text": "2026-08-29 service unavailable",
    "multiline stack trace":
      "Error: connection failed\n    at connect (/app/db.js:12:4)\nCaused by: timeout",
    "structured JSON":
      "{\n  \"level\": \"error\",\n  \"context\": {\n    \"status\": 503\n  }\n}\n",
  };

  for (const [name, log] of Object.entries(inputs)) {
    await t.test(name, async () => {
      const { app, calls } = createHarness();
      const response = await request(app)
        .post("/api/analyze")
        .set("Authorization", authorize(createToken()))
        .send({ log });

      assert.equal(response.status, 201);
      assert.deepEqual(calls.analyzeLog, [log]);
      assert.equal(calls.saveAnalysis[0][1], log);
    });
  }
});

test("invalid AI response does not enter the quota transaction or persist", async () => {
  const { app, calls } = createHarness({ invalidAiResponse: true });
  const response = await request(app)
    .post("/api/analyze")
    .set("Authorization", authorize(createToken()))
    .send({ log: "production service unavailable" });

  assert.equal(response.status, 500);
  assert.deepEqual(calls.runWithAnalysisQuota, []);
  assert.equal(calls.saveAnalysis.length, 0);
});

test("persistence failure is propagated from the quota transaction", async () => {
  const { app, calls } = createHarness({ saveFailure: true });
  const response = await request(app)
    .post("/api/analyze")
    .set("Authorization", authorize(createToken()))
    .send({ log: "production service unavailable" });

  assert.equal(response.status, 500);
  assert.deepEqual(calls.runWithAnalysisQuota, [EXISTING_USER.id]);
  assert.equal(calls.saveAnalysis.length, 1);
});

test("analysis quota exhaustion blocks Gemini and database saves", async () => {
  const { app, calls } = createHarness({ quotaAllowed: false });
  const response = await request(app)
    .post("/api/analyze")
    .set("Authorization", authorize(createToken()))
    .send({ log: "production service unavailable" });

  assert.equal(response.status, 429);
  assert.deepEqual(response.body, {
    message: "Monthly analysis quota exceeded.",
  });
  assert.deepEqual(calls.getAnalysisUsage, [EXISTING_USER.id]);
  assert.deepEqual(calls.runWithAnalysisQuota, []);
  assert.equal(calls.analyzeLog.length, 0);
  assert.equal(calls.saveAnalysis.length, 0);
});

test("account summary exposes safe billing state and monthly usage", async () => {
  const { app, calls } = createHarness();
  const response = await request(app)
    .get("/api/account")
    .set("Authorization", authorize(createToken()));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    account: {
      createdAt: "2026-01-01T00:00:00.000Z",
      currentPeriodEnd: null,
      email: EXISTING_USER.email,
      id: EXISTING_USER.id,
      name: "Existing User",
      plan: "free",
      subscriptionStatus: "inactive",
    },
    usage: { limit: 50, plan: "free", remaining: 50, used: 0 },
  });
  assert.deepEqual(calls.getAnalysisUsage, [EXISTING_USER.id]);
});

test("history passes the authenticated user ID to the service", async () => {
  const { app, calls } = createHarness();

  const response = await request(app)
    .get("/api/history")
    .set("Authorization", authorize(createToken()));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
  assert.equal(calls.getHistory.length, 1);
  assert.equal(calls.getHistory[0][0], EXISTING_USER.id);
});

test("history does not run for a token whose user does not exist", async () => {
  const { app, calls } = createHarness();
  const token = createToken({
    id: 999999,
    email: "missing@example.test",
  });

  const response = await request(app)
    .get("/api/history")
    .set("Authorization", authorize(token));

  assert.equal(response.status, 401);
  assert.equal(calls.getHistory.length, 0);
});

test("history deletion passes both analysis and authenticated user IDs", async () => {
  const { app, calls } = createHarness();

  const response = await request(app)
    .delete("/api/history/25")
    .set("Authorization", authorize(createToken()));

  assert.equal(response.status, 404);
  assert.deepEqual(calls.deleteAnalysis, [[25, EXISTING_USER.id]]);
});
