"use client";

import React, { useState } from "react";
import { Search, ExternalLink, Loader2, ShoppingBag, Star } from "lucide-react";

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

export default function ProcurementTab() {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const q = keyword.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch(`/api/rakuten/search?keyword=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "検索に失敗しました");
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || "検索に失敗しました");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 pt-4 pb-6">
      <div className="mb-4">
        <div className="text-[13px] text-neutral-400">調達</div>
        <div className="text-[20px] font-bold text-neutral-900 dark:text-white">持ち物を探す</div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="例）日焼け止め、変換プラグイン"
          className="flex-1 rounded-[14px] bg-neutral-50 dark:bg-neutral-800 border border-transparent focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-colors"
        />
        <button
          onClick={search}
          disabled={!keyword.trim() || loading}
          className="w-12 h-12 rounded-[14px] flex items-center justify-center text-white disabled:opacity-40 shrink-0"
          style={{ background: ACCENT }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </button>
      </div>

      {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}

      {!searched && !loading && (
        <EmptyState icon={ShoppingBag} text="欲しいものを検索してみましょう" sub="楽天市場から商品を探せます" />
      )}

      {searched && !loading && items.length === 0 && !error && (
        <EmptyState icon={ShoppingBag} text="見つかりませんでした" sub="別のキーワードで試してみてください" />
      )}

      {items.length > 0 && (
        <div className="space-y-2.5">
          {items.map((item) => (
            <a
              key={item.code}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 rounded-[16px] bg-white dark:bg-neutral-900 shadow-sm p-3"
            >
              <div className="w-20 h-20 rounded-[10px] overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <div className="text-[13px] text-neutral-800 dark:text-neutral-100 line-clamp-2">{item.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[15px] font-bold text-neutral-900 dark:text-white">
                    ¥{item.price.toLocaleString()}
                  </span>
                  {item.reviewCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] text-neutral-400">
                      <Star size={10} fill="currentColor" /> {item.reviewAverage}（{item.reviewCount}）
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 truncate">{item.shopName}</div>
              </div>
              <ExternalLink size={14} className="text-neutral-300 shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
