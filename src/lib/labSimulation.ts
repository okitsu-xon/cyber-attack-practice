import { simulateSql } from "./sqlSimulation.ts";

export type LabId =
  | "sql-injection"
  | "path-traversal"
  | "stored-xss"
  | "command-injection"
  | "idor"
  | "open-redirect";
export type FailureReason =
  | "sql-syntax"
  | "auth-failed"
  | "path-not-found"
  | "path-too-shallow"
  | "xss-plain-text"
  | "xss-no-alert"
  | "command-no-separator"
  | "command-no-flag"
  | "idor-invalid"
  | "idor-own"
  | "idor-not-found"
  | "redirect-internal"
  | "redirect-invalid"
  | "redirect-scheme";
export type LabResult = {
  success: boolean;
  reason?: FailureReason;
  trace: string;
  output: string;
  alertMessage?: string;
};

export function decodeInput(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function normalizePath(input: string): string {
  const path = decodeInput(input);
  const parts: string[] = ["var", "www", "public"];
  for (const segment of path.split("/")) {
    if (segment === "..") parts.pop();
    else if (segment !== "" && segment !== ".") parts.push(segment);
  }
  return `/${parts.join("/")}`;
}

// Recognize only a tiny alert-call grammar, skipping quoted JS text and comments.
// Backtick interpolation remains literal text. No code or DOM is evaluated.
export function extractAlert(input: string): string | undefined {
  const scripts = input.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi);
  for (const script of scripts) {
    const body = script[1] ?? "";
    let i = 0;
    while (i < body.length) {
      if (body.startsWith("//", i)) {
        const end = body.indexOf("\n", i);
        i = end < 0 ? body.length : end + 1;
        continue;
      }
      if (body.startsWith("/*", i)) {
        const end = body.indexOf("*/", i + 2);
        i = end < 0 ? body.length : end + 2;
        continue;
      }
      if (body[i] === "'" || body[i] === '"' || body[i] === "`") {
        const quote = body[i++];
        while (i < body.length) {
          if (body[i] === "\\") i += 2;
          else if (body[i++] === quote) break;
        }
        continue;
      }
      if (
        body.startsWith("alert", i) &&
        (i === 0 || !/[\w$.]/.test(body[i - 1]!))
      ) {
        const call =
          /^alert\s*\(\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`|(-?\d+(?:\.\d+)?))\s*\)/.exec(
            body.slice(i),
          );
        if (call)
          return (call[1] ?? call[2] ?? call[3] ?? call[4] ?? "").replace(
            /\\(['"`\\])/g,
            "$1",
          );
      }
      i++;
    }
  }
  return undefined;
}

export function simulateLab(
  id: LabId,
  input: string,
  password = "",
): LabResult {
  switch (id) {
    case "sql-injection": {
      const result = simulateSql(input, password);
      return {
        success: result.success,
        reason: result.reason,
        trace: result.sql,
        output: result.success
          ? "LOGIN SUCCESSFUL\nMATCHED ACCOUNT: admin\n架空セッション: lab_7f3a••••"
          : result.detail,
      };
    }
    case "path-traversal": {
      const path = normalizePath(input);
      const success = path === "/etc/passwd";
      return {
        success,
        trace: `NORMALIZED PATH → ${path}`,
        reason: success
          ? undefined
          : path.endsWith("/etc/passwd")
            ? "path-too-shallow"
            : "path-not-found",
        output: success
          ? "# FICTIONAL FILE / 実在しないアカウント\nroot:x:0:0:Lab Administrator:/root:/bin/sh\nbyte:x:1001:1001:Lab User:/home/byte:/bin/sh"
          : `仮想ファイルが見つかりません: ${path}`,
      };
    }
    case "stored-xss": {
      const message = extractAlert(input);
      const success = message !== undefined;
      return {
        success,
        trace: "POST /board → 仮想保存 → 管理者の疑似プレビュー",
        alertMessage: message,
        reason: success
          ? undefined
          : /<script\b/i.test(input)
            ? "xss-no-alert"
            : "xss-plain-text",
        output: success
          ? "架空の管理者が投稿を開きました。検出したメッセージを疑似ダイアログへ表示します。"
          : "疑似アラートの条件に一致しませんでした。",
      };
    }
    case "command-injection": {
      const decoded = decodeInput(input);
      const parts = decoded.split(/(&&|\|\||;|\|)/);
      const address = (parts[0] ?? "").trim();
      let previousSucceeded =
        address === "127.0.0.1" || address === "localhost";
      let readFlag = false;
      for (let index = 1; index < parts.length; index += 2) {
        const operator = parts[index];
        const command = (parts[index + 1] ?? "").trim();
        const shouldRun =
          operator === ";" ||
          operator === "|" ||
          (operator === "&&" && previousSucceeded) ||
          (operator === "||" && !previousSucceeded);
        if (!shouldRun) continue;
        previousSucceeded =
          /^(?:cat|head|tail|less)\s+(?:\.\/)?flag\.txt\s*$/.test(command);
        if (previousSucceeded) readFlag = true;
      }
      const success = readFlag;
      return {
        success,
        trace: `ping -c 1 ${input}`,
        reason: success
          ? undefined
          : parts.length < 3
            ? "command-no-separator"
            : "command-no-flag",
        output: success
          ? `PING ${address} — simulated\n${address === "127.0.0.1" || address === "localhost" ? "64 bytes: time=0.04 ms" : "Request timed out"}\n\nBYTE{shells_are_not_strings}`
          : "疑似診断は完了しましたが、目標ファイルは読み取られていません。",
      };
    }
    case "idor": {
      const success = input === "1042";
      return {
        success,
        trace: `GET /api/reports/${input}\nSESSION user_17`,
        reason: success
          ? undefined
          : !/^\d+$/.test(input)
            ? "idor-invalid"
            : input === "1001"
              ? "idor-own"
              : "idor-not-found",
        output: success
          ? "REPORT #1042\nOWNER: user_88（別ユーザー）\nCLASSIFICATION: CONFIDENTIAL\n\n架空資料: Project NIGHTFALL / 社外秘の開発計画"
          : input === "1001"
            ? "自分のレポートです。別ユーザーのレポートを探してください。"
            : "指定されたレポートを表示できません。",
      };
    }
    case "open-redirect": {
      const trace = `https://portal.example/login?next=${encodeURIComponent(input)}`;
      try {
        const url = new URL(input, "https://portal.example");
        const validScheme =
          url.protocol === "https:" || url.protocol === "http:";
        const success = validScheme && url.origin !== "https://portal.example";
        return {
          success,
          trace,
          reason: success
            ? undefined
            : !validScheme
              ? "redirect-scheme"
              : "redirect-internal",
          output: success
            ? `HTTP/1.1 302 Found\nLocation: ${input}\n\nportal.example → ${url.host}\n疑似遷移が完了しました（実際のページ移動はありません）。`
            : `解析先: ${url.protocol}//${url.host}${url.pathname}`,
        };
      } catch {
        return {
          success: false,
          reason: "redirect-invalid",
          trace,
          output: "URLとして解析できませんでした。",
        };
      }
    }
  }
}
