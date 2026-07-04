"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, MapPin, Star, Clock, ThumbsUp, MessageCircle, Plus, X, Check,
  ChevronUp, Loader2, Navigation
} from "lucide-react";
import { loadGoogleMaps } from "../lib/googleMaps";

const ACCENT = "#4F8EF7";
const SUCCESS = "#3CCB7F";
const WARNING = "#FFB84D";
const CANDIDATE_PIN = "#7BB4FF"; // 水色ピン（候補スポット）
const ITINERARY_PIN = "#B7D84A"; // 黄緑ピン（旅程に確定したスポット）

const REACTIONS = ["👍", "❤️", "🔥", "✨"];

function Avatar({ member, size = 24 }) {
  if (!member) return null;
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-medium shrink-0"
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.42 }}
      title={member.name}
    >
      {member.initial}
    </div>
  );
}

export default function SharedMapTab({ trip, updateTrip, currentMember }) {
  const containerRef = useRef(null);
  const mapDivRef = useRef(null);
  const mapObjRef = useRef(null);
  const markersRef = useRef([]);
  const autocompleteRef = useRef(null);
  const searchInputRef = useRef(null);

  const [mapsError, setMapsError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [containerH, setContainerH] = useState(600);
  const [sheetPct, setSheetPct] = useState(42); // % of the map container's own height
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [confirmSpot, setConfirmSpot] = useState(null); // spot being confirmed to itinerary
  const [confirmDay, setConfirmDay] = useState("new");
  const [confirmDate, setConfirmDate] = useState("");
  const [confirmTime, setConfirmTime] = useState("");

  // 自分自身のコンテナの高さを測る（ヘッダー分を引いた実際の表示エリア）
  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => setContainerH(containerRef.current.clientHeight || 600);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const spots = trip.spots || [];
  const candidateSpots = [...spots]
    .filter((s) => s.status !== "itinerary")
    .sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));

  const memberOf = (id) => trip.members.find((m) => m.id === id);

  const pushHistory = (action) => ({
    id: `h${Date.now()}`,
    who: currentMember?.name || "誰か",
    action,
    time: "たった今",
  });

  // ---------- load Google Maps once ----------
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setMapsReady(true);
      })
      .catch((err) => {
        if (!cancelled) setMapsError(err.message || "Google Mapsの読み込みに失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- init map + geocode destination for initial center ----------
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || mapObjRef.current) return;
    const google = window.google;
    const map = new google.maps.Map(mapDivRef.current, {
      center: { lat: 35.681236, lng: 139.767125 }, // 東京駅（destinationのジオコーディングが終わるまでの仮位置）
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      styles: [
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      ],
    });
    mapObjRef.current = map;

    if (trip.destination) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: trip.destination }, (results, status) => {
        if (status === "OK" && results[0]) {
          map.setCenter(results[0].geometry.location);
          map.setZoom(12);
        }
      });
    }

    // Places Autocomplete on the search input
    if (searchInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ["place_id", "name", "formatted_address", "geometry", "rating", "user_ratings_total", "opening_hours", "types", "photos"],
      });
      autocomplete.bindTo("bounds", map);
      autocompleteRef.current = autocomplete;
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;
        addSpotFromPlace(place);
        searchInputRef.current.value = "";
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  // ---------- render markers whenever spots change ----------
  useEffect(() => {
    if (!mapsReady || !mapObjRef.current) return;
    const google = window.google;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    spots.forEach((spot) => {
      if (spot.lat == null || spot.lng == null) return;
      const marker = new google.maps.Marker({
        position: { lat: spot.lat, lng: spot.lng },
        map: mapObjRef.current,
        title: spot.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: spot.status === "itinerary" ? ITINERARY_PIN : CANDIDATE_PIN,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        setSelectedSpotId(spot.id);
        setSheetPct(70);
      });
      markersRef.current.push(marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, mapsReady]);

  // ---------- add a spot from a selected Google Place ----------
  const addSpotFromPlace = useCallback(
    (place) => {
      let photoUrl = null;
      try {
        if (place.photos && place.photos[0]) {
          photoUrl = place.photos[0].getUrl({ maxWidth: 400 });
        }
      } catch {
        photoUrl = null;
      }
      const newSpot = {
        id: `spot${Date.now()}`,
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address || "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        rating: place.rating || null,
        userRatingsTotal: place.user_ratings_total || 0,
        openNow: place.opening_hours ? place.opening_hours.isOpen?.() ?? null : null,
        category: place.types?.[0]?.replace(/_/g, " ") || "",
        photoUrl,
        addedBy: currentMember?.id || "",
        status: "candidate",
        day: null,
        time: null,
        comments: [],
        reactions: {},
        votes: [],
      };
      updateTrip({
        ...trip,
        spots: [...spots, newSpot],
        history: [pushHistory(`「${newSpot.name}」を候補スポットに追加しました`), ...trip.history].slice(0, 50),
      });
      setSelectedSpotId(newSpot.id);
      setSheetPct(70);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip, spots, currentMember]
  );

  const toggleVote = (spot) => {
    if (!currentMember) return;
    const has = (spot.votes || []).includes(currentMember.id);
    const votes = has ? spot.votes.filter((id) => id !== currentMember.id) : [...(spot.votes || []), currentMember.id];
    const nextSpots = spots.map((s) => (s.id === spot.id ? { ...s, votes } : s));
    updateTrip({
      ...trip,
      spots: nextSpots,
      history: has
        ? trip.history
        : [pushHistory(`「${spot.name}」に投票しました`), ...trip.history].slice(0, 50),
    });
  };

  const toggleReaction = (spot, emoji) => {
    if (!currentMember) return;
    const current = spot.reactions?.[emoji] || [];
    const has = current.includes(currentMember.id);
    const nextList = has ? current.filter((id) => id !== currentMember.id) : [...current, currentMember.id];
    const nextSpots = spots.map((s) =>
      s.id === spot.id ? { ...s, reactions: { ...s.reactions, [emoji]: nextList } } : s
    );
    updateTrip({ ...trip, spots: nextSpots });
  };

  const addComment = (spot) => {
    const text = commentDraft.trim();
    if (!text || !currentMember) return;
    const comment = { id: `c${Date.now()}`, memberId: currentMember.id, text, time: "たった今" };
    const nextSpots = spots.map((s) => (s.id === spot.id ? { ...s, comments: [...(s.comments || []), comment] } : s));
    updateTrip({ ...trip, spots: nextSpots });
    setCommentDraft("");
  };

  const removeSpot = (spot) => {
    updateTrip({ ...trip, spots: spots.filter((s) => s.id !== spot.id) });
    setSelectedSpotId(null);
  };

  // ---------- confirm a candidate spot into the itinerary ----------
  const openConfirm = (spot) => {
    setConfirmSpot(spot);
    setConfirmDay(trip.itinerary.length ? trip.itinerary[0].day : "new");
    setConfirmDate("");
    setConfirmTime("");
  };

  const doConfirm = () => {
    if (!confirmSpot || !confirmTime) return;
    const newEvent = {
      time: confirmTime,
      title: confirmSpot.name,
      note: confirmSpot.address,
      spotId: confirmSpot.id,
      lat: confirmSpot.lat,
      lng: confirmSpot.lng,
    };
    let itinerary;
    let dayNum;
    if (confirmDay === "new") {
      dayNum = trip.itinerary.length ? Math.max(...trip.itinerary.map((d) => d.day)) + 1 : 1;
      itinerary = [...trip.itinerary, { day: dayNum, date: confirmDate || `Day${dayNum}`, events: [newEvent] }];
    } else {
      dayNum = confirmDay;
      itinerary = trip.itinerary.map((d) =>
        d.day === confirmDay
          ? { ...d, events: [...d.events, newEvent].sort((a, b) => a.time.localeCompare(b.time)) }
          : d
      );
    }
    const nextSpots = spots.map((s) =>
      s.id === confirmSpot.id ? { ...s, status: "itinerary", day: dayNum, time: confirmTime } : s
    );
    updateTrip({
      ...trip,
      itinerary,
      spots: nextSpots,
      history: [pushHistory(`「${confirmSpot.name}」を旅程(Day ${dayNum})へ追加しました`), ...trip.history].slice(0, 50),
    });
    setConfirmSpot(null);
    setSelectedSpotId(null);
  };

  const selectedSpot = spots.find((s) => s.id === selectedSpotId);

  // ---------- drag handle for the bottom sheet ----------
  const dragStateRef = useRef(null);
  const onHandlePointerDown = (e) => {
    dragStateRef.current = { startY: e.clientY, startPct: sheetPct };
    e.target.setPointerCapture?.(e.pointerId);
  };
  const onHandlePointerMove = (e) => {
    if (!dragStateRef.current) return;
    const deltaPct = ((dragStateRef.current.startY - e.clientY) / containerH) * 100;
    const next = Math.min(88, Math.max(16, dragStateRef.current.startPct + deltaPct));
    setSheetPct(next);
  };
  const onHandlePointerUp = () => {
    dragStateRef.current = null;
  };

  const inputCls =
    "w-full rounded-[14px] bg-neutral-50 dark:bg-neutral-800 border border-transparent focus:border-[#4F8EF7] outline-none px-4 h-12 text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-colors";

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {/* ---- Map ---- */}
      <div ref={mapDivRef} className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800" />

      {!mapsReady && !mapsError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F8FAFC] dark:bg-neutral-950">
          <Loader2 size={22} className="animate-spin text-neutral-300" />
        </div>
      )}
      {mapsError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-neutral-950 px-8 text-center">
          <MapPin size={28} className="text-neutral-300 mb-3" />
          <p className="text-[13px] text-neutral-400 leading-relaxed">
            地図を読み込めませんでした。<br />
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が正しく設定されているか確認してください。
          </p>
        </div>
      )}

      {/* ---- Bottom sheet ---- */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-white dark:bg-neutral-900 rounded-t-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] flex flex-col transition-[height] duration-100"
        style={{ height: `${(sheetPct / 100) * containerH}px` }}
      >
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          className="flex items-center justify-center pt-2.5 pb-1.5 cursor-grab touch-none"
        >
          <div className="w-10 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-full bg-neutral-100 dark:bg-neutral-800 px-4 h-11">
            <Search size={16} className="text-neutral-400 shrink-0" />
            <input
              ref={searchInputRef}
              placeholder="行きたい場所を検索"
              className="flex-1 bg-transparent outline-none text-[14px] text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          <div className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase px-1">
            候補スポット（{candidateSpots.length}）
          </div>
          {candidateSpots.length === 0 && (
            <div className="text-center text-[13px] text-neutral-400 py-10">
              検索してスポットを追加しましょう
            </div>
          )}
          {candidateSpots.map((spot) => {
            const addedByMember = memberOf(spot.addedBy);
            return (
              <button
                key={spot.id}
                onClick={() => {
                  setSelectedSpotId(spot.id);
                  setSheetPct(70);
                }}
                className="w-full text-left rounded-[16px] bg-neutral-50 dark:bg-neutral-800 p-3 flex gap-3"
              >
                {spot.photoUrl ? (
                  <img src={spot.photoUrl} alt="" className="w-16 h-16 rounded-[12px] object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-[12px] bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-neutral-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-neutral-900 dark:text-white truncate">{spot.name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                    {spot.rating && (
                      <span className="flex items-center gap-0.5"><Star size={11} fill="currentColor" /> {spot.rating}</span>
                    )}
                    {spot.openNow !== null && (
                      <span style={{ color: spot.openNow ? SUCCESS : "#EF4444" }}>{spot.openNow ? "営業中" : "営業時間外"}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <ThumbsUp size={11} /> {spot.votes?.length || 0}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <MessageCircle size={11} /> {spot.comments?.length || 0}
                    </span>
                    {addedByMember && <Avatar member={addedByMember} size={16} />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Spot detail sheet ---- */}
      {selectedSpot && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedSpotId(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-[20px] max-h-[88vh] overflow-y-auto">
            {selectedSpot.photoUrl && (
              <img src={selectedSpot.photoUrl} alt="" className="w-full h-40 object-cover" />
            )}
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[17px] font-bold text-neutral-900 dark:text-white">{selectedSpot.name}</h3>
                  <p className="text-[12px] text-neutral-400 mt-0.5">{selectedSpot.address}</p>
                </div>
                <button onClick={() => setSelectedSpotId(null)} className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  <X size={15} className="text-neutral-500" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-[12px] text-neutral-500">
                {selectedSpot.rating && (
                  <span className="flex items-center gap-1"><Star size={13} fill="currentColor" style={{ color: WARNING }} /> {selectedSpot.rating} ({selectedSpot.userRatingsTotal})</span>
                )}
                {selectedSpot.openNow !== null && (
                  <span className="flex items-center gap-1" style={{ color: selectedSpot.openNow ? SUCCESS : "#EF4444" }}>
                    <Clock size={13} /> {selectedSpot.openNow ? "営業中" : "営業時間外"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {REACTIONS.map((emoji) => {
                  const list = selectedSpot.reactions?.[emoji] || [];
                  const mine = currentMember && list.includes(currentMember.id);
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(selectedSpot, emoji)}
                      className="flex items-center gap-1 px-2.5 h-8 rounded-full border text-[13px]"
                      style={{ borderColor: mine ? ACCENT : "#E2E8F0", background: mine ? "rgba(79,142,247,0.08)" : "transparent" }}
                    >
                      <span>{emoji}</span>
                      {list.length > 0 && <span className="text-[11px] text-neutral-500">{list.length}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleVote(selectedSpot)}
                  className="flex-1 h-11 rounded-[14px] font-medium text-[14px] flex items-center justify-center gap-1.5"
                  style={{
                    background: currentMember && selectedSpot.votes?.includes(currentMember.id) ? SUCCESS : "rgba(60,203,127,0.1)",
                    color: currentMember && selectedSpot.votes?.includes(currentMember.id) ? "#fff" : SUCCESS,
                  }}
                >
                  <ThumbsUp size={15} /> ここ行こう！（{selectedSpot.votes?.length || 0}）
                </button>
                {selectedSpot.status !== "itinerary" && (
                  <button
                    onClick={() => openConfirm(selectedSpot)}
                    className="flex-1 h-11 rounded-[14px] font-medium text-[14px] text-white flex items-center justify-center gap-1.5"
                    style={{ background: ACCENT }}
                  >
                    <Navigation size={15} /> 旅程へ追加
                  </button>
                )}
              </div>
              {selectedSpot.status === "itinerary" && (
                <div className="text-[12px] text-center py-1" style={{ color: SUCCESS }}>
                  Day {selectedSpot.day}・{selectedSpot.time} に追加済み
                </div>
              )}

              <div>
                <div className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase mb-2">コメント</div>
                <div className="space-y-2 mb-2">
                  {(selectedSpot.comments || []).map((c) => {
                    const m = memberOf(c.memberId);
                    return (
                      <div key={c.id} className="flex items-start gap-2">
                        <Avatar member={m} size={22} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-neutral-500">{m?.name || "不明"} · {c.time}</div>
                          <div className="text-[13px] text-neutral-800 dark:text-neutral-100">{c.text}</div>
                        </div>
                      </div>
                    );
                  })}
                  {(!selectedSpot.comments || selectedSpot.comments.length === 0) && (
                    <div className="text-[12px] text-neutral-400">まだコメントはありません</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addComment(selectedSpot)}
                    placeholder="例）朝がおすすめ！"
                    className="flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-4 h-10 text-[13px] outline-none text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400"
                  />
                  <button
                    onClick={() => addComment(selectedSpot)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ background: ACCENT }}
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>
              </div>

              {currentMember && selectedSpot.addedBy === currentMember.id && (
                <button onClick={() => removeSpot(selectedSpot)} className="w-full text-center text-[12px] text-neutral-400 pt-1">
                  この候補を削除する
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Confirm to itinerary sheet ---- */}
      {confirmSpot && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmSpot(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-[20px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-white">「{confirmSpot.name}」を旅程へ</h3>
              <button onClick={() => setConfirmSpot(null)} className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <X size={15} className="text-neutral-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase mb-2">日程</div>
                <div className="flex flex-wrap gap-2">
                  {trip.itinerary.map((d) => (
                    <button
                      key={d.day}
                      onClick={() => setConfirmDay(d.day)}
                      className="px-3 h-9 rounded-full border text-[13px]"
                      style={{
                        borderColor: confirmDay === d.day ? ACCENT : "#E2E8F0",
                        color: confirmDay === d.day ? ACCENT : "#64748B",
                        background: confirmDay === d.day ? "rgba(79,142,247,0.08)" : "transparent",
                      }}
                    >
                      Day {d.day}
                    </button>
                  ))}
                  <button
                    onClick={() => setConfirmDay("new")}
                    className="px-3 h-9 rounded-full border text-[13px] flex items-center gap-1"
                    style={{
                      borderColor: confirmDay === "new" ? ACCENT : "#E2E8F0",
                      color: confirmDay === "new" ? ACCENT : "#64748B",
                      background: confirmDay === "new" ? "rgba(79,142,247,0.08)" : "transparent",
                    }}
                  >
                    <Plus size={12} /> 新しい日
                  </button>
                </div>
              </div>
              {confirmDay === "new" && (
                <div>
                  <div className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase mb-2">日付表示（例: 7/20）</div>
                  <input className={inputCls} placeholder="7/20" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} />
                </div>
              )}
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase mb-2">時刻</div>
                <input type="time" className={inputCls} value={confirmTime} onChange={(e) => setConfirmTime(e.target.value)} />
              </div>
              <button
                disabled={!confirmTime}
                onClick={doConfirm}
                className="w-full h-12 rounded-[14px] text-white font-medium text-[15px] disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: ACCENT }}
              >
                <Check size={16} /> 旅程に追加する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
