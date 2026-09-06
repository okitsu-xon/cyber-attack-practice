import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateSqlCondition, simulateSql } from "../src/lib/sqlSimulation.ts";

const successes = [
  "admin' OR '1'='1' --",
  "admin' OR '2'='2' --",
  "nobody' OR 2=2 --",
  "nobody' OR '42'='42' --",
  "nobody' OR 2<>3 --",
  "nobody' OR NOT 2=3 --",
  "nobody' OR (2=2 AND 'a'='a') --",
  "admin' AND 4>=4 --",
  "admin' --",
  "nobody' OR TRUE --",
  "nobody' OR 3!=2 --",
  "nobody' OR 2<=2 --",
  "admin' OR 'A'='B' --",
];
for (const input of successes)
  test(`SQL succeeds: ${input}`, () =>
    assert.equal(simulateSql(input).success, true));
const failures = [
  "admin",
  "nobody' OR '2'='3' --",
  "nobody' OR (2=2 AND 'a'='b') --",
  "admin' AND 4<4 --",
];
for (const input of failures)
  test(`SQL authentication fails: ${input}`, () => {
    const result = simulateSql(input);
    assert.equal(result.success, false);
    assert.equal(result.reason, "auth-failed");
  });
for (const input of [
  "nobody' OR mystery=1 --",
  "admin'",
  "nobody' OR (2=2 --",
  "admin' OR 1=1; DROP TABLE users --",
])
  test(`SQL syntax fails: ${input}`, () =>
    assert.equal(simulateSql(input).reason, "sql-syntax"));

test("AND binds more tightly than OR", () => {
  assert.equal(evaluateSqlCondition("TRUE OR FALSE AND FALSE"), true);
  assert.equal(evaluateSqlCondition("(TRUE OR FALSE) AND FALSE"), false);
  assert.equal(evaluateSqlCondition("FALSE AND TRUE OR TRUE"), true);
});
test("NOT applies to comparisons, binds above AND and OR", () => {
  assert.equal(evaluateSqlCondition("NOT 2=3 AND TRUE OR FALSE"), true);
  assert.equal(evaluateSqlCondition("NOT TRUE AND FALSE"), false);
  assert.equal(evaluateSqlCondition("NOT (TRUE AND FALSE)"), true);
});
test("NULL propagates SQL unknown truth", () => {
  assert.equal(evaluateSqlCondition("NULL = NULL"), null);
  assert.equal(evaluateSqlCondition("NOT NULL"), null);
  assert.equal(evaluateSqlCondition("NULL OR TRUE"), true);
  assert.equal(evaluateSqlCondition("NULL AND FALSE"), false);
  assert.equal(evaluateSqlCondition("NULL AND TRUE"), null);
  assert.equal(simulateSql("nobody' OR NULL --").success, false);
});
test("strings, numeric coercion, comments and comparisons", () => {
  assert.equal(evaluateSqlCondition("'it''s'='it''s'"), true);
  assert.equal(evaluateSqlCondition("'42'=42 -- anything ' ignored"), true);
  assert.equal(evaluateSqlCondition("'a'>'A' AND 3>=3 AND 1<2 AND 2<=2"), true);
  assert.equal(evaluateSqlCondition("'A' = 0"), false);
  assert.throws(() => evaluateSqlCondition("TRUE - ignored"));
  assert.throws(() => evaluateSqlCondition("TRUE # ignored"));
});
test("SQL output preserves input as a string", () => {
  assert.equal(
    simulateSql("admin", "nope").sql,
    "SELECT * FROM users WHERE username = 'admin' AND password = 'nope';",
  );
});
test("mission scoring follows the evaluated SQL condition", () => {
  assert.equal(evaluateSqlCondition("username='admin' OR 'A'='B'"), true);
  assert.equal(simulateSql("admin' OR 'A'='B' --").success, true);
});
test("excessive nesting and long input fail safely", () => {
  assert.equal(
    simulateSql(
      "nobody' OR " + "(".repeat(100) + "TRUE" + ")".repeat(100) + " --",
    ).reason,
    "sql-syntax",
  );
  assert.equal(simulateSql("a".repeat(5000)).reason, "sql-syntax");
});
