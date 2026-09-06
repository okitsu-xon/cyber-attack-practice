import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { labs, labIndexFromPath } from "./lib/labs";
import type { Lab } from "./lib/labs";
import { simulateLab } from "./lib/labSimulation";
import type { LabId, LabResult } from "./lib/labSimulation";
import { failureFeedback } from "./lib/failureFeedback";
import { Shield } from "./components/Shield";
import { Modal } from "./components/Modal";
import "./App.css";

const base = import.meta.env.BASE_URL;
const tutorialKey = "byte-breaker-tutorial-complete";
const publicationInfo = {
  operator:
    import.meta.env.VITE_SITE_OPERATOR?.trim() ||
    "未設定（公開前に VITE_SITE_OPERATOR を設定してください）",
  contact:
    import.meta.env.VITE_CONTACT?.trim() ||
    "未設定（公開前に VITE_CONTACT を設定してください）",
  securityContact:
    import.meta.env.VITE_SECURITY_CONTACT?.trim() ||
    "未設定（公開前に VITE_SECURITY_CONTACT を設定してください）",
  rights:
    import.meta.env.VITE_RIGHTS_NOTICE?.trim() ||
    "未設定（公開前に VITE_RIGHTS_NOTICE を設定してください）",
};

function needsTutorial(): boolean {
  try {
    return localStorage.getItem(tutorialKey) !== "true";
  } catch {
    return true;
  }
}

