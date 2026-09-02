# Entra ID (Azure AD) 側の設定手順

Cloudflare Access の Login method として Microsoft Entra ID (旧 Azure AD) を使うための、
Azure 側でのアプリ登録手順です。会社の既存テナントを使う場合は Azure 管理者に実施してもらい、
個人で無料テナントを新規に用意する場合は手順 0 から進めてください。

## 0. (個人利用) 無料の Entra ID テナントを用意する

すでに会社の Microsoft 365 / Azure サブスクリプションがある場合はこの手順は不要です
(既存テナントで手順 1 に進んでください)。個人で無料に使いたい場合は、以下のいずれかで
費用ゼロの Entra ID テナントを用意できます。今回の用途(Cloudflare Access への OIDC SSO)は
Conditional Access などの Premium(P1/P2)機能を必要としないため、**無料の Entra ID Free で
十分**です(アクセス制御は Cloudflare Access 側のポリシーで行います)。

### 方法A: Azure の無料アカウントで作る(推奨・恒久無料)

1. https://azure.microsoft.com/free/ から Azure アカウントを作成する
   (本人確認のためクレジットカード登録が必要ですが、Entra ID の利用だけでは課金されません)。
2. アカウント作成すると既定の Microsoft Entra ID テナント(Free ライセンス)が自動的に作られる。
   複数テナントを分けたい場合は [Entra 管理センター](https://entra.microsoft.com/) の
   「テナントの管理」→「テナントの作成」から追加のテナントも作成可能。
3. このテナントの Free ライセンスは試用期間ではなく **恒久的に無料**。App 登録・OIDC/SAML SSO
   はこの範囲に含まれる。

### 方法B: Microsoft 365 Developer Program で作る(クレジットカード不要)

1. https://developer.microsoft.com/microsoft-365/dev-program に個人の Microsoft アカウントで登録する。
2. E5 相当の機能(Entra ID P2 含む)を持つサンドボックステナントが無料で払い出される(ユーザー25枠)。
3. **注意点**: Microsoft の利用規約上、アプリの開発・検証目的のテナントという位置づけであり、
   実運用の認証基盤として使い続けることは規約上グレーです。また 90 日間 Graph API 呼び出し等の
   「対象アクティビティ」が無いとテナントが回収されるリスクがあるため、継続利用には定期的な
   操作が必要です。ちょっと試したいだけ・カード登録をどうしても避けたい場合の選択肢として。

いずれの方法でも、作成したテナントに対して手順 1 以降の「アプリ登録」を行います。

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
