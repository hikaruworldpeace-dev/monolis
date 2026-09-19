"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Trash2, Loader2, Image as ImageIcon, Play } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { uploadMemory, getMemoryUrl } from "../lib/uploadMedia";

const ACCENT = "#4F8EF7";

function EmptyState({ icon: Icon, text, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
        <Icon size={22} className="text-neutral-400" />
      </div>
      <p className="text-[14px] font-medium text-neutral-500 dark:text-neutral-400">{text}</p>
      {sub && <p className="text-[12px] text-neutral-400 dark:text-neutral-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function MemoriesTab({ trip, currentMember }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [viewing, setViewing] = useState(null);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_trip_memories", { p_trip_id: trip.id });
    if (!error) setMemories(data || []);
    setLoading(false);
  }, [trip.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openPicker = () => fileInputRef.current?.click();

  const onFileSelected = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploadError("");
    setPendingFiles(files);
  };

  const removePendingFile = (idx) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const cancelPending = () => {
    if (uploading) return;
    setPendingFiles([]);
    setUploadError("");
  };

  const submitPending = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    setUploadError("");
    setUploadProgress({ done: 0, total: pendingFiles.length });

    let failedCount = 0;
    for (const file of pendingFiles) {
      try {
        await uploadMemory({
          file,
          tripId: trip.id,
          memberId: currentMember?.id || null,
          memberName: currentMember?.name || null,
        });
      } catch {
        failedCount += 1;
      }
      setUploadProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    setUploading(false);
    setPendingFiles([]);
    if (failedCount > 0) setUploadError(`${failedCount}件のアップロードに失敗しました`);
    await load();
  };

  const removeMemory = async (memory) => {
    const { error } = await supabase.rpc("delete_memory", { p_id: memory.id, p_trip_id: trip.id });
    if (!error) {
      await supabase.storage.from("memories").remove([memory.storage_path]);
      setMemories((prev) => prev.filter((m) => m.id !== memory.id));
      setViewing(null);
    }
  };

  return (
    <div className="px-5 pt-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[13px] text-neutral-400">思い出</div>
          <div className="text-[20px] font-bold text-neutral-900 dark:text-white">{memories.length}件</div>
        </div>
        <button
          onClick={openPicker}
          className="flex items-center gap-1.5 text-[13px] font-medium px-3 h-9 rounded-full text-white"
          style={{ background: ACCENT }}
        >
          <Plus size={14} /> 投稿する
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={onFileSelected}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-neutral-400 gap-2 text-[13px]">
          <Loader2 size={16} className="animate-spin" /> 読み込み中...
        </div>
      )}

      {!loading && memories.length === 0 && (
        <EmptyState icon={ImageIcon} text="まだ思い出がありません" sub="右上のボタンから写真や動画を投稿しましょう" />
      )}

      {!loading && memories.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {memories.map((m) => (
            <button
              key={m.id}
              onClick={() => setViewing(m)}
              className="relative aspect-square rounded-[10px] overflow-hidden bg-neutral-100 dark:bg-neutral-800"
            >
              {m.type === "video" ? (
                <>
                  <video src={getMemoryUrl(m.storage_path)} className="w-full h-full object-cover" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play size={18} className="text-white" fill="white" />
                  </div>
                </>
              ) : (
                <img src={getMemoryUrl(m.storage_path)} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelPending} />
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-[20px] max-h-[88vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-neutral-900 pt-3 pb-2 px-5 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-8" />
              <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-white">{pendingFiles.length}件を投稿</h3>
              <button onClick={cancelPending} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <X size={16} className="text-neutral-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-1.5">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="relative aspect-square rounded-[10px] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    {file.type.startsWith("video/") ? (
                      <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    )}
                    {!uploading && (
                      <button
                        onClick={() => removePendingFile(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {uploadError && <p className="text-[12px] text-red-500">{uploadError}</p>}
              <button
                disabled={uploading}
                onClick={submitPending}
                className="w-full h-12 rounded-[14px] text-white font-medium text-[15px] disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: ACCENT }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {uploadProgress.done}/{uploadProgress.total}件アップロード中...
                  </>
                ) : (
                  `${pendingFiles.length}件を投稿する`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-5 pt-14 pb-3 shrink-0">
            <div className="text-[13px] text-white/70">{viewing.member_name}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => removeMemory(viewing)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <Trash2 size={16} className="text-white" />
              </button>
              <button onClick={() => setViewing(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-2">
            {viewing.type === "video" ? (
              <video src={getMemoryUrl(viewing.storage_path)} className="max-w-full max-h-full" controls autoPlay />
            ) : (
              <img src={getMemoryUrl(viewing.storage_path)} alt="" className="max-w-full max-h-full object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
