// monolis はログイン不要（URL共有方式）。
// 「自分がどの旅行に参加しているか」「自分はどのメンバーか」は
// サーバーではなく、この端末のブラウザ（localStorage）に保存する。

const LOCAL_TRIPS_KEY = "monolis_trip_ids";
const LOCAL_NAME_KEY = "monolis_display_name";
const memberKeyFor = (tripId) => `monolis_member_${tripId}`;

export function getLocalTripIds() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_TRIPS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addLocalTripId(id) {
  const ids = getLocalTripIds();
  if (!ids.includes(id)) {
    ids.unshift(id);
    window.localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(ids));
  }
}

export function getSavedName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LOCAL_NAME_KEY) || "";
}

export function saveName(name) {
  window.localStorage.setItem(LOCAL_NAME_KEY, name);
}

export function getLocalMemberId(tripId) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(memberKeyFor(tripId));
}

export function setLocalMemberId(tripId, memberId) {
  window.localStorage.setItem(memberKeyFor(tripId), memberId);
}

export const AVATAR_PALETTE = ["#4F8EF7", "#FF7D9E", "#FFB84D", "#3CCB7F", "#A78BFA", "#38BDF8"];
