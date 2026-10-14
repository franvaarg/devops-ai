const jwt = require("jsonwebtoken");
const pool = require("../database/db");

async function authenticateToken(req, res, next) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res.status(401).json({
      message: "Authentication token is required.",
    });
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Authorization header must use the Bearer token format.",
    });
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!decodedToken || typeof decodedToken !== 'object' || !Number.isInteger(decodedToken.userId) || decodedToken.userId < 1 || decodedToken.userId > 2147483647 ||
        (decodedToken.tokenVersion !== undefined && (!Number.isInteger(decodedToken.tokenVersion) || decodedToken.tokenVersion < 0))) throw new Error('Invalid claims');
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired authentication token.",
    });
  }

  try {
    const userResult = await pool.query(
      "SELECT token_version FROM users WHERE id = $1;",
      [decodedToken.userId]
    );

    if (
      userResult.rows.length === 0 ||
      (decodedToken.tokenVersion ?? 0) !==
        userResult.rows[0].token_version
    ) {
      return res.status(401).json({
        message: "Invalid or expired authentication token.",
      });
    }

    req.user = {
      id: decodedToken.userId,
      email: decodedToken.email,
    };

    next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticateToken;
