import type { FailureReason } from "./labSimulation.ts";

export const failureFeedback: Record<
  FailureReason,
  { title: string; message: string }
> = {
  "sql-syntax": {
    title: "400 SQL SYNTAX ERROR",
    message:
      "SQL構文エラーです。引用符と括弧の対応、コメントの位置、未対応の識別子がないかを確認してください。",
  },
  "auth-failed": {
    title: "401 AUTHENTICATION FAILED",
    message:
      "認証失敗です。実行内容を確認（学習用）で、条件全体が真になるか、後続のパスワード条件が残っていないかを確認してください。",
  },
  "path-not-found": {
    title: "404 FILE NOT FOUND",
    message:
      "ファイルが見つかりません。実行内容を確認（学習用）で、入力が公開ディレクトリを越えて /etc/passwd へ解決されたか確認してください。",
  },
  "path-too-shallow": {
    title: "404 NOT OUTSIDE PUBLIC DIRECTORY",
    message:
      "etc/passwd に向かっていますが、上の階層への移動回数が不足しています。基準は /var/www/public です。",
  },
  "xss-plain-text": {
    title: "200 STORED AS TEXT",
    message:
      "通常文字列として受け付けました。この演習は script 要素内の alert 呼び出しだけを検出します。script 外の呼び出しは対象外です。",
  },
  "xss-no-alert": {
    title: "200 NO ALERT DETECTED",
    message:
      "script はありますが、対応する alert 呼び出しがありません。閉じタグと、引用符で囲んだ文字列または数値の引数を確認してください。",
  },
  "command-no-separator": {
    title: "200 DIAGNOSTIC ONLY",
    message:
      "コマンドの区切り文字がありません。入力が ping の引数のままになっている点を確認してください。",
  },
  "command-no-flag": {
    title: "404 FLAG NOT READ",
    message:
      "追加部分は検出されましたが、目標ファイル flag.txt を読むコマンドが実行されていません。区切りの実行条件とコマンドを確認してください。",
  },
  "idor-invalid": {
    title: "400 INVALID RESOURCE ID",
    message:
      "IDの形式が正しくありません。空白や記号を含めず、半角数字のみを入力してください。",
  },
  "idor-own": {
    title: "200 OWN RESOURCE",
    message:
      "これは user_17 自身のレポートです。ログイン状態は変えず、リクエストのIDを目標の #1042 に変えてください。",
  },
  "idor-not-found": {
    title: "404 REPORT NOT FOUND",
    message:
      "指定されたレポートは見つかりません。今回の目標は user_88 が所有するレポート #1042 です。",
  },
  "redirect-internal": {
    title: "200 INTERNAL DESTINATION",
    message:
      "サイト内遷移です。相対URLは portal.example を基準に解決されます。目標の外部ホストを確認してください。",
  },
  "redirect-invalid": {
    title: "400 INVALID URL",
    message: "不正URLです。URLの書式、ホスト名、ポート番号を確認してください。",
  },
  "redirect-scheme": {
    title: "400 UNSUPPORTED SCHEME",
    message:
      "未対応スキームです。http または https のURLだけを解析します。JavaScriptなどは実行しません。",
  },
};
