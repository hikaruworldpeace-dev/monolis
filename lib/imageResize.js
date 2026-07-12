// アップロードされた画像を、旅行データ(jsonb)にそのまま保存できるサイズまで
// その場でリサイズ・圧縮してBase64のdata URLに変換する。
// Supabase Storageなどの追加インフラを使わずに「みんなで見られる画像」を実現するための
// 簡易的な方法（大きな画像をたくさん貼るような使い方には向かない）。

export function resizeImageToDataUrl(file, maxWidth = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
