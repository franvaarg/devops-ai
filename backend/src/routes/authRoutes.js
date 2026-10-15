const { log, logFailure } = require("../operations/logger");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../database/db");
const {
  loginRateLimiter,
  passwordRecoveryRateLimiter,
  passwordResetRateLimiter,
  registerRateLimiter,
} = require("../middleware/rateLimiters");
const {
  requestPasswordReset,
  resetPassword,
} = require("../services/passwordResetService");
const {
  isValidEmail,
  validatePassword,
} = require("../security/credentialValidation");

const router = express.Router();
router.use((req, res, next) => { res.locals.routeBase = req.baseUrl; next(); });
router.post('/logout', require('../middleware/authenticateToken'), async (req, res, next) => {
  try {
    await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [req.user.id]);
    return res.status(204).end();
  } catch (error) { return next(error); }
});
const DUMMY_PASSWORD_HASH =
  "$2b$12$B1kX1Aasm9ZFDDzuaFFY4.ni2OFxO8RpRGJyVsp08wwBoNqGp4pF.";

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tokenVersion: user.token_version ?? 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

router.post("/register", registerRateLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        message: "Name must contain between 2 and 100 characters.",
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        message: "A valid email address is required.",
      });
    }

    const passwordError = validatePassword(password, {
      email: cleanEmail,
      name: cleanName,
    });

    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    const existingUserResult = await pool.query(
      `
        SELECT id
        FROM users
        WHERE email = $1;
      `,
      [cleanEmail]
    );

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({
        message: "Unable to create an account with the provided details.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createdUserResult = await pool.query(
      `
        INSERT INTO users (
          name,
          email,
          password
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          name,
          email,
          token_version,
          created_at;
      `,
      [cleanName, cleanEmail, passwordHash]
    );

    const user = createdUserResult.rows[0];
    const token = createToken(user);
    log("authentication_succeeded");

    return res.status(201).json({
      message: "User registered successfully.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Unable to create an account with the provided details.",
      });
    }

    return next(error);
  }
});

router.post("/login", loginRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanEmail || typeof password !== "string" || !password || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const userResult = await pool.query(
      `
        SELECT
          id,
          name,
          email,
          password,
          token_version,
          created_at
        FROM users
        WHERE email = $1;
      `,
      [cleanEmail]
    );

    const user = userResult.rows[0];

    // Always perform a bcrypt comparison so nonexistent accounts do not have
    // an obviously faster response than accounts with a wrong password.
    const passwordMatches = await bcrypt.compare(
      password,
      user?.password || DUMMY_PASSWORD_HASH
    );

    if (!user || !passwordMatches) {
      log("authentication_rejected", { code: "AUTHENTICATION_REQUIRED", expected: true });
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user);
    log("authentication_succeeded");

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/forgot-password",
  passwordRecoveryRateLimiter,
  async (req, res) => {
    const cleanEmail =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (isValidEmail(cleanEmail)) {
      try {
        await requestPasswordReset(cleanEmail);
      } catch (error) {
        logFailure("password_reset_delivery_failed", error);
      }
    }

    return res.status(202).json({
      message:
        "If an account exists for that email, a password reset link will be sent.",
    });
  }
);

router.post(
  "/reset-password",
  passwordResetRateLimiter,
  async (req, res, next) => {
    const { password, token } = req.body || {};

    const passwordError = validatePassword(password);

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        message: "A valid password reset request is required.",
      });
    }

    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    try {
      const passwordWasReset = await resetPassword(token, password);

      if (!passwordWasReset) {
        return res.status(400).json({
          message: "The password reset link is invalid or has expired.",
        });
      }

      return res.status(200).json({
        message: "Password reset successfully. You can now sign in.",
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
