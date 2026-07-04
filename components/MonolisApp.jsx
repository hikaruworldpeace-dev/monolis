"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, ChevronLeft, Package, CheckSquare, Map, Wallet, MoreHorizontal,
  Moon, Sun, X, Check, Users, Calendar, MapPin, Link2, Plane,
  Home, FileText, Image as ImageIcon, Ticket, ChevronRight, Trash2,
  GripVertical, Bell, TrendingUp, ArrowRight, Sparkles, Briefcase, JapaneseYen,
  Loader2, User, Wand2, Map as MapIcon
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { loadGoogleMaps } from "../lib/googleMaps";
import { nearestNeighborOrder } from "../lib/geo";
import {
  getLocalTripIds, addLocalTripId, getSavedName, saveName,
  getLocalMemberId, setLocalMemberId, AVATAR_PALETTE
} from "../lib/localTrips";
import SharedMapTab from "./SharedMapTab";

// Brand assets (served from /public)
const LOGO_ICON = "/logo-icon.png";
const LOGO_FULL = "/logo-full.png";


/* ---------------------------------------------------------
   MONOLITH — travel planning, start to finish, in one place.
   Design tokens:
   accent   #4F8EF7  (motion / action)
   success  #3CCB7F  (done / settled)
   warning  #FFB84D  (pending / owed)
   itinerary-mark #B7D84A (黄緑・旅程に確定したスポット)
   bg       #F8FAFC  (light canvas)
   radius   16–20px
--------------------------------------------------------- */

const ACCENT = "#4F8EF7";
const SUCCESS = "#3CCB7F";
const WARNING = "#FFB84D";
const ITINERARY_MARK = "#B7D84A";

const EMPTY_TRIP_DATA = {
  packing: { 自分: [], 相手: [], 共通: [] },
  tasks: [],
  itinerary: [],
  expenses: [],
  spots: [],
  notes: { memo: "", hotelAddress: "", checkin: "", reservationNo: "", flight: "", links: [] },
  history: [],
};

// DBの行（trips + members のjsonb配列）を画面が使う trip オブジェクトに変換する
function rowToUiTrip(row) {
  const data = { ...EMPTY_TRIP_DATA, ...(row.data || {}) };
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    cover: row.cover,
    members: row.members || [],
    ...data,
  };
}

// 画面側の trip オブジェクトから、DBの data(jsonb) カラムに書き戻す部分だけを取り出す
function uiTripToData(trip) {
  return {
    packing: trip.packing,
    tasks: trip.tasks,
    itinerary: trip.itinerary,
    expenses: trip.expenses,
    notes: trip.notes,
    history: trip.history,
  };
}

function daysLeftLabel(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (today > end) return { label: "終了", tone: "muted" };
  const diff = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return { label: "開催中", tone: "accent" };
  return { label: `残り${diff}日`, tone: "accent" };
}

// ---------- small primitives ----------

function Avatar({ member, size = 28 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-medium shrink-0"
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.4 }}
      title={member.name}
    >
      {member.initial}
    </div>
  );
}

function Fab({ onClick, icon: Icon = Plus, label }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full shadow-lg px-5 h-14 text-white font-medium active:scale-95 transition-transform duration-150"
      style={{ background: ACCENT, boxShadow: "0 8px 24px rgba(79,142,247,0.35)" }}
    >
      <Icon size={20} />
      {label && <span className="text-[15px]">{label}</span>}
    </button>
  );
}

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_.2s_ease]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-[20px] max-h-[88vh] overflow-y-auto animate-[slideUp_.25s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="sticky top-0 bg-white dark:bg-neutral-900 pt-3 pb-2 px-5 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
          <div className="w-8" />
          <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <X size={16} className="text-neutral-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-semibold tracking-wide text-neutral-400 dark:text-neutral-500 uppercase mb-2 px-1">
      {children}
    </div>
  );
}

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


function Wordmark({ size = 15 }) {
  // text-only brand mark: blue "monolis" with the signature green dot on the i
  return (
    <span className="font-semibold tracking-tight select-none" style={{ fontSize: size, color: "#4F8EF7" }}>
      monol
      <span style={{ position: "relative" }}>
        i
        <span
          style={{
            position: "absolute",
            top: size * -0.62,
            left: "50%",
            transform: "translateX(-50%)",
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: "50%",
            background: "#B7D84A",
          }}
        />
      </span>
      s
    </span>
  );
}

// ---------- Trip List (home) ----------

