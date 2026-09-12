import { useState } from "react";
import MarkdownContent from "./MarkdownContent";

interface Props {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  textareaClassName: string;
}

/**
 * GitHubのIssue本文入力のような「編集/プレビュー」切り替え式のMarkdownエディタ。
 * リアルタイムプレビューではなく、タブ切り替え時にその時点の内容を描画する。
 */
export default function MarkdownEditor({ value, onChange, rows = 6, placeholder, textareaClassName }: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const minHeight = `${rows * 1.6 + 1}rem`;

  return (
    <div>
      <div className="mb-1.5 inline-flex overflow-hidden rounded-md border border-slate-200 text-xs font-medium">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={`px-3 py-1 transition-colors ${
            mode === "edit" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-100"
          }`}
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`px-3 py-1 transition-colors ${
            mode === "preview" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-100"
          }`}
        >
          プレビュー
        </button>
      </div>

      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={textareaClassName}
        />
      ) : (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2" style={{ minHeight }}>
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-slate-400">プレビューする内容がありません</p>
          )}
        </div>
      )}
      <p className="mt-1 text-xs text-slate-400">Markdown記法に対応しています(見出し・リスト・コード・表など)</p>
    </div>
  );
}
