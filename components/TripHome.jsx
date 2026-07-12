"use client";

import React, { useRef, useState } from "react";
import { Camera, RotateCcw, Compass, Briefcase, MoreHorizontal } from "lucide-react";
import { resizeImageToDataUrl } from "../lib/imageResize";

const ACCENT = "#4F8EF7";
const SUCCESS = "#3CCB7F";
const WARNING = "#FFB84D";
const BLUSH = "#F472A0";

function Avatar({ member, size = 26 }) {
  if (!member) return null;
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-medium shrink-0"
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.42, marginRight: -7, border: "2px solid #fff" }}
      title={member.name}
    >
      {member.initial}
    </div>
  );
}

// 行き先の文字列から、簡易的に「山・海・都市」を推定する
function detectScene(destination = "") {
  const ocean = ["沖縄", "石垣", "宮古", "ハワイ", "グアム", "バリ", "海", "島", "セブ", "モルディブ", "湘南", "江ノ島"];
  const city = ["東京", "大阪", "ニューヨーク", "ロンドン", "パリ", "ソウル", "台北", "香港", "シンガポール", "都市", "札幌", "福岡", "名古屋"];
  if (ocean.some((k) => destination.includes(k))) return "ocean";
  if (city.some((k) => destination.includes(k))) return "city";
  return "mountain";
}

function MountainScene() {
  return (
    <svg viewBox="0 0 340 250" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="sky-mtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8FC1FF" /><stop offset="55%" stopColor="#BFE0FF" /><stop offset="100%" stopColor="#FFE3C2" />
        </linearGradient>
        <linearGradient id="mtn1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6FA3E0" /><stop offset="100%" stopColor="#4F8EF7" />
        </linearGradient>
        <linearGradient id="mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3E6FC2" /><stop offset="100%" stopColor="#2F5AA8" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="340" height="250" fill="url(#sky-mtn)" />
      <circle cx="270" cy="55" r="26" fill="#FFF6E0" opacity="0.9" />
      <g opacity="0.75"><ellipse cx="70" cy="45" rx="26" ry="10" fill="#fff" /><ellipse cx="92" cy="40" rx="18" ry="9" fill="#fff" /><ellipse cx="48" cy="42" rx="16" ry="8" fill="#fff" /></g>
      <g opacity="0.6"><ellipse cx="200" cy="30" rx="20" ry="8" fill="#fff" /><ellipse cx="218" cy="26" rx="14" ry="7" fill="#fff" /></g>
      <path d="M0 190 L50 120 L90 165 L130 100 L180 175 L220 110 L260 170 L300 130 L340 185 L340 250 L0 250 Z" fill="url(#mtn2)" opacity="0.85" />
      <path d="M0 220 L40 165 L80 205 L140 150 L190 210 L250 160 L300 200 L340 175 L340 250 L0 250 Z" fill="url(#mtn1)" />
      <path d="M50 120 L60 132 L40 132 Z M130 100 L142 114 L118 114 Z M220 110 L231 123 L209 123 Z" fill="#fff" opacity="0.9" />
    </svg>
  );
}

function OceanScene() {
  return (
    <svg viewBox="0 0 340 250" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="sky-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6FCBFF" /><stop offset="60%" stopColor="#BDEBFF" /><stop offset="100%" stopColor="#FFF7DA" />
        </linearGradient>
        <linearGradient id="sea1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33C6C1" /><stop offset="100%" stopColor="#159E9B" />
        </linearGradient>
        <linearGradient id="sea2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E8FBE" /><stop offset="100%" stopColor="#12648A" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="340" height="250" fill="url(#sky-sea)" />
      <circle cx="80" cy="55" r="24" fill="#FFF6E0" opacity="0.9" />
      <g opacity="0.75"><ellipse cx="230" cy="42" rx="24" ry="9" fill="#fff" /><ellipse cx="250" cy="38" rx="16" ry="8" fill="#fff" /></g>
      <ellipse cx="260" cy="168" rx="46" ry="12" fill="#2FAF6E" opacity="0.55" />
      <path d="M0 175 Q40 160 80 175 T160 175 T240 175 T340 175 L340 250 L0 250 Z" fill="url(#sea2)" />
      <path d="M0 200 Q45 182 90 200 T180 200 T270 200 T340 198 L340 250 L0 250 Z" fill="url(#sea1)" />
      <path d="M0 205 Q40 195 80 205 T160 205 T240 205 T340 203" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.55" />
      <path d="M0 224 Q40 214 80 224 T160 224 T240 224 T340 222" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" />
    </svg>
  );
}

