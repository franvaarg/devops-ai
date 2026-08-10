const crypto = require("node:crypto");

const bcrypt = require("bcryptjs");

const pool = require("../database/db");
const { sendPasswordResetEmail } = require("./emailService");

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function requestPasswordReset(email) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT id, name, email
        FROM users
        WHERE email = $1
        FOR UPDATE;
      `,
      [email]
    );
    const user = userResult.rows[0];

    if (!user) {
      await client.query("ROLLBACK");
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS);

    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND used_at IS NULL;
      `,
      [user.id]
    );
    await client.query(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3);
      `,
      [user.id, tokenHash, expiresAt]
    );

    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      token,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function resetPassword(token, password) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenResult = await client.query(
      `
        SELECT id, user_id
        FROM password_reset_tokens
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        FOR UPDATE;
      `,
      [hashToken(token)]
    );
    const resetToken = tokenResult.rows[0];

    if (!resetToken) {
      await client.query("ROLLBACK");
      return false;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `
        UPDATE users
        SET password = $1,
            token_version = token_version + 1
        WHERE id = $2;
      `,
      [passwordHash, resetToken.user_id]
    );
    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND used_at IS NULL;
      `,
      [resetToken.user_id]
    );
    await client.query("COMMIT");

    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  requestPasswordReset,
  resetPassword,
};
