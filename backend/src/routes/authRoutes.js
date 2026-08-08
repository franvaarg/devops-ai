const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../database/db");
const {
  loginRateLimiter,
  registerRateLimiter,
} = require("../middleware/rateLimiters");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

router.post("/register", registerRateLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (cleanName.length < 2) {
      return res.status(400).json({
        message: "Name must contain at least 2 characters.",
      });
    }

    if (!cleanEmail.includes("@")) {
      return res.status(400).json({
        message: "A valid email address is required.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
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
        message: "An account with this email already exists.",
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
          created_at;
      `,
      [cleanName, cleanEmail, passwordHash]
    );

    const user = createdUserResult.rows[0];
    const token = createToken(user);

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
    console.error("Register error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      message: "Something went wrong while registering the user.",
    });
  }
});

router.post("/login", loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanEmail || !password) {
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
          created_at
        FROM users
        WHERE email = $1;
      `,
      [cleanEmail]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user);

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
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong while logging in.",
    });
  }
});

module.exports = router;
