"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, Eye, Loader2, Pause, Play, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { ActionProgressSkeleton } from "@/components/skeletons";

import {
  deleteVoiceCatalog,
  deleteVoiceCatalogEntry,
  getSpeakAudio,
  listSpeakSamples,
  listVoiceCatalog,
  speakSample,
  uploadVoiceCatalog,
  type VoiceSample,
} from "@/lib/callingAgentApi";
import { deleteVoice, getVoice, listVoices } from "@/lib/api/voices";
import { confirmDialog } from "@/components/ConfirmDialog";
import { showSuccessNotification } from "@/hooks/useNotification";
import { Button, ErrorBanner, ErrorState, Field, SearchInput, Select, TextInput } from "@/components/ui";
import { DeleteIconButton } from "@/components/ui/ActionIconButtons";
import { SkeletonBoundary, StockVoicesSkeleton, VoiceCardsSkeleton } from "@/components/skeletons";
import { customVoicePreviewUrl } from "./VoiceDetailsDrawer";
import DrawerLoadingPlaceholder from "./DrawerLoadingPlaceholder";
import BackgroundAudioPreview from "./BackgroundAudioPreview";
import {
  FALLBACK_TEXT,
  NAME_PLACEHOLDER,
  SAMPLE_NAME,
  SPEECH_SAMPLE_RATES,
  type SpeechSampleRate,
  customVoicesKey,
  languageName,
  samplesKey,
  voiceCatalogKey,
} from "./voicePickerShared";

const CustomVoiceDrawer = dynamic(() => import("./CustomVoiceDrawer"), {
  loading: () => <DrawerLoadingPlaceholder />,
});

const VOICE_PAGE_SIZE = 24;
const SAMPLE_PAGE_SIZE = 20;

/**
 * Choose the voice an agent speaks with: a stock Sarvam voice (previewed saying its
 * name and the agent's greeting) or a custom voice cloned from a recording.
 */
