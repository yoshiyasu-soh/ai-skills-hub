# AI Skills Hub

Claude Code のスキル・プロンプトを社内で共有するための、GitHub の超簡易版のようなサイトです。
Cloudflare Workers + D1 + R2 + React(Vite) で構築し、認証は Cloudflare Access 経由の
Entra ID (Azure AD) SSO を利用します。

## 主な機能

- スキル投稿(ZIP資産アップロード) / プロンプト投稿(テキスト)
- 投稿の編集・削除(投稿者本人のみ)
- タグ機能: デフォルトタグ + 投稿者による新規タグ追加、複数タグでの絞り込み(AND条件)
- タイトル・説明文の文字列検索(部分一致)
- ソート: 新着順 / 利用数順(DL数・コピー数) / お気に入り数順 / 名前順
- お気に入り登録・お気に入り一覧
- DL数(スキル) / コピー数(プロンプト)の記録とランキング表示(累計・過去7日・過去30日)
- プロンプトはワンクリックでクリップボードにコピー、または claude.ai の新規チャットへ
  本文入力済みの状態で遷移(`https://claude.ai/new?q=...`)
- スキルはブラウザから直接 ZIP ダウンロード

## アーキテクチャ

```
Cloudflare Access (Entra ID SSO)
        │  Cf-Access-Jwt-Assertion ヘッダを付与して転送
        ▼
Cloudflare Workers (Hono)  ──/api/*──▶  D1 (メタデータ) / R2 (スキルZIP)
        │
        └─/以外─▶ 静的アセット(React/Vite ビルド成果物, SPA)
```

- `worker/` : Hono ベースの API。`Cf-Access-Jwt-Assertion` を JWKS 検証し、
  ユーザーの email を元に users テーブルを upsert してから各エンドポイントを処理します。
- `frontend/` : React + Vite + Tailwind CSS の SPA。
- `migrations/` : D1(SQLite)のスキーマ定義。
- `wrangler.jsonc` : Worker 本体、D1/R2 バインディング、静的アセット配信の設定。

認証・認可はすべて Cloudflare Access 側のポリシーに委譲しており、Worker 自身はログイン画面や
トークン発行ロジックを持ちません(Access が検証済みの JWT を渡してくるだけ)。

## セットアップ

1. [`docs/setup-entra-id.md`](docs/setup-entra-id.md) — Entra ID 側でのアプリ登録
2. [`docs/setup-cloudflare.md`](docs/setup-cloudflare.md) — D1/R2 作成、Access アプリ作成、デプロイ

## ローカル開発

```bash
npm install
cp .dev.vars.example .dev.vars   # DEV_BYPASS_EMAIL 等を設定
npm run db:migrate:local

# ターミナル1
npx wrangler dev

# ターミナル2
npm run dev:frontend
```

詳細は `docs/setup-cloudflare.md` の「ローカル開発」を参照してください。

## 今後の拡張候補(今回のスコープ外)

- `npx skills add <name>` のような CLI 配布(現状は ZIP 一括ダウンロードのみ対応)
- GenU など他ツールへのワンクリック連携(現状はクリップボードコピーのみ対応)
- コメント・レビュー機能
- 投稿の承認フロー / モデレーション
