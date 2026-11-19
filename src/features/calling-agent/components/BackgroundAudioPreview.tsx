"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Music, Pause, Pencil, Play, Plus, Trash2, X } from "lucide-react";

import {
  createBackgroundAudio,
  deleteBackgroundAudio,
  getBackgroundAudioFile,
  getBackgroundAudioSettings,
  listBackgroundAudios,
  postBackgroundAudioSettings,
  updateBackgroundAudio,
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

function TrackRow({
  track,
  selected,
  playing,
  loading,
  disabled,
  onPlay,
  onSelect,
  onVolumeChange,
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
  onVolumeChange: (volume: number) => void;
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
      <div className="mt-3 flex items-center gap-3 border-t border-hairline pt-3">
        <label htmlFor={`track-playback-volume-${track.id}`} className="shrink-0 text-xs font-semibold text-muted">Playback volume</label>
        <input
          id={`track-playback-volume-${track.id}`}
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={volume}
          aria-label={`Playback volume for ${track.name}`}
          onChange={(event) => setVolume(Number(event.target.value))}
          onPointerUp={(event) => onVolumeChange(Number(event.currentTarget.value))}
          onKeyUp={(event) => onVolumeChange(Number(event.currentTarget.value))}
          className="h-2 min-w-0 flex-1 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <span className="w-14 text-right text-xs tabular-nums text-muted">{volume.toFixed(1)} / 5</span>
      </div>
      {editing && (
        <div className="mt-4 grid gap-3 border-t border-hairline pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)_auto] sm:items-end">
          <div>
            <label htmlFor={`track-volume-${track.id}`} className="mb-1 block text-xs font-semibold text-muted">Playback volume</label>
            <div className="flex items-center gap-3">
              <input id={`track-volume-${track.id}`} type="range" min="0" max="5" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="h-2 min-w-0 flex-1 accent-primary" />
              <input type="number" min="0" max="5" step="0.1" value={volume} aria-label={`Playback volume for ${track.name}`} onChange={(event) => { const nextValue = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(nextValue)) setVolume(Math.min(5, Math.max(0, nextValue))); }} className={`h-9 w-[72px] rounded-md border border-hairline-strong bg-surface px-2 text-right text-sm tabular-nums text-heading ${buttonFocus}`} />
            </div>
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

  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(1);
  const [newName, setNewName] = useState("");
  const [newVolume, setNewVolume] = useState(1.4);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingPlayId, setLoadingPlayId] = useState<string | null>(null);
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
  const updateTrackVolume = (track: BackgroundAudio, trackVolume: number) => {
    if (trackVolume === track.volume) return;
    const body = new FormData();
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

      {(settings.error || tracksQuery.error || setCallSettings.error || addTrack.error || patchTrack.error || deleteTrack.error) && (
        <div className="space-y-2">
          {settings.error && <ErrorBanner message={errorMessage(settings.error)} />}
          {tracksQuery.error && <ErrorBanner message={errorMessage(tracksQuery.error)} />}
          {setCallSettings.error && <ErrorBanner message={errorMessage(setCallSettings.error)} />}
          {addTrack.error && <ErrorBanner message={errorMessage(addTrack.error)} />}
          {patchTrack.error && <ErrorBanner message={errorMessage(patchTrack.error)} />}
          {deleteTrack.error && <ErrorBanner message={errorMessage(deleteTrack.error)} />}
        </div>
      )}

      <section className="order-2 rounded-lg border border-hairline bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-heading">Your Background voices</h2>
            <p className="mt-0.5 text-sm text-muted">Choose a background voice and set its playback volume.</p>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
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
                onVolumeChange={(nextVolume) => updateTrackVolume(track, nextVolume)}
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
            <p className="mt-1 text-sm text-muted">Add your first background sound using the form above.</p>
          </div>
        )}
      </section>

      <section className="order-1 rounded-lg border border-hairline bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold text-heading">Add a new Background voice</h2>
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
