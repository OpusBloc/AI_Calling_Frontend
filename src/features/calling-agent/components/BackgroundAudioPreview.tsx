"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Mic, Music, Pause, Pencil, Play, Plus, Trash2, X } from "lucide-react";

import {
  createBackgroundAudio,
  deleteBackgroundAudio,
  getBackgroundAudio,
  getBackgroundAudioFile,
  getBackgroundAudioPreview,
  getBackgroundAudioSettings,
  listBackgroundAudios,
  postBackgroundAudioSettings,
  updateBackgroundAudio,
  updateBackgroundAudioSettings,
  type BackgroundAudio,
} from "@/lib/callingAgentApi";
import { ErrorBanner, errorMessage } from "@/components/ui";
import { showErrorNotification } from "@/hooks/useNotification";
import VolumeDial from "./VolumeDial";

const isNotFoundError = (error: unknown) =>
  Boolean(error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 404);

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

const buttonFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const primaryButton = `inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45 ${buttonFocus}`;

export type Track = { id: string; name: string; durationSec: number; volume: number; isSelected: boolean };

export function useBackgroundPreview({ agentId, speaker, language, text }: {
  agentId?: string;
  speaker?: string;
  language?: string;
  text?: string;
}) {
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);
  const activeTrackRef = useRef<Track | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  const stop = useCallback(() => {
    requestRef.current += 1;
    if (timerRef.current) clearInterval(timerRef.current);
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    timerRef.current = null;
    volumeTimerRef.current = null;
    activeTrackRef.current = null;
    if (sourceRef.current) sourceRef.current.onended = null;
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
    setPlayingTrackId(null);
    setLoadingTrackId(null);
    setElapsed(0);
  }, []);

  const loadPreview = useCallback(async (track: Track, volume: number) => {
    const requestId = ++requestRef.current;
    activeTrackRef.current = track;
    setLoadingTrackId(track.id);
    try {
      const context = contextRef.current ?? new AudioContext();
      contextRef.current = context;
      await context.resume();
      const previewBlob = await getBackgroundAudioPreview({ agentId, volume, audioId: track.id, speaker, language, text });
      const previewBuffer = await context.decodeAudioData(await previewBlob.arrayBuffer());
      if (requestId !== requestRef.current) return;
      if (timerRef.current) clearInterval(timerRef.current);
      if (sourceRef.current) sourceRef.current.onended = null;
      try { sourceRef.current?.stop(); } catch { /* already stopped */ }
      const source = context.createBufferSource();
      source.buffer = previewBuffer;
      source.connect(context.destination);
      sourceRef.current = source;
      source.onended = () => {
        if (requestId !== requestRef.current) return;
        if (timerRef.current) clearInterval(timerRef.current);
        if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
        timerRef.current = null;
        volumeTimerRef.current = null;
        sourceRef.current = null;
        activeTrackRef.current = null;
        setPlayingTrackId(null);
        setElapsed(0);
      };
      setDuration(previewBuffer.duration);
      setElapsed(0);
      setPlayingTrackId(track.id);
      const startedAt = context.currentTime;
      timerRef.current = setInterval(() => setElapsed(Math.min(previewBuffer.duration, context.currentTime - startedAt)), 100);
      source.start();
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setLoadingTrackId(null);
      showErrorNotification(errorMessage(error), { title: "Preview failed" });
    } finally {
      if (requestId === requestRef.current) setLoadingTrackId(null);
    }
  }, [agentId, language, speaker, text]);

  const play = useCallback((track: Track, volume: number) => {
    if (playingTrackId === track.id || loadingTrackId === track.id) {
      stop();
      return;
    }
    stop();
    void loadPreview(track, volume);
  }, [loadPreview, loadingTrackId, playingTrackId, stop]);

  const setVolume = useCallback((volume: number) => {
    const track = activeTrackRef.current;
    if (!track) return;
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    volumeTimerRef.current = setTimeout(() => {
      volumeTimerRef.current = null;
      void loadPreview(track, volume);
    }, 200);
  }, [loadPreview]);

  useEffect(() => () => {
    requestRef.current += 1;
    if (timerRef.current) clearInterval(timerRef.current);
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    if (sourceRef.current) sourceRef.current.onended = null;
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    void contextRef.current?.close();
  }, []);

  return { playingTrackId, loadingTrackId, elapsed, duration, play, stop, setVolume };
}

