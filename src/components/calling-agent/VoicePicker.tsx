"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, Loader2, Play, Plus, Square, UploadCloud } from "lucide-react";

import {
  createCustomVoice,
  getSpeakAudio,
  listCustomVoices,
  listVoiceCatalog,
  speakSample,
  speakWithCustomVoice,
  uploadVoiceCatalog,
} from "@/lib/callingAgentApi";
import { showSuccessNotification } from "@/hooks/useNotification";
import { Button, Drawer, ErrorBanner, ErrorState, Field, FileDrop, SearchInput, Select, Skeleton, TextInput } from "@/components/ui";

const LANGUAGES: Record<string, string> = {
  "as-IN": "Assamese",
  "bn-IN": "Bengali",
  "en-IN": "English (India)",
  "gu-IN": "Gujarati",
  "hi-IN": "Hindi",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
  "od-IN": "Odia",
  "pa-IN": "Punjabi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
};
const languageName = (code: string) => LANGUAGES[code] ?? code;

/** Name used for the greeting's {{name}} placeholder in previews */
const SAMPLE_NAME = "Rahul";
const FALLBACK_TEXT = "Hello, this is a quick sample of how I sound on a call.";
const NAME_PLACEHOLDER = /\{\{\s*@?\s*name\s*\}\}/gi;

const catalogKey = ["voice-catalog"];
const customKey = ["custom-voices"];
/** Fixed row heights (rem), so the list's height can be worked out from its rows */
const ROW_REM = 3.75;
const GROUP_REM = 2;
const MAX_LIST_REM = 28;
/** Reference clip length Sarvam's voice cloning expects */
const CLIP_MIN_SECONDS = 10;
const CLIP_MAX_SECONDS = 15;

/**
 * Choose the voice an agent speaks with: a stock Sarvam voice (previewed saying the
 * agent's greeting) or a custom voice cloned from a recording.
 */
