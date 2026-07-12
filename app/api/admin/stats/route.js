import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { isAdminAuthorized, unauthorizedResponse } from "../../../../lib/adminAuth";

export async function GET(request) {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  try {
    const supabase = getSupabaseAdmin();

    const [{ data: trips, error: tripsError }, { count: memberCount, error: memberError }] =
      await Promise.all([
        supabase
          .from("trips")
          .select("id, title, destination, start_date, end_date, data, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("trip_members").select("*", { count: "exact", head: true }),
      ]);

    if (tripsError) throw tripsError;
    if (memberError) throw memberError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeTrips = 0;
    let upcomingTrips = 0;
    let pastTrips = 0;
    let totalSpots = 0;
    let totalComments = 0;
    let totalVotes = 0;
    let totalTasks = 0;
    let totalPackingItems = 0;
    let totalExpenseYen = 0;

    const dayBuckets = {}; // "YYYY-MM-DD" -> count, for a simple last-14-days chart

    trips.forEach((t) => {
      const start = new Date(t.start_date);
      const end = new Date(t.end_date);
      if (today < start) upcomingTrips++;
      else if (today > end) pastTrips++;
      else activeTrips++;

      const data = t.data || {};
      const spots = data.spots || [];
      totalSpots += spots.length;
      spots.forEach((s) => {
        totalComments += (s.comments || []).length;
        totalVotes += (s.votes || []).length;
      });
      totalTasks += (data.tasks || []).length;
      ["自分", "相手", "共通"].forEach((cat) => {
        totalPackingItems += (data.packing?.[cat] || []).length;
      });
      (data.expenses || []).forEach((e) => (totalExpenseYen += e.amount || 0));

      const day = (t.created_at || "").slice(0, 10);
      if (day) dayBuckets[day] = (dayBuckets[day] || 0) + 1;
    });

    // 直近14日分の日別作成件数（無い日は0で埋める）
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last14Days.push({ date: key, count: dayBuckets[key] || 0 });
    }

    const recentTrips = trips.slice(0, 30).map((t) => ({
      id: t.id,
      title: t.title,
      destination: t.destination,
      startDate: t.start_date,
      endDate: t.end_date,
      createdAt: t.created_at,
      memberCount: null, // 下でまとめて埋める
      spotCount: (t.data?.spots || []).length,
      taskCount: (t.data?.tasks || []).length,
    }));

    // メンバー数をtripごとに集計（1クエリで取得してJS側でグルーピング）
    const { data: memberRows } = await supabase.from("trip_members").select("trip_id");
    const memberCountByTrip = {};
    (memberRows || []).forEach((m) => {
      memberCountByTrip[m.trip_id] = (memberCountByTrip[m.trip_id] || 0) + 1;
    });
    recentTrips.forEach((t) => {
      t.memberCount = memberCountByTrip[t.id] || 0;
    });

    return Response.json({
      totals: {
        trips: trips.length,
        members: memberCount || 0,
        activeTrips,
        upcomingTrips,
        pastTrips,
        spots: totalSpots,
        comments: totalComments,
        votes: totalVotes,
        tasks: totalTasks,
        packingItems: totalPackingItems,
        expenseYen: totalExpenseYen,
      },
      last14Days,
      recentTrips,
    });
  } catch (err) {
    return Response.json({ error: err.message || "internal error" }, { status: 500 });
  }
}