function LabWorkspace({
  lab,
  onComplete,
  centerAnchorRef,
  formTitleRef,
}: {
  lab: Lab;
  onComplete: (id: LabId) => void;
  centerAnchorRef: RefObject<HTMLDivElement | null>;
  formTitleRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<LabResult | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [answer, setAnswer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultTimerRef = useRef<number | null>(null);
  const resultFrameRef = useRef<number | null>(null);
  const status =
    result && resultVisible
      ? result.success
        ? "success"
        : "failed"
      : "idle";
  const hideResult = () => {
    if (!result) return;
    if (resultTimerRef.current !== null)
      window.clearTimeout(resultTimerRef.current);
    setResultVisible(false);
    resultTimerRef.current = window.setTimeout(() => {
      setResult(null);
      resultTimerRef.current = null;
    }, 320);
  };
  const updateInput = (value: string) => {
    setInput(value);
    hideResult();
  };
  const run = () => {
    if (!input.trim()) return;
    const next = simulateLab(lab.id, input, password);
    if (resultTimerRef.current !== null)
      window.clearTimeout(resultTimerRef.current);
    if (resultFrameRef.current !== null)
      cancelAnimationFrame(resultFrameRef.current);
    setResultVisible(false);
    setResult(next);
    resultFrameRef.current = requestAnimationFrame(() => {
      setResultVisible(true);
      resultFrameRef.current = null;
    });
    if (next.success) onComplete(lab.id);
  };
  const reset = () => {
    setInput("");
    setPassword("");
    hideResult();
    setHintLevel(0);
    setAnswer(false);
    (textareaRef.current ?? inputRef.current)?.focus();
  };
  const toggleAnswer = () => {
    if (answer) {
      setAnswer(false);
      return;
    }
    setAnswer(true);
    setHintLevel(3);
    updateInput(lab.sample);
  };
  useEffect(() => {
    if (!result || !resultVisible) return;
    resultHeadingRef.current?.focus();
  }, [result, resultVisible]);
  useEffect(
    () => () => {
      if (resultTimerRef.current !== null)
        window.clearTimeout(resultTimerRef.current);
      if (resultFrameRef.current !== null)
        cancelAnimationFrame(resultFrameRef.current);
    },
    [],
  );
  const isSql = lab.id === "sql-injection";
  const isXss = lab.id === "stored-xss";
  const inputLabel = isSql
    ? "ユーザー名"
    : lab.id === "path-traversal"
      ? "ファイルパス"
      : isXss
        ? "投稿本文"
        : lab.id === "command-injection"
          ? "診断先IPアドレス"
          : lab.id === "idor"
            ? "レポートID"
            : "ログイン後の移動先";
  const placeholders: Record<LabId, string> = {
    "sql-injection": "ユーザー名を入力",
    "path-traversal": "guide.pdf",
    "stored-xss": "チームへのメッセージを入力…",
    "command-injection": "127.0.0.1",
    idor: "レポートIDを入力",
    "open-redirect": "/dashboard",
  };
  const feedback = result?.reason ? failureFeedback[result.reason] : undefined;
  const formTitles: Record<LabId, [string, string]> = {
    "sql-injection": [
      "Employee Portal",
      "認証情報を入力してログインしてください",
    ],
    "path-traversal": ["Document Viewer", "公開ドキュメントを開く"],
    "stored-xss": ["社員掲示板", "新しい投稿を作成"],
    "command-injection": ["Network Diagnostics", "接続確認ツール"],
    idor: ["Report Archive", "レポートをIDで検索"],
    "open-redirect": [
      "ログインリンク作成",
      "ログイン後の移動先を指定してください",
    ],
  };

  return (
    <section className="terminal" aria-label={`${lab.title} 演習ターミナル`}>
      <div className="terminal-bar">
        <span className="window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="terminal-target">
          SIMULATED TARGET <span aria-hidden="true">—</span> {lab.target}
        </span>
        <span className="isolated">
          <span className="status-dot" /> ISOLATED
        </span>
      </div>
      <div className="terminal-body">
        <aside className="mission-panel" aria-labelledby="mission-title">
          <div className="panel-eyebrow">
            <span aria-hidden="true">⌘</span> MISSION / HELP{" "}
            <span className="corner-mark" aria-hidden="true">
              ↗
            </span>
          </div>
          <div className="mission-content">
            <span className="micro-label">YOUR OBJECTIVE</span>
            <h2 id="mission-title">{lab.mission}</h2>
            <p>{lab.context}</p>
            <div className="mission-rule" />
            <div className="hint-actions">
              <div
                id="lab-hint"
                className={`smooth-disclosure ${hintLevel > 0 ? "is-open" : ""}`}
                aria-hidden={hintLevel === 0}
              >
                <div className="smooth-disclosure-inner">
                  <ol className="hint-list">
                    {lab.hints.slice(0, hintLevel).map((text, index) => (
                      <li key={text}>
                        <div className="hint-row">
                          <div className="hint-content">
                            <span>
                              HINT {String(index + 1).padStart(2, "0")}
                            </span>
                            <p>{text}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <button
                type="button"
                className="hint-button"
                aria-expanded={hintLevel > 0}
                aria-controls="lab-hint"
                onClick={() =>
                  setHintLevel((level) => (level === 3 ? 0 : level + 1))
                }
              >
                <span aria-hidden="true">◇</span>{" "}
                {hintLevel === 3
                  ? "ヒントを閉じる"
                  : `ヒント${hintLevel + 1}を見る`}
                <span aria-hidden="true">{hintLevel === 3 ? "−" : "+"}</span>
              </button>
              <button
                type="button"
                className="answer-button"
                aria-expanded={answer}
                aria-controls="lab-answer"
                onClick={toggleAnswer}
              >
                {answer ? "答えと解説を閉じる" : "答えと解説を表示"}{" "}
                <span aria-hidden="true">{answer ? "−" : "↗"}</span>
              </button>
              <div
                id="lab-answer"
                className={`smooth-disclosure ${answer ? "is-open" : ""}`}
                aria-hidden={!answer}
              >
                <div className="smooth-disclosure-inner">
                  <code className="answer-code">{lab.sample}</code>
                  <ol className="explanation-list">
                    {lab.explanation.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
          <div className="mission-footer">
            <Shield />
            {/* <span>
              失敗しても大丈夫。
              <br />
              <strong>何度でも試してみよう。</strong>
            </span> */}
          </div>
        </aside>

        <div ref={centerAnchorRef} className="target-area">
          <div className="target-breadcrumb">
            <span className="status-dot" /> target@byte-breaker{" "}
            <span className="muted">~ / {lab.target.toLowerCase()}</span>
            <span className="cursor" aria-hidden="true" />
          </div>
          <div className={`target-card ${isSql ? "login-card" : ""}`}>
            <div className="target-site-bar">
              <span aria-hidden="true">▧</span>
              <span>
                {isSql
                  ? "portal.internal / auth"
                  : `${lab.target.toLowerCase()}.internal`}
              </span>
              <span className="fictional-badge">FICTIONAL</span>
            </div>
            <div className="target-form">
              <div className="form-emblem" aria-hidden="true">
                {isSql ? (
                  <Shield />
                ) : isXss ? (
                  "✎"
                ) : lab.id === "command-injection" ? (
                  ">_"
                ) : lab.id === "idor" ? (
                  "▤"
                ) : lab.id === "open-redirect" ? (
                  "↗"
                ) : (
                  "⌑"
                )}
              </div>
              <h2 ref={formTitleRef} tabIndex={-1}>
                {formTitles[lab.id][0]}
              </h2>
              <p className="form-subtitle">{formTitles[lab.id][1]}</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  run();
                }}
              >
                <label htmlFor="payload">
                  {isSql ? (
                    <>
                      <span>USERNAME</span> / ユーザー名
                    </>
                  ) : (
                    inputLabel
                  )}
                </label>
                {lab.id === "path-traversal" && (
                  <div className="request-prefix">GET /documents?file=</div>
                )}
                {lab.id === "idor" && (
                  <div className="request-prefix">GET /api/reports/</div>
                )}
                {lab.id === "open-redirect" && (
                  <div className="request-prefix">
                    https://portal.example/login?next=
                  </div>
                )}
                <div className="input-row">
                  {lab.id === "command-injection" && (
                    <span className="input-prefix">PING</span>
                  )}
                  {isXss ? (
                    <textarea
                      id="payload"
                      ref={textareaRef}
                      value={input}
                      maxLength={500}
                      placeholder={placeholders[lab.id]}
                      onChange={(event) => updateInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          run();
                        }
                      }}
                      spellCheck={false}
                    />
                  ) : (
                    <input
                      id="payload"
                      ref={inputRef}
                      value={input}
                      maxLength={1000}
                      placeholder={placeholders[lab.id]}
                      onChange={(event) => updateInput(event.target.value)}
                      inputMode={lab.id === "idor" ? "numeric" : "text"}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                  )}
                </div>
                {isXss && (
                  <div className="input-help">
                    <span>Enterで投稿 / Shift + Enterで改行</span>
                    <span aria-live="polite">{input.length} / 500</span>
                  </div>
                )}
                {lab.id === "idor" && (
                  <p className="input-note">ログイン中: user_17</p>
                )}
                {isSql && (
                  <>
                    <label htmlFor="password">
                      <span>PASSWORD</span> / パスワード
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      maxLength={1000}
                      placeholder="パスワードを入力"
                      autoComplete="off"
                      onChange={(event) => {
                        setPassword(event.target.value);
                        hideResult();
                      }}
                    />
                  </>
                )}
                <button
                  type="submit"
                  className="run-button"
                  disabled={!input.trim()}
                >
                  <span aria-hidden="true">{isSql ? "→" : "▷"}</span>{" "}
                  {lab.action}
                </button>
              </form>
            </div>
            <div className="target-card-footer">
              <span aria-hidden="true">⌁</span> BYTE CORP. INTERNAL SYSTEM{" "}
              <span aria-hidden="true">·</span> SIMULATION
            </div>
          </div>
          <div className="execution-toolbar">
            <span className={`execution-status ${status}`}>
              <span className="status-dot" />
              {status === "idle"
                ? "入力待ち / READY"
                : status === "success"
                  ? "演習クリア / COMPLETE"
                  : "条件不成立 / TRY AGAIN"}
            </span>
            <button type="button" className="reset-button" onClick={reset}>
              <span aria-hidden="true">↻</span> RESET
            </button>
          </div>

          <div
            className={`results ${result ? "has-result" : ""} ${resultVisible ? "is-visible" : ""}`}
          >
            <div className="results-inner">
              {result && (
                <>
                {result.success && (
                  <div className="success-callout">
                    <span aria-hidden="true">✓</span>
                    <div>
                      <strong>正解です！</strong>
                      <p>攻撃が成立する条件を再現できました。</p>
                    </div>
                  </div>
                )}
                <div className="trace-block">
                  <span className="micro-label">
                    実行内容を確認（学習用） /{" "}
                    {isSql
                      ? "GENERATED SQL"
                      : lab.id === "command-injection"
                        ? "GENERATED COMMAND"
                        : "SIMULATED REQUEST"}
                  </span>
                  <pre>{result.trace}</pre>
                  <p className="simulation-limit">
                    これは仕組みを理解するための表示です。通常の対象画面に内部処理が表示されるとは限りません。
                  </p>
                </div>
                <div
                  className={`result-panel ${result.success ? "success" : "failed"}`}
                >
                  <h3 ref={resultHeadingRef} tabIndex={-1}>
                    {result.success ? lab.successTitle : feedback?.title}
                  </h3>
                  <pre>{result.output}</pre>
                  {feedback && <p>{feedback.message}</p>}
                  {result.success && isXss && (
                    <div className="browser-preview">
                      <div className="browser-address">
                        ▧ board.internal / admin-preview <span>SIMULATED</span>
                      </div>
                      <div className="pseudo-alert">
                        <span className="micro-label">
                          board.internal の内容
                        </span>
                        <p>{result.alertMessage}</p>
                        <span className="alert-indicator">
                          疑似 alert / 実行なし
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {result.success && (
                  <div className="learning-panels">
                    <section className="impact-panel">
                      <span className="micro-label">IMPACT</span>
                      <h3>実環境で悪用されると何が起きる？</h3>
                      <ul>
                        {lab.impact.map((text) => (
                          <li key={text}>{text}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="defense-panel">
                      <span className="micro-label">DEFENSE</span>
                      <h3>この攻撃を防ぐには</h3>
                      <p>{lab.defense}</p>
                      <div className="safe-code">
                        <div>
                          <span className="status-dot" /> SAFE IMPLEMENTATION{" "}
                          <span>教材コード / 実行されません</span>
                        </div>
                        <pre>
                          <code>{lab.safeCode}</code>
                        </pre>
                      </div>
                      <ol className="explanation-list">
                        {lab.codeExplanation.map((text) => (
                          <li key={text}>{text}</li>
                        ))}
                      </ol>
                    </section>
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        </div>
        <span className="terminal-watermark" aria-hidden="true">
          BYTE BREAKER // PRACTICE. UNDERSTAND. DEFEND.
        </span>
      </div>
    </section>
  );
}

export default function App() {
  const [current, setCurrent] = useState(() =>
    labIndexFromPath(window.location.pathname, base),
  );
  const [completed, setCompleted] = useState<LabId[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [about, setAbout] = useState(false);
  const [tutorial, setTutorial] = useState(needsTutorial);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const tabRef = useRef<HTMLButtonElement>(null);
  const skipTabFocus = useRef(false);
  const centerAnchorRef = useRef<HTMLDivElement>(null);
  const formTitleRef = useRef<HTMLHeadingElement>(null);
  const previousLab = useRef(current);
  const lab = labs[current]!;
  const modalOpen = tutorial || about;
  const closeAbout = useCallback(() => setAbout(false), []);
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    skipTabFocus.current = true;
    tabRef.current?.focus();
    queueMicrotask(() => {
      skipTabFocus.current = false;
    });
  }, []);
  const complete = useCallback(
    (id: LabId) =>
      setCompleted((items) => (items.includes(id) ? items : [...items, id])),
    [],
  );
  const focusWorkspace = useCallback(() => {
    centerAnchorRef.current?.scrollIntoView({
      behavior: "auto",
      block: "center",
    });
    formTitleRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const pop = () => {
      setCurrent(labIndexFromPath(window.location.pathname, base));
      setSidebarOpen(false);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const title = `${lab.title} — ${lab.subtitle} | BYTE BREAKER`;
    const description = `${lab.mission}。日本語で学ぶ、安全なフロントエンドWebセキュリティ演習。`;
    document.title = title;
    for (const [attribute, key, content] of [
      ["name", "description", description],
      ["property", "og:title", title],
      ["property", "og:description", description],
      ["property", "og:type", "website"],
      ["name", "twitter:card", "summary"],
      ["name", "twitter:title", title],
      ["name", "twitter:description", description],
    ]) {
      const selector = `meta[${attribute}="${key}"]`;
      let meta = document.querySelector<HTMLMetaElement>(selector);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute!, key!);
        document.head.appendChild(meta);
      }
      meta.content = content!;
    }
  }, [lab]);
  useEffect(() => {
    if (previousLab.current === current) return;
    previousLab.current = current;
    const frame = requestAnimationFrame(() => {
      focusWorkspace();
    });
    return () => cancelAnimationFrame(frame);
  }, [current, focusWorkspace]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarOpen && !modalOpen) closeSidebar();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [sidebarOpen, modalOpen, closeSidebar]);

  const navigate = (index: number) => {
    if (index < 0 || index >= labs.length) return;
    const changesLab = index !== current;
    if (
      index !== current ||
      window.location.pathname !== `${base}labs/${labs[index]!.id}/`
    ) {
      window.history.pushState({}, "", `${base}labs/${labs[index]!.id}/`);
      setCurrent(index);
    }
    setSidebarOpen(false);
    setInputFocused(false);
    if (!changesLab) requestAnimationFrame(focusWorkspace);
  };
  const start = () => {
    if (!acceptedRules) return;
    try {
      localStorage.setItem(tutorialKey, "true");
    } catch {
      /* Storage is optional; progress can continue. */
    }
    setTutorial(false);
    requestAnimationFrame(() => formTitleRef.current?.focus());
  };

  return (
    <>
      <div
        className="app-shell"
        inert={modalOpen}
        onFocusCapture={(event) => {
          if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement
          )
            setInputFocused(true);
        }}
        onBlurCapture={(event) => {
          if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement
          )
            setInputFocused(false);
        }}
      >
        <a className="skip-link" href="#main">
          メインコンテンツへ
        </a>
        <header className="site-header">
          <div className="brand">
            <Shield />
            <div>
              <strong>
                BYTE BREAKER<span className="brand-dot">.</span>
              </strong>
              <span>CYBER RANGE</span>
            </div>
          </div>
          <div className="header-right">
            <span className="offline-status">
              <span className="status-dot" /> LOCAL SIMULATION
            </span>
            <span className="version">v1.0.4</span>
            <button
              type="button"
              className="about-button"
              aria-label="このサイトについて"
              onClick={() => setAbout(true)}
            >
              ?
            </button>
          </div>
        </header>

        <button
          type="button"
          className={`sidebar-overlay ${sidebarOpen ? "is-open" : ""}`}
          aria-label="ラボ一覧を閉じる"
          aria-hidden={!sidebarOpen}
          disabled={!sidebarOpen}
          onClick={closeSidebar}
        />
        <aside
          className={`sidebar ${sidebarOpen ? "is-open" : ""}`}
          aria-label="ラボ一覧"
          onMouseEnter={() => {
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches)
              setSidebarOpen(true);
          }}
          onMouseLeave={(event) => {
            if (
              !modalOpen &&
              window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
              !event.currentTarget.contains(document.activeElement)
            )
              setSidebarOpen(false);
          }}
          onBlur={(event) => {
            if (
              !modalOpen &&
              !event.currentTarget.contains(event.relatedTarget)
            )
              setSidebarOpen(false);
          }}
        >
          <button
            ref={tabRef}
            type="button"
            className="labs-tab"
            aria-expanded={sidebarOpen}
            aria-controls="labs-navigation"
            onFocus={() => {
              if (
                !skipTabFocus.current &&
                window.matchMedia("(hover: hover)").matches
              )
                setSidebarOpen(true);
            }}
            onClick={() => setSidebarOpen((value) => !value)}
          >
            <span aria-hidden="true">▦</span>
            <span>LABS</span>
            <span aria-hidden="true">{sidebarOpen ? "‹" : "›"}</span>
          </button>
          <div
            className="sidebar-content"
            id="labs-navigation"
            inert={!sidebarOpen}
          >
            <div className="sidebar-heading">
              <span className="micro-label">TRAINING MODULES</span>
              <button
                type="button"
                className="icon-button"
                aria-label="ラボ一覧を閉じる"
                onClick={closeSidebar}
              >
                ×
              </button>
            </div>
            <h2>
              Choose your challenge<span>.</span>
            </h2>
            <div className="progress-label">
              <span>YOUR PROGRESS</span>
              <strong>
                {completed.length} <span>/ 06</span>
              </strong>
            </div>
            <progress
              max={6}
              value={completed.length}
              aria-label={`ラボ完了率 ${Math.round((completed.length / 6) * 100)}%`}
            />
            <p className="progress-caption">
              {Math.round((completed.length / 6) * 100)}% COMPLETE
            </p>
            <nav aria-label="演習ラボ">
              {labs.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`lab-choice ${index === current ? "active" : ""}`}
                  aria-current={index === current ? "step" : undefined}
                  onClick={() => navigate(index)}
                >
                  <span className="lab-choice-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.difficulty}</small>
                  </span>
                  <span
                    className={`lab-check ${completed.includes(item.id) ? "is-complete" : ""}`}
                    aria-label={completed.includes(item.id) ? "完了" : "未完了"}
                  >
                    {completed.includes(item.id) ? "✓" : "○"}
                  </span>
                </button>
              ))}
            </nav>
            <button
              type="button"
              className="sidebar-about"
              onClick={() => setAbout(true)}
            >
              このサイトについて <span aria-hidden="true">↗</span>
            </button>
          </div>
        </aside>

        <main id="main" className="main-content">
          <div className="lab-intro" key={`intro-${current}`}>
            <div>
              <div className="lab-kicker">
                <span>
                  LAB {String(current + 1).padStart(2, "0")}{" "}
                  <span className="muted">/ 06</span>
                </span>
                <span className="difficulty">{lab.difficulty}</span>
                <span className="intro-line" />
              </div>
              <h1>
                {lab.title}
                <span className="title-dot">_</span>
              </h1>
              <p className="lab-subtitle">{lab.subtitle}</p>
            </div>
            <div className="intro-decoration" aria-hidden="true">
              <span>LEARN BY BREAKING</span>
              <span>BUILD BY UNDERSTANDING</span>
              <div>〔 {String(current + 1).padStart(2, "0")} 〕</div>
            </div>
          </div>
          <LabWorkspace
            key={current}
            lab={lab}
            onComplete={complete}
            centerAnchorRef={centerAnchorRef}
            formTitleRef={formTitleRef}
          />
          <footer className="page-footer">
            <span>© BYTE BREAKER — CYBER RANGE</span>
            <span>
              <span className="status-dot" />{" "}
              入力は外部送信されません。許可された環境でのみ使用してください。
            </span>
          </footer>
        </main>
        <nav
          className={`bottom-navigation ${inputFocused ? "input-focused" : ""}`}
          aria-label="前後の問題"
        >
          <span className="nav-position">
            {String(current + 1).padStart(2, "0")} <span>/ 06</span>
          </span>
          <button
            type="button"
            disabled={current === 0}
            onClick={() => navigate(current - 1)}
          >
            <span aria-hidden="true">←</span> 前の問題
          </button>
          <button
            type="button"
            disabled={current === labs.length - 1}
            className="next-button"
            onClick={() => navigate(current + 1)}
          >
            次の問題 <span aria-hidden="true">→</span>
          </button>
        </nav>
      </div>

      <Modal open={tutorial} titleId="orientation-title">
          <div className="modal-logo">
            <Shield />
            <span>BYTE BREAKER / ORIENTATION</span>
          </div>
          <span className="modal-index">YOUR FIRST SESSION</span>
          <h2 id="orientation-title">
            安全な演習環境へ
            <br />
            ようこそ<span>。</span>
          </h2>
          <p>
            ここでは、架空のWebアプリを題材に脆弱性の仕組みと対策を学べます。演習入力はブラウザ内だけで処理され、外部へ送信されません。
          </p>
          <ol className="orientation-steps">
            <li>
              <span>01</span>左のLABSから好きな問題を選ぶ
            </li>
            <li>
              <span>02</span>攻撃が成立する条件を安全に再現する
            </li>
            <li>
              <span>03</span>問題はいつでも自由に行き来できる
            </li>
          </ol>
          <div className="orientation-rule" role="note">
            <strong>安全な利用ルール</strong>
            <p>
              操作できるのは、この教材内と、自分が管理するか管理者から明示的な許可を得た環境だけです。第三者のサイト、アカウント、ネットワークでは試さないでください。
            </p>
          </div>
          <label className="rule-consent">
            <input
              type="checkbox"
              checked={acceptedRules}
              onChange={(event) => setAcceptedRules(event.target.checked)}
            />
            <span>安全な利用ルールを確認しました</span>
          </label>
          <button
            type="button"
            className="run-button orientation-start"
            onClick={start}
            disabled={!acceptedRules}
          >
            演習を開始 <span aria-hidden="true">→</span>
          </button>
          <div className="modal-safety">
            <span className="status-dot" /> FICTIONAL TARGETS / AUTHORIZED USE
            ONLY
          </div>
      </Modal>
      <Modal open={about} titleId="about-title" onClose={closeAbout}>
          <div className="modal-logo">
            <Shield />
            <span>ABOUT THIS LAB</span>
          </div>
          <h2 id="about-title">
            安全に、壊して学ぶ<span>。</span>
          </h2>
          <p>
            BYTE BREAKER はWebセキュリティの基礎を学ぶためのフロントエンド・シミュレーターです。表示される企業名、人物、認証情報、ファイルはすべて架空です。
          </p>
          <p>
            入力は文字列として解析するだけです。実際のコマンド実行、ファイル・データベースへのアクセス、外部通信は行いません。
          </p>
          <section className="about-section" aria-labelledby="usage-title">
            <h3 id="usage-title">安全な利用について</h3>
            <p>
              この教材内、または自分が管理するか管理者から明示的な許可を得た環境だけで利用してください。第三者のサイト、アカウント、ネットワークに対して、掲載された入力例や手法を試してはいけません。
            </p>
            <p>
              演習は理解のために単純化されています。表示される防御コードも教材例であり、そのまま本番環境へ導入することを保証するものではありません。
            </p>
          </section>
          <section className="about-section" aria-labelledby="privacy-title">
            <h3 id="privacy-title">データとプライバシー</h3>
            <ul>
              <li>氏名、メールアドレスなどの個人情報の入力は求めません。</li>
              <li>
                演習入力とラボ完了状況はブラウザのメモリ内だけで扱い、再読み込みで消えます。
              </li>
              <li>
                初回案内の完了状態だけを、このブラウザのlocalStorageへ保存します。
              </li>
              <li>
                Cookie、アクセス解析、広告、外部APIはアプリ内で使用しません。
              </li>
              <li>
                配信事業者がIPアドレス等のアクセスログを扱う場合は、公開者と配信事業者の方針が適用されます。
              </li>
            </ul>
            <p>
              初回案内を再表示するには、ブラウザのサイトデータから「byte-breaker-tutorial-complete」を削除してください。
            </p>
          </section>
          <section className="about-section" aria-labelledby="contact-title">
            <h3 id="contact-title">運営・お問い合わせ</h3>
            <dl className="publication-info">
              <div>
                <dt>運営者</dt>
                <dd>{publicationInfo.operator}</dd>
              </div>
              <div>
                <dt>一般窓口</dt>
                <dd>{publicationInfo.contact}</dd>
              </div>
              <div>
                <dt>セキュリティ窓口</dt>
                <dd>{publicationInfo.securityContact}</dd>
              </div>
              <div>
                <dt>権利・利用条件</dt>
                <dd>{publicationInfo.rights}</dd>
              </div>
            </dl>
          </section>
          <button type="button" className="run-button" onClick={closeAbout}>
            ラボに戻る <span aria-hidden="true">→</span>
          </button>
          <div className="modal-safety">
            <span className="status-dot" /> LOCAL SIMULATION / v1.0.4
          </div>
      </Modal>
    </>
  );
}
