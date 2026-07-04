// Google Maps JavaScript API（Places / Directions含む）を一度だけ読み込む
// 共有ローダー。SharedMapTab / ItineraryTab の両方から呼び出される。

let loadPromise = null;

export function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is not available"));
  }
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google);
  }
  if (loadPromise) return loadPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  loadPromise = new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が設定されていません"));
      return;
    }
    const existing = document.getElementById("monolis-google-maps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () => reject(new Error("Google Mapsの読み込みに失敗しました")));
      return;
    }
    const script = document.createElement("script");
    script.id = "monolis-google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ja&region=JP`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google Mapsの読み込みに失敗しました"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
