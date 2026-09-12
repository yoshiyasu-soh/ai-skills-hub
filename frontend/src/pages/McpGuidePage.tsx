import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  InfoIcon,
  PlugIcon,
  SearchIcon,
  TerminalIcon,
} from "../components/icons";

// このAI Skills HubのMCPサーバー(ポータル)のURL。
// 別のドメインで運用する場合はここを書き換えてください。
const MCP_URL = "https://mcp.soh.jp/mcp";
const MCP_SERVER_NAME = "ai-skills-hub";

function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // クリップボードAPIが使えない環境では何もしない(手動選択でコピーしてもらう)
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2.5">
      <code className="flex-1 overflow-x-auto whitespace-pre font-mono text-[13px] leading-relaxed text-slate-100">
        {command}
      </code>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="flex shrink-0 items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
      >
        {copied ? (
          <>
            <CheckIcon className="h-3 w-3 text-emerald-400" />
            コピーしました
          </>
        ) : (
          <>
            <CopyIcon className="h-3 w-3" />
            コピー
          </>
        )}
      </button>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
      {n}
    </span>
  );
}

const USAGE_EXAMPLES = [
  {
    prompt: "AI Skills Hubで議事録に関するスキルを探して",
    note: "search_items が呼ばれ、該当するスキル・プロンプトの一覧(タイトル・概要・タグ・投稿者)が返ってきます。",
  },
  {
    prompt: "一番上のやつ、詳しく教えて",
    note: "get_item が呼ばれ、そのアイテムの詳細説明・使い方メモ・タグなどが返ってきます。",
  },
  {
    prompt: "AI Skills Hubにはどんなタグがある?",
    note: "list_tags が呼ばれ、絞り込みに使えるタグの一覧が返ってきます。",
  },
  {
    prompt: "〇〇スキルをインストールして",
    note: "後述の「スキルをインストールしてもらう」参照。検索→中身の取得→手元への保存まで自動で行われます。",
  },
];

