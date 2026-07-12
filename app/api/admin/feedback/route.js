import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { isAdminAuthorized, unauthorizedResponse } from "../../../../lib/adminAuth";

export async function GET(request) {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("feedback")
      .select("id, trip_id, category, message, reporter_name, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ feedback: data || [] });
  } catch (err) {
    return Response.json({ error: err.message || "internal error" }, { status: 500 });
  }
}