export function BackgroundVoiceCard({
  track,
  isTrackPlaying,
  isTrackLoading,
  isPreviewPlaying,
  isPreviewLoading,
  radioTabStop,
  elapsed,
  previewDuration,
  onSelect,
  onPlay,
  onPreview,
  onPreviewVolume,
  onRename,
  onVolume,
  onDelete,
}: {
  track: Track;
  isTrackPlaying: boolean;
  isTrackLoading: boolean;
  isPreviewPlaying: boolean;
  isPreviewLoading: boolean;
  radioTabStop: boolean;
  elapsed: number;
  previewDuration: number;
  onSelect: () => void;
  onPlay: () => void;
  onPreview: (volume: number) => void;
  onPreviewVolume: (volume: number) => void;
  onRename: (name: string) => Promise<void>;
  onVolume: (volume: number) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(track.name);
  const [volume, setVolume] = useState(track.volume);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setName(track.name); setVolume(track.volume); }, [track.name, track.volume]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
  const saveName = () => {
    const nextName = name.trim();
    if (!nextName) return;
    void onRename(nextName).then(() => setEditing(false)).catch(() => setName(track.name));
  };
  const changeVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    onPreviewVolume(nextVolume);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void onVolume(nextVolume).catch(() => {
      setVolume(track.volume);
      onPreviewVolume(track.volume);
    }), 500);
  };
  const progress = isPreviewPlaying && previewDuration > 0 ? Math.min(100, (elapsed / previewDuration) * 100) : 0;

  return (
    <li className={`relative min-w-0 max-w-md rounded-xl border-2 p-4 transition-colors ${track.isSelected ? "border-indigo-600 bg-indigo-50 dark:border-[#AFA9EC] dark:bg-[#26215C]" : "border-slate-200 bg-white dark:border-hairline-strong dark:bg-surface"}`}>
      <div className="flex min-w-0 items-center gap-3 pr-6">
        <div className="flex shrink-0 flex-col items-center gap-3">
          <button type="button" role="radio" tabIndex={radioTabStop ? 0 : -1} aria-checked={track.isSelected} aria-label={`Select ${track.name}`} onClick={onSelect} className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border ${track.isSelected ? "border-[#534AB7] dark:border-[#AFA9EC]" : "border-hairline-strong"} ${buttonFocus}`}>
            {track.isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[#534AB7] dark:bg-[#AFA9EC]" />}
          </button>
          <button type="button" aria-label={`${isTrackPlaying ? "Pause" : "Play"} ${track.name}`} aria-pressed={isTrackPlaying} disabled={isTrackLoading} onClick={onPlay} className={`flex h-11 w-11 items-center justify-center rounded-full bg-indigo-700 text-white transition hover:bg-indigo-800 disabled:opacity-60 ${buttonFocus}`}>
            {isTrackLoading ? <Loader2 size={18} className="animate-spin" /> : isTrackPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-1.5">
            {editing ? (
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); saveName(); }
                if (event.key === "Escape") { setName(track.name); setEditing(false); }
              }} aria-label={`Rename ${track.name}`} className={`h-8 min-w-0 flex-1 rounded-md border border-hairline-strong bg-surface px-2 text-sm text-heading ${buttonFocus}`} />
            ) : <span className="truncate text-sm font-semibold text-heading">{track.name}</span>}
            {editing ? (
              <button type="button" aria-label="Save voice name" disabled={!name.trim()} onClick={saveName} className={`flex h-8 w-8 items-center justify-center rounded-full text-[#534AB7] dark:text-[#AFA9EC] ${buttonFocus}`}><Check size={17} /></button>
            ) : (
              <button type="button" aria-label={`Rename ${track.name}`} onClick={() => setEditing(true)} className={`flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-heading ${buttonFocus}`}><Pencil size={15} /></button>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{formatTime(track.durationSec)} · <span className={track.isSelected ? "font-medium text-indigo-600 dark:text-[#AFA9EC]" : "text-slate-500 dark:text-slate-400"}>{track.isSelected ? "In use" : "Background voice"}</span></p>
          <button type="button" onClick={() => onPreview(volume)} aria-pressed={isPreviewPlaying} disabled={isPreviewLoading} className={`mt-3 inline-flex h-8 max-w-full items-center gap-2 rounded-full border px-3 text-xs font-semibold disabled:opacity-50 ${isPreviewPlaying ? "border-indigo-700 bg-indigo-700 text-white hover:bg-indigo-800 dark:border-[#AFA9EC] dark:bg-[#AFA9EC] dark:text-[#26215C] dark:hover:bg-[#9b95d9]" : "border-indigo-600 bg-white text-indigo-700 hover:bg-indigo-50 dark:border-[#AFA9EC] dark:bg-[#26215C] dark:text-[#AFA9EC] dark:hover:bg-[#26215C]"} ${buttonFocus}`}>
            {isPreviewLoading ? <Loader2 size={14} className="shrink-0 animate-spin" /> : isPreviewPlaying ? <X size={14} className="shrink-0" /> : <Mic size={14} className="shrink-0" />}
            <span className="truncate">{isPreviewPlaying ? "Stop preview" : "Play with voice"}</span>
          </button>
          {isPreviewPlaying && <div className="mt-1 min-w-0">
            <div className="h-1 overflow-hidden rounded-full bg-[#EEEDFE] dark:bg-[#26215C]"><div className="h-full bg-[#534AB7] transition-[width] dark:bg-[#AFA9EC]" style={{ width: `${progress}%` }} /></div>
            <p className="mt-1 truncate text-xs text-muted">Agent voice + {track.name} at {volume.toFixed(1)} · {formatTime(elapsed)}</p>
          </div>}
        </div>
        <div className="mr-4 flex shrink-0 flex-col items-center">
          <VolumeDial value={volume} label={`Playback volume for ${track.name}`} onChange={changeVolume} />
          <span className="-mt-1 text-[11px] text-slate-500 dark:text-slate-400">Volume</span>
        </div>
      </div>
      <button type="button" aria-label={`Delete ${track.name}`} onClick={onDelete} className={`absolute right-2.5 top-2.5 rounded p-1.5 text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 ${buttonFocus}`}><Trash2 size={20} /></button>
    </li>
  );
}

