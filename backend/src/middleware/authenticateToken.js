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
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired authentication token.",
    });
  }

  try {
    const userResult = await pool.query(
      "SELECT 1 FROM users WHERE id = $1;",
      [decodedToken.userId]
    );

    if (userResult.rows.length === 0) {
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
    console.error("Authentication database error:", error);

    return res.status(500).json({
      message: "Something went wrong while authenticating the user.",
    });
  }
}

module.exports = authenticateToken;
