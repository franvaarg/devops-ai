const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");

const modulePaths = {
  db: require.resolve("../src/database/db"),
  emailService: require.resolve("../src/services/emailService"),
  passwordResetService: require.resolve(
    "../src/services/passwordResetService"
  ),
  quotaService: require.resolve("../src/services/quotaService"),
};

function mockModule(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function clearServiceModules() {
  Object.values(modulePaths).forEach((modulePath) => {
    delete require.cache[modulePath];
  });
}

test("password-reset email is sent through Brevo with the configured sender", async (t) => {
  clearServiceModules();
  const originalFetch = global.fetch;
  const originalEnvironment = {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };
  const requests = [];

  t.after(() => {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    clearServiceModules();
  });

  process.env.BREVO_API_KEY = "test-api-key";
  process.env.EMAIL_FROM = "KANYI Support <support@example.test>";
  process.env.FRONTEND_URL = "https://app.example.test";
  global.fetch = async (...args) => {
    requests.push(args);
    return { ok: true, status: 201 };
  };

  const { sendPasswordResetEmail } = require(modulePaths.emailService);
  await sendPasswordResetEmail({
    email: "recipient@example.test",
    name: "Test User",
    token: "reset-token",
  });

  assert.equal(requests.length, 1);
  const [url, options] = requests[0];
  assert.equal(url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(options.method, "POST");
  assert.equal(options.headers["api-key"], "test-api-key");
  assert.equal(options.headers["content-type"], "application/json");
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(options.body), {
    sender: {
      name: "KANYI Support",
      email: "support@example.test",
    },
    to: [{ email: "recipient@example.test", name: "Test User" }],
    subject: "Reset your KANYI password",
    textContent: [
      "Hello Test User,",
      "",
      "Use the link below to reset your password. It expires in one hour.",
      "https://app.example.test/reset-password?token=reset-token",
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
  });
});

test("password-reset email reports Brevo failures without exposing response data", async (t) => {
  clearServiceModules();
  const originalFetch = global.fetch;
  const originalApiKey = process.env.BREVO_API_KEY;

  t.after(() => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.BREVO_API_KEY;
    } else {
      process.env.BREVO_API_KEY = originalApiKey;
    }
    clearServiceModules();
  });

  process.env.BREVO_API_KEY = "secret-test-api-key";
  global.fetch = async () => ({ ok: false, status: 400 });

  const { sendPasswordResetEmail } = require(modulePaths.emailService);
  await assert.rejects(
    sendPasswordResetEmail({
      email: "recipient@example.test",
      name: "Test User",
      token: "reset-token",
    }),
    (error) => {
      assert.equal(error.message, "Brevo email delivery failed with status 400.");
      assert.doesNotMatch(error.message, /secret-test-api-key/);
      return true;
    }
  );
});

test("password-reset email aborts a timed-out Brevo request", async (t) => {
  clearServiceModules();
  const originalApiKey = process.env.BREVO_API_KEY;
  const originalFetch = global.fetch;
  const originalSetTimeout = global.setTimeout;

  t.after(() => {
    global.fetch = originalFetch;
    global.setTimeout = originalSetTimeout;
    if (originalApiKey === undefined) {
      delete process.env.BREVO_API_KEY;
    } else {
      process.env.BREVO_API_KEY = originalApiKey;
    }
    clearServiceModules();
  });

  process.env.BREVO_API_KEY = "test-api-key";
  global.setTimeout = (callback, delay) => {
    assert.equal(delay, 10_000);
    queueMicrotask(callback);
    return 1;
  };
  global.fetch = async (_url, { signal }) => {
    await new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("request aborted");
        error.name = "AbortError";
        reject(error);
      });
    });
  };

  const { sendPasswordResetEmail } = require(modulePaths.emailService);
  await assert.rejects(
    sendPasswordResetEmail({
      email: "recipient@example.test",
      name: "Test User",
      token: "reset-token",
    }),
    { message: "Brevo email delivery timed out." }
  );
});

function createQuotaPool({ plan = "free", status = "inactive", limitUsed = 0 } = {}) {
  const calls = [];
  let analysesUsed = limitUsed;

  const client = {
    async query(sql, parameters = []) {
      calls.push({ parameters, sql });

      if (/^BEGIN|^COMMIT|^ROLLBACK/.test(sql)) {
        return { rows: [] };
      }

      if (/SELECT plan, subscription_status/i.test(sql)) {
        return { rows: [{ plan, subscription_status: status }] };
      }

      if (/INSERT INTO monthly_usage/i.test(sql)) {
        if (analysesUsed >= parameters[1]) {
          return { rows: [] };
        }

        analysesUsed += 1;
        return { rows: [{ analyses_used: analysesUsed }] };
      }

      throw new Error("Unexpected query.");
    },
    release() {
      calls.push({ parameters: [], sql: "RELEASE" });
    },
  };

  return {
    calls,
    client,
    get analysesUsed() {
      return analysesUsed;
    },
    pool: {
      async connect() {
        return client;
      },
    },
  };
}

