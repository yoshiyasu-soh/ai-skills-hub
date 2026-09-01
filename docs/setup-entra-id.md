# Entra ID (Azure AD) 側の設定手順

Cloudflare Access の Login method として Microsoft Entra ID (旧 Azure AD) を使うための、
Azure 側でのアプリ登録手順です。実際にリソースを作成する操作は管理者権限が必要なため、
このドキュメントの手順は Azure 管理者に実施してもらってください。

## 1. アプリ登録の作成

1. [Azure Portal](https://portal.azure.com/) にサインインし、「Microsoft Entra ID」→「アプリの登録」→「新規登録」を開く。
2. 名前: 任意(例: `ai-skills-hub-cloudflare-access`)
3. サポートされているアカウントの種類: 「この組織のディレクトリのみ」(社内限定のため)
4. リダイレクト URI: 種類は `Web` を選び、下記の Cloudflare Access コールバック URL を設定する。
   ```
   https://<あなたのチームドメイン>.cloudflareaccess.com/cdn-cgi/access/callback
   ```
   `<あなたのチームドメイン>` は Cloudflare Zero Trust ダッシュボードの
   `Settings > Custom Pages` などで確認できる Team domain です(後述の Cloudflare 側手順で作成)。
5. 「登録」をクリックして作成する。

## 2. クライアントシークレットの発行

1. 作成したアプリの「証明書とシークレット」→「新しいクライアント シークレット」
2. 説明・有効期限を設定して追加する。
3. **発行直後にのみ表示される「値」をコピーして安全に保管する**(Cloudflare 側で使用)。

## 3. API のアクセス許可

「API のアクセス許可」で以下が付与されていることを確認する(既定で付与されていることが多い):

- `openid`
- `email`
- `profile`
- `User.Read`

管理者の同意が必要な場合は「管理者の同意を与えます」を実行する。

## 4. 必要な情報をまとめる

Cloudflare 側の設定で以下3つの値を使用します。「概要」画面と手順2でメモしておいてください。

| 項目 | 確認場所 |
|---|---|
| アプリケーション (クライアント) ID | 「概要」画面 |
| ディレクトリ (テナント) ID | 「概要」画面 |
| クライアント シークレットの値 | 手順2で発行した値 |

## 5. (任意) 社内配布に絞るグループの用意

特定の部署・チームだけに公開したい場合は、Entra ID 側で対象ユーザーを含むグループを作成し、
グループ ID を控えておく。Cloudflare Access のポリシーで「Azure Group」条件として利用できる。

以降は `docs/setup-cloudflare.md` を参照し、Cloudflare Zero Trust 側でこれらの値を登録してください。
