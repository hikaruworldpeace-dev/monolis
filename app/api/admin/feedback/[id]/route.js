import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { isAdminAuthorized, unauthorizedResponse } from "../../../../../lib/adminAuth";

export async function PATCH(request, { params }) {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const status = body.status === "resolved" ? "resolved" : "open";
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("feedback").update({ status }).eq("id", params.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message || "internal error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("feedback").delete().eq("id", params.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message || "internal error" }, { status: 500 });
  }
}
