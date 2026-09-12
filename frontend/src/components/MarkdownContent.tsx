import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  className?: string;
}

/**
 * Markdown文字列をReact要素として描画する(dangerouslySetInnerHTMLは使わない)。
 * rehype-rawを組み込んでいないため、本文中に生HTMLを書いてもそのままテキストとして表示され、実行されない。
 */
export default function MarkdownContent({ content, className = "" }: Props) {
  return (
    <div
      className={`prose prose-sm prose-slate max-w-none prose-headings:font-semibold prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-normal prose-pre:bg-slate-900 prose-img:rounded-lg [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100 ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
