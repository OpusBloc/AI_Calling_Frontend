"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, ChevronDown, Clock3, Eye, Loader2, Pause, Play, Plus, Square, Trash2, UploadCloud } from "lucide-react";

import {
  type CatalogVoice,
  deleteSpeakSample,
  deleteVoiceCatalog,
  deleteVoiceCatalogEntry,
  getSpeakAudio,
  getSpeakSample,
  listSpeakSamples,
  listVoiceCatalog,
  speakSample,
  type VoiceSample,
  type VoiceSamplesResponse,
  uploadVoiceCatalog,
} from "@/lib/callingAgentApi";
import { createVoice, deleteVoice, getVoice, listVoices, type Voice } from "@/lib/api/voices";
import { setApiRequestInUrl } from "@/lib/apiUrlState";
import { confirmDialog } from "@/components/ConfirmDialog";
import { showSuccessNotification } from "@/hooks/useNotification";
import { Button, Drawer, ErrorBanner, ErrorState, Field, FileDrop, IconButton, SearchInput, Select, Skeleton, TextInput, formatDate } from "@/components/ui";

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
const samplesKey = ["voice-samples"];
const samplesEndpoint = "/api/voices/speak?limit=500";
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
  const custom = useQuery({ queryKey: customKey, queryFn: () => listVoices({ limit: 200 }), retry: false });
  const samples = useQuery({
    queryKey: samplesKey,
    queryFn: () => listSpeakSamples({ limit: 500 }),
    retry: false,
  });
  const voices = useMemo(() => catalog.data?.voices ?? [], [catalog.data]);
  const customVoices = useMemo(() => custom.data ?? [], [custom.data]);
  const defaultVoice = useMemo(
    () => customVoices.find((voice) => voice.isDefault) ?? customVoices[0],
    [customVoices],
  );
  const defaultVoiceId = defaultVoice?.id;
  const [adding, setAdding] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [voiceDetailsId, setVoiceDetailsId] = useState<string | null>(null);
  const samplesButtonRef = useRef<HTMLDivElement>(null);
  const [visibleStockCount, setVisibleStockCount] = useState(VOICE_PAGE_SIZE);
  const stockListRef = useRef<HTMLDivElement>(null);
  const lastLoadScrollTop = useRef(0);

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [style, setStyle] = useState("");
  useEffect(() => {
    if (!value && defaultVoiceId) onChange(defaultVoiceId);
  }, [defaultVoiceId, onChange, value]);
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
  const selectedCustomVoice = customVoices.find((voice) => voice.id === value);
  const selectedCatalogVoice = voices.find((voice) => voice.voice_id === value);
  const currentVoiceName = selectedCustomVoice?.name ?? selectedCatalogVoice?.speaker ?? defaultVoice?.name;

  const removeCustomVoice = useMutation({
    mutationFn: deleteVoice,
    onSuccess: async (_result, voiceId) => {
      await queryClient.invalidateQueries({ queryKey: customKey });
      if (value === voiceId) onChange("");
      showSuccessNotification("The custom voice was deleted.", { title: "Voice deleted" });
    },
  });
  const removeWholeCatalog = useMutation({
    mutationFn: deleteVoiceCatalog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogKey });
      if (voices.some((voice) => voice.voice_id === value)) onChange("");
      showSuccessNotification("The stock voice catalog was cleared.", { title: "Catalog cleared" });
    },
  });
  const removeStockVoice = useMutation({
    mutationFn: deleteVoiceCatalogEntry,
    onSuccess: async (_result, voiceId) => {
      await queryClient.invalidateQueries({ queryKey: catalogKey });
      if (value === voiceId) onChange("");
      showSuccessNotification("The stock voice was removed from the catalog.", { title: "Voice deleted" });
    },
  });
  const confirmVoiceDelete = async (voiceName: string, isStock: boolean, voiceId: string) => {
    const confirmed = await confirmDialog({
      title: isStock ? "Remove stock voice?" : "Delete custom voice?",
      message: isStock
        ? `"${voiceName}" will be removed from the stock voice catalog.`
        : `"${voiceName}" will be permanently deleted.`,
      confirmLabel: isStock ? "Remove" : "Delete",
    });
    if (confirmed) {
      (isStock ? removeStockVoice : removeCustomVoice).mutate(voiceId);
    }
  };
  const deleteError = removeCustomVoice.error ?? removeStockVoice.error ?? removeWholeCatalog.error;

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
            The voice this agent speaks with on every call. Stock voices can be previewed; saved voices can be selected here.
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
      {deleteError && <ErrorBanner message={deleteError instanceof Error ? deleteError.message : "The voice could not be deleted."} />}
      {custom.isLoading && <p role="status" className="text-sm text-muted">Loading saved voices…</p>}
      {custom.isError && (
        <ErrorState
          title="Couldn't load saved voices"
          message={(custom.error as Error).message}
          onRetry={() => custom.refetch()}
        />
      )}
      {showSamples && (
        <VoiceSamplesDrawer
          samples={samples.data?.samples ?? []}
          isLoading={samples.isLoading}
          loadError={samples.error}
          onRetry={() => void samples.refetch()}
          selectedVoiceId={value}
          customVoices={customVoices}
          catalogVoices={voices}
          onSetDefault={onChange}
          onClose={() => {
            setShowSamples(false);
            setApiRequestInUrl(null);
            samplesButtonRef.current?.querySelector("button")?.focus();
          }}
        />
      )}
      {voiceDetailsId && (
        <VoiceDetailsDrawer
          voiceId={voiceDetailsId}
          onClose={() => {
            setVoiceDetailsId(null);
            setApiRequestInUrl(null);
          }}
        />
      )}
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
          <div className="grid min-w-0 grid-cols-1 gap-3 @md:grid-cols-2 @xl:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
            <div className="@md:col-span-2 @xl:col-span-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Search voices…" label="Search voices" />
            </div>
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
            <div ref={samplesButtonRef} className="w-full @md:col-span-2 @xl:col-span-1 @xl:w-auto">
              <Button
                size="sm"
                variant="secondary"
                className="h-10 w-full whitespace-nowrap @md:w-auto"
                onClick={() => {
                  setShowSamples(true);
                  setApiRequestInUrl({ method: "GET", endpoint: samplesEndpoint });
                }}
              >
                <Clock3 size={15} aria-hidden /> Saved samples ({samples.data?.total ?? 0})
              </Button>
            </div>
          </div>

          <div role="radiogroup" aria-label="Agent voice" className="space-y-3 rounded-lg border border-hairline bg-surface p-3">
            <div className="grid min-w-0 grid-cols-1 items-end gap-3 @md:grid-cols-[minmax(0,1fr)_5rem_10rem]">
              <VoiceCard
                label="Default voice"
                detail={
                  currentVoiceName
                    ? `Default · ${currentVoiceName}`
                    : custom.isLoading
                      ? "Loading saved voices…"
                      : "No saved default voice"
                }
                selected={!!value && known.includes(value)}
                onSelect={() => onChange(value && known.includes(value) ? value : defaultVoice?.id ?? "")}
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
                    <div key={v.id} className="relative min-w-0">
                      <VoiceCard
                        label={v.name}
                        detail={[v.language && languageName(v.language), v.gender, "Custom"].filter(Boolean).join(" · ")}
                        selected={value === v.id}
                        onSelect={() => onChange(v.id)}
                        className="pr-20"
                      />
                      <IconButton
                        label={`Delete custom voice ${v.name}`}
                        tone="danger"
                        disabled={removeCustomVoice.isPending || removeStockVoice.isPending || removeWholeCatalog.isPending}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => void confirmVoiceDelete(v.name, false, v.id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                      <IconButton
                        label={`View details for ${v.name}`}
                        className="absolute right-12 top-1/2 -translate-y-1/2"
                        onClick={() => {
                          setVoiceDetailsId(v.id);
                          setApiRequestInUrl({
                            method: "GET",
                            endpoint: `/api/voices/${encodeURIComponent(v.id)}`,
                          });
                        }}
                      >
                        <Eye size={16} />
                      </IconButton>
                    </div>
                  ))}
                  {filtered && shownCustom.length === 0 && <NoMatch />}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Stock voices</p>
                {voices.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-amber-400 bg-amber-800 text-amber-950 hover:border-amber-500 hover:bg-amber-500"
                    disabled={removeWholeCatalog.isPending || removeStockVoice.isPending}
                    loading={removeWholeCatalog.isPending}
                    onClick={() => void (async () => {
                      const confirmed = await confirmDialog({
                        title: "Delete entire stock voice catalog?",
                        message: "All stock voices will be removed from the catalog. Custom voices will not be affected.",
                        confirmLabel: "Delete catalog",
                      });
                      if (confirmed) removeWholeCatalog.mutate();
                    })()}
                  >
                    <Trash2 size={14} aria-hidden /> Delete catalog
                  </Button>
                )}
              </div>
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
                      <div key={v.voice_id} className="relative min-w-0">
                        <VoiceCard
                          playable={{ id: v.voice_id, name: v.speaker || v.voice_id, language: v.language_code }}
                          label={v.speaker || v.voice_id}
                          detail={[languageName(v.language_code), v.style].filter(Boolean).join(" · ")}
                          selected={value === v.voice_id}
                          onSelect={() => onChange(v.voice_id)}
                          preview={preview}
                          className="pr-12"
                        />
                        <IconButton
                          label={`Remove ${v.speaker || v.voice_id} from stock catalog`}
                          tone="danger"
                          disabled={removeCustomVoice.isPending || removeStockVoice.isPending || removeWholeCatalog.isPending}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => void confirmVoiceDelete(v.speaker || v.voice_id, true, v.voice_id)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
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
          {preview.error && <ErrorBanner message={`Couldn't play voice preview: ${preview.error}`} />}
        </>
      )}

      {adding && (
        <CustomVoiceDrawer
          text={previewText}
          defaultLanguage={agentLanguage}
          onCreated={async (id) => {
            await queryClient.invalidateQueries({ queryKey: customKey });
            onChange(id);
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function VoiceDetailsDrawer({ voiceId, onClose }: { voiceId: string; onClose: () => void }) {
  const voice = useQuery({
    queryKey: ["custom-voice", voiceId],
    queryFn: () => getVoice(voiceId),
    retry: false,
  });
  const response = voice.data ?? {};
  const payload = response.data;
  const details = recordValue(payload) ? payload : response;
  const name = stringValue(details.name) ?? "Custom voice";
  const language = stringValue(details.language);
  const gender = stringValue(details.gender);
  const accent = stringValue(details.accent);
  const status = stringValue(details.status);
  const source = stringValue(details.source);
  const creator =
    stringValue(details.created_by_name) ??
    stringValue(details.created_by_email) ??
    stringValue(details.created_by);
  const createdAt = stringValue(details.created_at);
  const sampleDuration = Number(details.sample_duration_seconds);
  const referenceText = stringValue(details.reference_text);
  const previewAudioUrl = stringValue(details.preview_audio_url);
  const referenceAudioUrl = stringValue(details.reference_audio_url);
  const isFavorited = details.is_favorited === true;

  return (
    <Drawer
      title={voice.isSuccess ? name : "Custom voice details"}
      description="Voice profile and preview"
      onClose={onClose}
    >
      {voice.isLoading ? (
        <p role="status" className="text-sm text-muted">Loading voice details…</p>
      ) : voice.isError ? (
        <ErrorState
          title="Couldn't load voice details"
          message={voice.error instanceof Error ? voice.error.message : "An unexpected error occurred."}
          onRetry={() => voice.refetch()}
        />
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-hairline bg-raised p-4">
            <div className="flex flex-wrap items-center gap-2">
              {status && (
                <span
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                    status.toLowerCase() === "active" ? "bg-gain-bg text-gain" : "bg-surface text-muted",
                  )}
                >
                  {status}
                </span>
              )}
              {source && (
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium capitalize text-muted">
                  {source}
                </span>
              )}
              {isFavorited && (
                <span className="rounded-full bg-accent-bg px-2.5 py-1 text-xs font-medium text-accent-text">
                  Favorite
                </span>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
              {language && <VoiceDetail label="Language" value={languageName(language)} />}
              {gender && <VoiceDetail label="Gender" value={gender} capitalize />}
              {accent && <VoiceDetail label="Accent" value={accent} />}
              {Number.isFinite(sampleDuration) && sampleDuration > 0 && (
                <VoiceDetail label="Sample duration" value={`${sampleDuration.toFixed(1)} seconds`} />
              )}
              {creator && <VoiceDetail label="Created by" value={creator} />}
              {createdAt && <VoiceDetail label="Created" value={formatDate(createdAt)} />}
            </dl>
          </section>

          {referenceText && (
            <section className="rounded-lg border border-hairline p-4">
              <h3 className="text-sm font-medium text-heading">Reference text</h3>
              <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-body">
                {referenceText}
              </p>
            </section>
          )}

          {(previewAudioUrl || referenceAudioUrl) && (
            <section className="space-y-3 rounded-lg border border-hairline p-4">
              <h3 className="text-sm font-medium text-heading">Audio</h3>
              {previewAudioUrl && (
                <VoiceAudio label="Voice preview" src={previewAudioUrl} />
              )}
              {referenceAudioUrl && (
                <VoiceAudio label="Reference recording" src={referenceAudioUrl} />
              )}
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

function recordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function VoiceDetail({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={clsx("mt-1 break-words text-sm font-medium text-heading", capitalize && "capitalize")}>
        {value}
      </dd>
    </div>
  );
}

function SampleSpokenText({ text }: { text: string }) {
  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Text spoken</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-[1.5] text-body">{text}</p>
    </>
  );
}

function formatSampleTimestamp(value: string) {
  const parts = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("month")} ${part("day")}, ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}

function SampleDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-body">{value}</dd>
    </div>
  );
}

function VoiceAudio({ label, src }: { label: string; src: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{label}</p>
      <audio controls preload="none" className="h-10 w-full" src={src}>
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}

function VoiceSamplesDrawer({
  samples,
  isLoading,
  loadError,
  onRetry,
  selectedVoiceId,
  customVoices,
  catalogVoices,
  onSetDefault,
  onClose,
}: {
  samples: VoiceSample[];
  isLoading: boolean;
  loadError: Error | null;
  onRetry: () => void;
  selectedVoiceId: string;
  customVoices: Voice[];
  catalogVoices: CatalogVoice[];
  onSetDefault: (voiceId: string) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedSampleId, setExpandedSampleId] = useState<string | null>(null);
  const sampleDetails = useQuery({
    queryKey: ["voice-sample", expandedSampleId],
    queryFn: () => {
      if (!expandedSampleId) throw new Error("Select a sample to view its details.");
      return getSpeakSample(expandedSampleId);
    },
    enabled: expandedSampleId !== null,
    retry: false,
  });
  const [manualDefault, setManualDefault] = useState<{ voiceId: string; sampleId: string } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [loadedAudioId, setLoadedAudioId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioErrorId, setAudioErrorId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrls = useRef(new Map<string, string>());
  const audioRequest = useRef(0);
  const voiceLabel = (sample: VoiceSample) =>
    customVoices.find((voice) => voice.id === sample.speaker)?.name ??
    catalogVoices.find((voice) => voice.voice_id === sample.speaker)?.speaker ??
    sample.speaker;
  const orderedSamples = useMemo(
    () => [...samples].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [samples],
  );
  const filteredSamples = orderedSamples.filter((sample) =>
    `${sample.speaker} ${voiceLabel(sample)}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const defaultSampleId =
    manualDefault?.voiceId === selectedVoiceId && samples.some((sample) => sample.id === manualDefault.sampleId)
      ? manualDefault.sampleId
      : orderedSamples.find((sample) => sample.speaker === selectedVoiceId)?.id;
  const removeSample = useMutation({
    mutationFn: deleteSpeakSample,
    onSuccess: async (_result, sampleId) => {
      queryClient.setQueryData<VoiceSamplesResponse>(samplesKey, (current) =>
        current
          ? {
              ...current,
              total: Math.max(0, current.total - 1),
              samples: current.samples.filter((sample) => sample.id !== sampleId),
            }
          : current,
      );
      if (playingId === sampleId) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      if (loadedAudioId === sampleId) {
        audioRef.current?.removeAttribute("src");
        setLoadedAudioId(null);
        const url = audioUrls.current.get(sampleId);
        if (url) URL.revokeObjectURL(url);
        audioUrls.current.delete(sampleId);
      }
      if (expandedSampleId === sampleId) {
        setExpandedSampleId(null);
        setApiRequestInUrl({ method: "GET", endpoint: samplesEndpoint });
      }
      queryClient.removeQueries({ queryKey: ["voice-sample", sampleId] });
      setDeletingId(null);
      await queryClient.invalidateQueries({ queryKey: samplesKey });
      showSuccessNotification("The sample was deleted.", { title: "Sample deleted" });
    },
  });

  useEffect(() => {
    const audioUrlsOnUnmount = audioUrls.current;
    return () => {
      audioRequest.current += 1;
      audioRef.current?.pause();
      audioUrlsOnUnmount.forEach((url) => URL.revokeObjectURL(url));
      audioUrlsOnUnmount.clear();
    };
  }, []);

  const toggleAudio = async (sample: VoiceSample) => {
    if (playingId === sample.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    if (loadedAudioId === sample.id && audioRef.current) {
      setAudioError(null);
      setAudioErrorId(null);
      try {
        await audioRef.current.play();
        setPlayingId(sample.id);
      } catch (error) {
        setAudioError(error instanceof Error ? error.message : "The sample audio couldn't be played.");
        setAudioErrorId(sample.id);
      }
      return;
    }
    const requestId = ++audioRequest.current;
    audioRef.current?.pause();
    setPlayingId(null);
    setAudioError(null);
    setAudioErrorId(null);
    setLoadedAudioId(null);
    try {
      let url = audioUrls.current.get(sample.id);
      if (!url) {
        setLoadingAudioId(sample.id);
        const blob = await getSpeakAudio(sample.id);
        if (requestId !== audioRequest.current) return;
        url = URL.createObjectURL(blob);
        audioUrls.current.set(sample.id, url);
      }
      if (requestId !== audioRequest.current) return;
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      setLoadedAudioId(sample.id);
      audio.onended = () => {
        setPlayingId(null);
      };
      audio.onerror = () => {
        setAudioError("The sample audio couldn't be played.");
        setAudioErrorId(sample.id);
      };
      await audio.play();
      setPlayingId(sample.id);
    } catch (error) {
      if (requestId === audioRequest.current) {
        setAudioError(error instanceof Error ? error.message : "The sample audio couldn't be played.");
        setAudioErrorId(sample.id);
      }
    } finally {
      if (requestId === audioRequest.current) setLoadingAudioId(null);
    }
  };

  const selectable = (sample: VoiceSample) =>
    customVoices.some((voice) => voice.id === sample.speaker) ||
    catalogVoices.some((voice) => voice.voice_id === sample.speaker);

  const confirmDelete = (sample: VoiceSample) => {
    if (playingId === sample.id || loadingAudioId === sample.id || loadedAudioId === sample.id) {
      audioRequest.current += 1;
      audioRef.current?.pause();
      setPlayingId(null);
      setLoadingAudioId(null);
      setLoadedAudioId(null);
    }
    removeSample.mutate(sample.id);
  };

  return (
    <Drawer
      title="Saved samples"
      description="Voice samples you've generated. Play, pick, or delete them."
      onClose={onClose}
    >
      <div className="space-y-4">
        {removeSample.error && (
          <ErrorBanner message={removeSample.error instanceof Error ? removeSample.error.message : "The sample could not be deleted."} />
        )}
        <SearchInput value={search} onChange={setSearch} placeholder="Search by voice name" label="Search by voice name" />
        {isLoading ? (
          <div className="space-y-2" role="status" aria-label="Loading saved samples">
            <Skeleton className="h-24 rounded-md" />
            <Skeleton className="h-24 rounded-md" />
          </div>
        ) : loadError ? (
          <ErrorState title="Couldn't load saved samples" message={loadError.message} onRetry={onRetry} />
        ) : samples.length === 0 ? (
          <p className="rounded-md border border-hairline bg-raised p-5 text-center text-sm text-muted">
            No saved samples yet. Play a voice to create one.
          </p>
        ) : filteredSamples.length === 0 ? (
          <p className="py-5 text-center text-sm text-muted">No samples match that voice name.</p>
        ) : (
          <div className="overflow-hidden border-y-[0.5px] border-hairline">
            {filteredSamples.map((sample) => {
              const isDefault = defaultSampleId === sample.id;
              const canSelect = selectable(sample);
              return (
                <div
                  key={sample.id}
                  role="radio"
                  aria-checked={isDefault}
                  aria-disabled={!canSelect}
                  tabIndex={canSelect ? 0 : -1}
                  onClick={() => {
                    if (!canSelect) return;
                    setManualDefault({ voiceId: sample.speaker, sampleId: sample.id });
                    onSetDefault(sample.speaker);
                  }}
                  onKeyDown={(event) => {
                    if (canSelect && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      setManualDefault({ voiceId: sample.speaker, sampleId: sample.id });
                      onSetDefault(sample.speaker);
                    }
                  }}
                  className={clsx(
                    "cursor-pointer border-b-[0.5px] border-hairline transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                    isDefault ? "bg-accent-bg" : "bg-surface hover:bg-surface-hover",
                    !canSelect && "cursor-not-allowed opacity-75",
                  )}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      disabled={!canSelect}
                      aria-label="Select voice"
                      aria-pressed={isDefault}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!canSelect) return;
                        setManualDefault({ voiceId: sample.speaker, sampleId: sample.id });
                        onSetDefault(sample.speaker);
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                      className={clsx(
                        "inline-flex h-6 w-6 min-h-0 min-w-0 flex-none items-center justify-center rounded-full border-2 bg-transparent p-0 text-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed",
                        isDefault ? "border-accent bg-accent text-white" : "border-hairline-strong",
                      )}
                    >
                      <Check size={14} strokeWidth={3} aria-hidden />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium leading-5 text-heading">
                          {voiceLabel(sample)}
                        </h3>
                        <span className="flex-none rounded-[6px] border-[0.5px] border-hairline-strong px-1.5 text-[11px] leading-4 text-muted">
                          {sample.target_language_code}
                        </span>
                      </div>
                      <p className="mt-0.5 flex min-w-0 overflow-hidden whitespace-nowrap text-xs leading-4 text-muted">
                        <span className="flex-none">
                          {formatSampleTimestamp(sample.created_at)} ·{" "}
                        </span>
                        <span className="min-w-0 truncate">{sample.text}</span>
                      </p>
                    </div>

                    <div className="flex flex-none items-center gap-2">
                      <button
                        type="button"
                        className={clsx(
                          "group relative inline-flex h-9 w-9 min-h-0 min-w-0 flex-none items-center justify-center rounded-full border p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-wait disabled:opacity-70",
                          playingId === sample.id
                            ? "border-accent bg-accent text-white"
                            : "border-hairline-strong bg-surface text-heading hover:border-accent hover:bg-accent-bg",
                        )}
                        aria-label={playingId === sample.id ? "Pause sample" : "Play sample"}
                        aria-pressed={playingId === sample.id}
                        aria-busy={loadingAudioId === sample.id}
                        disabled={loadingAudioId === sample.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleAudio(sample);
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {playingId === sample.id && (
                          <span
                            aria-hidden
                            className="absolute inset-0 rounded-full bg-accent opacity-20 animate-ping motion-reduce:animate-none"
                          />
                        )}
                        {loadingAudioId === sample.id ? (
                          <Loader2 size={16} className="relative animate-spin" aria-hidden />
                        ) : playingId === sample.id ? (
                          <Pause size={16} className="relative" fill="currentColor" aria-hidden />
                        ) : (
                          <Play size={16} className="relative ml-0.5" fill="currentColor" aria-hidden />
                        )}
                      </button>

                      <button
                        type="button"
                        aria-label={expandedSampleId === sample.id ? "Hide sample details" : "View sample details"}
                        aria-expanded={expandedSampleId === sample.id}
                        aria-controls={`sample-details-${sample.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          const isOpen = expandedSampleId === sample.id;
                          setExpandedSampleId(isOpen ? null : sample.id);
                          setApiRequestInUrl(
                            isOpen
                              ? { method: "GET", endpoint: samplesEndpoint }
                              : {
                                  method: "GET",
                                  endpoint: `/api/voices/speak/${encodeURIComponent(sample.id)}`,
                                },
                          );
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="inline-flex h-8 min-h-0 w-auto min-w-0 flex-none items-center justify-center gap-1 rounded-lg border-0 bg-transparent px-2 py-0 text-[13px] font-medium text-accent-text transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent max-[420px]:w-8 max-[420px]:rounded-full max-[420px]:px-0"
                      >
                        <span className="max-[420px]:sr-only">Details</span>
                        <ChevronDown
                          size={14}
                          className={clsx("flex-none transition-transform", expandedSampleId === sample.id && "rotate-180")}
                          aria-hidden
                        />
                      </button>

                      <button
                        type="button"
                        aria-label="Delete sample"
                        disabled={removeSample.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletingId(deletingId === sample.id ? null : sample.id);
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="ml-1 inline-flex h-8 w-8 min-h-0 min-w-0 flex-none items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted transition-colors hover:bg-loss-bg hover:text-loss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed"
                      >
                        <Trash2 size={17} strokeWidth={1.8} aria-hidden />
                      </button>
                    </div>
                  </div>

                  {expandedSampleId === sample.id && (
                    <div
                      id={`sample-details-${sample.id}`}
                      className="pb-4 pl-[52px] pr-4 pt-0.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {sampleDetails.isLoading ? (
                        <div>
                          {sample.text && <SampleSpokenText text={sample.text} />}
                          <div className="my-3 border-t-[0.5px] border-hairline" />
                          <div className="grid grid-cols-2 gap-3" role="status" aria-label="Loading sample details">
                            <Skeleton className="h-9 rounded" />
                            <Skeleton className="h-9 rounded" />
                            <Skeleton className="h-9 rounded" />
                            <Skeleton className="h-9 rounded" />
                          </div>
                        </div>
                      ) : sampleDetails.isError ? (
                        <div>
                          {sample.text && <SampleSpokenText text={sample.text} />}
                          <div className="my-3 border-t-[0.5px] border-hairline" />
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <p role="alert" className="text-loss">
                              {sampleDetails.error instanceof Error
                                ? sampleDetails.error.message
                                : "Couldn't load sample details."}
                            </p>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void sampleDetails.refetch()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              Retry
                            </Button>
                          </div>
                        </div>
                      ) : sampleDetails.data ? (
                        <div>
                          {sample.text && <SampleSpokenText text={sample.text} />}
                          <div className="my-3 border-t-[0.5px] border-hairline" />
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                            {sampleDetails.data.model && (
                              <SampleDetail label="Model" value={sampleDetails.data.model} />
                            )}
                            {Number.isFinite(sampleDetails.data.pace) && (
                              <SampleDetail label="Pace" value={`${sampleDetails.data.pace}×`} />
                            )}
                            {(sampleDetails.data.output_audio_codec || sampleDetails.data.speech_sample_rate) && (
                              <SampleDetail
                                label="Audio format"
                                value={[
                                  sampleDetails.data.output_audio_codec?.toUpperCase(),
                                  sampleDetails.data.speech_sample_rate
                                    ? `${sampleDetails.data.speech_sample_rate.toLocaleString()} Hz`
                                    : "",
                                ].filter(Boolean).join(" · ")}
                              />
                            )}
                            {sampleDetails.data.size_bytes > 0 && (
                              <SampleDetail
                                label="File size"
                                value={`${(sampleDetails.data.size_bytes / 1024).toFixed(1)} KB`}
                              />
                            )}
                          </dl>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {audioError && audioErrorId === sample.id && (
                    <p role="alert" className="mt-2 text-xs text-loss">{audioError}</p>
                  )}
                  {deletingId === sample.id && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t-[0.5px] border-hairline px-4 py-3">
                      <span className="text-sm text-heading">Delete this sample?</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={removeSample.isPending}
                          onClick={(event) => { event.stopPropagation(); setDeletingId(null); }}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={removeSample.isPending}
                          onClick={(event) => { event.stopPropagation(); confirmDelete(sample); }}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
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

/** Stock voice previews use /voices/speak. Saved voices cannot be previewed by ID. */
type Playable = { id: string; name: string; language: string | null };

/** One voice as a card. Clicking it selects the voice and plays it (click again to stop). */
function VoiceCard({
  playable,
  label,
  detail,
  selected,
  onSelect,
  preview,
  className,
}: {
  playable?: Playable;
  label: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
  preview?: ReturnType<typeof usePreview>;
  className?: string;
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
        className,
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
  onCreated: (voiceId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState(defaultLanguage || "en-IN");
  const [gender, setGender] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [created, setCreated] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const audioElement = useRef<HTMLAudioElement>(null);
  const duration = useAudioDuration(file);
  const lengthOk = duration === null || (duration >= CLIP_MIN_SECONDS && duration <= CLIP_MAX_SECONDS);

  useEffect(() => {
    if (!audioUrl) return;
    const audioElementForUrl = audioElement.current;
    return () => {
      audioElementForUrl?.pause();
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const create = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose a reference recording.");
      return createVoice({ file, name, language, gender, text });
    },
    onSuccess: async ({ voiceId, audioBlob }) => {
      setCreated(true);
      setPreviewError(null);
      setPreviewLoading(true);
      setAudioUrl(URL.createObjectURL(audioBlob));
      await onCreated(voiceId);
      showSuccessNotification(`"${name.trim()}" is ready and selected for this agent.`, { title: "Custom voice created" });
    },
  });

  const nameError =
    tried && !name.trim()
      ? "Give the voice a name."
      : tried && name.trim().length > 100
        ? "Voice name must be 100 characters or fewer."
        : null;
  const fileError = tried && !file ? "Choose a recording." : null;
  const submit = () => {
    setTried(true);
    if (name.trim() && name.trim().length <= 100 && file && text.trim().length > 0 && text.trim().length <= 1000) {
      create.mutate();
    }
  };

  return (
    <Drawer
      title="Add custom voice"
      description="Clone a voice from a short recording of one person speaking."
      onClose={onClose}
      footer={
        created ? (
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
      {created ? (
        <div className="space-y-3">
          <p className="text-sm text-body">
            <span className="font-medium text-heading">{name.trim()}</span> is ready. Here it is saying your greeting:
          </p>
          {previewError && <ErrorBanner message={previewError} />}
          {previewLoading && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted">
              <Loader2 size={15} className="animate-spin" /> Loading preview…
            </p>
          )}
          {audioUrl ? (
            <audio
              ref={audioElement}
              controls
              autoPlay
              src={audioUrl}
              className="w-full"
              onCanPlay={() => setPreviewLoading(false)}
              onPlay={() => setPreviewError(null)}
              onEnded={() => {
                setPreviewLoading(false);
                setAudioUrl("");
              }}
              onError={() => {
                setPreviewLoading(false);
                setPreviewError("The voice was created, but its preview couldn't be played.");
                setAudioUrl("");
              }}
            />
          ) : (
            <p className="text-sm text-muted">{previewError ? "Preview unavailable." : "Preview playback finished."}</p>
          )}
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
 * Speaks "Hi, I'm {name}." followed by `text` with a stock voice, in the
 * voice's own language (falling back to the agent's). Clips are kept per voice,
 * language and text, so replaying doesn't generate (and store) a new sample.
 */
function usePreview(
  text: string,
  agentLanguage: string,
  pace: number,
  speechSampleRate: SpeechSampleRate,
) {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clips = useRef(new Map<string, string>());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    const language =
      voice.language && /^[a-z]{2}-[A-Z]{2}$/.test(voice.language) ? voice.language : agentLanguage || "en-IN";
    const spoken = `Hi, I'm ${voice.name}. ${text}`.slice(0, 1000);
    const key = `${voice.id}|${language}|${spoken}|${pace}|${speechSampleRate}`;
    let url = clips.current.get(key);
    if (!url) {
      setLoadingId(voice.id);
      try {
        const sample = await speakSample({
          text: spoken,
          speaker: voice.id,
          target_language_code: language,
          pace,
          speech_sample_rate: speechSampleRate,
          output_audio_codec: "mp3",
        });
        await queryClient.invalidateQueries({ queryKey: samplesKey });
        const audio = await getSpeakAudio(sample.id);
        url = URL.createObjectURL(audio);
        clips.current.set(key, url);
      } catch (previewError) {
        setError(previewError instanceof Error ? previewError.message : "The preview couldn't be generated.");
        return;
      } finally {
        setLoadingId(null);
      }
    }
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = url;
    audio.onended = () => setPlayingId(null);
    setPlayingId(voice.id);
    audio.play().catch((playError: unknown) => {
      setPlayingId(null);
      setError(playError instanceof Error ? playError.message : "The preview couldn't be played.");
    });
  };

  return { playingId, loadingId, error, toggle };
}