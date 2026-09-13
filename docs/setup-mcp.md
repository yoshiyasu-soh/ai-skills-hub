# MCP(Model Context Protocol)サーバー化

AI Skills Hub は `/api/mcp` に MCP エンドポイントを持ち、Claude Code / Claude Cowork などの
MCPクライアントから直接、投稿されているスキル・プロンプトを検索・参照できます。

**現状のスコープ: 参照系(検索・取得)のみ**。投稿・編集・お気に入り・DL数カウント等の
書き込み系操作は未対応です(今後の拡張候補。「今後の拡張」参照)。

本手順は実際に構築・接続確認まで完了した際の記録です。**Cloudflare Access の
「MCP サーバー ポータル」機能はベータ版であり、ダッシュボードだけでは完結しない
既知の不具合が複数あります。** 本手順ではそれらの回避策(Cloudflare API での直接設定)も
含めて記載しています。

## アーキテクチャ

Worker側は既存の認証方式(Cloudflare Access + Entra ID)をそのまま利用しており、
`/api/mcp` のコード自体に変更・追加のトークン発行ロジックはありません。
MCPクライアントからのOAuth対応は、**Cloudflare Access の「MCP サーバー ポータル」機能**
(Access コントロール › MCP ポータル、ベータ)を使って実現します。

```
Claude Code / Cowork
        │  ① MCPポータルへOAuth接続(ブラウザでEntra IDログイン)
        ▼
MCPサーバーポータル (例: https://mcp.example.com/mcp) ★接続先は末尾 /mcp が必要
  = 専用の Access Application (マネージドOAuth 有効)
        │  ② ポータル→バックエンドへ、OAuth認証方式で中継(ユーザーの代理として)
        ▼
既存の Access Application (ai-skills-hub - Cloudflare Workers)
  = サイト全体を保護しているアプリ。こちらも マネージドOAuth を有効化する必要がある
        │  Cf-Access-Jwt-Assertion ヘッダを付与して転送
        ▼
Cloudflare Workers (Hono) の /api/mcp
        └─ 既存の authMiddleware で認証(実ユーザーのメールアドレスを取得)
           ──▶ 読み取り専用ツールを実行
```

Access内部では、実は**3つの Access Application** が関与します:

| アプリ | 役割 | 作成方法 |
|---|---|---|
| `ai-skills-hub - Cloudflare Workers` | サイト全体を保護(既存) | 手動作成済み |
| `AI Skills Hub MCP`(type: `mcp_portal`) | ポータル本体(`mcp.example.com`) | MCPポータル作成時に自動生成 |
| `AI Skills Hub`(type: `mcp`) | 個別サーバーのリソース表現 | MCPサーバー登録時に自動生成、**ダッシュボードの「アプリケーション」一覧には出てこない** |

3つ目の「`mcp` タイプ」アプリは隠れた存在で、これが今回の不具合の温床でした(詳細後述)。

## 提供しているツール(読み取り専用)

| ツール名 | 内容 |
|---|---|
| `search_items` | キーワード・種別(skill/prompt)・タグ名・並び順で検索 |
| `get_item` | 指定IDの詳細(概要・詳細説明・プロンプト本文 または 使い方メモ・タグ・作者等)を取得 |
| `list_tags` | 絞り込みに使えるタグ一覧(名前・利用件数)を取得 |
| `get_skill_source` | SKILL.md単体形式のスキルの本文をテキストで取得(ZIP形式は非対応。Webサイトからダウンロードしてください) |

投稿・お気に入り登録・DL数カウント等は行わないため、MCP経由でアイテムを閲覧しても
一覧画面の利用数(users)やお気に入り数は変化しません。

## セットアップ手順

### 前提: 既存のサイト保護アプリでマネージドOAuthを有効化する

1. Zero Trust ダッシュボード › **Access コントロール › アプリケーション** を開き、
   `docs/setup-cloudflare.md` 手順2-2で作成した既存のアプリ(例: `ai-skills-hub - Cloudflare Workers`)
   を選択する。
