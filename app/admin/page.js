"use client";

import React, { useState, useEffect, useCallback } from "react";

const ACCENT = "#4F8EF7";
const SUCCESS = "#3CCB7F";
const WARNING = "#FFB84D";
const SESSION_KEY = "monolis_admin_password";

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-[16px] bg-white dark:bg-neutral-900 shadow-sm p-4">
      <div className="text-[12px] text-neutral-400">{label}</div>
      <div className="text-[26px] font-bold mt-1" style={{ color: color || "#0F172A" }}>{value}</div>
      {sub && <div className="text-[11px] text-neutral-400 mt-1">{sub}</div>}
    </div>
  );
}

function MiniBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-[4px]"
            style={{ height: `${(d.count / max) * 72 + 2}px`, background: ACCENT, opacity: d.count ? 1 : 0.15 }}
            title={`${d.date}: ${d.count}件`}
          />
          <div className="text-[9px] text-neutral-400">{d.date.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

function daysLeftLabel(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (today > end) return { label: "終了", color: "#94A3B8" };
  if (today >= start) return { label: "開催中", color: SUCCESS };
  return { label: "開催前", color: ACCENT };
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchStats = useCallback(async (pwd) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-password": pwd },
      });
      if (res.status === 401) {
        setError("パスワードが違います");
        setAuthed(false);
        window.sessionStorage.removeItem(SESSION_KEY);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStats(data);
      setAuthed(true);
      window.sessionStorage.setItem(SESSION_KEY, pwd);
    } catch (err) {
      setError(err.message || "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      setPassword(saved);
      fetchStats(saved);
    }
  }, [fetchStats]);

  const handleDelete = async (tripId, title) => {
    if (!window.confirm(`「${title}」を完全に削除します。よろしいですか？`)) return;
    setDeletingId(tripId);
    try {
      const res = await fetch(`/api/admin/trips/${tripId}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await fetchStats(password);
    } catch (err) {
      alert("削除に失敗しました: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <h1 className="text-[20px] font-bold text-neutral-900 mb-1">monolis Admin</h1>
          <p className="text-[13px] text-neutral-400 mb-6">運営者用ダッシュボード</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchStats(password)}
            placeholder="管理者パスワード"
            className="w-full rounded-[14px] bg-white border border-neutral-200 focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] mb-3"
            autoFocus
          />
          {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
          <button
            disabled={!password || loading}
            onClick={() => fetchStats(password)}
            className="w-full h-12 rounded-[14px] text-white font-medium text-[15px] disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            {loading ? "確認中..." : "ログイン"}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-[13px] text-neutral-400">読み込み中...</p>
      </div>
    );
  }

  const { totals, last14Days, recentTrips } = stats;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[24px] font-bold text-neutral-900">monolis Admin</h1>
            <p className="text-[13px] text-neutral-400 mt-0.5">運営者用ダッシュボード</p>
          </div>
          <button
            onClick={() => fetchStats(password)}
            className="text-[13px] px-3 h-9 rounded-full bg-white shadow-sm text-neutral-500"
          >
            再読み込み
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="総旅行数" value={totals.trips} color={ACCENT} />
          <StatCard label="総メンバー数" value={totals.members} />
          <StatCard label="開催中の旅行" value={totals.activeTrips} color={SUCCESS} />
          <StatCard label="開催前の旅行" value={totals.upcomingTrips} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="登録スポット数" value={totals.spots} sub="みんなの地図" />
          <StatCard label="コメント数" value={totals.comments} />
          <StatCard label="投票数" value={totals.votes} />
          <StatCard label="タスク数" value={totals.tasks} />
        </div>

        <div className="rounded-[16px] bg-white shadow-sm p-5 mb-6">
          <div className="text-[13px] font-semibold text-neutral-700 mb-4">直近14日間の旅行作成数</div>
          <MiniBarChart data={last14Days} />
        </div>

        <div className="rounded-[16px] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <div className="text-[13px] font-semibold text-neutral-700">最近の旅行（最大30件）</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-neutral-400 border-b border-neutral-100">
                  <th className="px-5 py-2 font-medium">タイトル</th>
                  <th className="px-3 py-2 font-medium">行き先</th>
                  <th className="px-3 py-2 font-medium">日程</th>
                  <th className="px-3 py-2 font-medium">状態</th>
                  <th className="px-3 py-2 font-medium">人数</th>
                  <th className="px-3 py-2 font-medium">スポット</th>
                  <th className="px-3 py-2 font-medium">作成日</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((t) => {
                  const status = daysLeftLabel(t.startDate, t.endDate);
                  return (
                    <tr key={t.id} className="border-b border-neutral-50 last:border-0">
                      <td className="px-5 py-2.5 text-neutral-800 font-medium">{t.title}</td>
                      <td className="px-3 py-2.5 text-neutral-500">{t.destination}</td>
                      <td className="px-3 py-2.5 text-neutral-500 whitespace-nowrap">{t.startDate} 〜 {t.endDate}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: status.color, background: `${status.color}1A` }}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-neutral-500">{t.memberCount}</td>
                      <td className="px-3 py-2.5 text-neutral-500">{t.spotCount}</td>
                      <td className="px-3 py-2.5 text-neutral-400 whitespace-nowrap">{(t.createdAt || "").slice(0, 10)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <button
                          onClick={() => handleDelete(t.id, t.title)}
                          disabled={deletingId === t.id}
                          className="text-[12px] text-red-400 hover:text-red-600 disabled:opacity-40"
                        >
                          {deletingId === t.id ? "削除中..." : "削除"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {recentTrips.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-neutral-400">まだ旅行がありません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