function CityScene() {
  return (
    <svg viewBox="0 0 340 250" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="sky-city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5E6FD8" /><stop offset="55%" stopColor="#B98FD1" /><stop offset="100%" stopColor="#FFC9A0" />
        </linearGradient>
        <linearGradient id="bld1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B3F6B" /><stop offset="100%" stopColor="#2B2E52" />
        </linearGradient>
        <linearGradient id="bld2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4B4F86" /><stop offset="100%" stopColor="#363A66" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="340" height="250" fill="url(#sky-city)" />
      <circle cx="255" cy="58" r="22" fill="#FFE9C7" opacity="0.85" />
      <g fill="url(#bld2)" opacity="0.9">
        <rect x="0" y="140" width="28" height="110" /><rect x="34" y="120" width="24" height="130" /><rect x="64" y="155" width="30" height="95" />
        <rect x="230" y="130" width="26" height="120" /><rect x="262" y="150" width="24" height="100" /><rect x="292" y="115" width="28" height="135" /><rect x="312" y="145" width="28" height="105" />
      </g>
      <g fill="url(#bld1)">
        <rect x="100" y="95" width="30" height="155" /><rect x="134" y="130" width="22" height="120" /><rect x="160" y="70" width="26" height="180" /><rect x="190" y="112" width="28" height="138" />
      </g>
      <g fill="#FFD98A" opacity="0.9">
        <rect x="106" y="106" width="4" height="4" /><rect x="116" y="106" width="4" height="4" /><rect x="106" y="120" width="4" height="4" /><rect x="116" y="134" width="4" height="4" />
        <rect x="167" y="84" width="4" height="4" /><rect x="177" y="98" width="4" height="4" /><rect x="167" y="112" width="4" height="4" /><rect x="177" y="128" width="4" height="4" />
        <rect x="196" y="126" width="4" height="4" /><rect x="206" y="140" width="4" height="4" />
        <rect x="7" y="160" width="4" height="4" /><rect x="17" y="176" width="4" height="4" />
        <rect x="236" y="146" width="4" height="4" /><rect x="298" y="132" width="4" height="4" />
      </g>
    </svg>
  );
}

function StatCard({ colorClass, blobColor, iconBg, iconColor, icon, title, sub, onClick, miniBarPct }) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden text-left rounded-[22px] p-4 h-[104px] flex flex-col justify-between shadow-sm active:scale-[0.97] transition-transform"
      style={{ background: colorClass }}
    >
      <div className="absolute w-20 h-20 rounded-full -right-6 -bottom-6 opacity-50" style={{ background: blobColor }} />
      <div className="w-8 h-8 rounded-[11px] flex items-center justify-center relative z-10" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="relative z-10">
        <div className="text-[13.5px] font-bold text-neutral-900 dark:text-white">{title}</div>
        <div className="text-[10px] text-neutral-500 mt-0.5">{sub}</div>
        {miniBarPct != null && (
          <div className="h-1 rounded-full bg-black/8 mt-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${miniBarPct}%`, background: SUCCESS }} />
          </div>
        )}
      </div>
    </button>
  );
}