export default function VoicePicker({
  value,
  onChange,
  greeting,
  language: agentLanguage,
  onEditGreeting,
}: {
  value: string;
  onChange: (voiceId: string) => void;
  greeting: string;
  /** The agent's main language; previews speak in it */
  language: string;
  onEditGreeting: () => void;
}) {
  const queryClient = useQueryClient();
  const catalog = useQuery({ queryKey: catalogKey, queryFn: listVoiceCatalog, retry: false });
  const custom = useQuery({ queryKey: customKey, queryFn: listCustomVoices, retry: false });
  const voices = useMemo(() => catalog.data?.voices ?? [], [catalog.data]);
  const customVoices = useMemo(() => custom.data ?? [], [custom.data]);
  const [adding, setAdding] = useState(false);

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const languages = useMemo(() => [...new Set(voices.map((v) => v.language_code))].sort(), [voices]);
  const matches = (text: string, lang: string | null | undefined) =>
    (!language || lang === language) && text.toLowerCase().includes(search.trim().toLowerCase());
  const shown = voices.filter((v) => matches(`${v.speaker} ${v.voice_id} ${v.style ?? ""}`, v.language_code));
  const shownCustom = customVoices.filter((v) => matches(`${v.name} ${v.id}`, v.language));
  const known = [...voices.map((v) => v.voice_id), ...customVoices.map((v) => v.id)];
  const selectedMissing = !!value && catalog.isSuccess && custom.isFetched && !known.includes(value);

  const previewText = (greeting.trim() ? greeting.trim().replace(NAME_PLACEHOLDER, SAMPLE_NAME) : FALLBACK_TEXT).slice(0, 1000);
  const preview = usePreview(previewText, agentLanguage);

  // Height follows the full list, not the filtered one: short lists leave no empty
  // space, and filtering never moves the page
  const rows = 1 + (selectedMissing ? 1 : 0) + customVoices.length + Math.max(voices.length, 1);
  const groups = customVoices.length ? 2 : 0;
  const listHeight = `${Math.min(MAX_LIST_REM, rows * ROW_REM + groups * GROUP_REM)}rem`;
  const filtered = !!search.trim() || !!language;

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.set("file", file);
      return uploadVoiceCatalog(form);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogKey });
      showSuccessNotification("The voice list was replaced.", { title: "Voices imported" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-heading">Voice</h2>
          <p className="mt-0.5 text-sm text-muted">The voice this agent speaks with on every call. Play one to hear your greeting.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label
            className={clsx(
              "relative inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-hairline-strong bg-surface px-3 text-sm font-medium text-heading transition-colors hover:bg-surface-hover focus-within:ring-2 focus-within:ring-accent",
              upload.isPending && "pointer-events-none opacity-60",
            )}
          >
            {upload.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <UploadCloud size={15} aria-hidden />}
            {upload.isPending ? "Importing…" : "Import voice list"}
            <input
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              disabled={upload.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
                e.target.value = "";
              }}
            />
          </label>
          <Button size="sm" className="h-9" onClick={() => setAdding(true)}>
            <Plus size={15} aria-hidden /> Add custom voice
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-raised px-3 py-2 text-sm">
        <p className="min-w-0 text-body">
          <span className="text-muted">Preview says: </span>“{previewText}”
        </p>
        <button type="button" onClick={onEditGreeting} className="shrink-0 font-medium text-accent-text hover:underline">
          {greeting.trim() ? "Edit greeting" : "Add a greeting"}
        </button>
      </div>

      {catalog.isError ? (
        <ErrorState title="Couldn't load voices" message={(catalog.error as Error).message} onRetry={() => catalog.refetch()} />
      ) : catalog.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      ) : (
        <>
          {voices.length + customVoices.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search voices…" label="Search voices" />
              <Select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
                <option value="">All languages</option>
                {languages.map((code) => (
                  <option key={code} value={code}>
                    {languageName(code)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div
            role="radiogroup"
            aria-label="Agent voice"
            style={{ height: listHeight }}
            className="relative overflow-y-auto overscroll-contain rounded-md border border-hairline"
          >
            <VoiceRow label="Default voice" detail="The system's standard voice" selected={!value} onSelect={() => onChange("")} />
            {selectedMissing && (
              <VoiceRow label={value} detail="Current voice · not in either list" selected onSelect={() => onChange(value)} />
            )}

            {customVoices.length > 0 && (
              <>
                <GroupLabel>Custom voices</GroupLabel>
                {shownCustom.map((v) => (
                  <VoiceRow
                    key={v.id}
                    playable={{ id: v.id, language: v.language, custom: true }}
                    label={v.name}
                    detail={[v.language && languageName(v.language), v.gender, "Custom"].filter(Boolean).join(" · ")}
                    selected={value === v.id}
                    onSelect={() => onChange(v.id)}
                    preview={preview}
                  />
                ))}
                {filtered && shownCustom.length === 0 && <NoMatch />}
                <GroupLabel>Stock voices</GroupLabel>
              </>
            )}

            {voices.length === 0 ? (
              <RowMessage>No stock voices yet. Import the voice list (CSV or Excel).</RowMessage>
            ) : (
              shown.map((v) => (
                <VoiceRow
                  key={v.voice_id}
                  playable={{ id: v.voice_id, language: v.language_code }}
                  label={v.speaker || v.voice_id}
                  detail={[languageName(v.language_code), v.style].filter(Boolean).join(" · ")}
                  selected={value === v.voice_id}
                  onSelect={() => onChange(v.voice_id)}
                  preview={preview}
                />
              ))
            )}
            {voices.length > 0 && shown.length === 0 && <NoMatch />}
          </div>
          <p className="text-xs text-muted">
            {voices.length} stock{customVoices.length ? ` · ${customVoices.length} custom` : ""} voices. Previews use “{SAMPLE_NAME}” in
            place of {"{{name}}"}.
            {custom.isError && " Custom voices couldn't be loaded."}
          </p>
        </>
      )}

      {adding && (
        <CustomVoiceDrawer
          text={previewText}
          defaultLanguage={agentLanguage}
          onCreated={async (id) => {
            await queryClient.invalidateQueries({ queryKey: customKey });
            if (id) onChange(id);
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="sticky top-0 z-10 flex items-center border-t border-hairline bg-raised px-3 text-xs font-semibold uppercase tracking-wide text-muted"
      style={{ height: `${GROUP_REM}rem` }}
    >
      {children}
    </p>
  );
}

function RowMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center border-t border-hairline px-4 text-center text-sm text-muted" style={{ height: `${ROW_REM}rem` }}>
      {children}
    </p>
  );
}

const NoMatch = () => <RowMessage>No voices match these filters.</RowMessage>;

/** Stock voices speak through /voices/speak, custom (cloned) ones through /voices/clone */
type Playable = { id: string; language: string | null; custom?: boolean };

function VoiceRow({
  playable,
  label,
  detail,
  selected,
  onSelect,
  preview,
}: {
  playable?: Playable;
  label: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
  preview?: ReturnType<typeof usePreview>;
}) {
  const playing = !!playable && preview?.playingId === playable.id;
  const loading = !!playable && preview?.loadingId === playable.id;

  return (
    <div
      className={clsx(
        "flex items-center gap-3 border-t border-hairline px-3 transition-colors first:border-t-0",
        selected ? "bg-accent-bg" : "hover:bg-surface-hover",
      )}
      style={{ height: `${ROW_REM}rem` }}
    >
      <label className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input type="radio" name="agent-voice" checked={selected} onChange={onSelect} className="sr-only" />
        <span
          aria-hidden
          className={clsx(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-accent bg-accent text-on-accent" : "border-hairline-strong",
          )}
        >
          {selected && <Check size={12} strokeWidth={3} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-heading">{label}</span>
          <span className="block truncate text-xs text-muted">{detail}</span>
        </span>
      </label>
      {playable && preview && (
        <button
          type="button"
          onClick={() => preview.toggle(playable)}
          disabled={!!preview.loadingId && !loading}
          aria-label={playing ? `Stop ${label}` : `Play ${label}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-heading transition-colors hover:bg-surface disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : playing ? (
            <Square size={13} fill="currentColor" aria-hidden />
          ) : (
            <Play size={15} fill="currentColor" aria-hidden />
          )}
        </button>
      )}
    </div>
  );
}

/* ------------------------------ Custom voice ------------------------------ */

/**
 * Clone a voice from a short recording. The backend speaks `text` with the new voice
 * straight away, so it can be heard before it's used.
 */
function CustomVoiceDrawer({
  text,
  defaultLanguage,
  onCreated,
  onClose,
}: {
  text: string;
  defaultLanguage: string;
  onCreated: (voiceId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState(defaultLanguage || "en-IN");
  const [gender, setGender] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const duration = useAudioDuration(file);
  const lengthOk = duration === null || (duration >= CLIP_MIN_SECONDS && duration <= CLIP_MAX_SECONDS);

  useEffect(() => {
    if (!audioUrl) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const create = useMutation({
    mutationFn: async () => {
      const result = await createCustomVoice({ file: file!, name: name.trim(), language, gender, text });
      // The X-Voice-Id header is only readable if the backend exposes it (CORS);
      // otherwise take the newest voice with this name
      const voiceId = result.voiceId ?? (await listCustomVoices()).find((v) => v.name === name.trim())?.id ?? null;
      return { ...result, voiceId };
    },
    onSuccess: async ({ voiceId, audio }) => {
      setAudioUrl(URL.createObjectURL(audio));
      await onCreated(voiceId);
      showSuccessNotification(
        voiceId ? `"${name.trim()}" is ready and selected for this agent.` : `"${name.trim()}" is ready. Pick it from the list.`,
        { title: "Custom voice created" },
      );
    },
  });

  const nameError = tried && !name.trim() ? "Give the voice a name." : null;
  const fileError = tried && !file ? "Choose a recording." : null;
  const submit = () => {
    setTried(true);
    if (name.trim() && file) create.mutate();
  };

  return (
    <Drawer
      title="Add custom voice"
      description="Clone a voice from a short recording of one person speaking."
      onClose={onClose}
      footer={
        audioUrl ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} loading={create.isPending}>
              {create.isPending ? "Creating voice…" : "Create voice"}
            </Button>
          </>
        )
      }
    >
      {audioUrl ? (
        <div className="space-y-3">
          <p className="text-sm text-body">
            <span className="font-medium text-heading">{name.trim()}</span> is ready. Here it is saying your greeting:
          </p>
          <audio controls autoPlay src={audioUrl} className="w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {create.isError && (
            <ErrorBanner
              message={
                /audio validation/i.test(create.error.message)
                  ? `Sarvam rejected this recording. Use a clear ${CLIP_MIN_SECONDS}–${CLIP_MAX_SECONDS} second clip of one person talking, with no music, background noise or silence at the start and end.`
                  : create.error.message
              }
            />
          )}
          <Field label="Voice name" required error={nameError}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Poonam" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Recording language" required>
              <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {Object.entries(LANGUAGES).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Gender">
              <Select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Not specified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </Select>
            </Field>
          </div>
          <FileDrop
            file={file}
            onChange={setFile}
            accept=".wav,.mp3,.flac,.opus,.aac"
            label="Recording"
            hint="10–15 seconds, one speaker, no background noise. WAV, MP3, FLAC, OPUS or AAC, up to 50 MB."
            error={fileError ?? (lengthOk ? null : `This clip is ${duration!.toFixed(1)} s long. Trim it to ${CLIP_MIN_SECONDS}–${CLIP_MAX_SECONDS} seconds, or Sarvam will likely reject it.`)}
            details={duration !== null ? `${duration.toFixed(1)} s long` : undefined}
          />
          <div className="rounded-md bg-raised px-3 py-2 text-sm">
            <span className="text-muted">Once created, it says: </span>
            <span className="text-body">“{text}”</span>
          </div>
        </div>
      )}
    </Drawer>
  );
}

/** Length of an audio file in seconds, or null until known (or if the browser can't read it) */
function useAudioDuration(file: File | null) {
  const [duration, setDuration] = useState<number | null>(null);
  useEffect(() => {
    setDuration(null);
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.src = url;
    return () => {
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return duration;
}

/**
 * Speaks `text` with a voice (stock or custom) on demand, in the agent's language when
 * set. Clips are kept per voice, language and text, so replaying doesn't generate (and
 * store) a new sample.
 */
function usePreview(text: string, agentLanguage: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clips = useRef(new Map<string, string>());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const cache = clips.current;
    return () => {
      audioRef.current?.pause();
      cache.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const stop = () => {
    audioRef.current?.pause();
    setPlayingId(null);
  };

  const toggle = async (voice: Playable) => {
    if (playingId === voice.id) return stop();
    stop();
    const language = agentLanguage || (voice.language && /^[a-z]{2}-[A-Z]{2}$/.test(voice.language) ? voice.language : "en-IN");
    const key = `${voice.id}|${language}|${text}`;
    let url = clips.current.get(key);
    if (!url) {
      setLoadingId(voice.id);
      try {
        const audio = voice.custom
          ? await speakWithCustomVoice({ voiceId: voice.id, text, language })
          : await getSpeakAudio(
              (await speakSample({ text, speaker: voice.id, target_language_code: language, output_audio_codec: "mp3" })).id,
            );
        url = URL.createObjectURL(audio);
        clips.current.set(key, url);
      } catch {
        return; // api() already shows the error
      } finally {
        setLoadingId(null);
      }
    }
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = url;
    audio.onended = () => setPlayingId(null);
    setPlayingId(voice.id);
    audio.play().catch(() => setPlayingId(null));
  };

  return { playingId, loadingId, toggle };
}
