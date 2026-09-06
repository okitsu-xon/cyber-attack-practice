import type { LabId } from "./labSimulation.ts";

export interface Lab {
  id: LabId;
  title: string;
  subtitle: string;
  difficulty: "BEGINNER" | "EASY";
  target: string;
  mission: string;
  context: string;
  sample: string;
  action: string;
  hints: [string, string, string];
  explanation: [string, string, string];
  successTitle: string;
  impact: [string, string, string];
  defense: string;
  safeCode: string;
  codeExplanation: [string, string, string];
}

export const labs: readonly Lab[] = [
  {
    id: "sql-injection",
    title: "SQL Injection",
    subtitle: "認証回避が起きる条件を確かめる",
    difficulty: "BEGINNER",
    target: "SQL_LAB",
    mission: "ユーザーネーム：admin としてポータルに侵入する。",
    context:
      "ログインフォームの裏では、入力値がそのままSQLにつながれています。認証条件の組み立て方に注目してください。",
    sample: "unknown' OR '1'='1' --",
    action: "ログイン",
    hints: [
      "パスワードは空欄のまま、実行後に「実行内容を確認（学習用）」でユーザー名がどの引用符の内側に入るか確認しましょう。",
      "シングルクォートでユーザー名を閉じ、OR の右側に常に真になる比較条件を追加します。",
      "後ろに残るパスワード条件は -- でコメント化します。形は unknown' OR '1'='1' -- です。",
    ],
    explanation: [
      "unknown' はユーザー名の文字列を閉じます。unknown は存在しない想定なので、OR条件が認証回避に必要です。",
      "OR '1'='1' は必ず真になる比較条件を追加します。",
      "-- は後続のパスワード条件をコメントとして扱わせます。",
    ],
    successTitle: "200 OK — AUTH BYPASSED",
    impact: [
      "他人や管理者としてログインし、権限を奪われる。",
      "顧客情報や認証情報など、データベース内の情報が漏れる。",
      "データが改ざん・削除され、業務やサービスが停止する。",
    ],
    defense:
      "入力値はパラメータ化クエリでデータとして渡します。パスワードは平文で比較せず、保存済みハッシュを Argon2 で検証します。認証失敗時の応答は統一します。",
    safeCode: `// サーバー側の教材例（このアプリでは実行しません）
const user = await db.oneOrNone(
  'SELECT id, password_hash FROM users WHERE username = $1',
  [username]
);
// dummyHash は起動時に用意した、有効な Argon2 ハッシュ
const hash = user?.password_hash ?? dummyHash;
const valid = await argon2.verify(hash, password);
if (!user || !valid) {
  return response(401, '認証情報が正しくありません');
}
return createSession(user.id);`,
    codeExplanation: [
      "$1 と引数配列により、入力中の引用符や OR がSQL構文になるのを防ぎます。",
      "Argon2でハッシュを検証します。存在しないユーザーでもダミーハッシュを検証し、処理時間の差を抑えます。",
      "ユーザー未登録とパスワード不一致で同じメッセージを返し、アカウントの存在を明かしません。",
    ],
  },
  {
    id: "path-traversal",
    title: "Path Traversal",
    subtitle: "公開範囲外のパス解決を確かめる",
    difficulty: "BEGINNER",
    target: "FILES_LAB",
    mission: "公開ディレクトリ外の /etc/passwd を参照する",
    context:
      "公開ドキュメントの閲覧機能です。ファイル名に含まれる「上の階層」を、サーバーはどう解釈するでしょうか。",
    sample: "../../../etc/passwd",
    action: "ファイルを開く",
    hints: [
      "配信元は /var/www/public です。送信後に「実行内容を確認（学習用）」で、入力がどのパスに解決されたか確認しましょう。",
      "Linuxのアカウント情報ファイル /etc/passwd を目標にします。../ は1階層上への移動です。",
      "public、www、varの3階層を戻ってから続けます。例: ../../../etc/passwd",
    ],
    explanation: [
      "../ は親ディレクトリへの移動を表します。",
      "繰り返すことで /var/www/public からルート / に到達します。",
      "etc/passwd をつなげ、正規化後のパスを /etc/passwd にします。",
    ],
    successTitle: "200 OK — FILE EXPOSED",
    impact: [
      "設定ファイルやソースコードなど、非公開の情報が漏れる。",
      "秘密鍵や接続情報が露出し、別システムへの侵入につながる。",
      "サーバー構成やアカウント名が知られ、追加の攻撃に使われる。",
    ],
    defense:
      "利用者からファイルパスを受け取らず、公開可能なファイルIDだけを受け付けます。サーバー側の許可リストから対象を選びます。",
    safeCode: `// サーバー側の教材例
const publicFiles = new Map([
  ['guide', '/srv/public/guide.pdf'],
  ['terms', '/srv/public/terms.pdf'],
]);
const filePath = publicFiles.get(request.params.fileId);
if (!filePath) return response(404, 'Not found');
return sendPublicFile(filePath);`,
    codeExplanation: [
      "入力は guide などのIDだけです。利用者がサーバーのパス構造を指定することはできません。",
      "Mapに登録した公開ファイルだけを配信し、不明なIDは404で拒否します。",
      "許可リストのパスは運用側が管理します。限定公開資料には別途セッションに基づく認可も必要です。",
    ],
  },
  {
    id: "stored-xss",
    title: "Stored XSS",
    subtitle: "保存された入力の扱いを確かめる",
    difficulty: "EASY",
    target: "BOARD_LAB",
    mission: "script 要素内の alert 呼び出しで疑似アラートを再現する",
    context:
      "投稿は保存され、後から管理者に読まれます。投稿をHTMLとして扱ってしまうと何が起こるか、文字列の検出で再現します。",
    sample: "<script>alert('LAB')</script>",
    action: "投稿する",
    hints: [
      "この演習は、保存された投稿が後からHTMLとして扱われる状況を文字列解析で再現します。",
      "検出対象は script 要素の内側にある alert(...) 呼び出しです。イベント属性などは対象外です。",
      "開始タグ、alertの文字列引数、終了タグの順に組み立てます。例: <script>alert('LAB')</script>",
    ],
    explanation: [
      "<script> はスクリプト要素の開始を表します。",
      "alert('LAB') は表示メッセージ LAB を指定します。ここでは呼び出しを検出するだけです。",
      "</script> は要素を閉じます。実際のブラウザのHTMLパーサーには渡しません。",
    ],
    successTitle: "200 OK — STORED PAYLOAD DETECTED",
    impact: [
      "投稿を読んだ利用者の画面で、不正な操作が行われる。",
      "偽の入力フォームに誘導され、認証情報などが盗まれる。",
      "管理者権限で設定変更やデータ取得が行われる恐れがある。",
    ],
    defense:
      "通常のJSXで本文を文字列として描画し、出力先に応じたエスケープを行います。入力検証と Content Security Policy（CSP）も組み合わせます。",
    safeCode: `// React の教材例
function Message({ body }: { body: string }) {
  if (body.length > 500) return <p>投稿が長すぎます</p>;
  return <p className="message">{body}</p>;
}
// 配信サーバーで設定する CSP ヘッダーの例
// Content-Security-Policy: default-src 'self';
// script-src 'self'; object-src 'none'; base-uri 'none'`,
    codeExplanation: [
      "{body} はReactが文字列としてエスケープします。投稿のタグがHTML要素として解釈されません。",
      "長さや用途に合う入力検証を行います。検証だけでXSSを防げるわけではなく、安全な出力処理が中心です。",
      "CSPで実行できるスクリプトの配信元を制限します。CSPは安全な描画処理に追加する防御です。",
    ],
  },
  {
    id: "command-injection",
    title: "Command Injection",
    subtitle: "コマンド連結が起きる条件を確かめる",
    difficulty: "EASY",
    target: "NETWORK_LAB",
    mission: "接続診断にコマンドを追加し、flag.txt を読み取る",
    context:
      "接続確認ツールが、入力からコマンド文字列を生成しています。IPアドレスの後に、目標ファイル flag.txt を読む命令をつなげられるでしょうか。",
    sample: "127.0.0.1; cat flag.txt",
    action: "診断を実行",
    hints: [
      "入力は ping -c 1 の後ろへ連結されます。生成コマンドのどこから別の命令を始められるか考えましょう。",
      "; は前の成否にかかわらず、&& はping成功時に、|| はping失敗時に後続コマンドを実行します。| は両方を起動して出力を渡します。",
      "診断先、区切り、flag.txtを読む命令の順です。例: 127.0.0.1; cat flag.txt",
    ],
    explanation: [
      "127.0.0.1 は最初の疑似 ping の宛先です。",
      "; は前の成否にかかわらず次のコマンドを実行します。演習でも区切りごとの実行条件を反映します。",
      "cat flag.txt はファイル表示の形です。演習は文字列を照合し、固定の架空出力を返します。",
    ],
    successTitle: "200 OK — COMMAND CHAIN DETECTED",
    impact: [
      "アプリの実行権限で任意のOSコマンドを実行される。",
      "機密ファイルや環境変数が取得され、情報が漏れる。",
      "データ削除や不正プログラムの設置により、サーバーを奪われる。",
    ],
    defense:
      "可能ならOSコマンドを使わずに実装します。必要な場合はIP形式を検証し、固定の実行ファイルへ引数配列を渡します。シェルを介さず、実行時間も制限します。",
    safeCode: `// Node.js サーバー側の教材例。ブラウザでは実行しません。
import { isIP } from 'node:net';
import { execFile } from 'node:child_process';

if (isIP(address) === 0) return response(400, 'Invalid IP');
execFile('/bin/ping', ['-c', '1', '--', address], {
  shell: false,
  timeout: 3000,
  maxBuffer: 64 * 1024,
}, handleDiagnosticResult);`,
    codeExplanation: [
      "isIPでIPv4・IPv6の形式を確認し、コマンド区切り文字を含む文字列を拒否します。",
      "execFileに固定の実行ファイルと引数配列を渡します。shell: false により、入力をシェル構文として解釈しません。",
      "-- は以降をオプションとして扱わないための区切りです。使用OSの ping が対応することを確認し、時間と出力量も制限します。",
    ],
  },
  {
    id: "idor",
    title: "IDOR",
    subtitle: "リソース単位の認可不備を確かめる",
    difficulty: "EASY",
    target: "REPORTS_LAB",
    mission: "認可不備により user_88 のレポート #1042 を表示する",
    context:
      "user_17 でログイン中です。URLに含まれるレポートIDを #1042 に変えたとき、所有者の確認が行われるか確かめてください。",
    sample: "1042",
    action: "レポートを開く",
    hints: [
      "現在の利用者は user_17 です。自分のレポート #1001 と、目標のレポート #1042 で変わるリクエスト部分を確認しましょう。",
      "ログイン中の利用者は変えず、URLに含まれるレポートIDだけを目標の番号へ変更します。脆弱な処理は所有者を確認していません。",
      "仮想データにある別ユーザー user_88 のレポートIDは #1042です。入力欄には 1042 と入力します。",
    ],
    explanation: [
      "1042 は別ユーザー user_88 が所有するレポートIDです。",
      "URLのIDだけを書き換えても、ログイン中の利用者は user_17 のままです。",
      "脆弱な処理は所有者を確認せずIDだけで検索するため、他人の資料が表示されます。",
    ],
    successTitle: "200 OK — AUTHORIZATION BYPASSED",
    impact: [
      "他人の個人情報や社外秘レポートを閲覧される。",
      "更新APIでも同じ不備があれば、他人のデータを変更・削除される。",
      "IDを順に変更することで、大量のリソースを取得される。",
    ],
    defense:
      "認証と認可を分けて確認します。reportId に加え、認証セッションから得た ownerId を検索条件へ含め、対象がなければ404を返します。",
    safeCode: `// サーバー側の教材例
const session = requireSession(request);
const report = await db.report.findFirst({
  where: {
    id: reportId,
    ownerId: session.userId,
  },
});
if (!report) return response(404, 'Not found');
return response(200, report);`,
    codeExplanation: [
      "ownerIdは入力値から受け取らず、検証済み認証セッションから取り出します。",
      "リソースIDと所有者IDの両方を検索条件に入れ、別ユーザーの資料を返さないようにします。",
      "権限がない場合も存在しない場合も404を返します。推測しにくいIDだけに頼らず、各操作で認可します。",
    ],
  },
  {
    id: "open-redirect",
    title: "Open Redirect",
    subtitle: "外部URLが許可される条件を確かめる",
    difficulty: "BEGINNER",
    target: "REDIRECT_LAB",
    mission: "許可されていない外部サイトへの転送を再現する",
    context:
      "ログイン後の移動先をリンクで指定できます。正規サイトのURLに見えても、その先が安全とは限りません。",
    sample: "https://outside.example/welcome",
    action: "ログインリンクを作成",
    hints: [
      "next の値がログイン後の遷移先としてURL解析されます。相対URLは portal.example 内に解決されます。",
      "httpまたはhttpsとして解決され、portal.exampleと異なるオリジンになるURLを指定すると外部転送になります。",
      "安全な架空ホストを使う例は https://outside.example/welcome です。//outside.example/welcome のようなネットワークパス参照も外部へ解決されます。",
    ],
    explanation: [
      "https:// はURLのスキームです。演習は http と https だけを受け付けます。",
      "outside.example は演習用の架空ホストです。実際の判定では、ホスト・スキーム・ポートからなるオリジンがportal.exampleと異なるかを確認します。",
      "/welcome は移動先のパスです。302応答の流れだけを描画し、実際の遷移は行いません。",
    ],
    successTitle: "302 FOUND — EXTERNAL DESTINATION",
    impact: [
      "正規サイトのリンクを使ったフィッシングに利用される。",
      "ログイン直後に偽サイトへ誘導され、認証情報を再入力させられる。",
      "信頼するサービスからの遷移として、不正なページが信用される。",
    ],
    defense:
      "URLを直接受け取らず、dashboard や profile のような短いIDを受け付けます。サーバー側の許可済みパスへ変換して遷移します。",
    safeCode: `// サーバー側の教材例
const destinations = new Map([
  ['dashboard', '/dashboard'],
  ['profile', '/account/profile'],
]);
const path = destinations.get(request.query.destination);
if (!path) return response(400, 'Invalid destination');
return redirect(303, path);`,
    codeExplanation: [
      "利用者は許可された移動先IDだけを指定します。外部URLそのものは受け付けません。",
      "許可リスト内の固定パスだけを使い、未知のIDやURLはエラーにします。",
      "遷移先を同一サイトの管理下へ限定します。許可先のページにも別の無検証リダイレクトがないか確認します。",
    ],
  },
];

export function labIndexFromPath(path: string, base: string): number {
  const relative = path.startsWith(base) ? path.slice(base.length) : "";
  const index = labs.findIndex(
    (lab) =>
      relative === `labs/${lab.id}/` ||
      relative === `labs/${lab.id}` ||
      relative === `labs/${lab.id}/index.html`,
  );
  return index < 0 ? 0 : index;
}
