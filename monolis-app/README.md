# monolis

「旅行の準備から思い出まで、これ一つ。」— 持ち物・タスク・旅程・お金・その他をまとめて管理する旅行管理サービスです。

Next.js（App Router）+ Tailwind CSS + lucide-react + **Supabase**（データベース）で構築しています。

**ログイン・会員登録は一切ありません。** 旅行を作成すると発行される固有のURLを知っている人だけが、その旅行を見る・編集できます（Walicaと同じ「リンクが鍵」という考え方です）。

---

## 1. Supabaseプロジェクトを作る

1. https://supabase.com にアクセスし、GitHubアカウント等でログイン
2. 「New Project」から新規プロジェクトを作成（リージョンは Tokyo (Northeast Asia) がおすすめ）
3. プロジェクトが作成できたら、左メニュー「SQL Editor」を開く
4. このリポジトリの `supabase-schema.sql` の中身を全部コピーして貼り付け、「Run」を実行
   - `trips`（旅行データ）と `trip_members`（メンバー管理）の2つのテーブルと、データの読み書き専用の関数（RPC）が作られます
   - テーブルへの直接アクセスはすべて禁止し、関数経由でしか読み書きできないようにしてあります。これにより「旅行のURL（UUID）を知っている人だけがアクセスできる」を安全に実現しています
5. 左メニュー「Settings」→「API」を開き、以下の2つをメモしておく
   - **Project URL**（`https://xxxxxxxxxxxx.supabase.co`）
   - **Publishable key**（`sb_publishable_...` から始まる文字列。以前は「anon key」と呼ばれていたものと同じ役割です）

> ⚠️ 以前のバージョン（メールログイン方式）からアップグレードする場合は、SQL Editorで先に次を実行してから、`supabase-schema.sql` を実行してください。
> ```sql
> drop table if exists public.trip_members cascade;
> drop table if exists public.trips cascade;
> ```

## 2. 環境変数を設定する

`.env.local.example` を `.env.local` にコピーし、①でメモした値を貼り付けてください。

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 3. ローカルで動かす

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くと、そのままトップ画面（旅行一覧）が表示されます。ログイン操作は不要です。

## 4. Vercelに反映する

1. Vercelのプロジェクト画面 →「Settings」→「Environment Variables」
2. 以下の2つを追加（Production / Preview / Development すべてにチェック）
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 「Deployments」タブから最新のデプロイの「Redeploy」を実行

---

## 使い方（招待の仕組み）

1. 「旅行を作成」で名前・旅行タイトル・日程を入力すると、旅行が作成されます
2. 旅行詳細画面の、メンバーアイコン横の「＋」ボタンを押すとURLがコピーされます（`https://.../trip/旅行のID`）
3. そのURLをLINEなどで共有すると、開いた人は名前を入力するだけで（登録不要）そのメンバーとして参加できます
4. 参加した端末には「どの旅行に参加しているか」がブラウザに保存されるので、次回そのブラウザで開くと自動的に旅行一覧に表示されます

**注意**: 旅行データは「端末（ブラウザ）に保存された旅行ID一覧」をもとに表示されます。ブラウザのデータを消去したり、別の端末で開いたりすると、招待リンクを再度開いて参加し直す必要があります。

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
│   └── MonolisApp.jsx      # アプリ本体（データ取得・全画面）
├── lib/
│   └── supabaseClient.js   # Supabaseクライアントの初期化
├── public/
│   ├── logo-icon.png
│   └── logo-full.png
├── supabase-schema.sql      # Supabaseに実行するテーブル・関数定義
├── .env.local.example
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

## 今後の拡張について

- 現状、6秒ごとに開いている旅行のデータを再取得することで、複数人での同時編集をゆるやかに同期しています（Supabase Realtimeを使った即時同期ではありません）。より即時性を求める場合はRealtimeの導入を検討してください。
- 旅程・お金・その他タブの一部ボタン（旅程の予定追加、支払いの記録、リンク追加、画像添付など）はUIのみでまだDB保存に繋がっていません。同じ `updateTrip(trip)` の仕組みに沿って値を更新するだけで保存されるようになります。
- 画像添付には Supabase Storage の利用がおすすめです。
