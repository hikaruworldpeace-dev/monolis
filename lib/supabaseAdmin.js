import { createClient } from "@supabase/supabase-js";

// ⚠️ このファイルは絶対にクライアントコンポーネント（"use client"）から
// import しないこと。SUPABASE_SERVICE_ROLE_KEY はRLSを無視して全データに
// アクセスできる強力な鍵なので、サーバー側（app/api/ 配下）でのみ使う。
// NEXT_PUBLIC_ を付けていないため、Next.jsはこれをブラウザ向けJSに含めない。

let adminClient = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が設定されていません（.env.local / Vercelの環境変数を確認してください）"
    );
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
