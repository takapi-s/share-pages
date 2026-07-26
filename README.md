# share-pages

Markdown / HTML を短期間だけ共有するための、Node.js ローカル実装と Cloudflare Workers 実装です。MCPクライアントから共有ページの作成・一覧・削除を実行できます。

初期アイデアは [TOKIUM Tech Blog の記事](https://zenn.dev/tokium_dev/articles/tokium-share-pages) に着想を得ています。

## Features

- Markdown / HTML のアップロード
- ドラッグ＆ドロップUI
- 一時共有URLの発行
- Markdownレンダリング
- HTMLのsandbox iframe表示
- 危険なHTML要素の除去
- 元ファイルのダウンロード
- 72時間の有効期限
- 期限切れページの閲覧時・定期削除
- 手動削除とページ一覧
- ローカルJSON永続化
- Cloudflare R2保存
- Cloudflare Durable ObjectsによるMCP Streamable HTTPセッション管理
- OAuth 2.0 / PKCE と Dynamic Client Registration
- MCP tools:
  - `share_markdown`
  - `share_html`
  - `list_shared_pages`
  - `delete_shared_page`

## Requirements

- Node.js 20+
- npm
- Cloudflareアダプターを使う場合: Wrangler 4+
- Cloudflare版の本番利用にはR2、Durable Objects、OAuth用Secretが必要

## Local Node.js server

```sh
npm ci
npm test
npm run check
npm start
```

デフォルトでは `http://127.0.0.1:8787` で起動し、データを `data/pages.json` に保存します。

```sh
SHARE_PAGES_DATA_DIR=/secure/path/share-pages-data npm start
```

ローカルのstdio MCPクライアントから使う場合:

```sh
SHARE_PAGES_URL=http://127.0.0.1:8787 npm run mcp
```

## Cloudflare Workers

1. Cloudflareへログインします。

```sh
npx wrangler@4.114.0 login
```

2. `wrangler.jsonc`の環境名、R2バケット名、`SHARE_PAGES_ORIGIN`を自分の環境へ変更します。

3. R2バケットを作成します。

```sh
npx wrangler@4.114.0 r2 bucket create YOUR_BUCKET_NAME
```

4. Secretを設定します。値はリポジトリやログへ保存しないでください。

```sh
npx wrangler@4.114.0 secret put GOOGLE_CLIENT_ID --env staging
npx wrangler@4.114.0 secret put GOOGLE_CLIENT_SECRET --env staging
npx wrangler@4.114.0 secret put GOOGLE_ALLOWED_DOMAIN --env staging
npx wrangler@4.114.0 secret put MCP_OAUTH_SIGNING_SECRET --env staging
```

`SHARE_API_TOKEN`を使う場合は、MCP OAuthの代わりにWorker APIを保護する用途として設定します。

5. Google OAuthのリダイレクトURIに登録します。

```text
https://YOUR_WORKER_HOST/auth/callback
```

6. dry-run、テスト、デプロイを実行します。

```sh
npm run check
npm test
npx wrangler@4.114.0 deploy --env staging --dry-run
npx wrangler@4.114.0 deploy --env staging
```

### Cloudflare MCP

Cloudflare版のMCPエンドポイントは次の形式です。

```text
https://YOUR_WORKER_HOST/mcp
```

CursorなどのStreamable HTTPクライアントには、次のように登録します。

```json
{
  "mcpServers": {
    "share-pages": {
      "url": "https://YOUR_WORKER_HOST/mcp"
    }
  }
}
```

MCPセッションは`McpAgent`とDurable Objectsで保持されます。R2バケットは直接公開せず、Worker経由で配信してください。

## Configuration

Cloudflare Secrets:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_ALLOWED_DOMAIN
GOOGLE_ALLOWED_EMAIL
MCP_OAUTH_SIGNING_SECRET
SHARE_API_TOKEN
```

公開リポジトリには値をコミットしないでください。サンプルは `.env.example` を参照してください。

## Security notes

- アップロード内容は信頼できない入力として扱ってください。
- HTMLはsandbox iframeとサニタイズを使用しますが、重要な機密情報の共有には使わないでください。
- 共有URLを知っている人は、期限内であればページを閲覧できます。
- 本番ではGoogle OAuthの許可ドメインまたはメールアドレスを必ず制限してください。
- R2バケットを公開設定にしないでください。
- Secret、OAuthコード、トークン、個人データをIssue・ログ・PRへ貼り付けないでください。

詳細は [SECURITY.md](SECURITY.md) を参照してください。

## Development

```sh
npm ci
npm run check
npm test
git diff --check
```

貢献方法は [CONTRIBUTING.md](CONTRIBUTING.md)、ライセンスは [LICENSE](LICENSE)、依存ライセンスの概要は [NOTICE](NOTICE) を参照してください。

## Current limitations

- 既定の期限は72時間です。
- 共有ページのURLを知っている利用者への細かなアクセス制御は提供していません。
- OAuthのGoogle設定は利用者自身のCloudflare/Google Cloudプロジェクトが必要です。
- Cloudflare版のMCPツールとローカルstdio MCPは別トランスポートです。
- 高トラフィック用途、監査ログ、利用者ごとの厳密なアクセス制御は未実装です。

## License

MIT License. See [LICENSE](LICENSE).
