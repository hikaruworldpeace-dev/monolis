// 調達タブ用: 楽天市場商品検索APIをサーバー側から呼び出す。
// applicationId / accessKey はサーバー専用の環境変数に置き、ブラウザには渡さない。
//
// 2026-02に旧バージョンのIchibaItem検索APIが順次廃止され、新しいエンドポイント
// （openapi.rakuten.co.jp配下）+ accessKeyでの認証に切り替わった。
// 新エンドポイントの応答では itemUrl に rafcid（トラッキング用パラメータ）が
// 自動で付与されるため、旧来の affiliateId パラメータ・affiliateUrl は不要。
//
// 新エンドポイントは、楽天ウェブサービスにアプリ登録した「アプリケーションURL」を
// Referer/Originヘッダーで検証する（REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING）。
// Referer は fetch() の headers に指定しても実際には送信されない「forbidden
// header」のため、Node.jsの https モジュールで直接リクエストを組み立てる。

import https from "node:https";

export const runtime = "nodejs";

const ENDPOINT_HOST = "openapi.rakuten.co.jp";
const ENDPOINT_PATH = "/ichibams/api/IchibaItem/Search/20260701";
const APP_REFERRER = "https://monolis-delta.vercel.app/";

function fetchRakuten(query) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: ENDPOINT_HOST,
        path: `${ENDPOINT_PATH}?${query}`,
        headers: {
          Referer: APP_REFERRER,
          Origin: "https://monolis-delta.vercel.app",
          "User-Agent": "Mozilla/5.0 (monolis)",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get("keyword") || "").trim();
  const page = searchParams.get("page") || "1";

  if (!keyword) {
    return Response.json({ error: "keyword is required" }, { status: 400 });
  }

  const applicationId = process.env.RAKUTEN_APPLICATION_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!applicationId || !accessKey) {
    return Response.json(
      { error: "楽天APIが設定されていません（RAKUTEN_APPLICATION_ID / RAKUTEN_ACCESS_KEY未設定）" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    applicationId,
    accessKey,
    keyword,
    genreId: "0",
    hits: "20",
    page,
    imageFlag: "1",
    format: "json",
  });

  try {
    const { status, data } = await fetchRakuten(params.toString());

    if (data.error || data.errors) {
      console.error(
        "[rakuten search] rakuten api error",
        JSON.stringify({
          httpStatus: status,
          error: data.error || data.errors?.errorCode,
          error_description: data.error_description || data.errors?.errorMessage,
        })
      );
      return Response.json(
        { error: data.error_description || data.errors?.errorMessage || "楽天APIエラー" },
        { status: 502 }
      );
    }

    const items = (data.Items || []).map(({ Item }) => ({
      code: Item.itemCode,
      name: Item.itemName,
      price: Item.itemPrice,
      url: Item.itemUrl,
      imageUrl: Item.mediumImageUrls?.[0]?.imageUrl || null,
      shopName: Item.shopName,
      reviewAverage: Item.reviewAverage,
      reviewCount: Item.reviewCount,
    }));

    return Response.json({
      items,
      page: data.page,
      pageCount: data.pageCount,
      count: data.count,
    });
  } catch (err) {
    return Response.json({ error: "検索に失敗しました" }, { status: 500 });
  }
}