export default function TripHome({ trip, updateTrip, currentMember, onNavigate }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const scene = detectScene(trip.destination || "");

  // ---- 準備率の計算 ----
  // 持ち物データの形式（新: personal/shared、旧: 自分/相手/共通）どちらでも数えられるようにする
  const packing = trip.packing || {};
  const packingItems = packing.shared
    ? [...Object.values(packing.personal || {}).flat(), ...packing.shared]
    : ["自分", "相手", "共通"].flatMap((c) => packing[c] || []);
  const packingDone = packingItems.filter((i) => i.done).length;
  const packingTotal = packingItems.length;
  const packingPct = packingTotal ? packingDone / packingTotal : 1;

  const tasksDone = trip.tasks.filter((t) => t.done).length;
  const tasksTotal = trip.tasks.length;
  const tasksPct = tasksTotal ? tasksDone / tasksTotal : 1;

  const itineraryPct = trip.itinerary.length > 0 ? 1 : 0;
  const overallPct = Math.round(((packingPct + tasksPct + itineraryPct) / 3) * 100);

  let hint = "準備は万端です！";
  if (itineraryPct < 1) hint = "旅程がまだ空っぽです。行きたい場所から探しましょう";
  else if (packingPct < 1) hint = `持ち物があと${packingTotal - packingDone}個残っています`;
  else if (tasksPct < 1) hint = `タスクがあと${tasksTotal - tasksDone}件残っています`;

  // ---- 精算カード用：未精算の合計 ----
  const totals = {};
  const owed = {};
  trip.members.forEach((m) => {
    totals[m.id] = 0;
    owed[m.id] = 0;
  });
  trip.expenses.forEach((e) => {
    totals[e.who] = (totals[e.who] || 0) + e.amount;
    const covered = e.for && e.for.length ? e.for : trip.members.map((m) => m.id);
    const share = e.amount / covered.length;
    covered.forEach((id) => (owed[id] = (owed[id] || 0) + share));
  });
  let unsettled = 0;
  trip.members.forEach((m) => {
    const diff = totals[m.id] - owed[m.id];
    if (diff < -0.5) unsettled += -diff;
  });
  unsettled = Math.round(unsettled);

  const maxDay = trip.itinerary.length ? Math.max(...trip.itinerary.map((d) => d.day)) : 0;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await updateTrip({ ...trip, heroPhoto: dataUrl });
    } catch {
      // 失敗しても静かに諦める（イラストのままになる）
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const revertPhoto = () => updateTrip({ ...trip, heroPhoto: null });

  const copyInvite = async () => {
    const url = `${window.location.origin}/trip/${trip.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("このリンクをコピーして共有してください", url);
    }
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 1800);
  };

  return (
    <div className="pb-6">
      {/* ---- Hero ---- */}
      <div className="relative h-[220px] overflow-hidden">
        {trip.heroPhoto ? (
          <img src={trip.heroPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : scene === "ocean" ? (
          <OceanScene />
        ) : scene === "city" ? (
          <CityScene />
        ) : (
          <MountainScene />
        )}
        {trip.heroPhoto && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/5 to-black/45" />
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        {trip.heroPhoto ? (
          <button
            onClick={revertPhoto}
            className="absolute right-4 top-[54px] z-10 flex items-center gap-1 text-[10.5px] font-semibold text-white px-3 h-8 rounded-full"
            style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.35)" }}
          >
            <RotateCcw size={12} /> イラストに戻す
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="写真を設定"
            className="absolute right-4 top-[54px] z-10 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.35)" }}
          >
            <Camera size={14} className="text-white" strokeWidth={2} />
          </button>
        )}

        <div className="absolute left-5 right-5 top-[54px] z-10">
          <div className="text-[11px] font-bold text-white/90 tracking-wide" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.2)" }}>
            {(trip.destination || "").toUpperCase()}
          </div>
          <div className="text-[24px] font-extrabold text-white mt-1" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
            {trip.title}
          </div>
        </div>

        <CountdownPill startDate={trip.startDate} endDate={trip.endDate} />

        <div className="absolute right-5 bottom-[38px] z-10 flex">
          {trip.members.map((m) => (
            <Avatar key={m.id} member={m} size={26} />
          ))}
        </div>
      </div>

      {/* ---- Progress (floats over hero edge) ---- */}
      <div className="mx-5 -mt-[26px] relative z-20 bg-white dark:bg-neutral-900 rounded-[20px] p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12.5px] font-bold text-neutral-800 dark:text-neutral-100">旅の準備、着々と進行中</span>
          <span className="text-[12.5px] font-extrabold" style={{ color: ACCENT }}>{overallPct}%</span>
        </div>
        <div className="h-[7px] rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${overallPct}%`, background: `linear-gradient(90deg, ${ACCENT}, ${SUCCESS})` }} />
        </div>
        <div className="text-[11px] text-neutral-400 mt-2">{hint}</div>
      </div>

      {/* ---- Cards ---- */}
      <div className="grid grid-cols-2 gap-3 px-5 mt-5">
        <StatCard
          onClick={() => onNavigate("plan")}
          colorClass="linear-gradient(160deg,#ffffff 0%,#F1F7FF 100%)"
          blobColor="rgba(79,142,247,0.30)"
          iconBg="rgba(79,142,247,0.08)"
          iconColor="#2F6FE0"
          icon={<Compass size={16} strokeWidth={1.8} />}
          title="プラン"
          sub={maxDay ? `地図・旅程／Day1〜${maxDay}` : `候補${trip.spots.length}件・旅程未定`}
        />
        <StatCard
          onClick={() => onNavigate("prep")}
          colorClass="linear-gradient(160deg,#ffffff 0%,#F0FBF5 100%)"
          blobColor="rgba(60,203,127,0.28)"
          iconBg="rgba(60,203,127,0.08)"
          iconColor="#269A5F"
          icon={<Briefcase size={16} strokeWidth={1.8} />}
          title="準備"
          sub={`持ち物${packingDone}/${packingTotal}・タスク${tasksDone}/${tasksTotal}`}
          miniBarPct={((packingPct + tasksPct) / 2) * 100}
        />
        <StatCard
          onClick={() => onNavigate("money")}
          colorClass="linear-gradient(160deg,#ffffff 0%,#FFF7EA 100%)"
          blobColor="rgba(255,184,77,0.30)"
          iconBg="rgba(255,184,77,0.10)"
          iconColor="#D9922A"
          icon={<span className="text-[15px] font-bold">¥</span>}
          title="精算"
          sub={trip.expenses.length === 0 ? "記録なし" : unsettled > 0 ? `¥${unsettled.toLocaleString()} 未精算` : "精算完了"}
        />
        <StatCard
          onClick={() => onNavigate("other")}
          colorClass="linear-gradient(160deg,#ffffff 0%,#FDF1F6 100%)"
          blobColor="rgba(244,114,160,0.26)"
          iconBg="rgba(244,114,160,0.09)"
          iconColor={BLUSH}
          icon={<MoreHorizontal size={16} strokeWidth={1.8} />}
          title="その他"
          sub="メモ・予約情報"
        />
      </div>

      {/* ---- Invite ---- */}
      <div className="mx-5 mt-4 bg-white dark:bg-neutral-900 rounded-[18px] p-3.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex">
            {trip.members.map((m) => (
              <Avatar key={m.id} member={m} size={24} />
            ))}
          </div>
          <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400 font-medium">{trip.members.length}人が参加中</span>
        </div>
        <button
          onClick={copyInvite}
          className="text-[11px] font-bold px-3 h-8 rounded-full"
          style={{ color: inviteCopied ? SUCCESS : ACCENT, background: inviteCopied ? "rgba(60,203,127,0.1)" : "rgba(79,142,247,0.1)" }}
        >
          {inviteCopied ? "コピーしました" : "招待リンク"}
        </button>
      </div>
    </div>
  );
}

function CountdownPill({ startDate, endDate }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  let label;
  if (today > end) label = "旅行終了";
  else if (today >= start) label = "旅行中！";
  else {
    const diff = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    label = `${diff}日後に出発 ✈️`;
  }
  return (
    <div className="absolute left-5 z-10" style={{ bottom: 34 }}>
      <div
        className="inline-flex items-baseline gap-1.5 bg-white/92 px-4 py-2 rounded-full shadow-lg"
        style={{ animation: "monolisPulse 2.4s ease-in-out infinite" }}
      >
        <span className="text-[13px] font-bold text-neutral-700">{label}</span>
      </div>
      <style>{`
        @keyframes monolisPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }
      `}</style>
    </div>
  );
}
