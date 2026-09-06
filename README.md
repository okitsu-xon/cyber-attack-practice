# BYTE BREAKER — Cyber Range

日本語でWebセキュリティの仕組みと防御を学ぶ、6ラボ構成の静的Reactアプリです。ダークテーマ、初回チュートリアル、ヒント・回答、入力別の失敗理由、成功時の被害・対策・安全な教材コードを備えます。

## 必要環境・ローカル起動

- Node.js **22.13.0以上**（推奨・検証環境: **24.20.0**）、npm。
- 実行時依存は React / React DOM のみ。TypeScript strict、Vite、通常のCSSを使用します。
- 初回の依存関係・テスト用ブラウザのインストールにはネットワーク接続が必要です。

```sh
npm install
npm run dev
```

表示されたローカルURL（通常 `http://127.0.0.1:5173/`）をブラウザで開きます。初回案内で安全な利用ルールを確認し、チェックボックスを選ぶと演習を開始できます。

PowerShellで `npm.ps1` の実行が制限される場合は、すべての `npm` を `npm.cmd` に置き換えてください。実行ポリシーの変更は不要です。npmキャッシュへの書き込みが制限される環境では `npm.cmd install --cache .npm-cache` を使用できます。

## 検証とproductionプレビュー

```sh
npm run typecheck
npm test
npm run test:sql
npm run test:labs
npm run test:feedback
npm run lint
npm run build
npm run preview
```

`build` は型検査を含み、配信用ファイルを `dist/` に生成します。プレビューは通常 `http://127.0.0.1:4173/` です。`dist/index.html` のダブルクリックではなく、HTTPサーバーで確認してください。

判定ロジックのテストにはNode標準の `node:test` とネイティブTypeScript型除去を使います。上記の個別テストは `npm test` にすべて含まれます。

ブラウザの操作テストも同梱しています。Playwrightは開発時だけの依存です。

```sh
npx playwright install chromium
npm run build
npm run test:ui
```

インストール済みのMicrosoft Edgeでも検証できます。Chromiumのダウンロードが制限される環境では次を使用してください。

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm.cmd run test:ui
```

`node --experimental-strip-types tests/publication-smoke.mjs` は、SPA用リライトを持たない静的サーバーで `dist/` の6URL・サンプル・履歴を検証します。サブパス版はビルドと検証の両方に同じ `VITE_BASE_PATH` を渡します。

テストはproductionプレビューを自動起動し、チュートリアル、ストレージ不可時の動作、6ラボの成功・リセット・重複しない進捗、深いURL、履歴、メタ情報、モーダル、タッチ操作、360 / 390 / 768 / 1280pxでの表示、入力の無害な描画と外部リクエストがないことを確認します。テストで生成する `test-results/` はGit管理対象外です。

## 操作

- 左の **LABS** タブから好きなラボを選びます。PCではホバー・フォーカスでも展開します。タッチではタップで開閉し、背景タップか Escape で閉じます。
- 空白だけの入力では実行できません。入力を変えると結果は消えます。
- ヒントは3段階です。考え方、組み立て方、入力例の順に一つずつ表示します。
- 「答えと解説を表示」は3段階のヒントと解説を開き、サンプルを自動入力します。実行ボタンで判定してください。
- 実行すると結果見出しへフォーカスが移動し、正解時は「正解です」と成立した条件・影響・防御策を表示します。動きを減らすOS設定では表示アニメーションを行いません。
- 入力欄では Enter キーでも解答を送信できます。複数行入力欄は Shift + Enter で改行します。
- 前後ボタンやLABS一覧で問題を移動すると、問題フォームが画面中央へ移動します。
- **RESET** は現在ラボの入力・パスワード・結果・ヒント・回答を初期化します。すでに獲得した完了チェックは維持します。
- 前後ナビゲーションやLABSで移動できます。ラボ切替時にフォームと結果・ヒント・回答は初期化されます。ブラウザの戻る・進むも使えます。
- Stored XSSでは Ctrl+Enter / Command+Enter でも投稿できます。
- 完了チェックはメモリ上だけに保持し、再読み込みで消えます。チュートリアルだけを `localStorage` の `byte-breaker-tutorial-complete` に保存します。保存不可でも演習は継続します。
- チュートリアルを再表示するには、ブラウザのサイトデータから上記キーを削除してください。
- ヘッダーの「?」またはサイドバーから「このサイトについて」を開けます。Tabキーのフォーカスをモーダル内に保ち、閉じると起点のボタンへ戻します。

## 静的ホスティングへの公開

リポジトリを任意の静的ホスティングへ接続して設定します。

| 設定                       | 値                        |
| -------------------------- | ------------------------- |
| Node.js                    | 24（最低22.13.0）         |
| Build command              | `npm ci && npm run build` |
| Publish / output directory | `dist`                    |
| サーバー機能               | 不要                      |
| 公開プロトコル             | HTTPS                     |

`package-lock.json` をコミットしてください。`dist/` 全体を配信します。教材用ホスト名 `portal.example` / `outside.example` をDNSに設定する必要はありません。

### 公開者情報

公開前に、運営者と連絡先をビルド時の環境変数へ設定してください。値は「このサイトについて」に文字列として表示されます。未設定のビルドには、公開前の設定が必要である旨が表示されます。

| 環境変数                | 内容                           | 例                      |
| ----------------------- | ------------------------------ | ----------------------- |
| `VITE_SITE_OPERATOR`    | サイトの運営主体               | `Example Security Team` |
| `VITE_CONTACT`          | 一般問い合わせ先               | `contact@example.com`   |
| `VITE_SECURITY_CONTACT` | セキュリティ上の問題の報告窓口 | `security@example.com`  |
| `VITE_RIGHTS_NOTICE`    | 著作権・教材の利用条件への案内 | `© 2026 Example`        |

アプリ自体は氏名等を収集せず、演習入力とラボ完了状況はブラウザのメモリ内だけで扱います。初回案内の完了状態だけをlocalStorageへ保存します。Cookie、アクセス解析、広告、外部APIは使用しません。ホスティング事業者が扱うアクセスログについては、公開者が利用するサービスの方針を確認し、必要な説明を追加してください。

公開者は、ソースコード、教材文、名称、画像等をインターネットで公開できる権利を確認し、採用する利用条件に対応したLICENSE・著作権表示を別途用意してください。このリポジトリは特定のライセンスを自動的に付与しません。

### 独自ドメイン直下とサブパス

`https://your-domain.example/` のように直下へ公開する場合は設定不要です。`VITE_BASE_PATH` の既定値は `/` です。

