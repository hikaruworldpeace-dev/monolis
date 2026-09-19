// 思い出タブ用: 画像・動画をSupabase Storage(memoriesバケット)にアップロードし、
// memoriesテーブルへの登録までまとめて行う。
// 画像はアップロード前にその場でリサイズ・圧縮する（動画はそのまま、50MB上限）。

import { supabase } from "./supabaseClient";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_QUALITY = 0.8;

function resizeImageToBlob(file, maxWidth = IMAGE_MAX_WIDTH, quality = IMAGE_QUALITY) {
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
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("画像の変換に失敗しました"))),
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadMemory({ file, tripId, memberId, memberName, caption }) {
  if (!file) throw new Error("ファイルが選択されていません");
  if (file.size > MAX_FILE_SIZE) throw new Error("ファイルサイズは50MBまでです");

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) throw new Error("画像または動画ファイルを選択してください");

  const type = isVideo ? "video" : "image";
  const uploadBody = isImage ? await resizeImageToBlob(file) : file;
  const ext = isVideo ? (file.name.split(".").pop() || "mp4") : "jpg";
  const path = `${tripId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("memories")
    .upload(path, uploadBody, { contentType: isVideo ? file.type : "image/jpeg" });
  if (uploadError) throw uploadError;

  const { data, error: rpcError } = await supabase.rpc("add_memory", {
    p_trip_id: tripId,
    p_member_id: memberId || null,
    p_member_name: memberName || null,
    p_type: type,
    p_storage_path: path,
    p_caption: caption || "",
  });

  if (rpcError) {
    // DBへの登録に失敗した場合、アップロード済みのファイルだけが残らないよう削除しておく
    await supabase.storage.from("memories").remove([path]);
    throw rpcError;
  }

  return data;
}

export function getMemoryUrl(storagePath) {
  const { data } = supabase.storage.from("memories").getPublicUrl(storagePath);
  return data.publicUrl;
}
