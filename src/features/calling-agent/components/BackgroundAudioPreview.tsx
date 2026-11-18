"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Music, Pause, Pencil, Play, Plus, Mic, Trash2, Volume2, X } from "lucide-react";

import {
  createBackgroundAudio,
  deleteBackgroundAudio,
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
import { confirmDialog } from "@/components/ConfirmDialog";
import { showErrorNotification } from "@/hooks/useNotification";

const isNotFoundError = (error: unknown) =>
  Boolean(error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 404);

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

const buttonFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const primaryButton = `inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45 ${buttonFocus}`;
const outlineButton = `inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-surface px-4 text-sm font-semibold text-info transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50 ${buttonFocus}`;

function RangeControl({
  id,
  value,
  onChange,
  onCommit,
  label,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-heading">
          <Volume2 size={17} className="text-muted" aria-hidden />
          {label}
        </label>
        <span className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-info">{value.toFixed(1)} / 5</span>
      </div>
      <input
        id={id}
        type="range"
        min="0"
        max="5"
        step="0.1"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={(event) => onCommit?.(Number(event.currentTarget.value))}
        onKeyUp={(event) => onCommit?.(Number(event.currentTarget.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      <div className="mt-1 flex justify-between text-xs text-muted"><span>Subtle</span><span>Loud</span></div>
    </div>
  );
}

function TrackRow({
  track,
  selected,
  playing,
  loading,
  disabled,
  onPlay,
  onSelect,
  onRename,
  onDelete,
}: {
  track: BackgroundAudio;
  selected: boolean;
  playing: boolean;
  loading: boolean;
  disabled: boolean;
  onPlay: () => void;
  onSelect: () => void;
  onRename: (name: string, volume: number) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(track.name);
  const [volume, setVolume] = useState(track.volume);

  useEffect(() => {
    setName(track.name);
    setVolume(track.volume);
  }, [track.name, track.volume]);

  return (
    <li className={`rounded-lg border p-3 transition-colors ${selected ? "border-primary bg-info-surface" : "border-hairline bg-surface hover:bg-surface-hover"}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label={`${playing ? "Pause" : "Play"} ${track.name}`}
          onClick={onPlay}
          disabled={disabled}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline-strong bg-surface text-info transition hover:border-primary hover:bg-primary-soft disabled:opacity-50 ${buttonFocus}`}
        >
          {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} aria-label={`Rename ${track.name}`} className={`h-10 w-full rounded-xl border border-hairline-strong bg-surface px-3 text-sm font-semibold text-heading ${buttonFocus}`} />
          ) : (
            <p className="truncate text-[15px] font-semibold text-heading">{track.name}</p>
          )}
          <p className="mt-0.5 text-[13px] text-muted">{formatTime(track.duration_seconds)} · Volume {track.volume.toFixed(1)} / 5</p>
        </div>
        {selected ? (
          <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">Selected</span>
        ) : (
          <button type="button" onClick={onSelect} className={`h-10 rounded-xl border border-primary px-3 text-sm font-semibold text-info transition hover:bg-primary-soft ${buttonFocus}`}>Use this</button>
        )}
        <button type="button" aria-label={`Rename ${track.name}`} title="Rename track" onClick={() => setEditing((value) => !value)} className={`flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-surface text-muted transition hover:border-primary hover:bg-primary-soft hover:text-info ${buttonFocus}`}>
          <Pencil size={17} aria-hidden />
        </button>
        <button type="button" aria-label={`Delete ${track.name}`} title="Delete track" onClick={onDelete} className={`flex h-10 w-10 items-center justify-center rounded-xl border border-loss/30 bg-surface text-loss transition hover:bg-loss-bg ${buttonFocus}`}>
          <Trash2 size={17} aria-hidden />
        </button>
      </div>
      {editing && (
        <div className="mt-4 grid gap-3 border-t border-hairline pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)_auto] sm:items-end">
          <div>
            <label htmlFor={`track-volume-${track.id}`} className="mb-1 block text-xs font-semibold text-muted">Playback volume</label>
            <input id={`track-volume-${track.id}`} type="range" min="0" max="5" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="h-2 w-full accent-primary" />
          </div>
          <span className="text-xs text-muted">Rename the track or adjust its volume.</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => { onRename(name.trim(), volume); setEditing(false); }} disabled={!name.trim()} className={`h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50 ${buttonFocus}`}>Save</button>
            <button type="button" onClick={() => { setName(track.name); setVolume(track.volume); setEditing(false); }} aria-label="Cancel rename" className={`flex h-10 w-10 items-center justify-center rounded-xl border border-hairline-strong bg-surface text-muted ${buttonFocus}`}><X size={17} /></button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function BackgroundAudioPreview({ agentId }: { agentId?: string }) {
  const queryClient = useQueryClient();
  const settingsKey = ["background-audio", "settings", agentId ?? null];
  const libraryKey = ["background-audio", "library"];
  const settings = useQuery({
    queryKey: settingsKey,
    queryFn: async () => {
      try {
        return await getBackgroundAudioSettings(agentId);
      } catch (error) {
        if (isNotFoundError(error)) return { enabled: false, volume: 1, source: "", active_id: null, active_name: null, updated_at: null, preview_url: null };
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
  const selectedId = settings.data?.active_id ?? tracks.find((track) => track.active)?.id ?? null;
  const selectedTrack = tracks.find((track) => track.id === selectedId) ?? null;

  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(1);
  const [newName, setNewName] = useState("");
  const [newVolume, setNewVolume] = useState(1.4);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [loadingPlayId, setLoadingPlayId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerUrlRef = useRef<string | null>(null);

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
    mutationFn: postBackgroundAudioSettings,
    onSuccess: (result) => {
      setEnabled(result.enabled);
      queryClient.setQueryData(settingsKey, result);
    },
    onError: (error) => {
      setEnabled(settings.data?.enabled ?? false);
      showErrorNotification(errorMessage(error), { title: "Background audio settings failed" });
    },
  });
  const saveCallVolume = useMutation({
    mutationFn: updateBackgroundAudioSettings,
    onSuccess: (result) => queryClient.setQueryData(settingsKey, result),
    onError: (error) => showErrorNotification(errorMessage(error), { title: "Volume update failed" }),
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
    onSuccess: refreshTracks,
    onError: (error) => showErrorNotification(errorMessage(error), { title: "Track deletion failed" }),
  });
  const replacePlayerSource = (blob: Blob, id: string) => {
    if (playerUrlRef.current) URL.revokeObjectURL(playerUrlRef.current);
    const nextUrl = URL.createObjectURL(blob);
    playerUrlRef.current = nextUrl;
    setCurrentTime(0);
    setLoadedId(id);
    setPlayingId(id);
    setPlayerUrl(nextUrl);
  };
  const playTrack = async (track: BackgroundAudio) => {
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
      replacePlayerSource(await getBackgroundAudioFile(track.id), track.id);
    } catch (error) {
      setPreviewError(errorMessage(error));
      showErrorNotification(errorMessage(error), { title: "Audio preview failed" });
    } finally {
      setLoadingPlayId(null);
    }
  };
  const playVoicePreview = async () => {
    if (playingId === "voice-preview") {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    setPreviewError(null);
    setLoadingPlayId("voice-preview");
    audioRef.current?.pause();
    setPlayingId(null);
    try {
      replacePlayerSource(await getBackgroundAudioPreview(agentId), "voice-preview");
    } catch (error) {
      setPreviewError(errorMessage(error));
      showErrorNotification(errorMessage(error), { title: "Audio preview failed" });
    } finally {
      setLoadingPlayId(null);
    }
  };
  const selectTrack = (track: BackgroundAudio) => {
    const body = new FormData();
    body.set("active", "true");
    patchTrack.mutate({ id: track.id, body });
  };
  const renameTrack = (track: BackgroundAudio, name: string, trackVolume: number) => {
    const body = new FormData();
    body.set("name", name);
    body.set("volume", String(trackVolume));
    patchTrack.mutate({ id: track.id, body });
  };
  const removeTrack = async (track: BackgroundAudio) => {
    const confirmed = await confirmDialog({ title: "Delete background audio?", message: `“${track.name}” will be permanently deleted.`, confirmLabel: "Delete" });
    if (confirmed) deleteTrack.mutate(track.id);
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
    setCallSettings.mutate({ enabled: nextEnabled, volume, agent_id: agentId });
  };
  const commitVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    saveCallVolume.mutate({ enabled, volume: nextVolume, agent_id: agentId });
  };

  const selectedDuration = selectedTrack?.duration_seconds ?? 0;
  const playedRatio = loadedId === selectedTrack?.id && selectedDuration > 0 ? Math.min(1, currentTime / selectedDuration) : 0;
  const waveform = [20, 33, 25, 39, 50, 34, 45, 60, 40, 54, 30, 48, 62, 38, 51, 31, 46, 58, 35, 49, 26, 42, 55, 32, 45, 27, 39, 52, 30, 43, 56, 34];

  return (
    <div className="min-w-0 space-y-4 font-sans text-body">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-bg text-info"><Music size={20} aria-hidden /></span>
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

      {(settings.error || tracksQuery.error || setCallSettings.error || saveCallVolume.error || addTrack.error || patchTrack.error || deleteTrack.error || previewError) && (
        <div className="space-y-2">
          {settings.error && <ErrorBanner message={errorMessage(settings.error)} />}
          {tracksQuery.error && <ErrorBanner message={errorMessage(tracksQuery.error)} />}
          {setCallSettings.error && <ErrorBanner message={errorMessage(setCallSettings.error)} />}
          {saveCallVolume.error && <ErrorBanner message={errorMessage(saveCallVolume.error)} />}
          {addTrack.error && <ErrorBanner message={errorMessage(addTrack.error)} />}
          {patchTrack.error && <ErrorBanner message={errorMessage(patchTrack.error)} />}
          {deleteTrack.error && <ErrorBanner message={errorMessage(deleteTrack.error)} />}
          {previewError && <ErrorBanner message={previewError} />}
        </div>
      )}

      <section className="rounded-lg border border-hairline bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Selected track</p>
          <h3 className="mt-2 truncate text-base font-semibold text-heading">{selectedTrack?.name ?? "No audio selected"}</h3>
            </div>
            {selectedTrack && (
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${enabled ? "bg-gain-bg text-gain" : "bg-warn-bg text-warn"}`}>
                {enabled ? "Active on calls" : "Not active on calls"}
              </span>
            )}
          </div>

          {selectedTrack ? (
            <div className="mt-5 grid items-stretch gap-5 md:grid-cols-2">
              <div className="flex min-h-[120px] flex-col justify-center gap-2 rounded-lg bg-info-surface p-4">
                <div className="flex items-center gap-4">
                  <button type="button" aria-label={`${playingId === selectedTrack.id ? "Pause" : "Play"} selected track`} onClick={() => void playTrack(selectedTrack)} disabled={!!loadingPlayId} className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60 ${buttonFocus}`}>
                    {loadingPlayId === selectedTrack.id ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" /> : playingId === selectedTrack.id ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
                  </button>
                  <div className="flex h-14 min-w-0 flex-1 items-center justify-between gap-[3px]" aria-label="Audio waveform">
                    {waveform.map((height, index) => (
                      <span key={index} className="w-[5px] max-w-[3%] rounded-full" style={{ height, backgroundColor: index / waveform.length <= playedRatio ? "var(--primary)" : "var(--hairline-strong)" }} />
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-[13px] tabular-nums text-muted">
                  <span>{formatTime(loadedId === selectedTrack.id ? currentTime : 0)}</span>
                  <span>{formatTime(selectedTrack.duration_seconds)}</span>
                </div>
              </div>
              <div className="flex min-h-[160px] flex-col justify-between gap-4">
                <RangeControl id="call-audio-volume" value={volume} label="Playback volume" onChange={setVolume} onCommit={commitVolume} />
                <button type="button" onClick={() => void playVoicePreview()} disabled={Boolean(loadingPlayId)} className={`mt-auto w-full ${outlineButton}`}>
                {loadingPlayId === "voice-preview" ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" /> : <Mic size={17} aria-hidden />}
                Preview voice + background
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex min-h-[160px] flex-col items-center justify-center rounded-lg bg-info-surface px-5 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-info"><Music size={22} aria-hidden /></span>
              <p className="mt-3 text-sm font-semibold text-heading">No audio selected</p>
              <p className="mt-1 max-w-xs text-sm text-muted">Choose a track from Your tracks to hear it during calls.</p>
            </div>
          )}
      </section>

      <section className="rounded-lg border border-hairline bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-heading">Your tracks</h2>
          <span className="text-[13px] text-muted">{tracksQuery.isLoading ? "Loading…" : `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`}</span>
        </div>
        {tracks.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                selected={track.id === selectedId}
                playing={playingId === track.id}
                loading={loadingPlayId === track.id}
                disabled={Boolean(loadingPlayId)}
                onPlay={() => void playTrack(track)}
                onSelect={() => selectTrack(track)}
                onRename={(name, trackVolume) => renameTrack(track, name, trackVolume)}
                onDelete={() => void removeTrack(track)}
              />
            ))}
          </ul>
        ) : tracksQuery.isLoading ? (
          <div className="flex min-h-24 items-center justify-center text-sm text-muted">Loading your tracks…</div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-info-border bg-info-surface px-4 py-8 text-center">
            <p className="text-sm font-semibold text-heading">No tracks yet</p>
            <p className="mt-1 text-sm text-muted">Add your first background sound using the form below.</p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-hairline bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold text-heading">Add a new track</h2>
          <p className="mt-1 text-sm leading-5 text-muted">Upload a sound, name it, and set how loud it plays. You can change both later.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="background-track-name" className="mb-2 block text-sm font-semibold text-heading">Track name</label>
              <input id="background-track-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g. Calm office" maxLength={100} className={`h-10 w-full rounded-md border border-hairline-strong bg-surface px-3 text-sm text-heading placeholder:text-faint ${buttonFocus}`} />
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="new-audio-volume" className="text-sm font-semibold text-heading">Playback volume</label>
                <span className="rounded-md bg-primary-soft px-2 py-1 text-xs font-semibold tabular-nums text-info">{newVolume.toFixed(1)} / 5</span>
              </div>
              <div className="flex h-10 items-center rounded-md border border-hairline-strong bg-surface px-3">
                <input id="new-audio-volume" type="range" min="0" max="5" step="0.1" value={newVolume} aria-label="New track playback volume" onChange={(event) => setNewVolume(Number(event.target.value))} className="h-2 w-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
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
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => setPlayingId(null)}
        onPause={() => setPlayingId(null)}
      />
    </div>
  );
}
