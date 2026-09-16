"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Song, VoteValue } from "@/lib/types";
import { USER_LABELS, USERS, type UserId } from "@/lib/users";

const STORAGE_KEY = "cover-user";

type Tab = "rank" | "unvoted";

function scoreOf(song: Song) {
  return Object.values(song.votes).reduce<number>(
    (sum, vote) => sum + (vote ?? 0),
    0,
  );
}

function plusCount(song: Song) {
  return Object.values(song.votes).filter((vote) => vote === 1).length;
}

function minusCount(song: Song) {
  return Object.values(song.votes).filter((vote) => vote === -1).length;
}

function neutralCount(song: Song) {
  return Object.values(song.votes).filter((vote) => vote === 0).length;
}

function voteLabel(vote: VoteValue) {
  if (vote === 1) return "+";
  if (vote === -1) return "−";
  return "nötr";
}

function sortSongs(songs: Song[]) {
  return [...songs].sort((a, b) => {
    const scoreDiff = scoreOf(b) - scoreOf(a);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export default function Home() {
  const [user, setUser] = useState<UserId | null>(null);
  const [ready, setReady] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [tab, setTab] = useState<Tab>("rank");
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "berkay" || saved === "mert" || saved === "eren" || saved === "sarp") {
      setUser(saved);
    }
    setReady(true);
  }, []);

  const loadSongs = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/songs", { cache: "no-store" });
      const data = (await response.json()) as { songs?: Song[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Liste alınamadı.");
      setSongs(data.songs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadSongs();
  }, [user, loadSongs]);

  const pickUser = (id: UserId) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setUser(id);
  };

  const changeUser = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const applySongs = (data: { songs?: Song[]; error?: string }, ok: boolean) => {
    if (!ok) throw new Error(data.error || "İşlem başarısız.");
    setSongs(data.songs ?? []);
  };

  const addSong = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist, title, addedBy: user }),
      });
      applySongs(await response.json(), response.ok);
      setArtist("");
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şarkı eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const vote = async (id: string, value: VoteValue) => {
    if (!user) return;
    const current = songs.find((song) => song.id === id)?.votes[user];
    const nextValue = current === value ? null : value;
    setError("");
    try {
      const response = await fetch(`/api/songs/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, value: nextValue }),
      });
      applySongs(await response.json(), response.ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oy kaydedilemedi.");
    }
  };

  const disable = async (id: string, target: UserId, reason: string) => {
    setError("");
    try {
      const response = await fetch(`/api/songs/${id}/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: target, reason }),
      });
      applySongs(await response.json(), response.ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disable kaydedilemedi.");
    }
  };

  const enable = async (id: string, target: UserId) => {
    setError("");
    try {
      const response = await fetch(`/api/songs/${id}/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: target, remove: true }),
      });
      applySongs(await response.json(), response.ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disable kaldırılamadı.");
    }
  };

  const unvoted = useMemo(
    () => (user ? sortSongs(songs.filter((song) => song.votes[user] === undefined)) : []),
    [songs, user],
  );
  const ranked = useMemo(() => sortSongs(songs), [songs]);
  const visible = tab === "rank" ? ranked : unvoted;

  if (!ready) return null;

  if (!user) {
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-5 py-16">
        <p className="text-sm tracking-[0.25em] text-amber-400/80 uppercase">grup cover</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Cover Seçici</h1>
        <p className="mt-3 text-zinc-400">Kimsin? Şifre yok, sadece ismini seç.</p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {USERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => pickUser(id)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-lg font-medium hover:border-amber-400/60 hover:bg-amber-400/10"
            >
              {USER_LABELS[id]}
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.25em] text-amber-400/80 uppercase">grup cover</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Cover Seçici</h1>
        </div>
        <button
          type="button"
          onClick={changeUser}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:border-white/30"
        >
          {USER_LABELS[user]} · değiştir
        </button>
      </header>

      <form
        onSubmit={addSong}
        className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input
          value={artist}
          onChange={(event) => setArtist(event.target.value)}
          placeholder="Grup / artist"
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none placeholder:text-zinc-500 focus:border-amber-400/70"
        />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Şarkı adı"
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none placeholder:text-zinc-500 focus:border-amber-400/70"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
        >
          Ekle
        </button>
      </form>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("rank")}
          className={`rounded-full px-4 py-2 text-sm ${tab === "rank" ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-300"}`}
        >
          Sıralama
        </button>
        <button
          type="button"
          onClick={() => setTab("unvoted")}
          className={`rounded-full px-4 py-2 text-sm ${tab === "unvoted" ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-300"}`}
        >
          Henüz puan vermediklerim
          {unvoted.length > 0 ? (
            <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
              {unvoted.length}
            </span>
          ) : null}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="mt-6 space-y-4">
        {loading ? (
          <p className="text-zinc-400">Yükleniyor…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-zinc-400">
            {tab === "unvoted"
              ? "Eksik oyun kalmamış. Helal."
              : "Henüz şarkı yok. İlk cover’ı sen at."}
          </p>
        ) : (
          visible.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              currentUser={user}
              onVote={vote}
              onDisable={disable}
              onEnable={enable}
            />
          ))
        )}
      </section>
    </main>
  );
}

