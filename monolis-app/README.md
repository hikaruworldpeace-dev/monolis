# monolis

「旅行の準備から思い出まで、これ一つ。」— 持ち物・タスク・旅程・お金・その他をまとめて管理する旅行管理サービスです。

Next.js（App Router）+ Tailwind CSS + lucide-react + **Supabase**（認証・データベース・リアルタイム同期）で構築しています。

ログインしたユーザーごとに旅行データが保存され、招待リンクを共有すると他のメンバーも同じ旅行を編集できます。誰かが持ち物にチェックを入れると、他のメンバーの画面にもリアルタイムで反映されます。

---

## 1. Supabaseプロジェクトを作る

1. https://supabase.com にアクセスし、GitHubアカウント等でログイン
2. 「New Project」から新規プロジェクトを作成（リージョンは Tokyo (Northeast Asia) がおすすめ）
3. プロジェクトが作成できたら、左メニュー「SQL Editor」を開く
4. このリポジトリの `supabase-schema.sql` の中身を全部コピーして貼り付け、「Run」を実行
   - `trips`（旅行データ）と `trip_members`（メンバー管理）の2つのテーブル、権限（RLS）、招待の仕組みが一括で作られます
5. 左メニュー「Authentication」→「Providers」で **Email** が有効になっていることを確認（デフォルトで有効です。パスワード不要の「マジックリンク」でログインする方式を使います）
6. 「Authentication」→「URL Configuration」で以下を設定
   - **Site URL**: `https://あなたのVercelのURL`（例: `https://monolis-delta.vercel.app`）
   - **Redirect URLs**: 上記URLに加えて、開発用に `http://localhost:3000` も追加しておくと便利です
7. 左メニュー「Settings」→「API」を開き、以下の2つをメモしておく
   - **Project URL**
   - **anon public** キー

## 2. 環境変数を設定する

`.env.local.example` を `.env.local` にコピーし、①でメモした値を貼り付けてください。

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 3. ローカルで動かす

```bash
npm install
npm run dev
```

`http://localhost:3000` を開き、メールアドレスを入力 →「ログインリンクを送る」→ 届いたメールのリンクを開くとログインできます。

## 4. Vercelに反映する

すでにVercelにデプロイ済みの場合、環境変数を追加してから再デプロイが必要です。

1. Vercelのプロジェクト画面 →「Settings」→「Environment Variables」
2. 以下の2つを追加（Production / Preview / Development すべてにチェック）
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 追加したら「Deployments」タブから最新のデプロイの「Redeploy」を実行
   - もしくはGitHubに何か変更をpushすれば自動で再デプロイされます

これで本番のURLでもログイン・データ保存・リアルタイム共有が動くようになります。

---

## 招待の仕組み

旅行詳細画面の、メンバーアイコンの横にある「＋」ボタンを押すとURLがコピーされます（`https://.../trip/旅行のID`）。このリンクをLINEなどで共有し、相手がリンクを開いてログイン（初めての場合はメールでログインリンクが届きます）→「この旅行に参加する」を押すと、その旅行のメンバーに加わります。

---

## フォルダ構成

```
monolis-app/
├── app/
│   ├── layout.js          # 全体レイアウト・メタデータ
│   ├── page.js             # トップページ（旅行一覧）
│   ├── trip/[id]/page.js   # 招待リンクから開くページ
│   └── globals.css
├── components/
│   └── MonolisApp.jsx      # アプリ本体（認証・データ取得・全画面）
├── lib/
│   └── supabaseClient.js   # Supabaseクライアントの初期化
├── public/
│   ├── logo-icon.png
│   └── logo-full.png
├── supabase-schema.sql      # Supabaseに実行するテーブル定義
├── .env.local.example
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

## 今後の拡張について

- 現状、旅程・お金・その他タブの「追加」ボタンの一部（旅程の予定追加、支払いの記録、リンク追加、画像添付など）はUIのみでまだDB保存に繋がっていません。同じ `updateTrip(trip)` の仕組みに沿って値を更新するだけで保存されるようになります。
- 画像添付には Supabase Storage の利用がおすすめです。
