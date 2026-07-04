import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[monolis] Supabase の環境変数が設定されていません。.env.local を確認してください。"
  );
}

// monolis はログイン不要（URL共有方式）なので Auth は使わない。
// データの読み書きはすべて supabase-schema.sql で定義した RPC 関数経由で行う。
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
