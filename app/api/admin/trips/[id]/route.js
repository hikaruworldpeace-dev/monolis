import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { isAdminAuthorized, unauthorizedResponse } from "../../../../../lib/adminAuth";

export async function DELETE(request, { params }) {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("trips").delete().eq("id", params.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message || "internal error" }, { status: 500 });
  }
}
