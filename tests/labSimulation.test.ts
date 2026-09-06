import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeInput,
  extractAlert,
  normalizePath,
  simulateLab,
} from "../src/lib/labSimulation.ts";
import { labs, labIndexFromPath } from "../src/lib/labs.ts";

for (const lab of labs)
  test(`${lab.title}: sample succeeds`, () =>
    assert.equal(simulateLab(lab.id, lab.sample).success, true));

test("narrow scoring targets are stated in the mission before hints", () => {
  const missions = Object.fromEntries(labs.map((lab) => [lab.id, lab.mission]));
  assert.match(missions["path-traversal"]!, /\/etc\/passwd/);
  assert.match(missions["stored-xss"]!, /script.*alert/);
  assert.match(missions["command-injection"]!, /flag\.txt/);
  assert.match(missions.idor!, /user_88.*#1042/);
});

test("path traversal handles decoding, separators and canonical paths", () => {
  const raw = "../../../etc/passwd";
  for (const input of [raw, "../../../etc/./passwd", encodeURIComponent(raw)]) {
    assert.equal(normalizePath(input), "/etc/passwd");
    assert.equal(simulateLab("path-traversal", input).success, true);
  }
  for (const input of [
    "../etc/passwd",
    "/etc/passwd",
    "..\\..\\..\\etc\\passwd",
    "/etc/passwd.bak",
    "/etc/shadow",
    "passwd",
    "%E0%A4%A",
  ])
    assert.equal(simulateLab("path-traversal", input).success, false);
});
test("URL decoding happens once and malformed encoding never throws", () => {
  assert.equal(decodeInput("%2525252f"), "%25252f");
  assert.equal(decodeInput("%zz"), "%zz");
  assert.equal(
    simulateLab(
      "path-traversal",
      encodeURIComponent(encodeURIComponent("../../../etc/passwd")),
    ).success,
    false,
  );
});
test("XSS extracts single, double, backtick, numeric and empty messages", () => {
  for (const [input, expected] of [
    ["<script>alert('LAB')</script>", "LAB"],
    ['<script>alert("hello")</script>', "hello"],
    ["<script>alert(`test`)</script>", "test"],
    ["<script>alert(42)</script>", "42"],
    ["<SCRIPT> alert( -1.5 ); </SCRIPT>", "-1.5"],
    ["<script>alert('')</script>", ""],
    ["<script>alert(`literal ${2+2}`)</script>", "literal ${2+2}"],
    ["<script>alert('it\\'s safe')</script>", "it's safe"],
  ])
    assert.equal(extractAlert(input!), expected);
});
test("XSS rejects outside calls, inert strings, comments, similar identifiers and incomplete scripts", () => {
  for (const input of [
    "alert('LAB')",
    "<p>alert('LAB')</p>",
    "<script>const x = 1</script>",
    '<script>"alert(1)"</script>',
    "<script>// alert(1)</script>",
    "<script>/* alert(1) */</script>",
    "<script>notalert(1)</script>",
    "<script>alert(1)",
    "<script>alert(document.cookie)</script>",
  ]) {
    assert.equal(extractAlert(input), undefined, input);
    assert.equal(simulateLab("stored-xss", input).success, false);
  }
});
for (const separator of [";", "&&", "|"]) {
  for (const command of ["cat", "head", "tail", "less"])
    test(`command ${separator} ${command}`, () => {
      assert.equal(
        simulateLab(
          "command-injection",
          `127.0.0.1 ${separator} ${command} flag.txt`,
        ).success,
        true,
      );
      assert.equal(
        simulateLab(
          "command-injection",
          `127.0.0.1 ${separator} ${command} ./flag.txt`,
        ).success,
        true,
      );
    });
}
test("command decoding and rejection of unrecognized reads", () => {
  assert.equal(
    simulateLab("command-injection", "127.0.0.1%3B%20cat%20flag.txt").success,
    true,
  );
  assert.equal(
    simulateLab("command-injection", "127.0.0.1%253B%2520cat%2520flag.txt")
      .success,
    false,
  );
  assert.equal(
    simulateLab("command-injection", "127.0.0.1 || cat flag.txt").success,
    false,
  );
  assert.equal(
    simulateLab("command-injection", "unavailable.example || cat flag.txt")
      .success,
    true,
  );
  for (const input of [
    "cat flag.txt",
    "127.0.0.1; cat secret.txt",
    "127.0.0.1; echo flag.txt",
    "127.0.0.1; cat flag.txt.bak",
    "127.0.0.1; cat /flag.txt",
    "127.0.0.1; cat flag.txt extra",
    "127.0.0.1; concatenate flag.txt",
  ])
    assert.equal(simulateLab("command-injection", input).success, false);
});
test("IDOR accepts only exact 1042 and distinguishes failure classes", () => {
  assert.equal(simulateLab("idor", "1042").success, true);
  assert.equal(simulateLab("idor", "1001").reason, "idor-own");
  assert.equal(simulateLab("idor", "9999").reason, "idor-not-found");
  assert.equal(simulateLab("idor", "01042").success, false);
  for (const input of [
    "1042abc",
    " 1042",
    "1042 ",
    "１０４２",
    "1e3",
    "",
    "../1042",
  ])
    assert.equal(simulateLab("idor", input).reason, "idor-invalid");
});
test("redirect accepts any external HTTP or HTTPS origin", () => {
  for (const input of [
    "https://outside.example/welcome",
    "http://outside.example/",
    "//outside.example/welcome",
    "https://OUTSIDE.EXAMPLE/welcome",
    "https://other.example",
    "https://evil.outside.example",
    "https://portal.example:8443",
    "http://portal.example",
  ])
    assert.equal(simulateLab("open-redirect", input).success, true);
});
test("redirect rejects same-origin, unsupported schemes and malformed URLs", () => {
  const cases = [
    ["/dashboard", "redirect-internal"],
    ["https://portal.example/profile", "redirect-internal"],
    ["https://portal.example:443/profile", "redirect-internal"],
    ["javascript:alert(1)", "redirect-scheme"],
    ["data:text/html,test", "redirect-scheme"],
    ["ftp://outside.example", "redirect-scheme"],
    ["https://[", "redirect-invalid"],
  ];
  for (const [input, reason] of cases) {
    const result = simulateLab("open-redirect", input!);
    assert.equal(result.success, false, input);
    assert.equal(result.reason, reason);
  }
});
test("routing supports deep paths, index.html, base paths and unknown fallback", () => {
  assert.equal(labIndexFromPath("/", "/"), 0);
  assert.equal(labIndexFromPath("/missing", "/"), 0);
  for (const [index, lab] of labs.entries()) {
    for (const base of ["/", "/byte-breaker/"]) {
      for (const suffix of ["", "/", "/index.html"])
        assert.equal(
          labIndexFromPath(`${base}labs/${lab.id}${suffix}`, base),
          index,
        );
    }
  }
  assert.equal(labIndexFromPath("/labs/idor/", "/other/"), 0);
});
