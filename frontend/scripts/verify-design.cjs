// Additional full-product visual/state coverage. All service responses are fixtures.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const AxeBuilder = require(
  process.env.AXE_MODULE || "@axe-core/playwright",
).default;
const assert = require("node:assert/strict");
const fs = require("node:fs");
const dir = process.env.BROWSER_REPORT_DIR || "/tmp/kanyi-design-report";
const origin = process.env.APP_URL || "http://127.0.0.1:5174";
(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let plan = "free";
      let accountFailure = false;
      let history = [];
      const analysis = {
        id: 1,
        severity: "Critical",
        summary: "Synthetic incident for layout verification",
        evidence: ["ERROR orders connection refused"],
        rootCause: "Possible dependency failure",
        confidence: "Low",
        recommendation:
          "Verify dependency health before changing configuration.",
        steps: ["Check connectivity", "Confirm customer impact"],
        missingInformation: ["Recovery status"],
        verificationSteps: ["Compare adjacent timestamps"],
        actionability: "Investigate",
        falsePositiveRisk: "Medium",
        noiseAssessment: "Insufficient context to dismiss.",
        originalLog: "ERROR orders connection refused",
        createdAt: "2026-10-31T12:00:00Z",
      };
      await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        let body = {};
        let status = 200;
        if (path.endsWith("/me"))
          body = { user: { id: 1, email: "synthetic@example.test" } };
        else if (path.endsWith("/plans"))
          body = {
            available: true,
            freeLimit: 50,
            proLimit: 500,
            maxLogBytes: 16384,
            pricing: { amount: 2900, currency: "usd", interval: "month" },
          };
        else if (path.endsWith("/account")) {
          if (accountFailure) {
            status = 503;
            body = { message: "Synthetic outage" };
          } else
            body = {
              account: {
                plan,
                subscriptionStatus: plan === "pro" ? "past_due" : "inactive",
                hasBillingCustomer: plan === "pro",
                cancelAtPeriodEnd: false,
                currentPeriodEnd: null,
              },
              usage: {
                plan,
                used: plan === "pro" ? 12 : 50,
                limit: plan === "pro" ? 500 : 50,
                reserved: 0,
                remaining: plan === "pro" ? 488 : 0,
              },
            };
        } else if (path.endsWith("/history")) body = history;
        else if (path.endsWith("/forgot-password"))
          body = {
            message: "If an account exists, a reset link has been sent.",
          };
        else if (path.endsWith("/analyze")) body = analysis;
        else {
          status = 404;
          body = { message: "Fixture not configured" };
        }
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      });
      async function audit(stage) {
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${width}/${stage} overflow`,
        );
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        if (result.violations.length)
          fs.writeFileSync(
            `${dir}/${width}-${stage}-axe.json`,
            JSON.stringify(result.violations, null, 2),
          );
        assert.equal(
          result.violations.length,
          0,
          JSON.stringify(
            result.violations.map((v) => ({
              id: v.id,
              targets: v.nodes.map((n) => n.target),
            })),
          ),
        );
        await page.screenshot({
          path: `${dir}/${width}-${stage}.png`,
          fullPage: true,
        });
      }
      await page.goto(origin + "/#login");
      await page
        .getByRole("heading", { name: "Welcome back", exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.classList.contains("dark"),
        ),
        true,
      );
      await audit("login");
      await page.getByRole("button", { name: "Register", exact: true }).click();
      await audit("registration");
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .first()
        .click();
      await page
        .getByRole("button", { name: "Forgot your password?", exact: true })
        .click();
      await audit("recovery");
      await page.evaluate(() => {
        localStorage.setItem("token", "synthetic-layout-session");
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: "Synthetic Developer with a deliberately long display name for responsive layout validation",
            email: "synthetic@example.test",
          }),
        );
      });
      await page.goto(origin);
      await page.getByRole("heading", { name: "KANYI", exact: true }).waitFor();
      await page.getByText(/You have reached your monthly limit/).waitFor();
      await page.getByText("No saved analyses yet", { exact: true }).waitFor();
      await page
        .getByText("Delete account and saved analyses", { exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Permanently delete my account" })
          .isDisabled(),
        true,
      );
      await page
        .getByLabel("Confirm with your password")
        .fill("synthetic-confirmation-passphrase");
      assert.equal(
        await page
          .getByRole("button", { name: "Permanently delete my account" })
          .isDisabled(),
        false,
      );
      await audit("workspace-empty-quota");
      const navigation = page.getByRole("navigation", {
        name: "Workspace navigation",
      });
      await navigation.getByRole("link", { name: /Analysis history/ }).click();
      await page.waitForFunction(() => document.querySelector('.app-rail a[href="#history"]').getAttribute('aria-current') === 'location');
      assert.equal(
        await navigation
          .getByRole("link", { name: /Analysis history/ })
          .getAttribute("aria-current"),
        "location",
      );
      await navigation.getByRole("link", { name: /Investigate/ }).click();
      // Real FileReader and upload validation, with synthetic text; no upload API exists.
      await page.locator("#log-file").setInputFiles({
        name: "incident.log",
        mimeType: "text/plain",
        buffer: Buffer.from(analysis.originalLog),
      });
      await page.waitForFunction(
        (expected) => document.getElementById("log-input").value === expected,
        analysis.originalLog,
      );
      assert.equal(
        await page.getByLabel("Log content", { exact: true }).inputValue(),
        analysis.originalLog,
      );
      await page
        .getByRole("button", { name: "Assess incident", exact: true })
        .click();
      await page.locator(".assessment-result").first().waitFor();
      await audit("assessment");
      history = [analysis];
      plan = "pro";
      await page.reload();
      await page.getByRole("button", { name: "Manage subscription" }).waitFor();
      await page.getByRole("button", { name: /View full analysis/ }).click();
      await page
        .getByRole("button", { name: "Delete analysis", exact: true })
        .click();
      await page.getByText("Delete this analysis?", { exact: true }).waitFor();
      await audit("history-delete-billing");
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      accountFailure = true;
      await page.reload();
      await page.getByText(/Plan details could not be loaded/).waitFor();
      await audit("account-error");
      assert.deepEqual(errors, []);
      report.push({
        width,
        darkDefault: true,
        auth: true,
        registration: true,
        recovery: true,
        realFileReader: true,
        assessment: true,
        empty: true,
        quota: true,
        history: true,
        deleteConfirmation: true,
        billingAttention: true,
        accountError: true,
        axeViolations: 0,
        overflow: false,
      });
      await context.close();
    }
    fs.writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