test("successful persistence commits active pro quota atomically", async () => {
  clearServiceModules();
  const quotaDatabase = createQuotaPool({
    plan: "pro",
    status: "active",
    limitUsed: 26,
  });
  mockModule(modulePaths.db, quotaDatabase.pool);

  const { runWithAnalysisQuota } = require(modulePaths.quotaService);
  const usage = await runWithAnalysisQuota(101, async (client) => {
    assert.equal(client, quotaDatabase.client);
    return { id: 501 };
  });

  assert.deepEqual(usage, {
    allowed: true,
    limit: 500,
    plan: "pro",
    used: 27,
    value: { id: 501 },
  });
  assert.ok(quotaDatabase.calls.some(({ sql }) => sql === "BEGIN"));
  assert.ok(quotaDatabase.calls.some(({ sql }) => sql === "COMMIT"));
  assert.equal(quotaDatabase.analysesUsed, 27);
});

test("inactive paid accounts receive the free quota", async () => {
  clearServiceModules();
  const quotaDatabase = createQuotaPool({
    plan: "pro",
    status: "past_due",
    limitUsed: 50,
  });
  mockModule(modulePaths.db, quotaDatabase.pool);

  const { runWithAnalysisQuota } = require(modulePaths.quotaService);
  const usage = await runWithAnalysisQuota(101, async () => {
    throw new Error("Operation must not run when quota is exhausted.");
  });

  assert.deepEqual(usage, {
    allowed: false,
    limit: 50,
    plan: "free",
    used: 50,
  });
  assert.ok(quotaDatabase.calls.some(({ sql }) => sql === "ROLLBACK"));
  assert.ok(!quotaDatabase.calls.some(({ sql }) => sql === "COMMIT"));
});

test("persistence failure rolls back quota consumption", async () => {
  clearServiceModules();
  const quotaDatabase = createQuotaPool({ limitUsed: 12 });
  const originalQuery = quotaDatabase.client.query.bind(quotaDatabase.client);
  let transactionStartUsage = quotaDatabase.analysesUsed;

  quotaDatabase.client.query = async (sql, parameters) => {
    if (sql === "BEGIN") {
      transactionStartUsage = quotaDatabase.analysesUsed;
    }

    const result = await originalQuery(sql, parameters);

    if (sql === "ROLLBACK") {
      while (quotaDatabase.analysesUsed > transactionStartUsage) {
        // The mock restores transactional state; PostgreSQL performs this rollback.
        quotaDatabase.client.decrementUsage();
      }
    }

    return result;
  };
  quotaDatabase.client.decrementUsage = () => {
    Object.defineProperty(quotaDatabase, "analysesUsed", {
      configurable: true,
      value: quotaDatabase.analysesUsed - 1,
    });
  };

  mockModule(modulePaths.db, quotaDatabase.pool);
  const { runWithAnalysisQuota } = require(modulePaths.quotaService);

  await assert.rejects(
    runWithAnalysisQuota(101, async () => {
      throw new Error("Analysis insert failed.");
    }),
    /Analysis insert failed/
  );

  assert.ok(quotaDatabase.calls.some(({ sql }) => sql === "ROLLBACK"));
  assert.ok(!quotaDatabase.calls.some(({ sql }) => sql === "COMMIT"));
});

test("simultaneous quota transactions cannot exceed the free limit", async () => {
  clearServiceModules();
  const quotaDatabase = createQuotaPool({ limitUsed: 49 });
  mockModule(modulePaths.db, quotaDatabase.pool);
  const { runWithAnalysisQuota } = require(modulePaths.quotaService);

  const results = await Promise.all([
    runWithAnalysisQuota(101, async () => "first"),
    runWithAnalysisQuota(101, async () => "second"),
  ]);

  assert.equal(results.filter(({ allowed }) => allowed).length, 1);
  assert.equal(results.filter(({ allowed }) => !allowed).length, 1);
  assert.equal(quotaDatabase.analysesUsed, 50);
});

