// 管理者APIの簡易認証。リクエストヘッダー x-admin-password と
// 環境変数 ADMIN_PASSWORD を比較するだけのシンプルな仕組み。
// 個人〜小規模運用向けの簡易ゲートです。本格的な複数管理者運用や
// 監査ログが必要な場合は、NextAuth等への置き換えを検討してください。

export function isAdminAuthorized(request) {
  const provided = request.headers.get("x-admin-password") || "";
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false; // 未設定なら誰も入れないようにする（安全側に倒す）
  return provided === expected;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
