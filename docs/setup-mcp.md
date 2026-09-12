# MCP(Model Context Protocol)サーバー化

AI Skills Hub は `/api/mcp` に MCP エンドポイントを持ち、Claude Code / Claude Cowork などの
MCPクライアントから直接、投稿されているスキル・プロンプトを検索・参照できます。

**現状のスコープ: 参照系(検索・取得)のみ**。投稿・編集・お気に入り・DL数カウント等の
書き込み系操作は未対応です(今後の拡張候補。「今後の拡張」参照)。

## アーキテクチャ

既存の認証方式(Cloudflare Access + Entra ID)をそのまま流用しており、MCP専用の
トークン発行・OAuthサーバーをWorker側に新たに実装してはいません。

```
Claude Code / Cowork
        │  MCPのOAuthフロー(ブラウザでEntra IDログイン)
        ▼
Cloudflare Access (Entra ID SSO)  ← 既存の Self-hosted Application がそのままカバー
        │  Cf-Access-Jwt-Assertion ヘッダを付与して転送
        ▼
Cloudflare Workers (Hono)
        └─ /api/mcp ──▶ 既存の authMiddleware で認証 ──▶ 読み取り専用ツールを実行
```

`/api/mcp` は他の `/api/*` エンドポイントと同じ Hono ルーティング配下にあるため、
`docs/setup-cloudflare.md` の手順2-2で作成した既存の Access Application(ドメイン全体をカバー)
がそのまま `/api/mcp` にも適用されます。**新しい Access Application を作る必要はありません。**
`wrangler.jsonc` の変更・新しい環境変数・KV/Durable Objectsの追加も不要です。

## 提供しているツール(読み取り専用)

| ツール名 | 内容 |
|---|---|
| `search_items` | キーワード・種別(skill/prompt)・タグ名・並び順で検索 |
| `get_item` | 指定IDの詳細(概要・詳細説明・プロンプト本文 または 使い方メモ・タグ・作者等)を取得 |
| `list_tags` | 絞り込みに使えるタグ一覧(名前・利用件数)を取得 |
| `get_skill_source` | SKILL.md単体形式のスキルの本文をテキストで取得(ZIP形式は非対応。Webサイトからダウンロードしてください) |

投稿・お気に入り登録・DL数カウント等は行わないため、MCP経由でアイテムを閲覧しても
一覧画面の利用数(users)やお気に入り数は変化しません。

## Cloudflare Access 側の設定(要ダッシュボード作業)

Claude Code / Cowork のようなMCPクライアントは、ブラウザ経由の通常ログインではなく
OAuth 2.1(PKCE + Dynamic Client Registration)の認可コードフローで認証します。
そのため Access アプリケーション側で、この方式に対応した動作(未認証時に
`401` + `WWW-Authenticate` を返し、OAuthのメタデータ(`/.well-known/oauth-authorization-server` 等)
を公開する)を有効にする必要があります。Cloudflare Zero Trust には
**Access › AI Controls** 配下に MCP サーバー保護専用の設定があります。

> **注意**: 本セッションの実行環境ではネットワーク制限により
> `developers.cloudflare.com` の該当ドキュメントページに直接アクセスできず、
> ダッシュボードの正確なメニュー名・手順を一次情報で確認できませんでした。
> 以下は一般的なOAuthプロバイダ化の手順として記載していますので、実際の画面の文言と
> 異なる場合は Cloudflare Zero Trust ダッシュボード内の表記を優先してください。
> 設定後に実際の画面のスクリーンショットを共有いただければ、この手順書を実機に合わせて
> 更新します。

想定される手順:

1. Zero Trust ダッシュボードで **Access › Applications** を開き、`docs/setup-cloudflare.md`
   手順2-2で作成した既存の Application(このサイト全体を保護しているもの)を確認する。
2. **Access › AI Controls**(または同等の「MCP Server」向け設定)を開き、上記ドメインの
   `/api/mcp` パスをMCPサーバーとして登録する。ここでこのパス宛のリクエストについて、
   ブラウザ以外のクライアント(MCPクライアント)向けにOAuthベースの認証が有効になる。
3. 許可するユーザーの条件(ポリシー)は、既存の Access Application のポリシーがそのまま
   引き継がれる想定(=同じユーザーがWeb版・MCP版の両方にアクセス可能)。個別に絞りたい場合は
   MCP用の設定内でポリシーを追加する。

## Claude Code から接続する

```bash
claude mcp add --transport http ai-skills-hub https://<公開ドメイン>/api/mcp
```

初回接続時にブラウザが開き、Entra ID のログイン画面(Access経由)が表示されます。
認証後はトークンが自動的に保存・更新され、以後は再ログイン不要です。

## Claude Cowork から接続する

Cowork のコネクタ設定画面で「カスタムMCPサーバーを追加」し、上記と同じURL
(`https://<公開ドメイン>/api/mcp`)を指定してください。認証フローはClaude Codeと同様です。

## ローカルでの動作確認(参考)

ローカル開発時は `DEV_BYPASS_EMAIL` による認証バイパスが有効なため、OAuth設定なしで
MCPエンドポイントを直接叩けます(`npx wrangler dev` 起動後):

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
