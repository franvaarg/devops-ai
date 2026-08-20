const BREVO_EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_EMAIL_FROM = "KANYI <no-reply@example.com>";

function parseSender(value) {
  const sender = value.trim();
  const match = sender.match(/^(.*?)\s*<([^<>]+)>$/);

  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  }

  return { email: sender };
}

async function sendPasswordResetEmail({ email, name, token }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("Brevo email delivery is not configured.");
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = new URL("/reset-password", frontendUrl);
  resetUrl.searchParams.set("token", token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BREVO_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(BREVO_EMAIL_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: parseSender(process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM),
        to: [{ email, name }],
        subject: "Reset your KANYI password",
        textContent: [
          `Hello ${name},`,
          "",
          "Use the link below to reset your password. It expires in one hour.",
          resetUrl.toString(),
          "",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Brevo email delivery failed with status ${response.status}.`);
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Brevo email delivery timed out.");
    }

    if (error?.message?.startsWith("Brevo email delivery failed with status ")) {
      throw error;
    }

    throw new Error("Brevo email delivery failed.");
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendPasswordResetEmail,
};
