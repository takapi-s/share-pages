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

## Hosted instance

運営者がホスティングしているHosted instanceを利用できます。

```text
https://share-pages-production.pocky1111gm.workers.dev
```

- Google OAuthによるログインが必要です。
- 現在は設定済みの許可ドメイン・許可メールアドレスの範囲で利用できます。
- 共有ページは公開URLを知っている人が閲覧できます。
- 共有ページの有効期限は72時間です。
- 運営者はサービスの停止、データ削除、仕様変更を行う場合があります。
- 可用性やデータ保存を保証するサービスではありません。
- 機密情報、個人情報、認証情報、重要な業務データはアップロードしないでください。

利用者自身で管理したい場合は、以下のCloudflare Workers手順でセルフホストしてください。

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

4. GitHub Actions用のCloudflare API Tokenを作成します。

Cloudflare Dashboardの次のページを開きます。

```text
https://dash.cloudflare.com/profile/api-tokens
```

`Create Token`から、手動のR2 API Tokenではなく、Cloudflare Workers用のテンプレートを選択します。

```text
Create Token
→ Edit Cloudflare Workers
```

テンプレートが表示されない場合は、`Custom token`で次のAccount権限を設定します。

```text
Account Settings: Read
Workers Scripts: Edit
Workers R2 Storage: Edit
```

Durable ObjectsはWorkerのデプロイとmigrationの一部として扱うため、別のDurable Objects用S3/R2 Tokenは作成しません。`workers_dev: true`の構成ではZone Workers Routes権限も不要です。

Account Resourcesは対象のCloudflareアカウント1つだけに限定してください。`All accounts`は選択しないでください。CI専用Tokenには有効期限を設定し、定期的にローテーションしてください。

5. GitHubリポジトリのSecretへ登録します。Tokenの値はリポジトリへ書き込まず、GitHub Secretだけに保存します。

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo YOUR_GITHUB_OWNER/share-pages
```

プロンプトにTokenを入力します。Tokenはチャット、Issue、ログ、READMEへ貼り付けないでください。

6. Google OAuthのSecretを設定します。値はリポジトリへ保存しません。

```sh
npx wrangler@4.114.0 secret put GOOGLE_CLIENT_ID --env staging
npx wrangler@4.114.0 secret put GOOGLE_CLIENT_SECRET --env staging
npx wrangler@4.114.0 secret put GOOGLE_ALLOWED_DOMAIN --env staging
npx wrangler@4.114.0 secret put MCP_OAUTH_SIGNING_SECRET --env staging
```

`SHARE_API_TOKEN`を使う場合は、MCP OAuthの代わりにWorker APIを保護する用途として設定します。

7. Google OAuthのリダイレクトURIに登録します。

```text
https://YOUR_WORKER_HOST/auth/callback
```

8. dry-run、テスト、デプロイを実行します。

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

## CI/CD

Pushes to `main` run tests and deploy the production Worker through GitHub Actions. Pull requests create an isolated staging Worker and add its Preview URL to the PR.

## Current limitations

- 既定の期限は72時間です。
- 共有ページのURLを知っている利用者への細かなアクセス制御は提供していません。
- OAuthのGoogle設定は利用者自身のCloudflare/Google Cloudプロジェクトが必要です。
- Cloudflare版のMCPツールとローカルstdio MCPは別トランスポートです。
- 高トラフィック用途、監査ログ、利用者ごとの厳密なアクセス制御は未実装です。

## License

MIT License. See [LICENSE](LICENSE).
