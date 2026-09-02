# Cloudflare 側のセットアップ手順

このリポジトリは Cloudflare Workers (Hono) + D1 + R2 + 静的アセット(React/Vite) 構成です。
以下は実際に Cloudflare アカウント上へリソースを作成し、デプロイするまでの手順です。
（本セッションではコードのみを用意しており、実リソースの作成・デプロイはユーザー側で実施する想定です）

**ポイント: 手順0〜2は Cloudflare / Azure の管理画面(ブラウザ)だけで完結し、
リポジトリの clone や `npm install` は不要です。** ローカルでの作業(コード側)が必要になるのは
手順3以降です。作業前に迷わないよう、まずは全体の流れを掴んでください。

```
[0] Cloudflareアカウント作成 + Team domain決定  ← ブラウザだけ
[1] Entra ID 側でアプリ登録(docs/setup-entra-id.md) ← ブラウザだけ(Azure)
[2] Cloudflare Access に Entra ID を連携          ← ブラウザだけ
--------------------------------------------------
[3] リポジトリを clone して npm install           ← ここから初めてローカル作業
[4] D1 / R2 の作成                                ← ローカル(wrangler CLI)
[5] wrangler.jsonc に値を埋める
[6] デプロイ
```

## 前提

- Cloudflare アカウント(Workers Paid プラン推奨。D1/R2 は無料枠でも動作しますが、
  利用規模に応じてプランを検討してください)
- Node.js 18 以上(手順3以降で使用)

---

## 0. Cloudflareアカウント作成 + Team domain の決定

1. https://dash.cloudflare.com/ を開き、メールアドレスとパスワードでアカウントを新規作成する(無料)。
2. ログイン後、左サイドメニューの **「Zero Trust」** を開く。
3. 初回アクセス時に「チーム名(Team name)を選んでください」という画面が出るので、
   世界で一意な文字列を入力する(例: `yourname-hub`)。
   これがそのまま Team domain になる: `https://yourname-hub.cloudflareaccess.com`
4. プラン選択画面が出たら **「Free」** を選ぶ(50ユーザーまで無料)。

これで Team domain が確定しました。この URL を、次の Entra ID 側の手順(リダイレクト URI)で使います。
後で確認したくなったら、Zero Trust ダッシュボードの「Settings」→「Custom Pages」等から
いつでも参照できます。

## 1. Entra ID 側でアプリ登録

[`docs/setup-entra-id.md`](setup-entra-id.md) を参照し、手順0で決めた Team domain を使って
Azure Portal 側でアプリ登録を行ってください。ここで以下の3つの値を控えておきます。

- アプリケーション(クライアント) ID
- ディレクトリ(テナント) ID
- クライアント シークレットの値

## 2. Cloudflare Zero Trust に Entra ID を連携

### 2-1. Login method に Entra ID を追加

手順1で控えた3つの値を使用します。

Zero Trust ダッシュボードの「Settings」→「Authentication」→「Login methods」→「Add new」→
「Azure AD」を選択し、

- Client ID: Entra ID アプリの アプリケーション(クライアント) ID
- Client secret: 発行したクライアント シークレットの値
- Directory ID (Tenant ID): Entra ID のディレクトリ(テナント) ID

を入力して保存します。

### 2-2. Access Application (自己ホスト型) の作成

「Access」→「Applications」→「Add an application」→「Self-hosted」を選択:

1. Application name: 任意(例: `AI Skills Hub`)
2. Application domain: この Worker を公開するホスト名(カスタムドメイン推奨。例: `skills.example.com`。
   まだドメインが無ければ、後から手順7で追加してもここは仮入力で進めて構いません)
3. Identity providers: 手順2-1で追加した Azure AD のみを有効化(限定公開のため他は無効化推奨)
4. Policies: 「Include」条件で許可する対象を指定する(例: Emails ending in `@your-company.co.jp`、
   個人利用なら Emails で自分のメールアドレスを直接指定、
   または Entra ID 側で用意したグループを Azure Group 条件で指定)

作成後、アプリケーション詳細ページに表示される **Application Audience (AUD) Tag** をコピーし、
控えておいてください(手順5で使います)。

ここまでは全て Cloudflare / Azure の管理画面上の操作です。以降でようやくコード側の作業に入ります。

---

## 3. リポジトリの取得と依存関係のインストール

```bash
git clone <このリポジトリのURL>
cd ai-skills-hub
npm install
npx wrangler login   # ブラウザが開くのでCloudflareアカウントで認可する
```

## 4. D1 データベースの作成

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

## 5. R2 バケットの作成

```bash
npx wrangler r2 bucket create ai-skills-hub-assets
```

`wrangler.jsonc` の `r2_buckets[0].bucket_name` と一致していることを確認してください
(既定値のままなら変更不要です)。

## 6. wrangler.jsonc の最終確認

以下のプレースホルダーをすべて実際の値に置き換えます:

```jsonc
"database_id": "REPLACE_WITH_D1_DATABASE_ID",             // 手順4で取得
"ACCESS_TEAM_DOMAIN": "https://REPLACE_WITH_YOUR_TEAM.cloudflareaccess.com", // 手順0で決めたTeam domain
"ACCESS_AUD": "REPLACE_WITH_ACCESS_APP_AUD_TAG",           // 手順2-2で取得したAUD Tag
```

## 7. デプロイ

```bash
npm run deploy
```

これはフロントエンドのビルド (`vite build` → `frontend/dist`) を行った上で
`wrangler deploy` を実行し、Worker・静的アセット・D1/R2 バインディングを一括でデプロイします。

## 8. カスタムドメインの割り当て

「Workers & Pages」→ 対象 Worker →「Settings」→「Domains & Routes」から、
手順2-2で Access Application に設定したホスト名を Worker のカスタムドメインとして追加してください。
Access はこのホスト名へのすべてのリクエストを検証し、認証成功後に
`Cf-Access-Jwt-Assertion` ヘッダを付与して Worker まで転送します
(Worker 側はこのヘッダの JWT を検証するのみで、ログイン処理自体は実装していません)。

## 9. 動作確認

1. Access で許可したユーザーで対象ドメインにアクセスし、Entra ID の認証画面が出ることを確認する。
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