function createPasswordResetPool(initialTokens = []) {
  const calls = [];
  const state = {
    tokens: initialTokens.map((token) => ({ ...token })),
  };
  let userLock = Promise.resolve();

  return {
    calls,
    state,
    pool: {
      async connect() {
        let releaseUserLock;
        let transactionTokens;

        return {
          async query(sql, parameters = []) {
            calls.push({ parameters, sql });

            if (sql === "BEGIN") {
              return { rows: [] };
            }

            if (/SELECT id, name, email[\s\S]*FOR UPDATE/i.test(sql)) {
              const previousLock = userLock;
              userLock = new Promise((resolve) => {
                releaseUserLock = resolve;
              });
              await previousLock;
              transactionTokens = state.tokens.map((token) => ({ ...token }));
              return {
                rows: [
                  {
                    id: 101,
                    name: "Existing User",
                    email: "existing@example.test",
                  },
                ],
              };
            }

            if (/UPDATE password_reset_tokens/i.test(sql)) {
              transactionTokens.forEach((token) => {
                if (token.userId === parameters[0] && !token.used) {
                  token.used = true;
                }
              });
              return { rows: [] };
            }

            if (/INSERT INTO password_reset_tokens/i.test(sql)) {
              transactionTokens.push({
                hash: parameters[1],
                userId: parameters[0],
                used: false,
              });
              return { rows: [] };
            }

            if (sql === "COMMIT") {
              state.tokens = transactionTokens;
              releaseUserLock?.();
              return { rows: [] };
            }

            if (sql === "ROLLBACK") {
              releaseUserLock?.();
              return { rows: [] };
            }

            throw new Error("Unexpected password-reset query.");
          },
          release() {},
        };
      },
    },
  };
}

function validResetTokens(database) {
  return database.state.tokens.filter((token) => !token.used);
}

test("successful password-reset issuance stores only the emailed token hash", async () => {
  clearServiceModules();
  const database = createPasswordResetPool();
  const emails = [];
  mockModule(modulePaths.db, database.pool);
  mockModule(modulePaths.emailService, {
    async sendPasswordResetEmail(message) {
      emails.push(message);
    },
  });

  const { requestPasswordReset } = require(modulePaths.passwordResetService);
  await requestPasswordReset("existing@example.test");

  assert.equal(emails.length, 1);
  assert.match(emails[0].token, /^[a-f0-9]{64}$/);
  assert.deepEqual(validResetTokens(database), [
    {
      hash: crypto.createHash("sha256").update(emails[0].token).digest("hex"),
      userId: 101,
      used: false,
    },
  ]);
  assert.ok(database.calls.some(({ sql }) => sql === "COMMIT"));
});

test("email delivery failure rolls back the new token and preserves the previous token", async () => {
  clearServiceModules();
  const previousToken = { hash: "previous", userId: 101, used: false };
  const database = createPasswordResetPool([previousToken]);
  mockModule(modulePaths.db, database.pool);
  mockModule(modulePaths.emailService, {
    async sendPasswordResetEmail() {
      throw new Error("Email delivery failed.");
    },
  });

  const { requestPasswordReset } = require(modulePaths.passwordResetService);
  await assert.rejects(
    requestPasswordReset("existing@example.test"),
    /Email delivery failed/
  );

  assert.deepEqual(validResetTokens(database), [previousToken]);
  assert.ok(database.calls.some(({ sql }) => sql === "ROLLBACK"));
  assert.ok(!database.calls.some(({ sql }) => sql === "COMMIT"));
});

test("successful replacement invalidates the previous reset token", async () => {
  clearServiceModules();
  const database = createPasswordResetPool([
    { hash: "previous", userId: 101, used: false },
  ]);
  const emails = [];
  mockModule(modulePaths.db, database.pool);
  mockModule(modulePaths.emailService, {
    async sendPasswordResetEmail(message) {
      emails.push(message);
    },
  });

  const { requestPasswordReset } = require(modulePaths.passwordResetService);
  await requestPasswordReset("existing@example.test");

  assert.equal(validResetTokens(database).length, 1);
  assert.notEqual(validResetTokens(database)[0].hash, "previous");
  assert.equal(emails.length, 1);
});

test("concurrent password-reset requests leave exactly one valid token", async () => {
  clearServiceModules();
  const database = createPasswordResetPool();
  const emails = [];
  let releaseFirstEmail;
  const firstEmailBlocked = new Promise((resolve) => {
    releaseFirstEmail = resolve;
  });
  let firstEmailStarted;
  const firstEmailReady = new Promise((resolve) => {
    firstEmailStarted = resolve;
  });
  mockModule(modulePaths.db, database.pool);
  mockModule(modulePaths.emailService, {
    async sendPasswordResetEmail(message) {
      emails.push(message);
      if (emails.length === 1) {
        firstEmailStarted();
        await firstEmailBlocked;
      }
    },
  });

  const { requestPasswordReset } = require(modulePaths.passwordResetService);
  const firstRequest = requestPasswordReset("existing@example.test");
  await firstEmailReady;
  const secondRequest = requestPasswordReset("existing@example.test");
  releaseFirstEmail();
  await Promise.all([firstRequest, secondRequest]);

  assert.equal(emails.length, 2);
  assert.equal(validResetTokens(database).length, 1);
  const lastEmailedHash = crypto
    .createHash("sha256")
    .update(emails[1].token)
    .digest("hex");
  assert.equal(validResetTokens(database)[0].hash, lastEmailedHash);
});
