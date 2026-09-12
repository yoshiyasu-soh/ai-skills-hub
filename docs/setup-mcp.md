# MCP(Model Context Protocol)サーバー化

AI Skills Hub は `/api/mcp` に MCP エンドポイントを持ち、Claude Code / Claude Cowork などの
MCPクライアントから直接、投稿されているスキル・プロンプトを検索・参照できます。

**現状のスコープ: 参照系(検索・取得)のみ**。投稿・編集・お気に入り・DL数カウント等の
書き込み系操作は未対応です(今後の拡張候補。「今後の拡張」参照)。

本手順は実際に Cloudflare Zero Trust ダッシュボードで設定した際のキャプチャをもとに、
実機で確認できた内容として記載しています(旧版はダッシュボード文言を推測で記載していましたが、
本版は実際の画面に基づいて書き直したものです)。

## アーキテクチャ

Worker側は既存の認証方式(Cloudflare Access + Entra ID)をそのまま利用しており、
`/api/mcp` のコード自体に変更・追加のトークン発行ロジックはありません。
MCPクライアントからのOAuth対応は、**Cloudflare Access の「MCP サーバー ポータル」機能**
(Access コントロール › MCP ポータル、ベータ)を使って実現します。

```
Claude Code / Cowork
        │  ① MCPポータルへOAuth接続(ブラウザでEntra IDログイン)
        ▼
MCPサーバーポータル (例: https://mcp.soh.jp)
  = 専用の Access Application (マネージドOAuth 有効)
        │  ② ポータル→バックエンドへ、OAuth認証方式で中継
        ▼
既存の Access Application (ai-skills-hub - Cloudflare Workers)
  = サイト全体を保護しているアプリ。こちらも マネージドOAuth を有効化する必要がある
        │  Cf-Access-Jwt-Assertion ヘッダを付与して転送
        ▼
Cloudflare Workers (Hono) の /api/mcp
        └─ 既存の authMiddleware で認証(実ユーザーのメールアドレスを取得)
           ──▶ 読み取り専用ツールを実行
```

ポイント:
- **2段階の Access Application** が登場します。① MCPポータル自身のアプリ(新規作成、
  カスタムドメイン必須)と、② 既存のサイト全体保護アプリ(`ai-skills-hub - Cloudflare Workers`)。
  **両方でマネージドOAuthを有効化する必要があります**(片方だけでは動きません)。
- Worker側のコード(`worker/src/lib/jwt.ts`)は JWT の `email` クレームを必須にしているため、
  バックエンド側(②)の認証方式は「カスタムヘッダー(Service Token)」ではなく
  **「OAuth」を選ぶ**必要があります。Service Tokenは実ユーザーのメールアドレスを持たない
  ため、選んでしまうと401になるか、全MCP利用者が同一の見せかけの身元になってしまいます。
- Claude Code / Cowork が実際に接続する先は **Worker の直URLではなく、MCPポータルの
  カスタムドメイン**(例: `https://mcp.soh.jp`)です。

## 提供しているツール(読み取り専用)

| ツール名 | 内容 |
|---|---|
| `search_items` | キーワード・種別(skill/prompt)・タグ名・並び順で検索 |
| `get_item` | 指定IDの詳細(概要・詳細説明・プロンプト本文 または 使い方メモ・タグ・作者等)を取得 |
| `list_tags` | 絞り込みに使えるタグ一覧(名前・利用件数)を取得 |
| `get_skill_source` | SKILL.md単体形式のスキルの本文をテキストで取得(ZIP形式は非対応。Webサイトからダウンロードしてください) |

投稿・お気に入り登録・DL数カウント等は行わないため、MCP経由でアイテムを閲覧しても
一覧画面の利用数(users)やお気に入り数は変化しません。

## Cloudflare Access 側の設定手順

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

### 手順1: MCPサーバーポータルを新規作成する

1. Zero Trust ダッシュボード › **Access コントロール › MCP ポータル**(ベータ)を開き、
   「サーバー ポータルを追加」をクリックする。
2. **基本情報**
   - ポータル名: 例 `AI Skills Hub MCP`
   - ポータルID: 自動入力のままでOK(例 `ai-skills-hub-mcp`)
3. **カスタムドメイン**: サブドメイン(例 `mcp`)+ 既存ドメイン(例 `soh.jp`)を選択する。
   `soh.jpのDNSレコードが作成されます` という表示の通り、DNSレコードは自動作成される。
