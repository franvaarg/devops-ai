const nodemailer = require("nodemailer");

function createTransport() {
  const { SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error("SMTP is not configured.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      pass: SMTP_PASSWORD,
      user: SMTP_USER,
    },
  });
}

async function sendPasswordResetEmail({ email, name, token }) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = new URL("/reset-password", frontendUrl);
  resetUrl.searchParams.set("token", token);

  await createTransport().sendMail({
    from: process.env.EMAIL_FROM || "KANYI <no-reply@example.com>",
    to: email,
    subject: "Reset your KANYI password",
    text: [
      `Hello ${name},`,
      "",
      "Use the link below to reset your password. It expires in one hour.",
      resetUrl.toString(),
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
  });
}

module.exports = {
  sendPasswordResetEmail,
};