function TripList({ trips, onOpen, onCreate, dark, setDark, loading }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-neutral-950 pb-28">
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div>
          <img src={LOGO_FULL} alt="monolis" className="h-14 w-auto -ml-1" />
          <p className="text-[13px] text-neutral-400 mt-1.5 ml-0.5">みんなの旅を、もっとスムーズに。</p>
        </div>
        <button
          onClick={() => setDark(!dark)}
          className="w-10 h-10 rounded-full bg-white dark:bg-neutral-900 shadow-sm flex items-center justify-center"
        >
          {dark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-neutral-500" />}
        </button>
      </div>

      <div className="px-5 mt-2 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-16 text-neutral-400 gap-2 text-[13px]">
            <Loader2 size={16} className="animate-spin" /> 読み込み中...
          </div>
        )}
        {!loading && trips.map((trip) => {
          const status = daysLeftLabel(trip.startDate, trip.endDate);
          return (
            <button
              key={trip.id}
              onClick={() => onOpen(trip.id)}
              className="w-full text-left rounded-[20px] overflow-hidden bg-white dark:bg-neutral-900 shadow-sm active:scale-[0.98] transition-transform duration-150"
            >
              <div className="h-24 relative" style={{ background: trip.cover }}>
                <div className="absolute top-3 right-3 flex -space-x-2">
                  {trip.members.map((m) => (
                    <div key={m.id} className="ring-2 ring-white rounded-full">
                      <Avatar member={m} size={26} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-[16px] font-semibold text-neutral-900 dark:text-white">{trip.title}</div>
                  <div className="text-[12px] text-neutral-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={12} /> {trip.destination}
                  </div>
                </div>
                <span
                  className="text-[12px] font-medium px-2.5 py-1 rounded-full"
                  style={{
                    color: status.tone === "accent" ? ACCENT : "#94A3B8",
                    background: status.tone === "accent" ? "rgba(79,142,247,0.1)" : "rgba(148,163,184,0.12)",
                  }}
                >
                  {status.label}
                </span>
              </div>
            </button>
          );
        })}
        {!loading && trips.length === 0 && (
          <EmptyState icon={Plane} text="まだ旅行がありません" sub="右下のボタンから作成しましょう" />
        )}
      </div>

      <Fab onClick={onCreate} label="旅行を作成" />
    </div>
  );
}

// ---------- Trip Create ----------

function TripCreateForm({ onCreate, onClose }) {
  const [title, setTitle] = useState("");
  const [dest, setDest] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [name, setName] = useState(getSavedName());
  const [creating, setCreating] = useState(false);

  const inputCls =
    "w-full rounded-[14px] bg-neutral-50 dark:bg-neutral-800 border border-transparent focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-colors";

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>あなたの名前</SectionLabel>
        <input className={inputCls} placeholder="例）あなた" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <SectionLabel>タイトル</SectionLabel>
        <input className={inputCls} placeholder="例）北海道旅行" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <SectionLabel>行き先</SectionLabel>
        <input className={inputCls} placeholder="例）北海道" value={dest} onChange={(e) => setDest(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <SectionLabel>出発日</SectionLabel>
          <input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <SectionLabel>帰宅日</SectionLabel>
          <input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div>
        <SectionLabel>メンバー招待</SectionLabel>
        <div className="rounded-[14px] bg-neutral-50 dark:bg-neutral-800 px-4 py-3 text-[12px] text-neutral-400 flex items-center gap-2">
          <Link2 size={14} />
          作成後、旅行詳細画面から招待リンクをコピーできます
        </div>
      </div>
      <button
        disabled={!title || !dest || !start || !end || !name || creating}
        onClick={async () => {
          setCreating(true);
          try {
            saveName(name);
            await onCreate({ title, destination: dest, startDate: start, endDate: end, displayName: name });
          } finally {
            setCreating(false);
          }
        }}
        className="w-full h-13 rounded-[14px] text-white font-medium text-[15px] py-3.5 mt-2 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        style={{ background: ACCENT }}
      >
        {creating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <img src={LOGO_ICON} alt="" className="h-5 w-auto opacity-90" />
        )}
        旅行を作成
      </button>
    </div>
  );
}

// ---------- Packing Tab ----------

function PackingTab({ trip, updateTrip }) {
  const categories = ["自分", "相手", "共通"];
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [drafts, setDrafts] = useState({ 自分: "", 相手: "", 共通: "" });

  const toggle = (cat, id) => {
    const items = trip.packing[cat].map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    updateTrip({ ...trip, packing: { ...trip.packing, [cat]: items } });
  };

  const addItem = (cat, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newItem = { id: `p${Date.now()}`, name: trimmed, who: "", done: false, qty: 1, note: "" };
    updateTrip({ ...trip, packing: { ...trip.packing, [cat]: [...trip.packing[cat], newItem] } });
    setDrafts((d) => ({ ...d, [cat]: "" }));
  };

  const removeItem = (cat, id) => {
    updateTrip({ ...trip, packing: { ...trip.packing, [cat]: trip.packing[cat].filter((i) => i.id !== id) } });
  };

  const total = categories.reduce((n, c) => n + trip.packing[c].length, 0);
  const done = categories.reduce((n, c) => n + trip.packing[c].filter((i) => i.done).length, 0);

  const aiSuggestions = ["水着", "日焼け止め", "帽子", "モバイルバッテリー", "サングラス", "ビーチサンダル"];

  return (
    <div className="px-5 pt-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] text-neutral-400">準備の進み具合</div>
          <div className="text-[20px] font-bold text-neutral-900 dark:text-white">{done} / {total}</div>
        </div>
        <button
          onClick={() => setSuggestOpen(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium px-3 h-9 rounded-full"
          style={{ color: ACCENT, background: "rgba(79,142,247,0.1)" }}
        >
          <Sparkles size={14} /> AI候補
        </button>
      </div>

      <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: total ? `${(done / total) * 100}%` : "0%", background: SUCCESS }}
        />
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <SectionLabel>{cat}</SectionLabel>
          <div className="rounded-[18px] bg-white dark:bg-neutral-900 shadow-sm overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
            {trip.packing[cat].map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 h-14 group">
                <GripVertical size={14} className="text-neutral-300 shrink-0" />
                <button
                  onClick={() => toggle(cat, item.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors"
                  style={{
                    borderColor: item.done ? SUCCESS : "#E2E8F0",
                    background: item.done ? SUCCESS : "transparent",
                  }}
                >
                  {item.done && <Check size={13} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-[14px] ${item.done ? "text-neutral-400 line-through" : "text-neutral-800 dark:text-neutral-100"}`}>
                    {item.name}
                  </div>
                  {item.note && <div className="text-[11px] text-neutral-400">{item.note}</div>}
                </div>
                {item.qty > 1 && <span className="text-[12px] text-neutral-400">×{item.qty}</span>}
                <button onClick={() => removeItem(cat, item.id)} className="text-neutral-300">
                  <X size={14} />
                </button>
              </div>
            ))}
            {trip.packing[cat].length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-neutral-400">アイテムなし</div>
            )}
            <div className="flex items-center gap-2 px-4 h-12">
              <Plus size={14} className="text-neutral-300 shrink-0" />
              <input
                value={drafts[cat]}
                onChange={(e) => setDrafts((d) => ({ ...d, [cat]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addItem(cat, drafts[cat])}
                placeholder="アイテムを追加"
                className="flex-1 bg-transparent outline-none text-[14px] text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>
      ))}

      <Sheet open={suggestOpen} onClose={() => setSuggestOpen(false)} title="AIによる持ち物候補">
        <p className="text-[13px] text-neutral-400 mb-4">{trip.destination}・{trip.startDate}〜 の旅程から生成しました。タップして追加できます</p>
        <div className="flex flex-wrap gap-2">
          {aiSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => addItem("共通", s)}
              className="text-[13px] px-3 py-2 rounded-full bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            >
              {s}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

// ---------- Tasks Tab ----------

function TasksTab({ trip, updateTrip }) {
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [who, setWho] = useState("");

  const toggle = (id) => {
    const tasks = trip.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    updateTrip({ ...trip, tasks });
  };

  const removeTask = (id) => {
    updateTrip({ ...trip, tasks: trip.tasks.filter((t) => t.id !== id) });
  };

  const addTask = () => {
    if (!title.trim()) return;
    const newTask = { id: `k${Date.now()}`, title: title.trim(), who, due, done: false };
    updateTrip({ ...trip, tasks: [...trip.tasks, newTask] });
    setTitle("");
    setDue("");
    setWho("");
    setAddOpen(false);
  };

  const done = trip.tasks.filter((t) => t.done).length;
  const memberOf = (id) => trip.members.find((m) => m.id === id);
  const inputCls =
    "w-full rounded-[14px] bg-neutral-50 dark:bg-neutral-800 border border-transparent focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-colors";

  return (
    <div className="px-5 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] text-neutral-400">やること</div>
          <div className="text-[20px] font-bold text-neutral-900 dark:text-white">{done} / {trip.tasks.length} 完了</div>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium px-3 h-9 rounded-full"
          style={{ color: ACCENT, background: "rgba(79,142,247,0.1)" }}
        >
          <Plus size={14} /> タスクを追加
        </button>
      </div>
      <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden -mt-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: trip.tasks.length ? `${(done / trip.tasks.length) * 100}%` : "0%", background: ACCENT }}
        />
      </div>

      <div className="rounded-[18px] bg-white dark:bg-neutral-900 shadow-sm overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
        {trip.tasks.map((task) => {
          const m = memberOf(task.who);
          return (
            <div key={task.id} className="flex items-center gap-3 px-4 h-16">
              <button
                onClick={() => toggle(task.id)}
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors"
                style={{ borderColor: task.done ? SUCCESS : "#E2E8F0", background: task.done ? SUCCESS : "transparent" }}
              >
                {task.done && <Check size={13} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-[14px] ${task.done ? "text-neutral-400 line-through" : "text-neutral-800 dark:text-neutral-100"}`}>
                  {task.title}
                </div>
                {task.due && (
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={11} /> {task.due}
                  </div>
                )}
              </div>
              {m && <Avatar member={m} size={26} />}
              <button onClick={() => removeTask(task.id)} className="text-neutral-300">
                <X size={14} />
              </button>
            </div>
          );
        })}
        {trip.tasks.length === 0 && <EmptyState icon={CheckSquare} text="タスクはまだありません" />}
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="タスクを追加">
        <div className="space-y-4">
          <div>
            <SectionLabel>やること</SectionLabel>
            <input className={inputCls} placeholder="例）ホテル予約" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <SectionLabel>期限</SectionLabel>
            <input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <SectionLabel>担当者</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {trip.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setWho(who === m.id ? "" : m.id)}
                  className="flex items-center gap-2 pl-1.5 pr-3 h-9 rounded-full border transition-colors"
                  style={{
                    borderColor: who === m.id ? ACCENT : "#E2E8F0",
                    background: who === m.id ? "rgba(79,142,247,0.08)" : "transparent",
                  }}
                >
                  <Avatar member={m} size={22} />
                  <span className="text-[13px] text-neutral-700 dark:text-neutral-200">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={!title.trim()}
            onClick={addTask}
            className="w-full h-12 rounded-[14px] text-white font-medium text-[15px] disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            追加する
          </button>
        </div>
      </Sheet>
    </div>
  );
}

