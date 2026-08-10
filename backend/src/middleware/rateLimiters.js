const { rateLimit } = require("express-rate-limit");

const RATE_LIMIT_MESSAGE = "Too many requests. Please try again later.";

function createRateLimiter({ windowMs, limit, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => {
      return res.status(429).json({
        message: RATE_LIMIT_MESSAGE,
      });
    },
  });
}

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

const passwordRecoveryRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

const passwordResetRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

const analyzeRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => String(req.user.id),
});

module.exports = {
  analyzeRateLimiter,
  loginRateLimiter,
  passwordRecoveryRateLimiter,
  passwordResetRateLimiter,
  registerRateLimiter,
};