export function DeleteVoiceDialog({ voice, loading, onCancel, onConfirm }: {
  voice: string | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!voice) return null;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-label="Delete this voice?">
    <div className="w-full max-w-sm rounded-xl border border-hairline bg-surface p-5 text-heading">
      <h3 className="text-base font-semibold">Delete this voice?</h3>
      <p className="mt-2 text-sm text-muted">“{voice}” will be permanently deleted.</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" disabled={loading} onClick={onCancel} className="h-9 rounded-full border border-hairline-strong px-4 text-sm font-medium">Cancel</button>
        <button type="button" disabled={loading} onClick={onConfirm} className="inline-flex h-9 items-center gap-2 rounded-full border border-loss px-4 text-sm font-semibold text-loss disabled:opacity-60">{loading && <Loader2 size={14} className="animate-spin" />}Delete</button>
      </div>
    </div>
  </div>;
}

export function BackgroundVoiceList({ tracks, loading, loadingTrackId, playingTrackId, preview, onSelect, onPlay, onRename, onVolume, onDelete, onStopAudio }: {
  tracks: Track[];
  loading: boolean;
  loadingTrackId: string | null;
  playingTrackId: string | null;
  preview: ReturnType<typeof useBackgroundPreview>;
  onSelect: (track: Track) => void;
  onPlay: (track: Track) => void;
  onRename: (track: Track, name: string) => Promise<void>;
  onVolume: (track: Track, volume: number) => Promise<void>;
  onDelete: (track: Track) => void;
  onStopAudio: () => void;
}) {
  return <>
    <header className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-heading">Your background voices</h2>
      <span className="text-sm text-muted">{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</span>
    </header>
    {loading ? <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">{[0, 1].map((item) => <li key={item} className="min-w-0 rounded-xl border border-hairline p-3">
      <div className="flex items-center gap-3">
        <span className="h-[22px] w-[22px] shrink-0 animate-pulse rounded-full bg-raised" />
        <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-raised" />
        <div className="min-w-0 flex-1 space-y-2"><span className="block h-4 w-2/3 animate-pulse rounded bg-raised" /><span className="block h-3 w-1/3 animate-pulse rounded bg-raised" /></div>
        <span className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-raised" />
        <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-raised" />
      </div>
    </li>)}</ul> : tracks.length ? (
      <ul role="radiogroup" aria-label="Your background voices" className="grid max-h-[420px] grid-cols-1 gap-4 overflow-y-auto overscroll-contain pr-2 md:grid-cols-2" onKeyDown={(event) => {
        if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
        const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]"));
        const current = radios.indexOf(event.target as HTMLButtonElement);
        if (current < 0 || radios.length < 2) return;
        event.preventDefault();
        const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
        const next = radios[(current + (forward ? 1 : -1) + radios.length) % radios.length];
        next.focus();
        next.click();
      }}>
        {tracks.map((track, index) => <BackgroundVoiceCard key={track.id} track={track} radioTabStop={track.isSelected || (!tracks.some((item) => item.isSelected) && index === 0)} isTrackPlaying={playingTrackId === track.id} isTrackLoading={loadingTrackId === track.id} isPreviewPlaying={preview.playingTrackId === track.id} isPreviewLoading={preview.loadingTrackId === track.id} elapsed={preview.elapsed} previewDuration={preview.duration} onSelect={() => onSelect(track)} onPlay={() => onPlay(track)} onPreview={(volume) => { onStopAudio(); void preview.play(track, volume); }} onPreviewVolume={(volume) => { if (preview.playingTrackId === track.id) preview.setVolume(volume); }} onRename={(name) => onRename(track, name)} onVolume={(volume) => onVolume(track, volume)} onDelete={() => onDelete(track)} />)}
      </ul>
    ) : <p className="rounded-xl border border-dashed border-hairline px-4 py-8 text-center text-sm text-muted">No background voices yet. Upload an audio file to add one.</p>}
  </>;
}

