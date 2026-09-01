const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "1234567890",
  "letmein123",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "welcome123",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeComparable(value) {
  return typeof value === "string"
    ? value.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
}

function isValidEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    EMAIL_PATTERN.test(email)
  );
}

function validatePassword(password, identity = {}) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must contain no more than ${MAX_PASSWORD_LENGTH} characters.`;
  }

  const normalizedPassword = normalizeComparable(password);
  const email = typeof identity.email === "string" ? identity.email : "";
  const obviousValues = [
    identity.name,
    email,
    email.split("@")[0],
  ]
    .map(normalizeComparable)
    .filter((value) => value.length >= 4);

  if (
    COMMON_PASSWORDS.has(password.toLowerCase()) ||
    /^(.)\1+$/.test(password) ||
    obviousValues.includes(normalizedPassword)
  ) {
    return "Choose a password that is not common or based on your name or email.";
  }

  return null;
}

module.exports = {
  isValidEmail,
  validatePassword,
};