2. 上部タブの **「追加設定」**(「アプリケーションの詳細」の隣)を開く。
   **マネージドOAuthはここにあります**(「アプリケーションの詳細」タブを下までスクロールしても
   出てきません)。
3. 「マネージドOAuth」トグルを **オン** にして保存する。
   - このWorkerは自前のOAuthサーバーや `WWW-Authenticate` ヘッダーを実装していないため、
     有効化しても既存の動作(ブラウザSSO)と競合しません。

### 手順1: バックエンド(Worker)をMCPサーバーとして登録する

**MCPサーバーポータルの作成フォームは、最低1台のサーバーが登録済みでないと
保存できません**(「少なくとも1台のサーバーが必要です」というエラーで弾かれる)。
そのため、ポータルより先にサーバー単体を登録します。

1. Zero Trust ダッシュボード › **Access コントロール › AI controls › Secure MCP servers**
   を開き、「Add an MCP server」をクリックする。
2. **サーバー名**: 例 `AI Skills Hub`
3. **HTTP(S) URL**: `https://<Workerの公開ドメイン>/api/mcp`
   (例: `https://ai-skills-hub.example-team.workers.dev/api/mcp`)
4. **認証の種類**: **「OAuth」を選択する**(「カスタムヘッダー」は選ばない。Worker側の
   `authMiddleware` は JWT の `email` クレームを必須にしており、Service Token等の
   カスタムヘッダー認証では実ユーザーのメールアドレスが得られず機能しない)。
5. **Accessポリシー**: 既存アプリと同じポリシー(例 `社内ドメイン`)を追加する
   (新規に同条件のポリシーを作らず、一元管理する)。
6. 保存する。

### 手順2: MCPサーバーポータルを新規作成する

1. Zero Trust ダッシュボード › **Access コントロール › MCP ポータル**(ベータ)を開き、
   「サーバー ポータルを追加」をクリックする。
2. **基本情報**: ポータル名(例 `AI Skills Hub MCP`)、ポータルIDは自動入力のままでOK。
3. **カスタムドメイン**: サブドメイン(例 `mcp`)+ 既存ドメイン(例 `example.com`)を選択する。
   DNSレコードは自動作成される。
4. **Cloudflare Gatewayを経由してルーティング**: オフのままでOK。
5. **コードモード**(ベータ): 「オフ」または「オプトイン」。今回は不要なのでどちらでも良い。
6. **サーバー**: 「既存のサーバーを選択」から、手順1で登録したサーバー(例 `AI Skills Hub`)
   を選ぶ(「少なくとも1台のサーバーが必要です」の警告はこれで解消される)。
7. **Accessポリシー**: 「現在のポリシーを追加」から、既存アプリと同じポリシー(例 `社内ドメイン`)
   を選択する(新規に同条件のポリシーを作らず、一元管理する)。
8. **マネージドOAuth**を **オン** にする。「localhostクライアントを許可」
   「ループバッククライアントを許可」もオンにする(Claude Code CLIのローカルコールバックに対応)。
9. 「サーバー ポータルを追加」をクリックして保存する。

ここまではダッシュボードの表示通りに進めれば問題なく完了します。**問題はこの後、
実際にMCPクライアントを接続しようとした段階から発生します。**

## 既知の不具合と回避策(ベータ版・要Cloudflare API操作)

ダッシュボードの「サーバーを認証」ボタン(自動/DCRモードでの初回認証トリガー)は、
**クリックしても実際には何のリクエストも送信されず、機能しません**(2026年9月時点)。
また、自動的に発生するはずの動的クライアント登録(DCR)が、設定不足により失敗する
経路がいくつかあります。以下、実際に踏んだ不具合と対処を順に示します。

