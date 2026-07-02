"use client";

import React, { useState, useMemo } from "react";
import {
  Plus, ChevronLeft, Package, CheckSquare, Map, Wallet, MoreHorizontal,
  Moon, Sun, X, Check, Users, Calendar, MapPin, Link2, Plane,
  Home, FileText, Image as ImageIcon, Ticket, ChevronRight, Trash2,
  GripVertical, Bell, TrendingUp, ArrowRight, Sparkles, Briefcase, JapaneseYen
} from "lucide-react";

// Brand assets (served from /public)
const LOGO_ICON = "/logo-icon.png";
const LOGO_FULL = "/logo-full.png";


/* ---------------------------------------------------------
   MONOLITH — travel planning, start to finish, in one place.
   Design tokens:
   accent   #4F8EF7  (motion / action)
   success  #3CCB7F  (done / settled)
   warning  #FFB84D  (pending / owed)
   bg       #F8FAFC  (light canvas)
   radius   16–20px
--------------------------------------------------------- */

const ACCENT = "#4F8EF7";
const SUCCESS = "#3CCB7F";
const WARNING = "#FFB84D";

// ---------- dummy data ----------

const initialTrips = [
  {
    id: "t1",
    title: "北海道旅行",
    destination: "北海道",
    startDate: "2026-07-18",
    endDate: "2026-07-22",
    cover: "linear-gradient(135deg,#4F8EF7 0%,#7BB4FF 100%)",
    members: [
      { id: "m1", name: "あなた", initial: "A", color: "#4F8EF7" },
      { id: "m2", name: "恋人", initial: "K", color: "#FF7D9E" },
    ],
    packing: {
      自分: [
        { id: "p1", name: "パスポート", who: "m1", done: true, qty: 1, note: "" },
        { id: "p2", name: "モバイルバッテリー", who: "m1", done: false, qty: 1, note: "残量確認" },
      ],
      相手: [
        { id: "p3", name: "カメラ", who: "m2", done: false, qty: 1, note: "" },
      ],
      共通: [
        { id: "p4", name: "地図アプリ確認", who: "", done: true, qty: 1, note: "" },
        { id: "p5", name: "常備薬", who: "", done: false, qty: 1, note: "" },
      ],
    },
    tasks: [
      { id: "k1", title: "ホテル予約", who: "m1", due: "2026-07-01", done: true },
      { id: "k2", title: "レンタカー手配", who: "m2", due: "2026-07-05", done: false },
      { id: "k3", title: "猫の世話依頼", who: "m1", due: "2026-07-15", done: false },
    ],
    itinerary: [
      {
        day: 1,
        date: "7/18",
        events: [
          { time: "09:00", title: "出発", note: "羽田空港" },
          { time: "11:30", title: "ランチ", note: "スープカレー" },
          { time: "15:00", title: "チェックイン", note: "札幌グランドホテル" },
          { time: "18:00", title: "BBQ", note: "ホテル屋上" },
        ],
      },
      {
        day: 2,
        date: "7/19",
        events: [
          { time: "10:00", title: "小樽運河", note: "散策" },
          { time: "13:00", title: "寿司ランチ", note: "" },
        ],
      },
    ],
    expenses: [
      { id: "e1", who: "m1", amount: 12000, category: "宿泊" },
      { id: "e2", who: "m2", amount: 8000, category: "食費" },
      { id: "e3", who: "m1", amount: 6000, category: "移動" },
    ],
    notes: {
      memo: "レンタカーはAT車を希望。空港到着後は電車移動。",
      hotelAddress: "北海道札幌市中央区北5条西2丁目",
      checkin: "15:00",
      reservationNo: "HKD-2291",
      flight: "NH1234 / 羽田 → 新千歳 09:00発",
      links: ["https://example.com/hotel"],
    },
    history: [
      { id: "h1", who: "恋人", action: "カメラを追加しました", time: "2時間前" },
      { id: "h2", who: "あなた", action: "レンタカー手配を作成しました", time: "5時間前" },
    ],
  },
  {
    id: "t2",
    title: "沖縄旅行",
    destination: "沖縄",
    startDate: "2026-04-10",
    endDate: "2026-04-13",
    cover: "linear-gradient(135deg,#3CCB7F 0%,#8EE6B2 100%)",
    members: [
      { id: "m1", name: "あなた", initial: "A", color: "#4F8EF7" },
      { id: "m3", name: "友人1", initial: "F", color: "#FFB84D" },
      { id: "m4", name: "友人2", initial: "T", color: "#3CCB7F" },
    ],
    packing: {
      自分: [{ id: "p6", name: "水着", who: "m1", done: true, qty: 1, note: "" }],
      相手: [],
      共通: [
        { id: "p7", name: "日焼け止め", who: "", done: true, qty: 1, note: "" },
        { id: "p8", name: "帽子", who: "", done: true, qty: 3, note: "" },
      ],
    },
    tasks: [{ id: "k4", title: "シュノーケル予約", who: "m1", due: "2026-04-01", done: true }],
    itinerary: [
      { day: 1, date: "4/10", events: [{ time: "10:00", title: "到着", note: "那覇空港" }] },
    ],
    expenses: [
      { id: "e4", who: "m1", amount: 20000, category: "宿泊" },
      { id: "e5", who: "m3", amount: 15000, category: "食費" },
      { id: "e6", who: "m4", amount: 9000, category: "移動" },
    ],
    notes: { memo: "", hotelAddress: "", checkin: "", reservationNo: "", flight: "", links: [] },
    history: [],
  },
];

