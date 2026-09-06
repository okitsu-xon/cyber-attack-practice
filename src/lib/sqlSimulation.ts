export type SqlFailure = "sql-syntax" | "auth-failed";
export type SqlResult = {
  success: boolean;
  reason?: SqlFailure;
  sql: string;
  detail: string;
};
type Value = string | number | boolean | null;
type Truth = boolean | null;
type Token =
  | { kind: "value"; value: Value }
  | { kind: "word" | "operator" | "punctuation"; text: string }
  | { kind: "end" };
type Expr =
  | { kind: "literal"; value: Value }
  | { kind: "field"; name: "username" | "password" }
  | { kind: "not"; child: Expr }
  | { kind: "binary"; op: string; left: Expr; right: Expr };

class SqlSyntaxError extends Error {}

// A deliberately small lexer. Nothing is delegated to a database or JS runtime.
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i]!;
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (source.startsWith("--", i)) break;
    if (char === "'") {
      i++;
      let value = "";
      let closed = false;
      while (i < source.length) {
        if (source[i] === "'") {
          if (source[i + 1] === "'") {
            value += "'";
            i += 2;
          } else {
            i++;
            closed = true;
            break;
          }
        } else {
          value += source[i++];
        }
      }
      if (!closed) throw new SqlSyntaxError("引用符が閉じられていません。");
      tokens.push({ kind: "value", value });
      continue;
    }
    const number = /^\d+(?:\.\d+)?/.exec(source.slice(i));
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value))
        throw new SqlSyntaxError("数値が大きすぎます。");
      tokens.push({ kind: "value", value });
      i += number[0].length;
      continue;
    }
    const word = /^[A-Za-z_][A-Za-z_0-9]*/.exec(source.slice(i));
    if (word) {
      const text = word[0].toUpperCase();
      if (text === "TRUE" || text === "FALSE" || text === "NULL") {
        tokens.push({
          kind: "value",
          value: text === "NULL" ? null : text === "TRUE",
        });
      } else {
        tokens.push({ kind: "word", text });
      }
      i += word[0].length;
      continue;
    }
    const op = /^(?:!=|<>|<=|>=|=|<|>)/.exec(source.slice(i));
    if (op) {
      tokens.push({ kind: "operator", text: op[0] });
      i += op[0].length;
      continue;
    }
    if ("();".includes(char)) {
      tokens.push({ kind: "punctuation", text: char });
      i++;
      continue;
    }
    throw new SqlSyntaxError(`未対応の文字です: ${char}`);
  }
  tokens.push({ kind: "end" });
  return tokens;
}

class Parser {
  private index = 0;
  private depth = 0;
  private readonly tokens: Token[];
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }
  private peek(): Token {
    return this.tokens[this.index] ?? { kind: "end" };
  }
  private take(text: string): boolean {
    const token = this.peek();
    if ("text" in token && token.text === text) {
      this.index++;
      return true;
    }
    return false;
  }
  parse(): Expr {
    const expression = this.or();
    this.take(";");
    if (this.peek().kind !== "end")
      throw new SqlSyntaxError("式の末尾に解釈できない入力があります。");
    return expression;
  }
  private or(): Expr {
    let left = this.and();
    while (this.take("OR"))
      left = { kind: "binary", op: "OR", left, right: this.and() };
    return left;
  }
  private and(): Expr {
    let left = this.not();
    while (this.take("AND"))
      left = { kind: "binary", op: "AND", left, right: this.not() };
    return left;
  }
  private not(): Expr {
    if (++this.depth > 64) throw new SqlSyntaxError("式の入れ子が深すぎます。");
    let expression: Expr;
    if (this.take("NOT")) expression = { kind: "not", child: this.not() };
    else expression = this.comparison();
    this.depth--;
    return expression;
  }
  private comparison(): Expr {
    const left = this.primary();
    const token = this.peek();
    if (token.kind !== "operator") return left;
    this.index++;
    return { kind: "binary", op: token.text, left, right: this.primary() };
  }
  private primary(): Expr {
    if (this.take("(")) {
      const expression = this.or();
      if (!this.take(")")) throw new SqlSyntaxError("閉じ括弧がありません。");
      return expression;
    }
    const token = this.peek();
    if (token.kind === "value") {
      this.index++;
      return { kind: "literal", value: token.value };
    }
    if (
      token.kind === "word" &&
      (token.text === "USERNAME" || token.text === "PASSWORD")
    ) {
      this.index++;
      return {
        kind: "field",
        name: token.text === "USERNAME" ? "username" : "password",
      };
    }
    throw new SqlSyntaxError(
      token.kind === "word"
        ? `未対応の識別子です: ${token.text}`
        : "値または条件式が必要です。",
    );
  }
}

function truth(value: Value): Truth {
  if (value === null) return null;
  if (typeof value === "string")
    return Number.isFinite(Number(value)) && Number(value) !== 0;
  return Boolean(value);
}

function evaluate(expr: Expr): Value {
  if (expr.kind === "literal") return expr.value;
  // NULL is an intentionally unavailable password in this educational target.
  if (expr.kind === "field") return expr.name === "username" ? "admin" : null;
  if (expr.kind === "not") {
    const value = truth(evaluate(expr.child));
    return value === null ? null : !value;
  }
  const left = evaluate(expr.left);
  const right = evaluate(expr.right);
  if (expr.op === "AND" || expr.op === "OR") {
    const a = truth(left);
    const b = truth(right);
    if (expr.op === "AND")
      return a === false || b === false
        ? false
        : a === null || b === null
          ? null
          : true;
    return a === true || b === true
      ? true
      : a === null || b === null
        ? null
        : false;
  }
  if (left === null || right === null) return null;
  let a: string | number = typeof left === "boolean" ? Number(left) : left;
  let b: string | number = typeof right === "boolean" ? Number(right) : right;
  if (typeof a !== typeof b) {
    if (!Number.isFinite(Number(a)) || !Number.isFinite(Number(b)))
      return false;
    a = Number(a);
    b = Number(b);
  }
  switch (expr.op) {
    case "=":
      return a === b;
    case "!=":
    case "<>":
      return a !== b;
    case "<":
      return a < b;
    case ">":
      return a > b;
    case "<=":
      return a <= b;
    case ">=":
      return a >= b;
    default:
      return false;
  }
}

export function evaluateSqlCondition(condition: string): Truth {
  if (condition.length > 4096)
    throw new SqlSyntaxError("入力は4096文字以内にしてください。");
  return truth(evaluate(new Parser(tokenize(condition)).parse()));
}

export function simulateSql(username: string, password = ""): SqlResult {
  const condition = `username = '${username}' AND password = '${password}';`;
  const sql = `SELECT * FROM users WHERE ${condition}`;
  try {
    if (condition.length > 4096) throw new SqlSyntaxError("入力が長すぎます。");
    const expression = new Parser(tokenize(condition)).parse();
    const success = truth(evaluate(expression)) === true;
    return {
      success,
      reason: success ? undefined : "auth-failed",
      sql,
      detail: success
        ? "条件に一致するアカウントが見つかり、認証回避が成立しました。"
        : "認証条件を回避できませんでした。条件式全体が真になるか確認してください。",
    };
  } catch (error: unknown) {
    return {
      success: false,
      reason: "sql-syntax",
      sql,
      detail:
        error instanceof SqlSyntaxError
          ? error.message
          : "条件式を解析できませんでした。",
    };
  }
}
