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

test('registration and reset cannot accept passwords login rejects or silently truncates', () => {
  assert.ok(validatePassword('unique-' + 'x'.repeat(66)));
  assert.ok(validatePassword('😀'.repeat(19)));
  assert.equal(validatePassword('different-' + 'x'.repeat(62)), null);
  assert.equal(isValidEmail('a'.repeat(140) + '@example.test'), false);
});
