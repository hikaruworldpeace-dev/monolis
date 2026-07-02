# monolis

「旅行の準備から思い出まで、これ一つ。」— 持ち物・タスク・旅程・お金・その他をまとめて管理する旅行管理サービスです。

Next.js（App Router）+ Tailwind CSS + lucide-react で構築しています。今回はダミーデータで動作する UI 実装です。Supabase 等の実データ連携は未接続なので、必要に応じて `components/MonolisApp.jsx` 内のダミーデータ部分を API 呼び出しに置き換えてください。

## ローカルで動かす

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くと確認できます。

## Vercel にデプロイする

### 方法A: Vercel CLI を使う（一番早い）

```bash
npm install -g vercel
vercel
```

プロンプトに従うだけでデプロイされ、URL が発行されます。以後の更新は同じフォルダで `vercel --prod` を実行してください。

### 方法B: GitHub 経由でデプロイ（継続的デプロイにおすすめ）

1. このフォルダを GitHub リポジトリにプッシュする
   ```bash
   git init
   git add .
   git commit -m "Initial commit: monolis"
   git branch -M main
   git remote add origin <あなたのリポジトリURL>
   git push -u origin main
   ```
2. [vercel.com](https://vercel.com) にログインし、「Add New... → Project」から今のリポジトリを選択
3. Framework Preset は自動で「Next.js」が検出されます。そのまま「Deploy」をクリック
4. 数十秒でデプロイが完了し、`https://your-project.vercel.app` のようなURLが発行されます

以後は `main` ブランチに push するたびに自動で再デプロイされます。

## フォルダ構成

```
monolis-app/
├── app/
│   ├── layout.js       # 全体レイアウト・メタデータ（タイトル、ファビコン等）
│   ├── page.js          # トップページ（MonolisApp を描画）
│   └── globals.css      # Tailwind 読み込み・共通アニメーション
├── components/
│   └── MonolisApp.jsx   # アプリ本体（画面・ロジックすべてここに集約）
├── public/
│   ├── logo-icon.png    # ロゴ（アイコンのみ）
│   └── logo-full.png    # ロゴ（アイコン＋ワードマーク）
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

## 今後の実データ連携について

- `components/MonolisApp.jsx` 冒頭の `initialTrips` がダミーデータです。ここを Supabase 等からの `fetch` に置き換えれば実データ化できます。
- 認証は Supabase Auth を想定した設計にしていますが、今回は未接続です。
