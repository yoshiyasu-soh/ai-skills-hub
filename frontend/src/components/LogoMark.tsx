import { useId } from "react";

interface LogoMarkProps {
  className?: string;
}

// 中心のハブノードから3つの外側ノードへ線を伸ばした「共有・ネットワーク」を表すマーク。
// 背景グラデーションはスキル(青)とプロンプト(紫)の既存カラーを踏襲している。
export default function LogoMark({ className = "h-8 w-8" }: LogoMarkProps) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="AI Skills Hub">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill={`url(#${gradientId})`} />
      <g stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85">
        <line x1="16" y1="16" x2="16" y2="7" />
        <line x1="16" y1="16" x2="24" y2="21" />
        <line x1="16" y1="16" x2="8" y2="21" />
      </g>
      <circle cx="16" cy="16" r="3.6" fill="#ffffff" />
      <circle cx="16" cy="7" r="2.4" fill="#ffffff" />
      <circle cx="24" cy="21" r="2.4" fill="#ffffff" />
      <circle cx="8" cy="21" r="2.4" fill="#ffffff" />
    </svg>
  );
}