export default function McpGuidePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeftIcon className="h-4 w-4" />
        一覧に戻る
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
          <PlugIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">MCP連携</p>
          <h1 className="text-xl font-bold text-slate-900">Claude Codeから話しかけて使う</h1>
        </div>
      </div>

      <p className="mb-8 max-w-prose text-sm leading-relaxed text-slate-600">
        AI Skills Hubは、MCP(Model Context Protocol)という仕組みを使って、Claude Codeから直接
        呼び出せるようになっています。一度つないでおけば、ブラウザでこのサイトを開かなくても、
        Claude Codeに話しかけるだけでスキル・プロンプトを検索したり、中身を確認したり、
        スキルをそのまま手元にインストールしたりできます。
      </p>

      {/* 事前準備 */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <InfoIcon className="h-3.5 w-3.5" />
          事前に必要なもの
        </p>
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-slate-700">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
            パソコンに <strong className="font-semibold">Claude Code</strong> がインストール済みであること
            (未導入の場合は情報システム部門・導入担当にお問い合わせください)
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
            AI Skills Hub にいつも使っているアカウント(会社のメールアドレス)でログインできること
          </li>
        </ul>
      </section>

      {/* 接続手順 */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">接続する(最初の1回だけ)</h2>

        <div className="flex flex-col gap-5">
          <div className="flex gap-3">
            <StepNumber n={1} />
            <div className="flex-1">
              <p className="mb-1.5 text-sm font-semibold text-slate-900">
                「ターミナル」を開く
              </p>
              <p className="mb-2 text-sm leading-relaxed text-slate-600">
                ターミナルとは、コマンド(文字の命令)を打ち込んで操作する黒っぽい画面のことです。
                普段Claude Codeを起動しているときに使っている画面がそれです。Claude Codeを起動していない場合は、
                まずいつも通りClaude Codeを起動してください。
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <StepNumber n={2} />
            <div className="flex-1">
              <p className="mb-1.5 text-sm font-semibold text-slate-900">
                下のコマンドをそのままコピーして、ターミナルに貼り付けてEnterキーを押す
              </p>
              <p className="mb-2 text-sm leading-relaxed text-slate-600">
                右の「コピー」ボタンを押すとコマンド全体がコピーされます。ターミナルの画面をクリックしてから、
                貼り付け(Windowsは右クリックまたは Ctrl+V、Macは Cmd+V)してEnterキーを押してください。
              </p>
              <CopyableCommand command={`claude mcp add --transport http ${MCP_SERVER_NAME} ${MCP_URL}`} />
            </div>
          </div>

          <div className="flex gap-3">
            <StepNumber n={3} />
            <div className="flex-1">
              <p className="mb-1.5 text-sm font-semibold text-slate-900">
                Claude Codeを起動し直し、認証を行う
              </p>
              <p className="mb-2 text-sm leading-relaxed text-slate-600">
                Claude Codeを一度終了し、もう一度起動してください。起動後、下のコマンドを実行すると、
                自動でブラウザが開きます。
              </p>
              <CopyableCommand command={`claude mcp login ${MCP_SERVER_NAME}`} />
            </div>
          </div>

          <div className="flex gap-3">
            <StepNumber n={4} />
            <div className="flex-1">
              <p className="mb-1.5 text-sm font-semibold text-slate-900">
                ブラウザで画面の指示に従ってログイン・許可を行う
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                以下の順番で画面が進みます。すべて許可・ログインして問題ありません。
              </p>
              <ol className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-slate-600">
                <li className="flex items-start gap-1.5">
                  <ChevronRightIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  いつも使っている社用メールアドレスとパスワードでログイン画面にサインインする
                  (すでにログイン済みの場合はこの画面は出ません)
                </li>
                <li className="flex items-start gap-1.5">
                  <ChevronRightIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  「AI Skills Hub」への接続を確認する画面が出たら「Authorize」(許可)ボタンを押す
                </li>
                <li className="flex items-start gap-1.5">
                  <ChevronRightIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  さらに、Workerへのアクセスを確認する画面が出た場合も「Allow」(許可)ボタンを押す
                </li>
              </ol>
            </div>
          </div>

          <div className="flex gap-3">
            <StepNumber n={5} />
            <div className="flex-1">
              <p className="mb-1.5 text-sm font-semibold text-slate-900">つながったか確認する</p>
              <p className="mb-2 text-sm leading-relaxed text-slate-600">
                Claude Codeの入力欄で下のコマンドを実行し、<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">ai-skills-hub</code> が
                「Connected」と表示されれば接続完了です。以降、毎回この作業をする必要はありません。
              </p>
              <CopyableCommand command="/mcp" />
            </div>
          </div>
        </div>
      </section>

      {/* うまくいかないとき */}
      <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="mb-1.5 text-sm font-semibold text-amber-900">うまくつながらないとき</p>
        <p className="text-sm leading-relaxed text-amber-800">
          「Access denied」「権限がありません」のようなメッセージが出る場合、AI Skills Hubの利用が
          許可されているアカウントでログインしているか確認してください。それでも解決しない場合は、
          エラーメッセージのスクリーンショットを添えて管理者にご連絡ください。
        </p>
      </section>

      {/* 使い方 */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">使い方</h2>
        <p className="mb-4 max-w-prose text-sm leading-relaxed text-slate-600">
          むずかしいコマンドを覚える必要はありません。Claude Codeに、いつも通り日本語で話しかけるだけです。
          「AI Skills Hub」という単語を含めて頼むと、確実にこのサイトの情報を使って答えてくれます。
        </p>

        <div className="flex flex-col gap-3">
          {USAGE_EXAMPLES.map((ex) => (
            <div key={ex.prompt} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="mb-1.5 flex items-center gap-2 font-mono text-sm text-slate-900">
                <SearchIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                「{ex.prompt}」
              </p>
              <p className="text-xs leading-relaxed text-slate-500">{ex.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* スキルのインストール */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <TerminalIcon className="h-3.5 w-3.5" />
          スキルをインストールしてもらう
        </p>
        <p className="mb-3 text-sm leading-relaxed text-slate-700">
          Claude Codeに「<strong className="font-semibold">〇〇スキルをインストールして</strong>」と頼むと、
          Claude Codeが自動的に AI Skills Hub からそのスキルを探し出し、中身を取得して、手元のパソコンの
          スキル置き場(<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.claude/skills/</code>{" "}
          など)にファイルを作成・登録するところまで行ってくれます。ダウンロード操作やファイルのコピーを
          自分で行う必要はありません。
        </p>
        <div className="mb-3 rounded-lg bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold text-slate-600">話しかけ方の例</p>
          <p className="font-mono text-sm text-slate-800">「PRレビューチェックリストスキルをインストールして」</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-1 text-xs font-semibold text-slate-500">現在の制限</p>
          <p className="text-xs leading-relaxed text-slate-500">
            この自動インストールが確実に使えるのは、<strong className="font-medium text-slate-700">SKILL.md単体形式</strong>で
            投稿されたスキルのみです。ZIP形式で投稿されたスキル(複数ファイルをまとめたもの)は、MCP経由では
            中身を取得できないため、お手数ですがWebサイトの詳細画面からダウンロードしてください。投稿画面で
            アイテムの種類(SKILL.md単体 / ZIP)を確認できます。
          </p>
        </div>
      </section>

      {/* できないこと */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-sm font-semibold text-slate-700">MCP経由ではできないこと</p>
        <p className="text-sm leading-relaxed text-slate-600">
          現時点では検索・閲覧のみに対応しており、MCP経由での新規投稿・編集・お気に入り登録はできません。
          これらの操作はこれまで通りWebサイト上で行ってください。また、MCP経由でスキル・プロンプトを見ても、
          一覧画面の利用数(users)には反映されません。
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          一覧を見る
        </Link>
        <a
          href="https://docs.claude.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
        >
          Claude公式ドキュメント
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