function daysLeftLabel(startDate, endDate) {
  const today = new Date("2026-07-02");
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

function TripList({ trips, onOpen, onCreate, dark, setDark }) {
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
        {trips.map((trip) => {
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
        {trips.length === 0 && (
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
  const [inviteCopied, setInviteCopied] = useState(false);

  const inputCls =
    "w-full rounded-[14px] bg-neutral-50 dark:bg-neutral-800 border border-transparent focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-colors";

  return (
    <div className="space-y-4">
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
        <button
          onClick={() => {
            setInviteCopied(true);
            setTimeout(() => setInviteCopied(false), 1500);
          }}
          className="w-full flex items-center justify-between rounded-[14px] bg-neutral-50 dark:bg-neutral-800 px-4 h-12 text-[14px] text-neutral-500"
        >
          <span className="flex items-center gap-2"><Link2 size={16} /> 招待リンクをコピー</span>
          {inviteCopied ? <Check size={16} style={{ color: SUCCESS }} /> : <ChevronRight size={16} />}
        </button>
      </div>
      <button
        disabled={!title || !dest || !start || !end}
        onClick={() => onCreate({ title, destination: dest, startDate: start, endDate: end })}
        className="w-full h-13 rounded-[14px] text-white font-medium text-[15px] py-3.5 mt-2 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        style={{ background: ACCENT }}
      >
        <img src={LOGO_ICON} alt="" className="h-5 w-auto opacity-90" />
        旅行を作成
      </button>
    </div>
  );
}

// ---------- Packing Tab ----------

function PackingTab({ trip, updateTrip }) {
  const categories = ["自分", "相手", "共通"];
  const [suggestOpen, setSuggestOpen] = useState(false);

  const toggle = (cat, id) => {
    const items = trip.packing[cat].map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    updateTrip({ ...trip, packing: { ...trip.packing, [cat]: items } });
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
              <div key={item.id} className="flex items-center gap-3 px-4 h-14">
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
              </div>
            ))}
            {trip.packing[cat].length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-neutral-400">アイテムなし</div>
            )}
          </div>
        </div>
      ))}

      <Sheet open={suggestOpen} onClose={() => setSuggestOpen(false)} title="AIによる持ち物候補">
        <p className="text-[13px] text-neutral-400 mb-4">{trip.destination}・{trip.startDate}〜 の旅程から生成しました</p>
        <div className="flex flex-wrap gap-2">
          {aiSuggestions.map((s) => (
            <span key={s} className="text-[13px] px-3 py-2 rounded-full bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {s}
            </span>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

// ---------- Tasks Tab ----------

function TasksTab({ trip, updateTrip }) {
  const toggle = (id) => {
    const tasks = trip.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    updateTrip({ ...trip, tasks });
  };
  const done = trip.tasks.filter((t) => t.done).length;
  const memberOf = (id) => trip.members.find((m) => m.id === id);

  return (
    <div className="px-5 pt-4 space-y-4">
      <div>
        <div className="text-[13px] text-neutral-400">やること</div>
        <div className="text-[20px] font-bold text-neutral-900 dark:text-white">{done} / {trip.tasks.length} 完了</div>
        <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden mt-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: trip.tasks.length ? `${(done / trip.tasks.length) * 100}%` : "0%", background: ACCENT }}
          />
        </div>
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
                <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                  <Calendar size={11} /> {task.due}
                </div>
              </div>
              {m && <Avatar member={m} size={26} />}
            </div>
          );
        })}
        {trip.tasks.length === 0 && <EmptyState icon={CheckSquare} text="タスクはまだありません" />}
      </div>
    </div>
  );
}