これらの操作には Cloudflare API トークン(`Access: Apps and Policies Write` 権限)が
必要です。Claude Code / Cowork に Cloudflare 公式MCPサーバーを接続し、AI経由で
実行することも可能です(本セットアップでもその方法で解決しました)。

### 不具合1: 個別サーバー用の隠れたAccessアプリに oauth_configuration が無い

MCPサーバーを登録すると、type: `mcp` の Access Application が自動生成されますが
(ダッシュボードのアプリケーション一覧には表示されない)、**このアプリには
`oauth_configuration` が一切設定されていません**。これがあらゆる認証エラーの土台になります。

対処(API):

```js
// GET /accounts/{account_id}/access/apps で type: "mcp" のアプリのIDを特定した上で
PUT /accounts/{account_id}/access/apps/{mcp型アプリのID}
{
  ...(既存の値をすべて含める),
  "oauth_configuration": {
    "enabled": true,
    "dynamic_client_registration": {
      "enabled": true,
      "allowed_uris": ["https://<ポータルのドメイン>/servers-callback"],
      "allow_any_on_localhost": true,
      "allow_any_on_loopback": true
    }
  }
}
```

同じ `allowed_uris` を、既存のバックエンドアプリ(`ai-skills-hub - Cloudflare Workers`)
側にも設定する。`allow_any_on_localhost`/`allow_any_on_loopback` は **localhost/127.0.0.1
宛のリダイレクトURIしか許可しない**ため、`https://<ポータル>/servers-callback` のような
実ホスト名は `allowed_uris` に明示的に追加しないと `redirect_uri is not allowed by the
account configuration` エラーになる。

### 不具合2: バックエンドのOAuthクライアントは client_secret_basic でなければならない

MCPサーバーの「認証」タブで「手動の資格情報」を使う場合(自動/DCRのボタンが機能しない
ため、実質こちらしか選択肢がない)、**Cloudflare Access がポータル→バックエンド間の
トークン交換を行う際、登録したクライアントの `token_endpoint_auth_method` に関わらず、
常に HTTP Basic認証(`client_secret_basic`)でクライアントシークレットを送信する**。
そのため、`client_secret_post`(または `none`)で登録したクライアントを設定すると、
バックエンドの同意画面(Allow/Deny)までは進むものの、その先で必ず
`Authorization failed: invalid client` になる。

対処: 登録時に明示的に `client_secret_basic` を指定する。

```bash
curl -s -X POST https://<team-domain>.cloudflareaccess.com/cdn-cgi/access/oauth/registration \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris":["https://<ポータルのドメイン>/servers-callback"],"client_name":"<任意>","token_endpoint_auth_method":"client_secret_basic","grant_types":["authorization_code","refresh_token"],"response_types":["code"]}'
```

返ってきた `client_id`・`client_secret` を、MCPサーバーの手動OAuth資格情報として設定する
(API経由。ダッシュボードの「手動の資格情報」欄からも入力可能なはずだが、
`config`(issuer/authorization_endpoint/token_endpoint/resource)を含めて送る必要が
あるため、APIから直接送るのが確実):

```js
PUT /accounts/{account_id}/access/ai-controls/mcp/servers/{server_id}
{
  "name": "AI Skills Hub",
  "client_secret": "<上記で取得したclient_secret>",
  "auth_credentials": JSON.stringify({
    "auth_mode": "manual",
    "config": {
      "issuer": "https://<team-domain>.cloudflareaccess.com",
      "authorization_endpoint": "https://<team-domain>.cloudflareaccess.com/cdn-cgi/access/oauth/authorization",
      "token_endpoint": "https://<team-domain>.cloudflareaccess.com/cdn-cgi/access/oauth/token",
      "revocation_endpoint": "https://<team-domain>.cloudflareaccess.com/cdn-cgi/access/oauth/revoke",
      "resource": "https://<Workerの公開ドメイン>/api/mcp"
    },
    "registration_info": {
      "client_id": "<上記で取得したclient_id>",
      "redirect_uris": ["https://<ポータルのドメイン>/servers-callback"]
    }
  })
}
```