`https://user.github.io/byte-breaker/` のようなサブパスでは、**ビルド時**に末尾スラッシュ付きのパスを指定します。

```sh
# macOS / Linux
VITE_BASE_PATH=/byte-breaker/ npm run build
```

```powershell
# Windows PowerShell
$env:VITE_BASE_PATH = '/byte-breaker/'
npm.cmd run build
npm.cmd run preview
# 確認後、直下公開の設定へ戻す
Remove-Item Env:VITE_BASE_PATH
```

この場合のプレビューURLは `http://127.0.0.1:4173/byte-breaker/` です。ViteのアセットURLと、アプリのHistory APIによるラボURLは同じbaseを使います。公開先を変更したら再ビルドしてください。baseは先頭・末尾に `/` がある絶対パスのみ対応します。

### 深いURLの直接アクセス

以下6つはそれぞれ独立したHTML入口を持ち、すべてViteの `build.rollupOptions.input` に登録しています。ホスティングでディレクトリ内の `index.html` を配信すれば、SPA用のリライト設定なしで直接アクセスできます。

| ラボ              | URL（ドメイン直下の場合）  |
| ----------------- | -------------------------- |
| SQL Injection     | `/labs/sql-injection/`     |
| Path Traversal    | `/labs/path-traversal/`    |
| Stored XSS        | `/labs/stored-xss/`        |
| Command Injection | `/labs/command-injection/` |
| IDOR              | `/labs/idor/`              |
| Open Redirect     | `/labs/open-redirect/`     |

サブパス公開ではすべてに `/byte-breaker` などの接頭辞が付きます。`/` およびアプリに渡された不明なpathnameはSQLラボを表示します。存在しない任意のURLへの**直接アクセス**は静的ホストが404を返す場合があります。その場合もSQLラボを表示したいときは、ホスト側で未知のパスをルートの `index.html` へ200リライトしてください。既知の6URLにはこの設定は不要です。

各HTMLにラボ固有のtitle / description / OG / Twitterメタ情報を含み、ラボ切替時にも更新します。OG画像や外部Webフォントは取得しません。

### GitHub Pages

`.github/workflows/pages.yml` を用意しています。

1. GitHubにリポジトリを作り、`main` ブランチへコードをpushします。
2. **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
3. `main` へのpushまたはActionsの手動実行で、型検査・テスト・lint・production build・ブラウザテスト後に公開します。Pull Requestでは検証だけを行います。
4. 通常はリポジトリ名から `/リポジトリ名/` を自動設定します。`*.github.io` リポジトリは `/` になります。
5. 独自ドメイン直下で配信する場合は、リポジトリの **Settings → Secrets and variables → Actions → Variables** に `VITE_BASE_PATH` = `/` を設定して再実行します。Pages側で独自ドメインとDNSも設定し、**Enforce HTTPS** を有効にします。

ワークフローはGitHubが発行する一時的な認証を使用します。独自のアクセストークンや秘密情報の登録は不要です。

## シミュレーションの範囲

