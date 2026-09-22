// 調達タブ用: 楽天市場商品検索APIをサーバー側から呼び出す。
// applicationId / accessKey はサーバー専用の環境変数に置き、ブラウザには渡さない。
//
// 2026-02に旧バージョンのIchibaItem検索APIが順次廃止され、新しいエンドポイント
// （openapi.rakuten.co.jp配下）+ accessKeyでの認証に切り替わった。
// 新エンドポイントの応答では itemUrl に rafcid（トラッキング用パラメータ）が
// 自動で付与されるため、旧来の affiliateId パラメータ・affiliateUrl は不要。

const ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

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
    const res = await fetch(`${ENDPOINT}?${params.toString()}`);
    const data = await res.json();

    if (data.error) {
      console.error(
        "[rakuten search] rakuten api error",
        JSON.stringify({
          httpStatus: res.status,
          error: data.error,
          error_description: data.error_description,
        })
      );
      return Response.json({ error: data.error_description || "楽天APIエラー" }, { status: 502 });
    }

    console.log(
      "[rakuten search] ok",
      JSON.stringify({ keyword, keys: Object.keys(data), raw: JSON.stringify(data).slice(0, 800) })
    );

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
