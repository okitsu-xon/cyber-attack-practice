import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateLab } from "../src/lib/labSimulation.ts";
import type { LabId, FailureReason } from "../src/lib/labSimulation.ts";
import { failureFeedback } from "../src/lib/failureFeedback.ts";

const cases: [LabId, string, FailureReason][] = [
  ["sql-injection", "admin", "auth-failed"],
  ["sql-injection", "admin' OR unknown --", "sql-syntax"],
  ["path-traversal", "guide.pdf", "path-not-found"],
  ["path-traversal", "../etc/passwd", "path-too-shallow"],
  ["stored-xss", "hello", "xss-plain-text"],
  ["stored-xss", "<script>1+1</script>", "xss-no-alert"],
  ["command-injection", "127.0.0.1", "command-no-separator"],
  ["command-injection", "127.0.0.1; cat other.txt", "command-no-flag"],
  ["idor", "abc", "idor-invalid"],
  ["idor", "1001", "idor-own"],
  ["idor", "999", "idor-not-found"],
  ["open-redirect", "/dashboard", "redirect-internal"],
  ["open-redirect", "https://[", "redirect-invalid"],
  ["open-redirect", "javascript:alert(1)", "redirect-scheme"],
];
for (const [id, input, reason] of cases)
  test(`feedback ${reason}`, () => {
    const result = simulateLab(id, input);
    assert.equal(result.success, false);
    assert.equal(result.reason, reason);
    assert.match(failureFeedback[reason].title, /^\d{3} /);
    assert.match(failureFeedback[reason].message, /[ぁ-んァ-ン一-龯]/);
    assert.ok(failureFeedback[reason].message.length > 20);
  });
test("every failure reason has a scenario and Japanese guidance", () => {
  assert.deepEqual(
    [...new Set(cases.map((item) => item[2]))].sort(),
    Object.keys(failureFeedback).sort(),
  );
});

test("failure feedback repeats scoring targets without revealing payloads", () => {
  assert.match(failureFeedback["path-not-found"].message, /\/etc\/passwd/);
  assert.doesNotMatch(failureFeedback["path-not-found"].message, /\.\.\//);
  assert.match(failureFeedback["command-no-flag"].message, /flag\.txt/);
  assert.doesNotMatch(failureFeedback["command-no-flag"].message, /cat flag\.txt/);
  assert.match(failureFeedback["idor-own"].message, /#1042/);
  assert.match(failureFeedback["idor-not-found"].message, /#1042/);
});