/** Flow: load voice sources, filter them, and coordinate selection, previews, and drawers. */
export default function VoicePicker({
  value,
  onChange,
  agentId,
  greeting,
  language: agentLanguage,
  onEditGreeting,
}: {
  value: string;
  onChange: (voiceId: string) => void;
  agentId?: string;
  greeting: string;
  /** The agent's main language; used when a voice has no language of its own */
  language: string;
  onEditGreeting: () => void;
}) {
  const queryClient = useQueryClient();
  const [voiceSection, setVoiceSection] = useState<"imported" | "custom" | "samples" | "background">("imported");
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [style, setStyle] = useState("");
  const catalog = useQuery({ queryKey: voiceCatalogKey, queryFn: listVoiceCatalog, retry: false });
  const custom = useQuery({ queryKey: customVoicesKey, queryFn: () => listVoices({ limit: 200 }), retry: false });
  const samples = useInfiniteQuery({
    queryKey: [...samplesKey, search.trim(), language, style],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listSpeakSamples({ limit: SAMPLE_PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((total, page) => total + page.samples.length, 0);
      return lastPage.samples.length === SAMPLE_PAGE_SIZE || loaded < lastPage.total ? loaded : undefined;
    },
    retry: false,
    enabled: voiceSection === "samples",
  });
  const sampleAudio = useSavedSampleAudio();
  const { reset: resetSampleAudio } = sampleAudio;
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  useEffect(() => {
    if (voiceSection !== "samples") resetSampleAudio();
  }, [voiceSection, resetSampleAudio]);
  const sampleSentinelRef = useRef<HTMLDivElement>(null);
  const sampleListRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = samples;
  useEffect(() => {
    if (voiceSection !== "samples" || !hasNextPage || isFetchingNextPage) return;
    const sentinel = sampleSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
    }, { root: sampleListRef.current, rootMargin: "120px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [voiceSection, hasNextPage, isFetchingNextPage, fetchNextPage]);
  const voices = useMemo(() => catalog.data?.voices ?? [], [catalog.data]);
  const customVoices = useMemo(() => custom.data ?? [], [custom.data]);
  const defaultVoice = useMemo(
    () => customVoices.find((voice) => voice.isDefault) ?? customVoices[0],
    [customVoices],
  );
  const defaultVoiceId = defaultVoice?.id;
  const [adding, setAdding] = useState(false);
  const [visibleStockCount, setVisibleStockCount] = useState(VOICE_PAGE_SIZE);
  const stockListRef = useRef<HTMLDivElement>(null);
  const lastLoadScrollTop = useRef(0);

  useEffect(() => {
    if (!value && defaultVoiceId) onChange(defaultVoiceId);
  }, [defaultVoiceId, onChange, value]);
  const languages = useMemo(
    () => [...new Set([...voices.map((v) => v.language_code), ...customVoices.map((v) => v.language).filter((lang): lang is string => !!lang)])].sort(),
    [voices, customVoices],
  );
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
  const sampleVoiceName = (sample: VoiceSample) =>
    customVoices.find((voice) => voice.id === sample.speaker)?.name ??
    voices.find((voice) => voice.voice_id === sample.speaker)?.speaker ??
    sample.speaker;
  const allSamples = useMemo(() => {
    const unique = new Map<string, VoiceSample>();
    for (const sample of samples.data?.pages.flatMap((page) => page.samples) ?? []) unique.set(sample.id, sample);
    return [...unique.values()];
  }, [samples.data]);
  const selectedSample = allSamples.find((sample) => sample.id === selectedSampleId) ?? null;
  const sampleStyle = (sample: VoiceSample) =>
    voices.find((voice) => voice.voice_id === sample.speaker)?.style?.trim() ||
    (customVoices.some((voice) => voice.id === sample.speaker) ? "Custom voice" : "—");
  const shownSamples = allSamples.filter((sample) => {
    const stockVoice = voices.find((voice) => voice.voice_id === sample.speaker);
    return matches(
      `${sample.speaker} ${sampleVoiceName(sample)} ${sample.text}`,
      sample.target_language_code,
      stockVoice?.style,
    );
  });
  const known = [...voices.map((v) => v.voice_id), ...customVoices.map((v) => v.id)];
  const selectedMissing = !!value && catalog.isSuccess && custom.isFetched && !known.includes(value);
  const shownMissing = selectedMissing && matches(value, agentLanguage);
  const customVoiceCount = customVoices.length + (selectedMissing ? 1 : 0);
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
  const previewLanguage = selectedCatalogVoice?.language_code ?? selectedCustomVoice?.language ?? agentLanguage;

  const removeCustomVoice = useMutation({
    mutationFn: deleteVoice,
    onSuccess: async (_result, voiceId) => {
      await queryClient.invalidateQueries({ queryKey: customVoicesKey });
      if (value === voiceId) onChange("");
      showSuccessNotification("The custom voice was deleted.", { title: "Voice deleted" });
    },
  });
  const removeWholeCatalog = useMutation({
    mutationFn: deleteVoiceCatalog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: voiceCatalogKey });
      if (voices.some((voice) => voice.voice_id === value)) onChange("");
      showSuccessNotification("The stock voice catalog was cleared.", { title: "Catalog cleared" });
    },
  });
  const removeStockVoice = useMutation({
    mutationFn: deleteVoiceCatalogEntry,
    onSuccess: async (_result, voiceId) => {
      await queryClient.invalidateQueries({ queryKey: voiceCatalogKey });
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
  const switchVoiceSection = (section: typeof voiceSection) => {
    setVoiceSection(section);
    setSelectedSampleId(null);
    setActiveSampleId(null);
    sampleListRef.current?.scrollTo({ top: 0 });
    void queryClient.removeQueries({ queryKey: samplesKey });
  };
  const resetSamplePages = () => {
    setSelectedSampleId(null);
    setActiveSampleId(null);
    sampleListRef.current?.scrollTo({ top: 0 });
    void queryClient.removeQueries({ queryKey: samplesKey });
  };
  const deleteError = removeCustomVoice.error ?? removeStockVoice.error ?? removeWholeCatalog.error;

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.set("file", file);
      return uploadVoiceCatalog(form);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: voiceCatalogKey });
      showSuccessNotification("The voice list was replaced.", { title: "Voices imported" });
    },
  });

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-heading">Voice</h2>
          <p className="mt-0.5 text-sm text-muted">
            The voice this agent speaks with on every call. Stock voices can be previewed; saved voices can be selected here.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <label
            className={clsx(
              "relative inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-hairline-strong bg-surface px-3 text-sm font-medium text-heading transition-colors hover:bg-surface-hover focus-within:ring-2 focus-within:ring-[var(--input-glow)] sm:w-auto shadow-xl",
              upload.isPending && "pointer-events-none opacity-60",
            )}
          >
            {upload.isPending ? <ActionProgressSkeleton /> : <UploadCloud size={15} aria-hidden />}
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
          <Button 
          size="sm"
           className="blue-fields h-9 w-full sm:w-auto btn-blue"
            onClick={() => setAdding(true)}>
            <Plus size={15} aria-hidden /> Add custom voice
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-blue-50/60 px-3 py-2 text-sm dark:bg-primary-soft">
        <p className="min-w-0 text-body">
          <span className="text-blue-500 dark:text-primary-soft-text">Preview says: </span>“{previewText}”
        </p>
        <button type="button" onClick={onEditGreeting} className="shrink-0 font-medium text-[var(--input-glow)] hover:underline ">
          {greeting.trim() ? "Edit greeting" : "Add a greeting"}
        </button>
      </div>
      {deleteError && <ErrorBanner message={deleteError instanceof Error ? deleteError.message : "The voice could not be deleted."} />}
      <>
          <div 
          className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] blue-fields">
            <div 
            className="sm:col-span-3 xl:col-span-1">
              <SearchInput value={search} onChange={(next) => { setSearch(next); resetSamplePages(); }} placeholder="Search voices…" label="Search voices" />
            </div>
            <Select value={language} onChange={(e) => { setLanguage(e.target.value); resetSamplePages(); }} aria-label="Language">
              <option value="">All languages</option>
              {languages.map((code) => (
                <option key={code} value={code}>
                  {languageName(code)}
                </option>
              ))}
            </Select>
            <Select value={activeStyle} onChange={(e) => { setStyle(e.target.value); resetSamplePages(); }} aria-label="Style">
              <option value="">All styles</option>
              {styles.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>

          <div role="tablist" aria-label="Voice sources" className="flex gap-1 overflow-x-auto border-b border-hairline">
            <button type="button" role="tab" id="voice-tab-imported" aria-controls="voice-panel-imported" aria-selected={voiceSection === "imported"} onClick={() => switchVoiceSection("imported")}
              className={clsx("-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors", voiceSection === "imported" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-muted hover:text-heading")}>
              Imported voices ({voices.length})
            </button>
            <button type="button" role="tab" id="voice-tab-custom" aria-controls="voice-panel-custom" aria-selected={voiceSection === "custom"} onClick={() => switchVoiceSection("custom")}
              className={clsx("-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors", voiceSection === "custom" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-muted hover:text-heading")}>
              Custom voices ({customVoiceCount})
            </button>
            <button type="button" role="tab" id="voice-tab-background" aria-controls="voice-panel-background" aria-selected={voiceSection === "background"} onClick={() => switchVoiceSection("background")}
              className={clsx("-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors", voiceSection === "background" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-muted hover:text-heading")}>
              Background audio
            </button>
          </div>

         <div className="space-y-3 rounded-lg bg-surface p-3">
            {voiceSection !== "background" && (
            <div className="grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_5rem_10rem]">
              <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                <VoiceCard
                playable={
                  selectedCatalogVoice
                    ? {
                        id: selectedCatalogVoice.voice_id,
                        name: selectedCatalogVoice.speaker || selectedCatalogVoice.voice_id,
                        language: selectedCatalogVoice.language_code,
                      }
                    : undefined
                }
                label="Default voice"
                detail={
                  currentVoiceName
                    ? `Default · ${currentVoiceName}`
                    : custom.isLoading ? " " : "No saved default voice"
                }
                selected={!!value && known.includes(value)}
                onSelect={() => onChange(value && known.includes(value) ? value : defaultVoice?.id ?? "")}
                preview={preview}
                />
              </div>
              <Field label="Pace" className="w-full lg:w-20">
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
              <Field label="Sample rate" className="w-full lg:w-40">
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
            )}
            {voiceSection === "background" && (
              <section id="voice-panel-background" role="tabpanel" aria-labelledby="voice-tab-background">
                <BackgroundAudioPreview agentId={agentId} speaker={selectedCatalogVoice?.voice_id} language={previewLanguage} text={previewText} />
              </section>
            )}
            {voiceSection === "samples" && (
              <section id="voice-panel-samples" role="tabpanel" aria-labelledby="voice-tab-samples" aria-label="Saved samples" className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Saved samples</p>
                {samples.isError ? (
                  <ErrorState title="Couldn't load saved samples" message={(samples.error as Error).message} onRetry={() => void samples.refetch()} />
                ) : samples.isLoading ? (
                  <VoiceCardsSkeleton count={6} />
                ) : shownSamples.length === 0 && !samples.hasNextPage ? (
                  <RowMessage>{allSamples.length ? "No saved samples match these filters." : "No saved samples yet. Play a voice to create one."}</RowMessage>
                ) : (
                  <div ref={sampleListRef} className="h-80 overflow-y-auto overscroll-contain rounded-md border border-hairline p-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {shownSamples.length === 0 && <RowMessage>{allSamples.length ? "No saved samples match these filters." : "No saved samples yet. Play a voice to create one."}</RowMessage>}
                      {shownSamples.map((sample) => (
                        <SavedSampleCard
                          key={sample.id}
                          sample={sample}
                          label={sampleVoiceName(sample)}
                          selected={activeSampleId === sample.id}
                          onSelect={() => { setActiveSampleId(sample.id); onChange(sample.speaker); }}
                          onDetails={() => setSelectedSampleId(sample.id)}
                          audio={sampleAudio}
                        />
                      ))}
                      {samples.hasNextPage && <div ref={sampleSentinelRef} className="col-span-full flex min-h-8 items-center justify-center" aria-hidden="true">
                        {samples.isFetchingNextPage && <Loader2 size={18} className="animate-spin text-[var(--input-glow)]" aria-label="Loading more saved samples" />}
                      </div>}
                    </div>
                  </div>
                )}
              </section>
            )}
            {voiceSection === "custom" && <section id="voice-panel-custom" role="tabpanel" aria-labelledby="voice-tab-custom" className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Custom voices</p>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-blue-700 dark:bg-primary-soft dark:text-primary-soft-text">
                  {customVoiceCount}
                </span>
              </div>
              {custom.isError ? (
                <ErrorState title="Couldn't load saved voices" message={(custom.error as Error).message} onRetry={() => custom.refetch()} />
              ) : <div className="max-h-[260px] overflow-y-auto overscroll-contain rounded-xl border border-hairline bg-surface p-3">
                <SkeletonBoundary loading={custom.isLoading} skeleton={<VoiceCardsSkeleton count={3} />}>
                {custom.isSuccess && customVoices.length === 0 && !selectedMissing ? (
                  <RowMessage>No custom voices saved yet. Add a custom voice to view or delete it here.</RowMessage>
                ) : filtered && shownCustom.length === 0 && !shownMissing ? (
                  <NoMatch />
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {shownCustom.map((v) => (
                      <div key={v.id} className="relative min-w-0">
                        <VoiceCard
                          label={v.name}
                          detail={[v.language && languageName(v.language), v.gender, "Custom"].filter(Boolean).join(" · ")}
                          selected={value === v.id}
                          onSelect={() => onChange(v.id)}
                          className="pr-20"
                          compact
                        />
                        <CustomVoicePlayback voiceId={v.id} voiceName={v.name} />
                        <DeleteIconButton
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          disabled={removeCustomVoice.isPending || removeStockVoice.isPending || removeWholeCatalog.isPending}
                          onClick={() => void confirmVoiceDelete(v.name, false, v.id)}
                        />
                      </div>
                    ))}
                    {shownMissing && (
                      <VoiceCard
                        label={value}
                        detail="Current voice"
                        selected
                        onSelect={() => onChange(value)}
                        compact
                      />
                    )}
                  </div>
                )}
                </SkeletonBoundary>
              </div>}
            </section>}

            {voiceSection === "imported" && <section id="voice-panel-imported" role="tabpanel" aria-labelledby="voice-tab-imported" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Stock voices</p>
                <button
                  type="button"
                  aria-label="Delete Catalogs"
                  disabled={removeWholeCatalog.isPending || removeStockVoice.isPending || voices.length === 0}
                  onClick={() => void (async () => {
                    const confirmed = await confirmDialog({
                      title: "Delete entire stock voice catalog?",
                      message: "All stock voices will be removed from the catalog. Custom voices will not be affected.",
                      confirmLabel: "Delete catalog",
                    });
                    if (confirmed) removeWholeCatalog.mutate();
                  })()}
                  className="btn-red inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-on-danger)] shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} aria-hidden />
                  Delete Catalogs
                </button>
              </div>
              <SkeletonBoundary loading={catalog.isLoading} skeleton={<StockVoicesSkeleton />}>
              {catalog.isError ? (
                <ErrorState title="Couldn't load voices" message={(catalog.error as Error).message} onRetry={() => catalog.refetch()} />
              ) : voices.length === 0 ? (
                <RowMessage>No stock voices yet. Import the voice list (CSV or Excel).</RowMessage>
              ) : shown.length === 0 ? (
                <RowMessage>No stock voices match these filters.</RowMessage>
              ) : (
                <div
                  ref={stockListRef}
                  onScroll={handleStockScroll}
                  className="h-80 overflow-y-auto overscroll-contain rounded-md border border-hairline p-2"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                        <DeleteIconButton
                          disabled={removeCustomVoice.isPending || removeStockVoice.isPending || removeWholeCatalog.isPending}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => void confirmVoiceDelete(v.speaker || v.voice_id, true, v.voice_id)}
                        />
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
              </SkeletonBoundary>
            </section>}
          </div>
          {voiceSection === "imported" && <p className="flex flex-wrap justify-between gap-2 text-xs text-muted">
            <span>
              Showing {shownPage.length} of {shown.length} matching stock voices.
            </span>
            <span>Previews use “{SAMPLE_NAME}” in place of {"{{name}}"}.</span>
          </p>}
          {voiceSection === "imported" && preview.error && <ErrorBanner message={`Couldn't play voice preview: ${preview.error}`} />}
      </>

      {adding && (
        <CustomVoiceDrawer
          text={previewText}
          defaultLanguage={agentLanguage}
          onCreated={async (id) => {
            await queryClient.invalidateQueries({ queryKey: customVoicesKey });
            onChange(id);
          }}
          onClose={() => setAdding(false)}
        />
      )}
      {selectedSample && (
        <SampleDetailsDialog
          sample={selectedSample}
          voiceName={sampleVoiceName(selectedSample)}
          style={sampleStyle(selectedSample)}
          selected={value === selectedSample.speaker}
          audio={sampleAudio}
          onUseVoice={() => onChange(selectedSample.speaker)}
          onClose={() => {
            setSelectedSampleId(null);
            sampleAudio.reset();
          }}
        />
      )}
    </div>
  );
}

/** Flow: fetch and play a saved custom voice preview, with loading and error feedback. */
function CustomVoicePlayback({ voiceId, voiceName }: { voiceId: string; voiceName: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const toggle = async () => {
    setError(null);
    if (audioRef.current) {
      if (audioRef.current.paused) {
        try {
          await audioRef.current.play();
          setPlaying(true);
        } catch {
          setError("Preview could not be played.");
        }
      } else {
        audioRef.current.pause();
        setPlaying(false);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await getVoice(voiceId);
      const src = customVoicePreviewUrl(response);
      if (!src) throw new Error("No preview audio is available for this voice.");
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        setPlaying(false);
        setError("Preview audio could not be loaded.");
      };
      await audio.play();
      setPlaying(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Preview could not be played.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={`${playing ? "Pause" : "Play"} custom voice ${voiceName}`}
        title={error ?? `${playing ? "Pause" : "Play"} ${voiceName}`}
        disabled={loading}
        onClick={() => void toggle()}
        className={clsx("absolute right-12 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border bg-surface text-heading transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)] disabled:cursor-wait disabled:opacity-50", loading ? "border-[var(--input-glow)]" : "border-hairline")}
      >
        {loading ? <Loader2 size={15} className="animate-spin text-[var(--input-glow)]" aria-hidden /> : playing ? <Pause size={15} fill="currentColor" aria-hidden /> : <Play size={15} fill="currentColor" aria-hidden />}
      </button>
      {error && <span className="sr-only" role="status">{error}</span>}
    </>
  );
}

function SavedSampleCard({
  sample,
  label,
  selected,
  onSelect,
  onDetails,
  audio,
}: {
  sample: VoiceSample;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onDetails: () => void;
  audio: ReturnType<typeof useSavedSampleAudio>;
}) {
  const playing = audio.playingId === sample.id;
  const loading = audio.loadingId === sample.id;

  return (
    <VoiceCard
      label={label}
      detail={`${sample.target_language_code} · ${new Date(sample.created_at).toLocaleDateString()}`}
      subDetail={sample.text}
      selected={selected}
      onSelect={onSelect}
      actions={<>
        <button type="button" aria-label={`${playing ? "Pause" : "Play"} saved sample for ${label}`} aria-pressed={playing} aria-busy={loading} disabled={loading} title={audio.error ?? `${playing ? "Pause" : "Play"} sample`} onClick={() => void audio.toggle(sample)} className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)] disabled:cursor-wait disabled:opacity-60", loading ? "border-[var(--input-glow)] text-[var(--input-glow)]" : playing ? "border-[var(--input-glow)] bg-[var(--input-glow)] text-[var(--selected-on-primary)]" : "border-hairline text-heading hover:border-[var(--input-glow)] hover:bg-surface hover:text-[var(--input-glow)]")}>
          {loading ? <Loader2 size={15} className="animate-spin text-[var(--input-glow)]" aria-hidden /> : playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
        </button>
        <button type="button" aria-label="View details" title="View details" onClick={(event) => { event.stopPropagation(); onDetails(); }} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-muted transition-colors hover:bg-surface-hover hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)]">
          <Eye size={18} aria-hidden />
        </button>
      </>}
    />
  );
}

type SavedSampleAudio = ReturnType<typeof useSavedSampleAudio>;

function useSavedSampleAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const reset = useCallback(() => {
    requestRef.current += 1;
    const audio = audioRef.current;
    audioRef.current = null;
    audio?.pause();
    audio?.removeAttribute("src");
    audio?.load();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setSampleId(null);
    setPlayingId(null);
    setLoadingId(null);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  useEffect(() => reset, [reset]);

  const toggle = useCallback(async (sample: VoiceSample) => {
    setError(null);
    const currentAudio = audioRef.current;
    if (sampleId === sample.id && currentAudio) {
      if (currentAudio.paused) {
        try {
          await currentAudio.play();
          setPlayingId(sample.id);
        } catch {
          setError("This sample could not be played.");
        }
      } else {
        currentAudio.pause();
        setPlayingId(null);
      }
      return;
    }

    reset();
    const requestId = requestRef.current;
    setLoadingId(sample.id);
    try {
      const blob = await getSpeakAudio(sample.id);
      if (requestId !== requestRef.current) return;
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      setSampleId(sample.id);
      audio.onloadedmetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => {
        setPlayingId(null);
        setCurrentTime(0);
        audio.currentTime = 0;
      };
      audio.onerror = () => {
        setPlayingId(null);
        setError("This sample could not be played.");
      };
      await audio.play();
      if (requestId === requestRef.current) setPlayingId(sample.id);
    } catch (reason) {
      if (requestId === requestRef.current) {
        setError(reason instanceof Error ? reason.message : "This sample could not be played.");
      }
    } finally {
      if (requestId === requestRef.current) setLoadingId(null);
    }
  }, [reset, sampleId]);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  return { sampleId, playingId, loadingId, error, currentTime, duration, toggle, seekTo, reset };
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function SampleDetailsDialog({
  sample,
  voiceName,
  style,
  selected,
  audio,
  onUseVoice,
  onClose,
}: {
  sample: VoiceSample;
  voiceName: string;
  style: string;
  selected: boolean;
  audio: SavedSampleAudio;
  onUseVoice: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const close = () => onClose();
  const playState = audio.playingId === sample.id;
  const loadingState = audio.loadingId === sample.id;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Sample details"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-[440px] overflow-y-auto rounded-xl border border-hairline bg-surface p-0 text-heading shadow-2xl backdrop:bg-black/50"
    >
      <div className="space-y-5 p-5">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-heading">{voiceName}</h2>
            <p className="mt-1 text-sm text-muted">{sample.target_language_code} · {style}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)]"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Sample text</h3>
          <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-raised p-3 text-sm leading-relaxed text-muted">{sample.text}</p>
        </section>

        <section aria-label="Audio preview" className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={playState ? "Pause sample" : "Play sample"}
              aria-pressed={playState}
              disabled={loadingState}
              onClick={() => void audio.toggle(sample)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline text-heading transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)] disabled:opacity-60"
            >
              {loadingState ? <ActionProgressSkeleton /> : playState ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            </button>
            <input
              type="range"
              min={0}
              max={audio.duration || 1}
              step={0.1}
              value={Math.min(audio.currentTime, audio.duration || 1)}
              aria-label="Sample playback position"
              onChange={(event) => audio.seekTo(Number(event.target.value))}
              className="h-1.5 min-w-0 flex-1 accent-[var(--primary)]"
            />
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {formatAudioTime(audio.currentTime)} / {formatAudioTime(audio.duration)}
            </span>
          </div>
          {audio.error && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <p role="alert" className="text-loss">{audio.error}</p>
              <button type="button" onClick={() => void audio.toggle(sample)} className="shrink-0 font-medium text-link hover:underline">Retry</button>
            </div>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <SampleDetailRow label="Voice" value={voiceName} />
          <SampleDetailRow label="Language" value={sample.target_language_code} />
          <SampleDetailRow label="Style" value={style} />
          <SampleDetailRow label="Saved on" value={new Date(sample.created_at).toLocaleString()} />
          <SampleDetailRow label="Pace" value={`${sample.pace}×`} />
          <SampleDetailRow label="Sample rate" value={`${sample.speech_sample_rate.toLocaleString()} Hz`} />
        </dl>

        <footer className="flex justify-end gap-2 border-t border-hairline pt-4">
          <button type="button" onClick={close} className="rounded-md border border-hairline-strong px-3 py-2 text-sm font-medium text-heading transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)]">Close</button>
          {!selected && <button type="button" onClick={() => { onUseVoice(); close(); }} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)]">Use this voice</button>}
        </footer>
      </div>
    </dialog>
  );
}

function SampleDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-heading">{value}</dd>
    </div>
  );
}

/** Shared empty and no-results message used by the custom and stock voice lists. */
function RowMessage({ children }: { children: React.ReactNode }) {
  return <p className="col-span-full px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

/** Tell the user when their stock voice filters return no results. */
const NoMatch = () => <RowMessage>No voices match these filters.</RowMessage>;

/** Stock voice previews use /voices/speak. Saved voices cannot be previewed by ID. */
type Playable = { id: string; name: string; language: string | null };

/** Select a voice independently from its play/pause preview control. */
function VoiceCard({
  playable,
  label,
  detail,
  selected,
  onSelect,
  preview,
  className,
  subDetail,
  actions,
  compact = false,
}: {
  playable?: Playable;
  label: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
  preview?: ReturnType<typeof usePreview>;
  className?: string;
  subDetail?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  const playing = !!playable && preview?.playingId === playable.id;
  const loading = !!playable && preview?.loadingId === playable.id;

  return (
    <div
      className={clsx(
        clsx("flex min-w-0 items-center border px-3 py-2 transition-colors", compact ? "gap-2 rounded-xl" : "gap-3 rounded-md"),
        selected ? "border-[var(--input-glow)] bg-[var(--input-glow)]/20" : "border-hairline hover:border-[var(--input-glow)] hover:bg-[var(--input-glow)]/10",
        className,
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={clsx("flex min-w-0 flex-1 items-center rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)]", compact ? "gap-2" : "gap-3")}
      >
        <span
          aria-hidden
          className={clsx(
            clsx("flex shrink-0 items-center justify-center rounded-full border", compact ? "h-6 w-6" : "h-9 w-9"),
            selected ? "border-[var(--input-glow)] bg-[var(--input-glow)] text-[var(--selected-on-primary)]" : "border-hairline text-heading",
          )}
        >
          {selected && <Check size={compact ? 12 : 15} strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-heading">{label}</span>
          <span className="block truncate text-xs text-muted">{detail}</span>
          {subDetail && <span className="block truncate text-xs text-muted">{subDetail}</span>}
        </span>
      </button>
      {playable && preview && (
        <button
          type="button"
          aria-label={`${playing ? "Pause" : "Play"} preview for ${label}`}
          title={`${playing ? "Pause" : "Play"} voice preview`}
          disabled={!!preview.loadingId}
          onClick={() => void preview.toggle(playable)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-heading transition-colors hover:border-[var(--input-glow)] hover:bg-surface hover:text-[var(--input-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <ActionProgressSkeleton />
          ) : playing ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
        </button>
      )}
      {actions}
    </div>
  );
}

/**
 * Speaks "Hi, I'm {name}." followed by `text` with a stock voice, in the
 * voice's own language (falling back to the agent's). Clips are kept per voice,
 * language and text, so replaying doesn't generate (and store) a new sample.
 */
/** Flow: generate or reuse a stock-voice preview clip, then control audio playback. */
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
