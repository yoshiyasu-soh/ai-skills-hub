# Cloudflare 側のセットアップ手順

このリポジトリは Cloudflare Workers (Hono) + D1 + R2 + 静的アセット(React/Vite) 構成です。
以下は実際に Cloudflare アカウント上へリソースを作成し、デプロイするまでの手順です。
（本セッションではコードのみを用意しており、実リソースの作成・デプロイはユーザー側で実施する想定です）

## 前提

- Cloudflare アカウント(Workers Paid プラン推奨。D1/R2 は無料枠でも動作しますが、
  社内利用の規模に応じてプランを検討してください)
- `npx wrangler login` でログイン済みであること
- Node.js 18 以上

## 1. 依存関係のインストール

```bash
npm install
```

## 2. D1 データベースの作成

```bash
npx wrangler d1 create ai-skills-hub-db
```

出力される `database_id` を `wrangler.jsonc` の `d1_databases[0].database_id` に貼り付けてください。

マイグレーションを適用します(`migrations/0001_init.sql` がテーブル定義とデフォルトタグの投入を行います):

```bash
# ローカル動作確認用
npm run db:migrate:local

# 本番D1に適用
npm run db:migrate:remote
```

## 3. R2 バケットの作成

```bash
npx wrangler r2 bucket create ai-skills-hub-assets
```

`wrangler.jsonc` の `r2_buckets[0].bucket_name` と一致していることを確認してください
(既定値のままなら変更不要です)。

## 4. Cloudflare Zero Trust (Access) の設定

### 4-1. Team domain の確認/作成

[Cloudflare Zero Trust ダッシュボード](https://one.dash.cloudflare.com/) →
「Settings」→「Custom Pages」等で Team domain (`https://<team>.cloudflareaccess.com`) を確認します。
未設定の場合は初回アクセス時に作成を求められます。

この値を `wrangler.jsonc` の `vars.ACCESS_TEAM_DOMAIN` に設定してください。

### 4-2. Login method に Entra ID を追加

`docs/setup-entra-id.md` の手順で取得した以下3つの値を使用します。

「Settings」→「Authentication」→「Login methods」→「Add new」→「Azure AD」を選択し、

- Client ID: Entra ID アプリの アプリケーション(クライアント) ID
- Client secret: 発行したクライアント シークレットの値
- Directory ID (Tenant ID): Entra ID のディレクトリ(テナント) ID

を入力して保存します。

### 4-3. Access Application (自己ホスト型) の作成

「Access」→「Applications」→「Add an application」→「Self-hosted」を選択:

1. Application name: 任意(例: `AI Skills Hub`)
2. Application domain: この Worker を公開するホスト名(カスタムドメイン推奨。例: `skills.example.com`)
3. Identity providers: 手順 4-2 で追加した Azure AD のみを有効化(社内限定のため他は無効化推奨)
4. Policies: 「Include」条件で社内ユーザーのみを許可する(例: Emails ending in `@your-company.co.jp`、
   または Entra ID 側で用意したグループを Azure Group 条件で指定)

作成後、アプリケーション詳細ページに表示される **Application Audience (AUD) Tag** をコピーし、
`wrangler.jsonc` の `vars.ACCESS_AUD` に設定してください。

## 5. wrangler.jsonc の最終確認

以下のプレースホルダーをすべて実際の値に置き換えます:

```jsonc
"database_id": "REPLACE_WITH_D1_DATABASE_ID",
"ACCESS_TEAM_DOMAIN": "https://REPLACE_WITH_YOUR_TEAM.cloudflareaccess.com",
"ACCESS_AUD": "REPLACE_WITH_ACCESS_APP_AUD_TAG",
```

## 6. デプロイ

```bash
npm run deploy
```

これはフロントエンドのビルド (`vite build` → `frontend/dist`) を行った上で
`wrangler deploy` を実行し、Worker・静的アセット・D1/R2 バインディングを一括でデプロイします。

## 7. カスタムドメインの割り当て

「Workers & Pages」→ 対象 Worker →「Settings」→「Domains & Routes」から、
手順 4-3 で Access Application に設定したホスト名を Worker のカスタムドメインとして追加してください。
Access はこのホスト名へのすべてのリクエストを検証し、認証成功後に
`Cf-Access-Jwt-Assertion` ヘッダを付与して Worker まで転送します
(Worker 側はこのヘッダの JWT を検証するのみで、ログイン処理自体は実装していません)。

## 8. 動作確認

1. Access で許可した社内ユーザーで対象ドメインにアクセスし、Entra ID の認証画面が出ることを確認する。
2. 認証後にアプリ本体(一覧画面)が表示されることを確認する。
3. スキルを1件投稿し、ダウンロードできること、DL数が増えることを確認する。
4. プロンプトを1件投稿し、コピー・claude.ai遷移・お気に入り登録ができることを確認する。

## ローカル開発

```bash
# 別ターミナルで Worker をローカル起動 (D1/R2 はローカルエミュレーション)
npx wrangler dev

# フロントエンドの dev server (上記 Worker に /api をプロキシ)
npm run dev:frontend
```

ローカルでは Cloudflare Access が介在しないため認証をバイパスする必要があります。
リポジトリ直下(`wrangler.jsonc` と同じ階層)に `.dev.vars` (Git管理対象外) を作成してください。
`.dev.vars.example` をコピーして使うと簡単です:

```bash
cp .dev.vars.example .dev.vars
```

```
ENVIRONMENT=development
DEV_BYPASS_EMAIL=you@example.com
```

`ENVIRONMENT` が `production` でない場合に限り、`Cf-Access-Jwt-Assertion` ヘッダが無くても
`DEV_BYPASS_EMAIL` のユーザーとしてログイン済み扱いになります。本番の `wrangler.jsonc` には
`DEV_BYPASS_EMAIL` を絶対に設定しないでください。