function SongCard({
  song,
  currentUser,
  onVote,
  onDisable,
  onEnable,
}: {
  song: Song;
  currentUser: UserId;
  onVote: (id: string, value: VoteValue) => void;
  onDisable: (id: string, target: UserId, reason: string) => void;
  onEnable: (id: string, target: UserId) => void;
}) {
  const [target, setTarget] = useState<UserId>(currentUser);
  const [reason, setReason] = useState("");
  const myVote = song.votes[currentUser];
  const score = scoreOf(song);

  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{song.title}</h2>
          <p className="text-zinc-400">{song.artist}</p>
          <p className="mt-1 text-xs text-zinc-500">
            ekleyen: {USER_LABELS[song.addedBy]}
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-3xl font-semibold tabular-nums ${
              score > 0 ? "text-emerald-400" : score < 0 ? "text-rose-400" : "text-zinc-300"
            }`}
          >
            {score > 0 ? `+${score}` : score}
          </p>
          <p className="text-xs text-zinc-500">
            +{plusCount(song)} / nötr {neutralCount(song)} / −{minusCount(song)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
        {USERS.map((id) => {
          const vote = song.votes[id];
          if (vote === undefined) return null;
          return (
            <span key={id} className="rounded-full bg-white/5 px-2 py-1">
              {USER_LABELS[id]} {voteLabel(vote)}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onVote(song.id, 1)}
          className={`flex-1 rounded-xl border py-2 font-semibold ${
            myVote === 1
              ? "border-emerald-400 bg-emerald-400/15 text-emerald-300"
              : "border-white/10 bg-white/5 text-zinc-200"
          }`}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onVote(song.id, 0)}
          className={`flex-1 rounded-xl border py-2 text-sm font-semibold ${
            myVote === 0
              ? "border-zinc-300 bg-white/15 text-white"
              : "border-white/10 bg-white/5 text-zinc-200"
          }`}
        >
          Nötr
        </button>
        <button
          type="button"
          onClick={() => onVote(song.id, -1)}
          className={`flex-1 rounded-xl border py-2 font-semibold ${
            myVote === -1
              ? "border-rose-400 bg-rose-400/15 text-rose-300"
              : "border-white/10 bg-white/5 text-zinc-200"
          }`}
        >
          −
        </button>
      </div>

      {song.disabledFor.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {song.disabledFor.map((entry) => (
            <button
              key={entry.user}
              type="button"
              onClick={() => onEnable(song.id, entry.user)}
              className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-left text-sm text-rose-200"
              title="Kaldırmak için tıkla"
            >
              {USER_LABELS[entry.user]} için olmaz — {entry.reason}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void onDisable(song.id, target, reason);
          setReason("");
        }}
      >
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value as UserId)}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
        >
          {USERS.map((id) => (
            <option key={id} value={id}>
              {USER_LABELS[id]}
            </option>
          ))}
        </select>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="vokal çok zor, solo aşırı hızlı…"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500"
        />
        <button
          type="submit"
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:border-rose-400/50"
        >
          Olmaz
        </button>
      </form>
    </article>
  );
}