// ---------- Itinerary Tab ----------

function ItineraryTab({ trip }) {
  return (
    <div className="px-5 pt-4 space-y-6">
      {trip.itinerary.map((day) => (
        <div key={day.day}>
          <div className="flex items-baseline gap-2 mb-3 px-1">
            <span className="text-[15px] font-bold text-neutral-900 dark:text-white">Day {day.day}</span>
            <span className="text-[12px] text-neutral-400">{day.date}</span>
          </div>
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-neutral-200 dark:bg-neutral-800" />
            <div className="space-y-4">
              {day.events.map((ev, i) => (
                <div key={i} className="relative">
                  <div
                    className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4 ring-[#F8FAFC] dark:ring-neutral-950"
                    style={{ background: ACCENT }}
                  />
                  <div className="rounded-[16px] bg-white dark:bg-neutral-900 shadow-sm px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-neutral-900 dark:text-white">{ev.title}</span>
                      <span className="text-[12px] font-medium text-neutral-400">{ev.time}</span>
                    </div>
                    {ev.note && <div className="text-[12px] text-neutral-400 mt-0.5">{ev.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      {trip.itinerary.length === 0 && <EmptyState icon={Map} text="旅程はまだありません" />}
      <button className="w-full h-11 rounded-[14px] border border-dashed border-neutral-300 dark:border-neutral-700 text-[13px] text-neutral-400 flex items-center justify-center gap-1.5">
        <Plus size={14} /> 予定を追加
      </button>
    </div>
  );
}

// ---------- Money Tab ----------

function MoneyTab({ trip }) {
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

  return (
    <div className="px-5 pt-4 space-y-6">
      <div className="rounded-[20px] p-5 text-white" style={{ background: "linear-gradient(135deg,#4F8EF7,#7BB4FF)" }}>
        <div className="text-[13px] opacity-80">合計支出</div>
        <div className="text-[28px] font-bold mt-0.5">¥{grandTotal.toLocaleString()}</div>
        <div className="text-[12px] opacity-80 mt-1">{trip.members.length}人で折半 · 一人あたり ¥{Math.round(grandTotal / trip.members.length).toLocaleString()}</div>
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
              </div>
            );
          })}
        </div>
      </div>

      <button className="w-full h-11 rounded-[14px] border border-dashed border-neutral-300 dark:border-neutral-700 text-[13px] text-neutral-400 flex items-center justify-center gap-1.5">
        <Plus size={14} /> 支払いを記録
      </button>
    </div>
  );
}

// ---------- Other Tab ----------

function OtherTab({ trip }) {
  const rows = [
    { icon: FileText, label: "自由メモ", value: trip.notes.memo || "未入力" },
    { icon: Home, label: "ホテル住所", value: trip.notes.hotelAddress || "未入力" },
    { icon: Calendar, label: "チェックイン時間", value: trip.notes.checkin || "未入力" },
    { icon: Ticket, label: "予約番号", value: trip.notes.reservationNo || "未入力" },
    { icon: Plane, label: "飛行機便", value: trip.notes.flight || "未入力" },
  ];
  return (
    <div className="px-5 pt-4 space-y-6">
      <div className="rounded-[18px] bg-white dark:bg-neutral-900 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(79,142,247,0.1)" }}>
              <r.icon size={15} style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-neutral-400">{r.label}</div>
              <div className="text-[14px] text-neutral-800 dark:text-neutral-100 mt-0.5">{r.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <SectionLabel>URL</SectionLabel>
        <div className="rounded-[18px] bg-white dark:bg-neutral-900 shadow-sm p-4 space-y-2">
          {trip.notes.links.length === 0 && <div className="text-[13px] text-neutral-400">リンクなし</div>}
          {trip.notes.links.map((l, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px]" style={{ color: ACCENT }}>
              <Link2 size={13} /> <span className="truncate">{l}</span>
            </div>
          ))}
          <button className="text-[13px] text-neutral-400 flex items-center gap-1.5 pt-1">
            <Plus size={13} /> リンクを追加
          </button>
        </div>
      </div>

      <div>
        <SectionLabel>画像</SectionLabel>
        <button className="w-full h-24 rounded-[18px] border border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-1.5 text-neutral-400">
          <ImageIcon size={20} />
          <span className="text-[12px]">画像を添付</span>
        </button>
      </div>
    </div>
  );
}

// ---------- Trip Detail (container) ----------

const TABS = [
  { key: "packing", label: "持ち物", icon: Briefcase },
  { key: "tasks", label: "タスク", icon: CheckSquare },
  { key: "itinerary", label: "旅程", icon: Calendar },
  { key: "money", label: "お金", icon: JapaneseYen },
  { key: "other", label: "その他", icon: MoreHorizontal },
];

function TripDetail({ trip, updateTrip, onBack }) {
  const [tab, setTab] = useState("packing");
  const [historyOpen, setHistoryOpen] = useState(false);
  const status = daysLeftLabel(trip.startDate, trip.endDate);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-neutral-950 pb-24">
      <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 dark:bg-neutral-950/90 backdrop-blur-md px-5 pt-14 pb-3">
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
        <div className="flex -space-x-2 mt-3">
          {trip.members.map((m) => <Avatar key={m.id} member={m} size={28} />)}
          <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center ml-1">
            <Plus size={13} className="text-neutral-400" />
          </div>
        </div>
      </div>

      <div className="animate-[fadeIn_.2s_ease]" key={tab}>
        {tab === "packing" && <PackingTab trip={trip} updateTrip={updateTrip} />}
        {tab === "tasks" && <TasksTab trip={trip} updateTrip={updateTrip} />}
        {tab === "itinerary" && <ItineraryTab trip={trip} />}
        {tab === "money" && <MoneyTab trip={trip} />}
        {tab === "other" && <OtherTab trip={trip} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-100 dark:border-neutral-800">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className="flex flex-col items-center gap-1 py-2.5">
                <t.icon size={20} strokeWidth={active ? 2.4 : 1.8} style={{ color: active ? ACCENT : "#94A3B8" }} />
                <span className="text-[10px]" style={{ color: active ? ACCENT : "#94A3B8", fontWeight: active ? 600 : 400 }}>
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

// ---------- App root ----------

export default function MonolisApp() {
  const [trips, setTrips] = useState(initialTrips);
  const [currentId, setCurrentId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const currentTrip = trips.find((t) => t.id === currentId);

  const updateTrip = (updated) => {
    setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const createTrip = (data) => {
    const newTrip = {
      id: `t${Date.now()}`,
      title: data.title,
      destination: data.destination,
      startDate: data.startDate,
      endDate: data.endDate,
      cover: "linear-gradient(135deg,#4F8EF7 0%,#7BB4FF 100%)",
      members: [{ id: "m1", name: "あなた", initial: "A", color: "#4F8EF7" }],
      packing: { 自分: [], 相手: [], 共通: [] },
      tasks: [],
      itinerary: [],
      expenses: [],
      notes: { memo: "", hotelAddress: "", checkin: "", reservationNo: "", flight: "", links: [] },
      history: [],
    };
    setTrips((prev) => [newTrip, ...prev]);
    setCreateOpen(false);
    setCurrentId(newTrip.id);
  };

  return (
    <div className={dark ? "dark" : ""}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes slideUp { from { transform: translateY(100%);} to { transform: translateY(0);} }
        * { -webkit-tap-highlight-color: transparent; }
        body { font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif; }
      `}</style>
      <div className="font-sans">
        {currentTrip ? (
          <TripDetail trip={currentTrip} updateTrip={updateTrip} onBack={() => setCurrentId(null)} />
        ) : (
          <TripList trips={trips} onOpen={setCurrentId} onCreate={() => setCreateOpen(true)} dark={dark} setDark={setDark} />
        )}
      </div>

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="旅行を作成">
        <TripCreateForm onCreate={createTrip} onClose={() => setCreateOpen(false)} />
      </Sheet>
    </div>
  );
}
