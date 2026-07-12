// 緯度経度2点間の距離（km）をハーバサイン公式で計算する
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}

// 簡易ルート最適化：最も近い未訪問地点へ次々に移動する「最近傍法」。
// 距離だけを考慮するシンプルなアルゴリズム（営業時間などは考慮しない）。
// points: [{lat, lng}, ...] を渡すと、訪問順のインデックス配列を返す。
// 最初の地点（points[0]）は固定し、そこから順に近い地点を選んでいく。
export function nearestNeighborOrder(points) {
  if (points.length <= 2) return points.map((_, i) => i);
  const visited = new Array(points.length).fill(false);
  const order = [0];
  visited[0] = true;
  for (let step = 1; step < points.length; step++) {
    const last = points[order[order.length - 1]];
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      if (visited[i]) continue;
      const d = haversineKm(last, points[i]);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    order.push(best);
    visited[best] = true;
  }
  return order;
}
