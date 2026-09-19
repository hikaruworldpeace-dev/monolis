// 調達タブ用: 楽天市場商品検索APIをサーバー側から呼び出す。
// applicationId / affiliateId はサーバー専用の環境変数に置き、ブラウザには渡さない
// （affiliateId が漏れると第三者に不正利用されうるため）。

const ENDPOINT = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get("keyword") || "").trim();
  const page = searchParams.get("page") || "1";

  if (!keyword) {
    return Response.json({ error: "keyword is required" }, { status: 400 });
  }

  const applicationId = process.env.RAKUTEN_APPLICATION_ID;
  if (!applicationId) {
    return Response.json({ error: "楽天APIが設定されていません（RAKUTEN_APPLICATION_ID未設定）" }, { status: 500 });
  }

  const params = new URLSearchParams({
    applicationId,
    keyword,
    hits: "20",
    page,
    imageFlag: "1",
    format: "json",
  });
  if (process.env.RAKUTEN_AFFILIATE_ID) {
    params.set("affiliateId", process.env.RAKUTEN_AFFILIATE_ID);
  }

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`);
    const data = await res.json();

    if (data.error) {
      return Response.json({ error: data.error_description || "楽天APIエラー" }, { status: 502 });
    }

    const items = (data.Items || []).map(({ Item }) => ({
      code: Item.itemCode,
      name: Item.itemName,
      price: Item.itemPrice,
      url: Item.affiliateUrl || Item.itemUrl,
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
