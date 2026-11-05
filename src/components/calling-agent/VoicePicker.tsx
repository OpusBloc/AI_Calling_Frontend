"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, Loader2, Play, Plus, Square, UploadCloud } from "lucide-react";

import {
  createCustomVoice,
  getDefaultVoiceConfig,
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
/** Height of the sticky group headers (rem) */
const GROUP_REM = 2;
const VOICE_PAGE_SIZE = 12;
/** Reference clip length Sarvam's voice cloning expects */
const CLIP_MIN_SECONDS = 10;
const CLIP_MAX_SECONDS = 15;
const SPEECH_SAMPLE_RATES = [8000, 16000, 22050, 24000] as const;
type SpeechSampleRate = (typeof SPEECH_SAMPLE_RATES)[number];

/**
 * Choose the voice an agent speaks with: a stock Sarvam voice (previewed saying its
 * name and the agent's greeting) or a custom voice cloned from a recording.
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
  /** The agent's main language; used when a voice has no language of its own */
  language: string;
  onEditGreeting: () => void;
}) {
  const queryClient = useQueryClient();
  const catalog = useQuery({ queryKey: catalogKey, queryFn: listVoiceCatalog, retry: false });
  const custom = useQuery({ queryKey: customKey, queryFn: listCustomVoices, retry: false });
  const defaultVoice = useQuery({
    queryKey: ["default-voice-config"],
    queryFn: getDefaultVoiceConfig,
    retry: false,
  });
  const voices = useMemo(() => catalog.data?.voices ?? [], [catalog.data]);
  const customVoices = useMemo(() => custom.data ?? [], [custom.data]);
  const [adding, setAdding] = useState(false);
  const [visibleStockCount, setVisibleStockCount] = useState(VOICE_PAGE_SIZE);
  const stockListRef = useRef<HTMLDivElement>(null);
  const lastLoadScrollTop = useRef(0);

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [style, setStyle] = useState("");
  const languages = useMemo(() => [...new Set(voices.map((v) => v.language_code))].sort(), [voices]);
  // Only styles that have at least one voice in the chosen language
  const styles = useMemo(
    () =>
      [
        ...new Set(
          voices
            .filter((v) => !language || v.language_code === language)
            .map((v) => v.style?.trim())
            .filter(Boolean) as string[],
        ),
      ].sort(),
    [voices, language],
  );
  // If the chosen style isn't available in this language any more, treat it as "All styles"
  const activeStyle = styles.includes(style) ? style : "";

  const matches = (text: string, lang: string | null | undefined, voiceStyle?: string | null) =>
    (!language || lang === language) &&
    (!activeStyle || voiceStyle?.trim() === activeStyle) &&
    text.toLowerCase().includes(search.trim().toLowerCase());

  const shown = voices.filter((v) => matches(`${v.speaker} ${v.voice_id} ${v.style ?? ""}`, v.language_code, v.style));
  // Custom voices have no style, so choosing a style hides them
  const shownCustom = customVoices.filter((v) => matches(`${v.name} ${v.id}`, v.language));
  const known = [...voices.map((v) => v.voice_id), ...customVoices.map((v) => v.id)];
  const selectedMissing = !!value && catalog.isSuccess && custom.isFetched && !known.includes(value);
  const filtered = !!search.trim() || !!language || !!activeStyle;
  const shownPage = shown.slice(0, visibleStockCount);
  const hasMoreVoices = visibleStockCount < shown.length;

  useEffect(() => {
    setVisibleStockCount(VOICE_PAGE_SIZE);
    lastLoadScrollTop.current = 0;
    stockListRef.current?.scrollTo({ top: 0 });
  }, [search, language, activeStyle, voices.length, customVoices.length]);

  const handleStockScroll = () => {
    const list = stockListRef.current;
    if (!list || !hasMoreVoices) return;

    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;
    if (nearBottom && list.scrollTop > lastLoadScrollTop.current) {
      lastLoadScrollTop.current = list.scrollTop;
      setVisibleStockCount((count) => count + VOICE_PAGE_SIZE);
    }
  };

  const previewText = (greeting.trim() ? greeting.trim().replace(NAME_PLACEHOLDER, SAMPLE_NAME) : FALLBACK_TEXT).slice(0, 1000);
  const [previewPace, setPreviewPace] = useState(1);
  const [previewSampleRate, setPreviewSampleRate] = useState<SpeechSampleRate>(24000);
  const preview = usePreview(previewText, agentLanguage, previewPace, previewSampleRate);

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
    <div className="space-y-4 @container">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-heading">Voice</h2>
          <p className="mt-0.5 text-sm text-muted">
            The voice this agent speaks with on every call. Click a voice to select it and hear it say its name and your greeting.
          </p>
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
        <div className="grid gap-2 @md:grid-cols-2 @xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : (
        <>
          {voices.length + customVoices.length > 0 && (
            <div className="grid min-w-0 grid-cols-1 gap-3 @md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search voices…" label="Search voices" />
              <Select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
                <option value="">All languages</option>
                {languages.map((code) => (
                  <option key={code} value={code}>
                    {languageName(code)}
                  </option>
                ))}
              </Select>
              <Select value={activeStyle} onChange={(e) => setStyle(e.target.value)} aria-label="Style">
                <option value="">All styles</option>
                {styles.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div role="radiogroup" aria-label="Agent voice" className="space-y-3 rounded-lg border border-hairline bg-surface p-3">
            <div className="grid min-w-0 grid-cols-1 items-end gap-3 @md:grid-cols-[minmax(0,1fr)_5rem_10rem]">
              <VoiceCard
                playable={
                  defaultVoice.data
                    ? {
                        id: defaultVoice.data.speaker,
                        name: defaultVoice.data.speaker,
                        language: defaultVoice.data.language,
                      }
                    : undefined
                }
                label="Default voice"
                detail={
                  defaultVoice.data
                    ? `System default · ${defaultVoice.data.speaker}`
                    : defaultVoice.isError
                      ? "System default voice · preview unavailable"
                      : "Loading system default…"
                }
                selected={!value}
                onSelect={() => onChange("")}
                preview={preview}
              />
              <Field label="Pace" className="w-full @md:w-20">
                <TextInput
                  type="number"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={previewPace}
                  onChange={(event) => {
                    const pace = event.target.valueAsNumber;
                    if (Number.isFinite(pace) && pace >= 0.5 && pace <= 2) setPreviewPace(pace);
                  }}
                  aria-label="Voice preview pace"
                />
              </Field>
              <Field label="Sample rate" className="w-full @md:w-40">
                <Select
                  value={previewSampleRate}
                  onChange={(event) => setPreviewSampleRate(Number(event.target.value) as SpeechSampleRate)}
                  aria-label="Stock voice preview sample rate"
                >
                  {SPEECH_SAMPLE_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate.toLocaleString()} Hz
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {selectedMissing && (
              <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @xl:grid-cols-3">
                <VoiceCard label={value} detail="Current voice · not in either list" selected onSelect={() => onChange(value)} />
              </div>
            )}

            {customVoices.length > 0 && (
              <section className="space-y-2">
                <GroupLabel>Custom voices</GroupLabel>
                <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @xl:grid-cols-3">
                  {shownCustom.map((v) => (
                    <VoiceCard
                      key={v.id}
                      playable={{ id: v.id, name: v.name, language: v.language, custom: true }}
                      label={v.name}
                      detail={[v.language && languageName(v.language), v.gender, "Custom"].filter(Boolean).join(" · ")}
                      selected={value === v.id}
                      onSelect={() => onChange(v.id)}
                      preview={preview}
                    />
                  ))}
                  {filtered && shownCustom.length === 0 && <NoMatch />}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <GroupLabel>Stock voices</GroupLabel>
              {voices.length === 0 ? (
                <RowMessage>No stock voices yet. Import the voice list (CSV or Excel).</RowMessage>
              ) : shown.length === 0 ? (
                <RowMessage>No stock voices match these filters.</RowMessage>
              ) : (
                <div
                  ref={stockListRef}
                  onScroll={handleStockScroll}
                  className="h-80 overflow-y-auto overscroll-contain rounded-md border border-hairline p-2"
                >
                  <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @xl:grid-cols-3">
                    {shownPage.map((v) => (
                      <VoiceCard
                        key={v.voice_id}
                        playable={{ id: v.voice_id, name: v.speaker || v.voice_id, language: v.language_code }}
                        label={v.speaker || v.voice_id}
                        detail={[languageName(v.language_code), v.style].filter(Boolean).join(" · ")}
                        selected={value === v.voice_id}
                        onSelect={() => onChange(v.voice_id)}
                        preview={preview}
                      />
                    ))}
                    {hasMoreVoices && (
                      <div role="status" aria-live="polite" className="col-span-full py-3 text-center text-xs text-muted">
                        Showing {shownPage.length} of {shown.length} stock voices · scroll here for more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
          <p className="flex flex-wrap justify-between gap-2 text-xs text-muted">
            <span>
              Showing {shownPage.length} of {shown.length} matching stock voices
              {customVoices.length > 0 ? ` · ${shownCustom.length} custom ${shownCustom.length === 1 ? "voice" : "voices"}` : ""}.
              {custom.isError && " Custom voices couldn't be loaded."}
            </span>
            <span>Previews use “{SAMPLE_NAME}” in place of {"{{name}}"}.</span>
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
      className="sticky top-0 z-10 col-span-full -mx-2 flex items-center bg-raised px-5 text-xs font-semibold uppercase tracking-wide text-muted"
      style={{ height: `${GROUP_REM}rem` }}
    >
      {children}
    </p>
  );
}

function RowMessage({ children }: { children: React.ReactNode }) {
  return <p className="col-span-full px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

const NoMatch = () => <RowMessage>No voices match these filters.</RowMessage>;

/** Stock voices speak through /voices/speak, custom (cloned) ones through /voices/clone */
type Playable = { id: string; name: string; language: string | null; custom?: boolean };

/** One voice as a card. Clicking it selects the voice and plays it (click again to stop). */
function VoiceCard({
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

  const activate = () => {
    onSelect();
    // Ignore the play part while another voice is still being generated
    if (playable && preview && (!preview.loadingId || loading)) preview.toggle(playable);
  };

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
      className={clsx(
        "flex min-w-0 cursor-pointer items-center gap-3 rounded-md border px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected ? "border-accent bg-accent-bg" : "border-hairline hover:bg-surface-hover",
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-accent bg-accent text-on-accent" : "border-hairline text-heading",
        )}
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : playing ? (
          <Square size={13} fill="currentColor" />
        ) : selected ? (
          <Check size={15} strokeWidth={3} />
        ) : playable ? (
          <Play size={15} fill="currentColor" />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-heading">{label}</span>
        <span className="block truncate text-xs text-muted">{detail}</span>
      </span>
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
 * Speaks "Hi, I'm {name}." followed by `text` with a voice (stock or custom), in the
 * voice's own language (falling back to the agent's). Clips are kept per voice,
 * language and text, so replaying doesn't generate (and store) a new sample.
 */
function usePreview(
  text: string,
  agentLanguage: string,
  pace: number,
  speechSampleRate: SpeechSampleRate,
) {
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
    const language =
      voice.language && /^[a-z]{2}-[A-Z]{2}$/.test(voice.language) ? voice.language : agentLanguage || "en-IN";
    const spoken = `Hi, I'm ${voice.name}. ${text}`.slice(0, 1000);
    const key = `${voice.id}|${language}|${spoken}|${pace}|${speechSampleRate}`;
    let url = clips.current.get(key);
    if (!url) {
      setLoadingId(voice.id);
      try {
        const audio = voice.custom
          ? await speakWithCustomVoice({ voiceId: voice.id, text: spoken, language })
          : await getSpeakAudio(
              (
                await speakSample({
                  text: spoken,
                  speaker: voice.id,
                  target_language_code: language,
                  pace,
                  speech_sample_rate: speechSampleRate,
                  output_audio_codec: "mp3",
                })
              ).id,
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