export default function BackgroundAudioPreview({ agentId, speaker, language, text }: {
  agentId?: string;
  speaker?: string;
  language?: string;
  text?: string;
}) {
  const queryClient = useQueryClient();
  const settingsKey = ["background-audio", "settings", agentId ?? null];
  const libraryKey = ["background-audio", "library"];
  const settings = useQuery({
    queryKey: settingsKey,
    queryFn: async () => {
      try {
        return { ...await getBackgroundAudioSettings(agentId), exists: true };
      } catch (error) {
        if (isNotFoundError(error)) return { enabled: false, volume: 1, source: "", active_id: null, active_name: null, updated_at: null, preview_url: null, exists: false };
        throw error;
      }
    },
    retry: false,
  });
  const tracksQuery = useQuery({
    queryKey: libraryKey,
    queryFn: async () => {
      try {
        return await listBackgroundAudios();
      } catch (error) {
        if (isNotFoundError(error)) return [];
        throw error;
      }
    },
    retry: false,
  });
  const tracks = tracksQuery.data ?? [];
  const [selectedTrackOverride, setSelectedTrackOverride] = useState<string | null>(null);
  const selectedId = selectedTrackOverride ?? settings.data?.active_id ?? tracks.find((track) => track.active)?.id ?? null;
  const preview = useBackgroundPreview({ agentId, speaker, language, text });

  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(1);
  const [newName, setNewName] = useState("");
  const [newVolume, setNewVolume] = useState(1.4);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingPlayId, setLoadingPlayId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [deletingTrack, setDeletingTrack] = useState<BackgroundAudio | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerUrlRef = useRef<string | null>(null);
  const audioRequestRef = useRef(0);

  useEffect(() => {
    if (!settings.data) return;
    setEnabled(settings.data.enabled);
    setVolume(Math.min(5, Math.max(0, settings.data.volume)));
  }, [settings.data]);
  useEffect(() => {
    if (playerUrl && audioRef.current) {
      audioRef.current.src = playerUrl;
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => setPlayingId(null));
    }
  }, [playerUrl]);
  useEffect(() => () => {
    audioRef.current?.pause();
    if (playerUrlRef.current) URL.revokeObjectURL(playerUrlRef.current);
  }, []);

  const refreshTracks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: libraryKey }),
      queryClient.invalidateQueries({ queryKey: ["background-audio", "settings"] }),
    ]);
  };
  const setCallSettings = useMutation({
    mutationFn: ({ body, create }: { body: { enabled: boolean; volume: number; agent_id?: string }; create: boolean }) =>
      create ? postBackgroundAudioSettings(body) : updateBackgroundAudioSettings(body),
    onSuccess: (result) => {
      setEnabled(result.enabled);
      queryClient.setQueryData(settingsKey, { ...result, exists: true });
    },
    onError: (error) => {
      setEnabled(settings.data?.enabled ?? false);
      showErrorNotification(errorMessage(error), { title: "Background audio settings failed" });
    },
  });
  const addTrack = useMutation({
    mutationFn: createBackgroundAudio,
    onSuccess: async () => {
      setNewName("");
      setNewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshTracks();
    },
    onError: (error) => showErrorNotification(errorMessage(error), { title: "Track upload failed" }),
  });
  const patchTrack = useMutation({
    mutationFn: ({ id, body }: { id: string; body: FormData }) => updateBackgroundAudio(id, body),
    onSuccess: refreshTracks,
    onError: (error) => showErrorNotification(errorMessage(error), { title: "Track update failed" }),
  });
  const deleteTrack = useMutation({
    mutationFn: deleteBackgroundAudio,
    onSuccess: async (_result, deletedId) => {
      const remaining = (await listBackgroundAudios()).filter((track) => track.id !== deletedId);
      queryClient.setQueryData(libraryKey, remaining);
      if (deletedId === selectedId && remaining[0]) {
        setSelectedTrackOverride(remaining[0].id);
        const body = new FormData();
        body.set("active", "true");
        await updateBackgroundAudio(remaining[0].id, body);
      } else if (deletedId === selectedId) {
        setSelectedTrackOverride(null);
      }
      await refreshTracks();
      setDeletingTrack(null);
    },
    onError: (error) => showErrorNotification(errorMessage(error), { title: "Track deletion failed" }),
  });
  const replacePlayerSource = (blob: Blob, id: string, trackVolume = 5) => {
    if (playerUrlRef.current) URL.revokeObjectURL(playerUrlRef.current);
    const nextUrl = URL.createObjectURL(blob);
    playerUrlRef.current = nextUrl;
    setPlayingId(id);
    setPlayerUrl(nextUrl);
    if (audioRef.current) audioRef.current.volume = Math.min(1, Math.max(0, trackVolume / 5));
  };
  const playTrack = async (track: BackgroundAudio) => {
    preview.stop();
    const requestId = ++audioRequestRef.current;
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    setPreviewError(null);
    setLoadingPlayId(track.id);
    audioRef.current?.pause();
    setPlayingId(null);
    try {
      const [latestTrack, audio] = await Promise.all([
        getBackgroundAudio(track.id),
        getBackgroundAudioFile(track.id),
      ]);
      if (requestId !== audioRequestRef.current) return;
      replacePlayerSource(audio, track.id, latestTrack.volume);
    } catch (error) {
      if (requestId === audioRequestRef.current) {
        setPreviewError(errorMessage(error));
        showErrorNotification(errorMessage(error), { title: "Audio preview failed" });
      }
    } finally {
      if (requestId === audioRequestRef.current) setLoadingPlayId(null);
    }
  };
  const selectTrack = (track: BackgroundAudio) => {
    const previousId = selectedId;
    setSelectedTrackOverride(track.id);
    const body = new FormData();
    body.set("active", "true");
    patchTrack.mutate({ id: track.id, body }, {
      onError: () => setSelectedTrackOverride((current) => current === track.id ? previousId : current),
    });
  };
  const renameTrack = async (track: BackgroundAudio, name: string) => {
    const body = new FormData();
    body.set("name", name);
    await patchTrack.mutateAsync({ id: track.id, body });
  };
  const updateTrackVolume = async (track: BackgroundAudio, trackVolume: number) => {
    if (trackVolume === track.volume) return;
    const body = new FormData();
    body.set("volume", String(trackVolume));
    await patchTrack.mutateAsync({ id: track.id, body });
  };
  const removeTrack = (track: BackgroundAudio) => setDeletingTrack(track);
  const confirmRemoveTrack = () => {
    if (!deletingTrack) return;
    if (playingId === deletingTrack.id) audioRef.current?.pause();
    if (preview.playingTrackId === deletingTrack.id) preview.stop();
    deleteTrack.mutate(deletingTrack.id);
  };
  const createTrack = () => {
    if (!newName.trim() || !newFile) return;
    const body = new FormData();
    body.set("name", newName.trim());
    body.set("volume", String(newVolume));
    body.set("file", newFile);
    addTrack.mutate(body);
  };
  const chooseFile = (file?: File | null) => {
    if (file) setNewFile(file);
  };
  const toggleCalls = (nextEnabled: boolean) => {
    setEnabled(nextEnabled);
    setCallSettings.mutate({ body: { enabled: nextEnabled, volume, agent_id: agentId }, create: settings.data?.exists !== true });
  };


  return (
    <div className="flex min-w-0 flex-col gap-4 font-sans text-body">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-heading">Background audio</h2>
            <p className="mt-0.5 text-sm text-muted">Add a soft sound behind your agent&apos;s voice during calls.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-raised px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-heading">Play during calls</p>
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${enabled ? "bg-gain-bg text-gain" : "bg-chip text-muted"}`}>
              Currently {enabled ? "on" : "off"}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Play background audio during calls"
            disabled={settings.isLoading || setCallSettings.isPending}
            onClick={() => toggleCalls(!enabled)}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-wait disabled:opacity-60 ${enabled ? "bg-primary" : "bg-hairline-strong"} ${buttonFocus}`}
          >
            <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-surface shadow-sm transition-transform duration-200 ${enabled ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
      </header>

      {(settings.error || tracksQuery.error || setCallSettings.error || addTrack.error || patchTrack.error || deleteTrack.error || previewError) && (
        <div className="space-y-2">
          {settings.error && <ErrorBanner message={errorMessage(settings.error)} />}
          {tracksQuery.error && <ErrorBanner message={errorMessage(tracksQuery.error)} />}
          {setCallSettings.error && <ErrorBanner message={errorMessage(setCallSettings.error)} />}
          {addTrack.error && <ErrorBanner message={errorMessage(addTrack.error)} />}
          {patchTrack.error && <ErrorBanner message={errorMessage(patchTrack.error)} />}
          {deleteTrack.error && <ErrorBanner message={errorMessage(deleteTrack.error)} />}
          {previewError && <ErrorBanner message={previewError} />}
        </div>
      )}

      <section className="order-2 rounded-lg border border-hairline bg-surface p-5 shadow-sm">
        <BackgroundVoiceList
          tracks={tracks.map((track) => ({ id: track.id, name: track.name, durationSec: track.duration_seconds, volume: track.volume, isSelected: track.id === selectedId }))}
          loading={tracksQuery.isLoading}
          loadingTrackId={loadingPlayId}
          playingTrackId={playingId}
          preview={preview}
          onSelect={(track) => { const source = tracks.find((item) => item.id === track.id); if (source) selectTrack(source); }}
          onPlay={(track) => { const source = tracks.find((item) => item.id === track.id); if (source) void playTrack(source); }}
          onRename={(track, name) => { const source = tracks.find((item) => item.id === track.id); return source ? renameTrack(source, name) : Promise.resolve(); }}
          onVolume={(track, nextVolume) => { const source = tracks.find((item) => item.id === track.id); return source ? updateTrackVolume(source, nextVolume) : Promise.resolve(); }}
          onDelete={(track) => { const source = tracks.find((item) => item.id === track.id); if (source) removeTrack(source); }}
          onStopAudio={() => { audioRequestRef.current += 1; audioRef.current?.pause(); setPlayingId(null); setLoadingPlayId(null); }}
        />
      </section>
      <DeleteVoiceDialog voice={deletingTrack?.name ?? null} loading={deleteTrack.isPending} onCancel={() => setDeletingTrack(null)} onConfirm={confirmRemoveTrack} />

      <section className="order-1 rounded-lg border border-hairline bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold text-heading">Add a new background voice</h2>
          <p className="mt-1 text-sm leading-5 text-muted">Upload a sound, name it, and set how loud it plays. You can change both later.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="background-track-name" className="mb-2 block text-sm font-semibold text-heading">Background voice name</label>
              <input id="background-track-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g. Calm office" maxLength={100} className={`h-10 w-full rounded-md border border-hairline-strong bg-surface px-3 text-sm text-heading placeholder:text-faint ${buttonFocus}`} />
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="new-audio-volume" className="text-sm font-semibold text-heading">Playback volume</label>
                <span className="text-xs text-muted">/ 5</span>
              </div>
              <div className="flex h-10 items-center gap-3 rounded-md border border-hairline-strong bg-surface px-3">
                <input id="new-audio-volume" type="range" min="0" max="5" step="0.1" value={newVolume} aria-label="New track playback volume" onChange={(event) => setNewVolume(Number(event.target.value))} className="h-2 min-w-0 flex-1 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                <input type="number" min="0" max="5" step="0.1" value={newVolume} aria-label="New track playback volume numeric value" onChange={(event) => { const nextValue = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(nextValue)) setNewVolume(Math.min(5, Math.max(0, nextValue))); }} className={`h-8 w-[72px] rounded-md border border-hairline-strong bg-surface px-2 text-right text-sm tabular-nums text-heading ${buttonFocus}`} />
              </div>
            </div>

            <div className="min-w-0 md:col-span-2">
              <label htmlFor="background-audio-upload" className="mb-2 block text-sm font-semibold text-heading">Audio file</label>
              <input id="background-audio-upload" ref={fileInputRef} type="file" accept="audio/*" className="hidden" aria-label="Choose an audio file" onChange={(event) => setNewFile(event.target.files?.[0] ?? null)} />
              <label
                htmlFor="background-audio-upload"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
                onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}
                className={`flex min-h-24 min-w-0 cursor-pointer items-center gap-3 rounded-md border-2 border-dashed px-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${dragging ? "border-primary bg-primary-soft" : "border-info-border bg-info-surface hover:bg-primary-soft"}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-info"><Music size={20} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  {newFile ? (
                    <>
                      <span className="block truncate text-sm font-semibold text-heading">{newFile.name}</span>
                      <span className="mt-1 block text-xs text-muted">{newFile.name.split(".").pop()?.toUpperCase()} · ready to add</span>
                    </>
                  ) : (
                    <>
                      <span className="block text-sm font-semibold text-heading">Drag and drop an audio file here</span>
                      <span className="mt-1 block text-xs text-muted">Or click anywhere in this area to choose a file.</span>
                    </>
                  )}
                </span>
                <span className="inline-flex h-9 shrink-0 items-center rounded-md border border-hairline-strong bg-surface px-3 text-xs font-semibold text-info">{newFile ? "Change file" : "Browse files"}</span>
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
          <button type="button" onClick={createTrack} disabled={!newName.trim() || !newFile || addTrack.isPending} className={primaryButton}>
            {addTrack.isPending ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" /> : <Plus size={19} aria-hidden />}
            {addTrack.isPending ? "Adding track…" : "Add track"}
          </button>
          </div>
        </section>

      <audio
        ref={audioRef}
        className="sr-only"
        onEnded={() => setPlayingId(null)}
        onPause={() => setPlayingId(null)}
      />
    </div>
  );
}
