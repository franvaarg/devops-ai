const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isValidEmail,
  validatePassword,
} = require("../src/security/credentialValidation");

test("email validation rejects empty and malformed addresses", () => {
  for (const email of ["", "missing-at.test", "user@", "user @example.test"]) {
    assert.equal(isValidEmail(email), false, email);
  }

  assert.equal(isValidEmail("user@example.test"), true);
});

test("password policy rejects short, common, repeated, and identity passwords", () => {
  const identity = {
    name: "Example User",
    email: "exampleuser@example.test",
  };

  for (const password of [
    "too-short",
    "password123",
    "aaaaaaaaaa",
    "Example User",
    "example-user",
    "exampleuser@example.test",
  ]) {
    assert.ok(validatePassword(password, identity), password);
  }

  assert.equal(validatePassword("correct-horse-battery", identity), null);
});