入力は純粋関数で解析し、Reactの通常の文字列描画へ渡します。JavaScript・HTML・SQL・OSコマンドを実行せず、DOMへのHTML挿入、ファイル／データベースアクセス、外部API、バックエンドを使用しません。リンク・302応答・alert・ファイル・セッション・資料はすべて架空の表示です。防御コードは教材文字列であり、実行用のモジュールとして読み込みません。

演習手法は、この教材内、または自分が管理するか管理者から明示的な許可を得た環境でのみ利用してください。第三者のサイト、アカウント、ネットワークに対して試してはいけません。教材は理解のために挙動を単純化しており、実システムや製品の完全な再現ではありません。

**SQLの仕様上の注意:** 小さな字句解析器と再帰下降パーサーで比較、括弧、NOT / AND / ORを評価します。ANDはORより優先され、NULLはunknownとして扱います。数値に変換できる文字列と数値は比較可能です。仮想データには `username = admin` の行があり、未取得のパスワードはNULLとして評価します。採点は解析した条件式全体の真偽に従います。コメントはSQL標準形式の `--` だけに対応し、負数・複数文・任意の識別子・関数呼び出しには対応しません。未対応の識別子と構文不正は構文エラーになります。

Path TraversalとCommand InjectionのURL表現は1回だけデコードします。Path TraversalはPOSIX形式の相対パスを `/var/www/public` から正規化し、絶対パスとWindows形式の区切りは受け付けません。Stored XSSはscript要素内の単純なalert呼び出しを検出する限定文法で、JS全体の解析は行いません。引用文字列・コメント内のalertは無視し、バッククォート内の `${...}` も文字列のまま表示します。Command Injectionは `;`、`&&`、`||`、`|` ごとの実行条件を反映し、ループバックへの疑似pingを成功、それ以外を失敗として扱います。Open RedirectはWHATWG URL解析後の `origin` が `https://portal.example` と異なるHTTP(S) URLで成功します。

実行後に表示するSQL、正規化パス、コマンド、リクエストは、仕組みを理解するための「実行内容を確認（学習用）」です。一般的な実システムがこれらの内部情報を画面へ返すという意味ではありません。

配信HTMLのCSPで `connect-src 'none'`、外部スクリプト・外部画像・フォーム送信などを制限しています。初期ページ・同一サイト内のJS/CSSの取得は静的サイトの読み込みとして必要です。演習操作中にデータ通信は発生しません。開発用Viteは配信に使わず、公開時は必ず `dist/` を配信してください。開発時のホット更新は無効にしているため、編集後はブラウザを再読み込みします。

## 外部公開前の確認事項

- `npm ci` / `npm run typecheck` / `npm test` / `npm run lint` / `npm run build` / `npm run test:ui` が成功する。
- 公開先に合うbaseでビルドし、6URLそれぞれを直接開いて再読み込みできる。
- すべてのサンプルが成功し、誤入力で具体的な日本語フィードバックが出る。
- PC・タブレット・スマートフォンで操作でき、横スクロールが出ない。
- キーボードのTab、Escape、履歴の戻る／進む、モーダルのフォーカスを確認する。
- 初回チュートリアルと、保存できない環境での継続を確認する。
- production画面のNetworkパネルで、同一サイトの初期アセット以外へのリクエストがない。
- HTTPS、ホスティング側のディレクトリindex配信、必要に応じたCSPレスポンスヘッダーを確認する。
- 秘密情報・トークン・個人情報を含めず、`node_modules` や開発サーバーを公開しない。

この作業には外部ホスティングへのアップロードは含まれません。`dist/` と上記ワークフローが公開用成果物です。

## 実施済み検証（2026-09-05）

Windows / Node.js 24.20.0 / npm 11.19.0 / Microsoft Edge（Playwright経由）で確認しました。

| 検証                                  | 結果                                             |
| ------------------------------------- | ------------------------------------------------ |
| 依存関係のインストール                | 成功、npm監査の脆弱性検出0件                     |
| TypeScript strict 型検査              | 成功                                             |
| Node標準の判定ロジックテスト          | 75件成功                                         |
| ESLint                                | エラー・警告0件                                  |
| production build                      | 成功、ルートと6ラボのHTMLを生成                  |
| ブラウザ操作・レスポンシブテスト      | 14件成功                                         |
| リライトなし静的配信 `/`              | 6URL・全サンプル・履歴・外部リクエストなしを確認 |
| リライトなし静的配信 `/byte-breaker/` | 6URL・全サンプル・履歴・外部リクエストなしを確認 |
| Vite開発サーバー                      | 6URL・全サンプル・履歴・実行時エラーなしを確認   |

生成済みの `dist/` はドメイン直下（base `/`）向けです。実機のSafari / Firefoxや、実際の公開先固有の設定については、公開前に別途確認してください。
