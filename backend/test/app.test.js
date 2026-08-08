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
};

function mockModule(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function createHarness({ existingUserIds = [EXISTING_USER.id] } = {}) {
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
  };

  const pool = {
    async query(sql, parameters = []) {
      calls.database.push({ sql, parameters });

      if (/SELECT 1 FROM users WHERE id/i.test(sql)) {
        return {
          rows: existingUserIds.includes(parameters[0]) ? [{}] : [],
        };
      }

      throw new Error("Unexpected database query in isolated test.");
    },
  };

  const aiService = {
    async analyzeLog(log) {
      calls.analyzeLog.push(log);
      throw new Error("Unexpected Gemini call in isolated test.");
    },
  };

  const analysisService = {
    async saveAnalysis(...parameters) {
      calls.saveAnalysis.push(parameters);
      throw new Error("Unexpected analysis save in isolated test.");
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

  mockModule(modulePaths.db, pool);
  mockModule(modulePaths.aiService, aiService);
  mockModule(modulePaths.analysisService, analysisService);

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
        password: "password123",
      },
      message: "Name must contain at least 2 characters.",
    },
    {
      name: "invalid email",
      body: {
        name: "Test User",
        email: "invalid-email",
        password: "password123",
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
      message: "Password must contain at least 8 characters.",
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