4. **Cloudflare Gatewayを経由してトラフィックをルーティングする**: オフのままでOK。
5. **コードモード**(ベータ): 複数ツールをまとめて1回で呼ぶ機能。今回は不要なため
   「オフ」または「オプトイン」(クライアントが要求した場合のみ有効)を選択。どちらでも問題ない。
6. **Accessポリシー**: 「現在のポリシーを追加」から、既存アプリで使っているポリシー
   (例 `outlook.com`)を選択する。新規に同じ条件のポリシーを作らず、既存ポリシーを
   流用することで許可条件を一元管理できる。
7. **マネージドOAuth**(ベータ)を **オン** にする。
   - 「localhostクライアントを許可」「ループバッククライアントを許可」: オン
     (Claude Code CLIのローカルOAuthコールバックに対応するため)
   - 「許可されたリダイレクトURI」: 基本は空欄のままでOK。Claude Cowork(ブラウザ版)から
     接続してリダイレクトURIエラーが出た場合は、ここにCowork側が提示するコールバックURLを
     追加する。
   - グラントセッション期間・アクセストークンの有効期間: 既定値のままでOK。
8. 「サーバー ポータルを追加」をクリックして保存する。

### 手順2: バックエンド(Worker)をMCPサーバーとして登録する

ポータル保存後、続けて「MCP サーバーを追加する」から登録する(または後から
MCPポータルの詳細画面 › 「MCP サーバー」タブから追加する)。

1. **サーバー名**: 例 `AI Skills Hub`
2. **HTTP URL**: このWorkerのMCPエンドポイントのフルURL。
   ```
   https://<Workerの公開ドメイン>/api/mcp
   ```
   (例: `https://ai-skills-hub.yoshiyasu.workers.dev/api/mcp`。独自ドメインを
   割り当てている場合はそちらを使う)
3. **サーバーID**: 空欄で自動生成されるものでOK。
4. **Cloudflare Gatewayを経由してルーティング**: オフのままでOK。
5. **認証の種類**: **「OAuth」を選択する**(デフォルト)。
   - 「カスタムヘッダー」(Service Token等)は選ばないこと。前述の通り、Worker側が
     `email` クレームを必須にしているため、Service Token経由では認証が通らないか、
     全利用者が同一の身元として扱われてしまう。
   - この選択が機能するには、前提の手順で **既存のサイト保護アプリ側にもマネージドOAuth
     が有効になっている**必要がある。
6. **Accessポリシー**: ここでも同じポリシー(例 `outlook.com`)を「現在のポリシーを追加」
   から追加する。
7. 「保存してサーバーに接続」をクリックする。

### トラブルシューティング: 「サーバーの認証が失敗したか、中断されました」

このエラーが出た場合:

1. まず、前提の手順(既存のサイト保護アプリの「追加設定」タブでマネージドOAuthが
   オンになっているか)を再確認する。
2. Zero Trust ダッシュボード › Access コントロール › **アプリケーション**(または
   AI Controls)› **MCP サーバー** タブを開き、該当のサーバーを選択 › 「編集」›
   **「サーバーを認証」** を選択する。
3. ブラウザ経由のEntra IDログイン画面が表示されるので、ログインして認可を完了させる。

## Claude Code から接続する

Worker の直URLではなく、**MCPポータルのカスタムドメイン**を指定する。

```bash
claude mcp add --transport http ai-skills-hub https://mcp.soh.jp
```

初回接続時にブラウザが開き、Entra ID のログイン画面(Access経由)が表示される。
認証後はトークンが自動的に保存・更新され、以後は再ログイン不要。

## Claude Cowork から接続する

Cowork のコネクタ設定画面で「カスタムMCPサーバーを追加」し、同じくポータルのURL
(`https://mcp.soh.jp`)を指定する。認証フローはClaude Codeと同様。

> **既知の注意点**: claude.ai(ブラウザ/モバイル)のコネクタが、Cloudflare Accessの
> マネージドOAuthで保護されたMCPポータルへの接続に失敗する一方、Claude Code(CLI)は
> 同一URLに問題なく接続できる、という事例が報告されています。Coworkで接続エラーが出て
> Claude Codeでは成功する場合は、クライアント側の既知の制約の可能性があるため、
> エラーメッセージを共有してください。

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