「アカウントの管理 › OAuth クライアント」から作成するOAuthクライアント機能は、
**Cloudflare API への委任アクセス用の別システムであり、ここでは使えない**(登録しても
`Unknown client ID` になる)。必ず `/cdn-cgi/access/oauth/registration` に対して
直接登録すること。

上記2点を修正すると、MCPサーバーのステータスが `status: "ready"` になり、
`tools` 配列にツール一覧が入るようになる(`GET /accounts/{account_id}/access/ai-controls/mcp/servers/{id}` で確認可能)。

### 不具合3: Claude Desktop / claude.ai / モバイル / Cowork のコールバックURLが未許可

Claude Code(CLI)はローカルの `http://localhost:<ポート>/callback` を使うため
`allow_any_on_localhost` でカバーされるが、**Claude Desktop・claude.ai(ブラウザ)・
モバイルアプリ・Cowork は共通して固定のコールバックURL
`https://claude.ai/api/mcp/auth_callback` を使う**。これも実ホスト名なので
`allow_any_on_localhost`/`allow_any_on_loopback`ではカバーされず、
**ポータル本体のAccessアプリ**(type: `mcp_portal`)側の `allowed_uris` に
明示的に追加しないと、Claude Desktop側で「AI Skills Hubのサインインサービスに
登録できませんでした」というエラーになる。

対処(API):

```js
PUT /accounts/{account_id}/access/apps/{ポータル本体のAccessアプリのID}
{
  ...(既存の値をすべて含める),
  "oauth_configuration": {
    "enabled": true,
    "dynamic_client_registration": {
      "enabled": true,
      "allowed_uris": ["https://claude.ai/api/mcp/auth_callback"],
      "allow_any_on_localhost": true,
      "allow_any_on_loopback": true
    }
  }
}
```

## Claude Code から接続する

**接続先URLは、ポータルのドメイン直下ではなく、末尾に `/mcp` を付けたパスです。**

```bash
claude mcp add --transport http ai-skills-hub https://mcp.example.com/mcp
```

(`https://mcp.example.com` のみだと `MCP endpoint not found` エラーになる)

初回接続時にブラウザが開き、Entra ID のログイン画面(Access経由)→バックエンドへの
アクセス同意画面(Allow)の順で進む。完了後、Claude Code側で `/mcp` を実行し
`Connected` と表示されれば成功。

## Claude Desktop / claude.ai / Cowork から接続する

Claude Desktopの場合: 設定(Ctrl+, / Cmd+,)› Connectors › 画面下部の
「Add custom connector」から、名前と `https://mcp.example.com/mcp` を入力して追加する。
claude.ai(ブラウザ版)・モバイル・Coworkも、それぞれのコネクタ追加画面から同じURLを
指定すれば同様に接続できる(「不具合3」の対処が完了している前提)。

## ローカルでの動作確認(参考)

ローカル開発時は `DEV_BYPASS_EMAIL` による認証バイパスが有効なため、OAuth設定なしで
MCPエンドポイントを直接叩ける(`npx wrangler dev` 起動後):

```bash
# ツール一覧
curl -X POST http://localhost:8787/api/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# 検索
curl -X POST http://localhost:8787/api/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_items","arguments":{"query":"テスト"}}}'
```

## 今後の拡張(スコープ外)

- 投稿・編集・お気に入り登録・DL/コピーのカウント連携など、書き込み系ツールの追加
  (誤操作防止のため、確認ステップや権限スコープの設計が別途必要)
- `list_ranking` など補助的な参照ツールの追加
- Cloudflare側でベータ機能の不具合(「既知の不具合と回避策」参照)が修正された場合、
  ダッシュボードの「自動(推奨)」モード + 「サーバーの認証」ボタンだけで完結するように
  なる可能性がある。その際は本セクションの手動API操作は不要になる。