// ---------- Itinerary Tab ----------

const TRAVEL_MODES = [
  { key: "WALKING", label: "徒歩", icon: "🚶" },
  { key: "DRIVING", label: "車", icon: "🚗" },
  { key: "TRANSIT", label: "公共交通機関", icon: "🚃" },
];

function ItineraryTab({ trip, updateTrip }) {
  const [addOpen, setAddOpen] = useState(false);
  const [dayChoice, setDayChoice] = useState("new");
  const [newDate, setNewDate] = useState("");
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [modeByDay, setModeByDay] = useState({});
  const [segments, setSegments] = useState({}); // "day-idx" -> { distanceText, durationText }
  const [mapsReady, setMapsReady] = useState(false);

  const inputCls =
    "w-full rounded-[14px] bg-neutral-50 dark:bg-neutral-800 border border-transparent focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-colors";

  // Google Mapsを読み込む（区間の移動時間表示に使う）
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => !cancelled && setMapsReady(true))
      .catch(() => !cancelled && setMapsReady(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // 各Dayの区間（地図座標を持つ予定同士）の移動時間を取得する
  useEffect(() => {
    if (!mapsReady) return;
    const google = window.google;
    const service = new google.maps.DirectionsService();

    trip.itinerary.forEach((day) => {
      const mode = modeByDay[day.day] || "WALKING";
      for (let i = 0; i < day.events.length - 1; i++) {
        const a = day.events[i];
        const b = day.events[i + 1];
        if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) continue;
        const key = `${day.day}-${i}-${mode}`;
        if (segments[key]) continue;
        service.route(
          {
            origin: { lat: a.lat, lng: a.lng },
            destination: { lat: b.lat, lng: b.lng },
            travelMode: google.maps.TravelMode[mode],
          },
          (result, status) => {
            if (status === "OK" && result.routes[0]?.legs[0]) {
              const leg = result.routes[0].legs[0];
              setSegments((prev) => ({
                ...prev,
                [key]: { distanceText: leg.distance.text, durationText: leg.duration.text },
              }));
            }
          }
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, trip.itinerary, modeByDay]);

  const addEvent = () => {
    if (!title.trim() || !time) return;
    const newEvent = { time, title: title.trim(), note: note.trim() };
    let itinerary;
    if (dayChoice === "new") {
      const nextDayNum = trip.itinerary.length ? Math.max(...trip.itinerary.map((d) => d.day)) + 1 : 1;
      itinerary = [...trip.itinerary, { day: nextDayNum, date: newDate || `Day${nextDayNum}`, events: [newEvent] }];
    } else {
      itinerary = trip.itinerary.map((d) =>
        d.day === dayChoice ? { ...d, events: [...d.events, newEvent].sort((a, b) => a.time.localeCompare(b.time)) } : d
      );
    }
    updateTrip({ ...trip, itinerary });
    setTime("");
    setTitle("");
    setNote("");
    setNewDate("");
    setDayChoice("new");
    setAddOpen(false);
  };

  const removeEvent = (dayNum, idx) => {
    const itinerary = trip.itinerary
      .map((d) => (d.day === dayNum ? { ...d, events: d.events.filter((_, i) => i !== idx) } : d))
      .filter((d) => d.events.length > 0);
    updateTrip({ ...trip, itinerary });
  };

  // 簡易ルート最適化：地図座標を持つ予定同士を、最も近い順に並べ替える
  const optimizeDay = (day) => {
    const located = day.events.filter((e) => e.lat != null && e.lng != null);
    if (located.length < 3) return;
    const order = nearestNeighborOrder(located.map((e) => ({ lat: e.lat, lng: e.lng })));
    const reorderedLocated = order.map((i) => located[i]);
    const unlocated = day.events.filter((e) => e.lat == null || e.lng == null);
    const nextEvents = [...reorderedLocated, ...unlocated];
    const itinerary = trip.itinerary.map((d) => (d.day === day.day ? { ...d, events: nextEvents } : d));
    updateTrip({ ...trip, itinerary });
    setSegments({}); // 並び替わったので区間キャッシュをクリア
  };

  return (
    <div className="px-5 pt-4 space-y-6">
      {trip.itinerary.map((day) => {
        const locatedCount = day.events.filter((e) => e.lat != null && e.lng != null).length;
        const mode = modeByDay[day.day] || "WALKING";
        return (
          <div key={day.day}>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-bold text-neutral-900 dark:text-white">Day {day.day}</span>
                <span className="text-[12px] text-neutral-400">{day.date}</span>
              </div>
              {locatedCount >= 3 && (
                <button
                  onClick={() => optimizeDay(day)}
                  className="flex items-center gap-1 text-[12px] font-medium px-2.5 h-7 rounded-full"
                  style={{ color: ACCENT, background: "rgba(79,142,247,0.1)" }}
                >
                  <Wand2 size={12} /> 最適化
                </button>
              )}
            </div>

            {locatedCount >= 2 && (
              <div className="flex gap-1.5 mb-3 px-1">
                {TRAVEL_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setModeByDay((prev) => ({ ...prev, [day.day]: m.key }))}
                    className="px-2.5 h-7 rounded-full text-[11px] border"
                    style={{
                      borderColor: mode === m.key ? ACCENT : "#E2E8F0",
                      color: mode === m.key ? ACCENT : "#94A3B8",
                      background: mode === m.key ? "rgba(79,142,247,0.08)" : "transparent",
                    }}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative pl-6">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-neutral-200 dark:bg-neutral-800" />
              <div className="space-y-2">
                {day.events.map((ev, i) => (
                  <div key={i}>
                    <div className="relative group">
                      <div
                        className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4 ring-[#F8FAFC] dark:ring-neutral-950"
                        style={{ background: ev.lat != null ? ITINERARY_MARK : ACCENT }}
                      />
                      <div className="rounded-[16px] bg-white dark:bg-neutral-900 shadow-sm px-4 py-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-neutral-900 dark:text-white">{ev.title}</span>
                            <span className="text-[12px] font-medium text-neutral-400">{ev.time}</span>
                          </div>
                          {ev.note && <div className="text-[12px] text-neutral-400 mt-0.5">{ev.note}</div>}
                        </div>
                        <button onClick={() => removeEvent(day.day, i)} className="text-neutral-300 shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {i < day.events.length - 1 && segments[`${day.day}-${i}-${mode}`] && (
                      <div className="pl-1 py-1.5 text-[11px] text-neutral-400 flex items-center gap-1.5">
                        <span>{TRAVEL_MODES.find((m) => m.key === mode)?.icon}</span>
                        {segments[`${day.day}-${i}-${mode}`].durationText}
                        （{segments[`${day.day}-${i}-${mode}`].distanceText}）
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      {trip.itinerary.length === 0 && <EmptyState icon={Map} text="旅程はまだありません" />}
      <button
        onClick={() => setAddOpen(true)}
        className="w-full h-11 rounded-[14px] border border-dashed border-neutral-300 dark:border-neutral-700 text-[13px] text-neutral-400 flex items-center justify-center gap-1.5"
      >
        <Plus size={14} /> 予定を追加
      </button>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="予定を追加">
        <div className="space-y-4">
          <div>
            <SectionLabel>日程</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {trip.itinerary.map((d) => (
                <button
                  key={d.day}
                  onClick={() => setDayChoice(d.day)}
                  className="px-3 h-9 rounded-full border text-[13px]"
                  style={{
                    borderColor: dayChoice === d.day ? ACCENT : "#E2E8F0",
                    color: dayChoice === d.day ? ACCENT : "#64748B",
                    background: dayChoice === d.day ? "rgba(79,142,247,0.08)" : "transparent",
                  }}
                >
                  Day {d.day}
                </button>
              ))}
              <button
                onClick={() => setDayChoice("new")}
                className="px-3 h-9 rounded-full border text-[13px] flex items-center gap-1"
                style={{
                  borderColor: dayChoice === "new" ? ACCENT : "#E2E8F0",
                  color: dayChoice === "new" ? ACCENT : "#64748B",
                  background: dayChoice === "new" ? "rgba(79,142,247,0.08)" : "transparent",
                }}
              >
                <Plus size={12} /> 新しい日
              </button>
            </div>
          </div>
          {dayChoice === "new" && (
            <div>
              <SectionLabel>日付表示（例: 7/20）</SectionLabel>
              <input className={inputCls} placeholder="7/20" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
          )}
          <div>
            <SectionLabel>時刻</SectionLabel>
            <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <SectionLabel>予定</SectionLabel>
            <input className={inputCls} placeholder="例）チェックイン" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <SectionLabel>メモ</SectionLabel>
            <input className={inputCls} placeholder="任意" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button
            disabled={!title.trim() || !time}
            onClick={addEvent}
            className="w-full h-12 rounded-[14px] text-white font-medium text-[15px] disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            追加する
          </button>
        </div>
      </Sheet>
    </div>
  );
}

// ---------- Money Tab ----------

function MoneyTab({ trip, updateTrip }) {
  const [addOpen, setAddOpen] = useState(false);
  const [who, setWho] = useState(trip.members[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  const { totals, settlements, grandTotal } = useMemo(() => {
    const totals = {};
    trip.members.forEach((m) => (totals[m.id] = 0));
    trip.expenses.forEach((e) => (totals[e.who] = (totals[e.who] || 0) + e.amount));
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    const fairShare = grandTotal / trip.members.length;

    const balances = trip.members.map((m) => ({ id: m.id, name: m.name, diff: totals[m.id] - fairShare }));
    const debtors = balances.filter((b) => b.diff < -0.01).map((b) => ({ ...b }));
    const creditors = balances.filter((b) => b.diff > 0.01).map((b) => ({ ...b }));
    const settlements = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amt = Math.min(-debtors[di].diff, creditors[ci].diff);
      settlements.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(amt) });
      debtors[di].diff += amt;
      creditors[ci].diff -= amt;
      if (Math.abs(debtors[di].diff) < 1) di++;
      if (Math.abs(creditors[ci].diff) < 1) ci++;
    }
    return { totals, settlements, grandTotal };
  }, [trip]);

  const memberOf = (id) => trip.members.find((m) => m.id === id);
  const maxTotal = Math.max(...Object.values(totals), 1);
  const inputCls =
    "w-full rounded-[14px] bg-neutral-50 dark:bg-neutral-800 border border-transparent focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-colors";

  const addExpense = () => {
    const amt = Number(amount);
    if (!who || !amt || amt <= 0) return;
    const newExpense = { id: `e${Date.now()}`, who, amount: amt, category: category.trim() || "その他" };
    updateTrip({ ...trip, expenses: [...trip.expenses, newExpense] });
    setAmount("");
    setCategory("");
    setAddOpen(false);
  };

  const removeExpense = (id) => {
    updateTrip({ ...trip, expenses: trip.expenses.filter((e) => e.id !== id) });
  };

  return (
    <div className="px-5 pt-4 space-y-6">
      <div className="rounded-[20px] p-5 text-white" style={{ background: "linear-gradient(135deg,#4F8EF7,#7BB4FF)" }}>
        <div className="text-[13px] opacity-80">合計支出</div>
        <div className="text-[28px] font-bold mt-0.5">¥{grandTotal.toLocaleString()}</div>
        <div className="text-[12px] opacity-80 mt-1">{trip.members.length}人で折半 · 一人あたり ¥{Math.round(grandTotal / trip.members.length || 0).toLocaleString()}</div>
      </div>

      <div>
        <SectionLabel>支払い内訳</SectionLabel>
        <div className="rounded-[18px] bg-white dark:bg-neutral-900 shadow-sm p-4 space-y-3">
          {trip.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar member={m} size={26} />
              <div className="flex-1">
                <div className="flex items-center justify-between text-[13px] mb-1">
                  <span className="text-neutral-700 dark:text-neutral-200">{m.name}</span>
                  <span className="font-medium text-neutral-900 dark:text-white">¥{totals[m.id].toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(totals[m.id] / maxTotal) * 100}%`, background: m.color }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>精算</SectionLabel>
        <div className="rounded-[18px] bg-white dark:bg-neutral-900 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
          {settlements.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px]" style={{ color: SUCCESS }}>
              精算の必要はありません
            </div>
          )}
          {settlements.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center gap-2 text-[14px] text-neutral-700 dark:text-neutral-200">
                <span>{s.from}</span>
                <ArrowRight size={14} className="text-neutral-300" />
                <span>{s.to}</span>
              </div>
              <span className="text-[14px] font-semibold" style={{ color: WARNING }}>¥{s.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>履歴</SectionLabel>
        <div className="rounded-[18px] bg-white dark:bg-neutral-900 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
          {trip.expenses.map((e) => {
            const m = memberOf(e.who);
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 h-14">
                {m && <Avatar member={m} size={24} />}
                <div className="flex-1 text-[13px] text-neutral-700 dark:text-neutral-200">{e.category}</div>
                <div className="text-[13px] font-medium text-neutral-900 dark:text-white">¥{e.amount.toLocaleString()}</div>
                <button onClick={() => removeExpense(e.id)} className="text-neutral-300">
                  <X size={14} />
                </button>
              </div>
            );
          })}
          {trip.expenses.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-neutral-400">記録はまだありません</div>}
        </div>
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="w-full h-11 rounded-[14px] border border-dashed border-neutral-300 dark:border-neutral-700 text-[13px] text-neutral-400 flex items-center justify-center gap-1.5"
      >
        <Plus size={14} /> 支払いを記録
      </button>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="支払いを記録">
        <div className="space-y-4">
          <div>
            <SectionLabel>誰が払ったか</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {trip.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setWho(m.id)}
                  className="flex items-center gap-2 pl-1.5 pr-3 h-9 rounded-full border transition-colors"
                  style={{
                    borderColor: who === m.id ? ACCENT : "#E2E8F0",
                    background: who === m.id ? "rgba(79,142,247,0.08)" : "transparent",
                  }}
                >
                  <Avatar member={m} size={22} />
                  <span className="text-[13px] text-neutral-700 dark:text-neutral-200">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>金額</SectionLabel>
            <input type="number" inputMode="numeric" className={inputCls} placeholder="例）12000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <SectionLabel>カテゴリ</SectionLabel>
            <input className={inputCls} placeholder="例）宿泊・食費・移動" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <button
            disabled={!who || !amount}
            onClick={addExpense}
            className="w-full h-12 rounded-[14px] text-white font-medium text-[15px] disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            記録する
          </button>
        </div>
      </Sheet>
    </div>
  );
}

// ---------- Other Tab ----------

function OtherTab({ trip, updateTrip }) {
  const [linkDraft, setLinkDraft] = useState("");
  const [imageInfoOpen, setImageInfoOpen] = useState(false);
  const [editing, setEditing] = useState(null); // which field is being edited
  const [draftValue, setDraftValue] = useState("");

  const fields = [
    { key: "memo", icon: FileText, label: "自由メモ" },
    { key: "hotelAddress", icon: Home, label: "ホテル住所" },
    { key: "checkin", icon: Calendar, label: "チェックイン時間" },
    { key: "reservationNo", icon: Ticket, label: "予約番号" },
    { key: "flight", icon: Plane, label: "飛行機便" },
  ];

  const startEdit = (key) => {
    setEditing(key);
    setDraftValue(trip.notes[key] || "");
  };

  const saveEdit = () => {
    updateTrip({ ...trip, notes: { ...trip.notes, [editing]: draftValue } });
    setEditing(null);
  };

  const addLink = () => {
    const url = linkDraft.trim();
    if (!url) return;
    updateTrip({ ...trip, notes: { ...trip.notes, links: [...trip.notes.links, url] } });
    setLinkDraft("");
  };

  const removeLink = (idx) => {
    updateTrip({ ...trip, notes: { ...trip.notes, links: trip.notes.links.filter((_, i) => i !== idx) } });
  };

  return (
    <div className="px-5 pt-4 space-y-6">
      <div className="rounded-[18px] bg-white dark:bg-neutral-900 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
        {fields.map((f) => (
          <button
            key={f.key}
            onClick={() => startEdit(f.key)}
            className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(79,142,247,0.1)" }}>
              <f.icon size={15} style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-neutral-400">{f.label}</div>
              <div className={`text-[14px] mt-0.5 ${trip.notes[f.key] ? "text-neutral-800 dark:text-neutral-100" : "text-neutral-400"}`}>
                {trip.notes[f.key] || "タップして入力"}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div>
        <SectionLabel>URL</SectionLabel>
        <div className="rounded-[18px] bg-white dark:bg-neutral-900 shadow-sm p-4 space-y-2">
          {trip.notes.links.length === 0 && <div className="text-[13px] text-neutral-400">リンクなし</div>}
          {trip.notes.links.map((l, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px]">
              <Link2 size={13} style={{ color: ACCENT }} className="shrink-0" />
              <a href={l} target="_blank" rel="noreferrer" className="truncate flex-1" style={{ color: ACCENT }}>{l}</a>
              <button onClick={() => removeLink(i)} className="text-neutral-300 shrink-0"><X size={13} /></button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Plus size={13} className="text-neutral-300 shrink-0" />
            <input
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
              placeholder="https://..."
              className="flex-1 bg-transparent outline-none text-[13px] text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>画像</SectionLabel>
        <button
          onClick={() => setImageInfoOpen(true)}
          className="w-full h-24 rounded-[18px] border border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-1.5 text-neutral-400"
        >
          <ImageIcon size={20} />
          <span className="text-[12px]">画像を添付</span>
        </button>
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={fields.find((f) => f.key === editing)?.label || ""}>
        <div className="space-y-4">
          <input
            autoFocus
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            className="w-full rounded-[14px] bg-neutral-50 dark:bg-neutral-800 border border-transparent focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] text-neutral-900 dark:text-white"
          />
          <button onClick={saveEdit} className="w-full h-12 rounded-[14px] text-white font-medium text-[15px]" style={{ background: ACCENT }}>
            保存する
          </button>
        </div>
      </Sheet>

      <Sheet open={imageInfoOpen} onClose={() => setImageInfoOpen(false)} title="画像添付について">
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          画像の添付は、写真データを保存する場所（Supabase Storage）の追加設定が必要な機能です。現在のバージョンではまだ利用できません。
        </p>
      </Sheet>
    </div>
  );
}

// ---------- Trip Detail (container) ----------

const TABS = [
  { key: "map", label: "みんなの地図", icon: MapIcon },
  { key: "packing", label: "持ち物", icon: Briefcase },
  { key: "tasks", label: "タスク", icon: CheckSquare },
  { key: "itinerary", label: "旅程", icon: Calendar },
  { key: "money", label: "お金", icon: JapaneseYen },
  { key: "other", label: "その他", icon: MoreHorizontal },
];

function TripDetail({ trip, updateTrip, onBack, currentMember }) {
  const [tab, setTab] = useState("map");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const status = daysLeftLabel(trip.startDate, trip.endDate);
  const isMapTab = tab === "map";

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] dark:bg-neutral-950 overflow-hidden">
      <div className={`shrink-0 z-20 bg-[#F8FAFC]/90 dark:bg-neutral-950/90 backdrop-blur-md px-5 pt-14 ${isMapTab ? "pb-2" : "pb-3"}`}>
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white dark:bg-neutral-900 shadow-sm flex items-center justify-center">
            <ChevronLeft size={18} className="text-neutral-600 dark:text-neutral-300" />
          </button>
          <Wordmark size={14} />
          <button onClick={() => setHistoryOpen(true)} className="w-9 h-9 rounded-full bg-white dark:bg-neutral-900 shadow-sm flex items-center justify-center relative">
            <Bell size={16} className="text-neutral-600 dark:text-neutral-300" />
            {trip.history.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: WARNING }} />
            )}
          </button>
        </div>
        {!isMapTab && (
          <>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <h1 className="text-[20px] font-bold text-neutral-900 dark:text-white">{trip.title}</h1>
                <div className="text-[12px] text-neutral-400 mt-0.5">{trip.startDate} 〜 {trip.endDate}</div>
              </div>
              <span
                className="text-[12px] font-medium px-2.5 py-1 rounded-full"
                style={{
                  color: status.tone === "accent" ? ACCENT : "#94A3B8",
                  background: status.tone === "accent" ? "rgba(79,142,247,0.1)" : "rgba(148,163,184,0.12)",
                }}
              >
                {status.label}
              </span>
            </div>
            <div className="flex -space-x-2 mt-3 items-center">
              {trip.members.map((m) => <Avatar key={m.id} member={m} size={28} />)}
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/trip/${trip.id}`;
                  try {
                    await navigator.clipboard.writeText(url);
                  } catch (e) {
                    window.prompt("このリンクをコピーして共有してください", url);
                  }
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 1800);
                }}
                className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center ml-1"
                title="招待リンクをコピー"
              >
                {inviteCopied ? <Check size={13} style={{ color: SUCCESS }} /> : <Plus size={13} className="text-neutral-400" />}
              </button>
              {inviteCopied && (
                <span className="text-[11px] ml-1" style={{ color: SUCCESS }}>リンクをコピーしました</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className={`flex-1 min-h-0 ${isMapTab ? "overflow-hidden" : "overflow-y-auto"} animate-[fadeIn_.2s_ease]`} key={tab}>
        {tab === "map" && <SharedMapTab trip={trip} updateTrip={updateTrip} currentMember={currentMember} />}
        {tab === "packing" && <PackingTab trip={trip} updateTrip={updateTrip} />}
        {tab === "tasks" && <TasksTab trip={trip} updateTrip={updateTrip} />}
        {tab === "itinerary" && <ItineraryTab trip={trip} updateTrip={updateTrip} />}
        {tab === "money" && <MoneyTab trip={trip} updateTrip={updateTrip} />}
        {tab === "other" && <OtherTab trip={trip} updateTrip={updateTrip} />}
      </div>

      <div className="shrink-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-100 dark:border-neutral-800">
        <div className="max-w-md mx-auto grid grid-cols-6">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className="flex flex-col items-center gap-1 py-2.5">
                <t.icon size={19} strokeWidth={active ? 2.4 : 1.8} style={{ color: active ? ACCENT : "#94A3B8" }} />
                <span className="text-[9px] leading-tight text-center" style={{ color: active ? ACCENT : "#94A3B8", fontWeight: active ? 600 : 400 }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="更新履歴">
        <div className="space-y-4">
          {trip.history.length === 0 && <div className="text-[13px] text-neutral-400 text-center py-6">まだ履歴はありません</div>}
          {trip.history.map((h) => (
            <div key={h.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: ACCENT }} />
              <div>
                <div className="text-[13px] text-neutral-700 dark:text-neutral-200">
                  <span className="font-medium">{h.who}</span>さんが{h.action}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{h.time}</div>
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

// ---------- Join trip (invite link) screen ----------
// ログイン不要：招待リンク(=旅行のUUID)を開いた人に、一度だけ名前を聞く。
// 一度参加すると、その端末には「あなたはこの旅行のこのメンバーです」という
// 対応関係がローカルに保存され、次回からは自動的に開く。

function JoinTripScreen({ tripId, tripPreview, onJoined, onCancel }) {
  const [name, setName] = useState(getSavedName());
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const join = async () => {
    if (!name) return;
    setJoining(true);
    setError("");
    const color = AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];
    const { data: member, error } = await supabase.rpc("add_trip_member", {
      p_trip_id: tripId,
      p_display_name: name,
      p_initial: name.slice(0, 1).toUpperCase(),
      p_color: color,
    });
    setJoining(false);
    if (error || !member) {
      setError("参加できませんでした。リンクが正しいか確認してください。");
      return;
    }
    saveName(name);
    setLocalMemberId(tripId, member.id);
    addLocalTripId(tripId);
    onJoined();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-neutral-950 flex flex-col items-center justify-center px-8 text-center">
      <img src={LOGO_ICON} alt="" className="h-16 w-auto mb-6" />
      <h1 className="text-[18px] font-bold text-neutral-900 dark:text-white mb-2">
        {tripPreview ? `「${tripPreview.title}」に招待されました` : "旅行に招待されました"}
      </h1>
      <p className="text-[13px] text-neutral-400 mb-8 max-w-xs">
        参加すると、このメンバーとして持ち物・タスク・旅程・お金を一緒に編集できるようになります。
      </p>
      <div className="w-full max-w-xs space-y-3">
        <input
          placeholder="あなたの名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-[14px] bg-white dark:bg-neutral-900 border border-transparent focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 shadow-sm text-center"
        />
        {error && <p className="text-[12px]" style={{ color: "#EF4444" }}>{error}</p>}
        <button
          disabled={!name || joining}
          onClick={join}
          className="w-full h-12 rounded-[14px] text-white font-medium text-[15px] disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: ACCENT }}
        >
          {joining ? <Loader2 size={18} className="animate-spin" /> : <Users size={16} />}
          この旅行に参加する
        </button>
      </div>
      <button onClick={onCancel} className="mt-4 text-[13px] text-neutral-400">
        旅行一覧に戻る
      </button>
    </div>
  );
}

// ---------- App root ----------

export default function MonolisApp({ initialTripId = null }) {
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [currentId, setCurrentId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [pendingJoinId, setPendingJoinId] = useState(null);
  const [joinPreview, setJoinPreview] = useState(null);
  const [ready, setReady] = useState(false);

  // --- fetch every trip this device has created/joined ---
  const fetchTrips = useCallback(async () => {
    const ids = getLocalTripIds();
    if (ids.length === 0) {
      setTrips([]);
      setLoadingTrips(false);
      return;
    }
    setLoadingTrips(true);
    const { data, error } = await supabase.rpc("get_trips_with_members", { p_ids: ids });
    if (error || !data) {
      setTrips([]);
      setLoadingTrips(false);
      return;
    }
    setTrips(data.map(rowToUiTrip));
    setLoadingTrips(false);
  }, []);

  // --- on load: decide whether this is a normal visit or an invite-link visit ---
  useEffect(() => {
    (async () => {
      if (initialTripId) {
        const alreadyJoined = getLocalMemberId(initialTripId);
        if (alreadyJoined) {
          addLocalTripId(initialTripId);
          await fetchTrips();
          setCurrentId(initialTripId);
        } else {
          const { data } = await supabase.rpc("get_trip_with_members", { p_id: initialTripId });
          if (data && data.length > 0) {
            setJoinPreview(rowToUiTrip(data[0]));
          }
          setPendingJoinId(initialTripId);
        }
      } else {
        await fetchTrips();
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTripId]);

  // --- keep the currently open trip fresh so changes from other members show up ---
  useEffect(() => {
    if (!currentId) return;
    const poll = setInterval(async () => {
      const { data } = await supabase.rpc("get_trip_with_members", { p_id: currentId });
      if (data && data.length > 0) {
        const fresh = rowToUiTrip(data[0]);
        setTrips((prev) => prev.map((t) => (t.id === fresh.id ? fresh : t)));
      }
    }, 6000);
    return () => clearInterval(poll);
  }, [currentId]);

  const currentTrip = trips.find((t) => t.id === currentId);
  const currentMember = currentTrip
    ? currentTrip.members.find((m) => m.id === getLocalMemberId(currentTrip.id)) || currentTrip.members[0]
    : null;

  const updateTrip = useCallback(async (updated) => {
    // 楽観的に画面をすぐ更新してから、DBに保存する
    setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    await supabase.rpc("update_trip_data", { p_trip_id: updated.id, p_data: uiTripToData(updated) });
  }, []);

  const createTrip = useCallback(async (formData) => {
    const color = AVATAR_PALETTE[0];
    const { data, error } = await supabase.rpc("create_trip", {
      p_title: formData.title,
      p_destination: formData.destination,
      p_start_date: formData.startDate,
      p_end_date: formData.endDate,
      p_display_name: formData.displayName,
      p_initial: formData.displayName.slice(0, 1).toUpperCase(),
      p_color: color,
    });
    if (error || !data) return;
    const tripId = data.trip.id;
    setLocalMemberId(tripId, data.member_id);
    addLocalTripId(tripId);
    await fetchTrips();
    setCreateOpen(false);
    setCurrentId(tripId);
  }, [fetchTrips]);

  const shell = (children) => (
    <div className={dark ? "dark" : ""}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes slideUp { from { transform: translateY(100%);} to { transform: translateY(0);} }
        * { -webkit-tap-highlight-color: transparent; }
        body { font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif; }
      `}</style>
      <div className="font-sans">{children}</div>
    </div>
  );

  if (!ready) {
    return shell(
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-neutral-300" />
      </div>
    );
  }

  if (pendingJoinId) {
    return shell(
      <JoinTripScreen
        tripId={pendingJoinId}
        tripPreview={joinPreview}
        onJoined={async () => {
          await fetchTrips();
          setCurrentId(pendingJoinId);
          setPendingJoinId(null);
        }}
        onCancel={() => {
          setPendingJoinId(null);
          fetchTrips();
        }}
      />
    );
  }

  return shell(
    <>
      {currentTrip ? (
        <TripDetail trip={currentTrip} updateTrip={updateTrip} onBack={() => setCurrentId(null)} currentMember={currentMember} />
      ) : (
        <TripList
          trips={trips}
          onOpen={setCurrentId}
          onCreate={() => setCreateOpen(true)}
          dark={dark}
          setDark={setDark}
          loading={loadingTrips}
        />
      )}

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="旅行を作成">
        <TripCreateForm onCreate={createTrip} onClose={() => setCreateOpen(false)} />
      </Sheet>
    </>
  );
}
