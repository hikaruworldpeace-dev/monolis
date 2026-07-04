# monolis

「旅行をみんなで作るプラットフォーム」— 行きたい場所探し・相談・投票・旅程・持ち物・お金をひとつに集約する旅行管理サービスです。

Next.js（App Router）+ Tailwind CSS + lucide-react + **Supabase**（データベース）+ **Google Maps Platform**（みんなの地図）で構築しています。

**ログイン・会員登録は一切ありません。** 旅行を作成すると発行される固有のURLを知っている人だけが、その旅行を見る・編集できます（Walicaと同じ「リンクが鍵」という考え方です）。

---

## 1. Supabaseプロジェクトを作る

1. https://supabase.com にアクセスし、GitHubアカウント等でログイン
2. 「New Project」から新規プロジェクトを作成（リージョンは Tokyo (Northeast Asia) がおすすめ）
3. プロジェクトが作成できたら、左メニュー「SQL Editor」を開く
4. このリポジトリの `supabase-schema.sql` の中身を全部コピーして貼り付け、「Run」を実行
   - `trips`（旅行データ）と `trip_members`（メンバー管理）の2つのテーブルと、データの読み書き専用の関数（RPC）が作られます
   - **地図のスポット・コメント・投票・リアクションもすべて `trips` の中の1つのデータとして保存されるので、今回の地図機能追加にあたってテーブル構造の変更は不要です**
5. 左メニュー「Settings」→「API」を開き、以下の2つをメモしておく
   - **Project URL**（`https://xxxxxxxxxxxx.supabase.co`）
   - **Publishable key**（`sb_publishable_...` から始まる文字列）

## 2. Google Maps Platformの設定（Shared Map機能に必要）

1. https://console.cloud.google.com にアクセスし、プロジェクトを作成（または既存のものを選択）
2. 左メニュー「APIとサービス」→「ライブラリ」から、以下の3つを検索して**それぞれ「有効にする」**をクリック
   - **Maps JavaScript API**（地図の表示）
   - **Places API**（行きたい場所の検索）
   - **Directions API**（徒歩/車/公共交通機関の移動時間表示）
3. 左メニュー「APIとサービス」→「認証情報」→「認証情報を作成」→「APIキー」でキーを発行
4. 発行したキーの「アプリケーションの制限」で「HTTPリファラー」を選択し、自分のVercel URL（例: `https://monolis-delta.vercel.app/*`）と `http://localhost:3000/*` を登録しておくと安全です
5. 「請求先アカウント」の設定が必要です（Google Maps Platformは無料枠がありますが、クレジットカード登録が必須です）。想定利用規模であれば無料枠内に収まることがほとんどです

## 3. 環境変数を設定する

`.env.local.example` を `.env.local` にコピーし、①②でメモした値を貼り付けてください。

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 4. ローカルで動かす

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くと、そのままトップ画面（旅行一覧）が表示されます。

## 5. Vercelに反映する

1. Vercelのプロジェクト画面 →「Settings」→「Environment Variables」
2. 以下の3つを追加（Production / Preview / Development すべてにチェック）
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. 「Deployments」タブから最新のデプロイの「Redeploy」を実行

---

## みんなの地図（Shared Map）の使い方

旅行詳細画面を開くと、最初に表示されるのがこの「みんなの地図」タブです。

- 下部の検索バーで施設名を検索すると、地図上と候補リストに追加されます（水色ピン）
- スポットをタップすると詳細シートが開き、**コメント・リアクション（👍❤️🔥✨）・「ここ行こう！」投票**ができます
- 「旅程へ追加」を押すと、日付と時刻を選んで旅程に確定できます（ピンが黄緑色に変わります）
- ボトムシートは上下にドラッグして高さを調整できます（Google Mapsアプリのような操作感）

旅程タブでは、地図から確定した予定同士について、**徒歩/車/公共交通機関の移動時間**が自動表示されます。また、1日の予定が3件以上（地図座標を持つもの）あると「最適化」ボタンが表示され、最も効率のよい順番に並べ替えます（距離だけを考慮する簡易アルゴリズムです。営業時間などは考慮しません）。

---

## 招待の仕組み

旅行詳細画面の、メンバーアイコン横の「＋」ボタンを押すとURLがコピーされます（`https://.../trip/旅行のID`）。このリンクをLINEなどで共有すると、開いた人は名前を入力するだけで（登録不要）そのメンバーとして参加できます。

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
│   ├── MonolisApp.jsx      # アプリ本体（データ取得・全画面）
│   └── SharedMapTab.jsx    # みんなの地図（検索・投票・コメント・旅程確定）
├── lib/
│   ├── supabaseClient.js   # Supabaseクライアントの初期化
│   ├── googleMaps.js       # Google Maps JS APIの読み込み
│   ├── geo.js               # 距離計算・簡易ルート最適化
│   └── localTrips.js        # 端末（ブラウザ）側の参加旅行・名前の保存
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
- ルート最適化は距離だけを考慮する簡易アルゴリズムです。営業時間や滞在時間を考慮したより高度な最適化は将来の拡張候補です。
- お金・その他タブの画像添付はまだ未実装です（Supabase Storageの追加設定が必要です）。
- AI持ち物提案・AI旅行コンシェルジュは現状ダミー実装（固定候補の表示）です。将来的にLLM APIへ接続しやすい構造にしてあります。
