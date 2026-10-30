"use client";

import { useEffect, useMemo, useState } from "react";
import { AudioLines, ChevronLeft, ChevronRight, Eye, Info, Plus, RefreshCw, Search, Trash2, UploadCloud } from "lucide-react";

import { confirmDialog } from "@/components/ConfirmDialog";
import { showErrorNotification, showSuccessNotification } from "@/hooks/useNotification";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  createSarvamVoice,
  createSarvamSpeakSample,
  deleteSarvamSpeakSample,
  deleteSarvamVoiceCatalog,
  deleteSarvamVoiceCatalogEntry,
  deleteSarvamVoice,
  getSarvamSpeakAudio,
  getSarvamSpeakSample,
  getSarvamVoice,
  listSarvamSpeakSamples,
  listSarvamVoiceCatalog,
  listSarvamVoices,
  synthesizeSarvamVoice,
  uploadSarvamVoiceCatalog,
} from "@/lib/callingAgentApi";
import {
  Button,
  Drawer,
  EmptyState,
  ErrorBanner,
  Field,
  Loading,
  SectionHeader,
  TextArea,
  TextInput,
  Tabs,
  errorMessage,
  useLoad,
} from "./ui";

const SARVAM_LANGUAGES = [
  ["as-IN", "Assamese"], ["bn-IN", "Bengali"], ["en-IN", "English (Indian)"],
  ["gu-IN", "Gujarati"], ["hi-IN", "Hindi"], ["kn-IN", "Kannada"],
  ["ml-IN", "Malayalam"], ["mr-IN", "Marathi"], ["od-IN", "Odia"],
  ["pa-IN", "Punjabi"], ["ta-IN", "Tamil"], ["te-IN", "Telugu"],
] as const;

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function unwrap(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return value.data ?? value;
}

function normalizeVoice(value: unknown) {
  const record = isRecord(value) ? value : {};
  const id = record.voice_id ?? record.id;
  if (typeof id !== "string") return null;
  return {
    id,
    name: typeof record.name === "string" ? record.name : id,
    language: typeof record.language === "string" ? record.language : null,
    gender: typeof record.gender === "string" ? record.gender : null,
    accent: typeof record.accent === "string" ? record.accent : null,
    style: typeof record.style === "string" ? record.style : null,
    referenceText:
      typeof record.reference_text === "string" ? record.reference_text : null,
    raw: record,
  };
}

function normalizeVoiceList(value: unknown) {
  const root = unwrap(value);
  const rows = Array.isArray(root)
    ? root
    : isRecord(root)
      ? root.voices ?? root.items ?? root.results ?? []
      : [];
  return Array.isArray(rows)
    ? rows.map(normalizeVoice).filter((voice): voice is NonNullable<typeof voice> => voice !== null)
    : [];
}

function audioUrlFromResponse(response: unknown, codec: string) {
  if (response instanceof Blob) {
    if (!response.size) throw new Error("The voice preview returned an empty audio file.");
    return URL.createObjectURL(response);
  }

  const root = unwrap(response);
  if (!isRecord(root)) throw new Error("The voice preview response did not contain audio.");

  const audioValue = root.audio_b64 ?? root.audio_base64 ?? root.audio ??
    (Array.isArray(root.audios) ? root.audios[0] : undefined);
  const audio = isRecord(audioValue)
    ? audioValue.audio_b64 ?? audioValue.audio ?? audioValue.data
    : audioValue;
  if (typeof audio !== "string") {
    const url = root.audio_url ?? root.url;
    if (typeof url === "string") return url;
    throw new Error("The voice preview response did not contain playable audio.");
  }

  if (/^(https?:|blob:|data:audio\/)/i.test(audio)) return audio;
  const base64 = audio.replace(/^data:audio\/[^;]+;base64,/, "");
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const mimeType = codec === "mp3" ? "audio/mpeg" : `audio/${codec || "wav"}`;
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function CustomVoiceTab() {
  const { data, error, loading, reload } = useLoad(listSarvamVoices);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [testLanguage, setTestLanguage] = useState("en-IN");
  const [style, setStyle] = useState("conversational");
  const [gender, setGender] = useState("female");
  const [file, setFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [testVoiceId, setTestVoiceId] = useState("");
  const [testText, setTestText] = useState("Hello! This is a sample of the voice I selected.");
  const [testErrors, setTestErrors] = useState<{ voiceId?: string; text?: string }>({});
  const [testingVoice, setTestingVoice] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const voices = normalizeVoiceList(data);

  useEffect(() => {
    return () => {
      if (previewAudioUrl.startsWith("blob:")) URL.revokeObjectURL(previewAudioUrl);
    };
  }, [previewAudioUrl]);

  const createVoice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !name.trim() || !language.trim()) return;

    const form = new FormData();
    form.set("file", file);
    form.set("name", name.trim());
    form.set("language", language.trim());
    if (style.trim()) form.set("style", style.trim());
    if (gender) form.set("gender", gender);

    setCreating(true);
    try {
      await createSarvamVoice(form);
      showSuccessNotification(`The cloned voice “${name.trim()}” was created.`, {
        title: "Voice created",
      });
      setName("");
      setFile(null);
      const input = document.getElementById("sarvam-reference-audio") as HTMLInputElement | null;
      if (input) input.value = "";
      await reload();
    } catch (err) {
      showErrorNotification(errorMessage(err), { title: "Could not create voice" });
    } finally {
      setCreating(false);
    }
  };

  const inspectVoice = async (voiceId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await getSarvamVoice(voiceId));
    } catch (err) {
      showErrorNotification(errorMessage(err), { title: "Could not load voice details" });
    } finally {
      setDetailLoading(false);
    }
  };

  const detailData = unwrap(detail);
  const detailRecord = isRecord(detailData)
    ? (isRecord(detailData.voice) ? detailData.voice : detailData)
    : {};
  const detailValue = (...keys: string[]) => {
    for (const key of keys) {
      const value = detailRecord[key];
      if (typeof value === "string" || typeof value === "number") return String(value);
    }
    return "";
  };
  const referenceAudioUrl = detailValue("reference_audio_url", "reference_audio_signed_url");
  const recordedAudioUrl = detailValue("recorded_audio_url", "recorded_audio_signed_url");
  const detailsPreviewAudioUrl = detailValue("preview_audio_url", "preview_url");
  const closeDetails = () => {
    setDetailOpen(false);
    setDetail(null);
  };

  const removeVoice = async (voiceId: string, voiceName: string) => {
    const confirmed = await confirmDialog({
      title: "Delete cloned voice?",
      message: `“${voiceName}” will be removed from your Sarvam voice library.`,
      confirmLabel: "Delete voice",
    });
    if (!confirmed) return;

    setDeletingId(voiceId);
    try {
      await deleteSarvamVoice(voiceId);
      showSuccessNotification(`“${voiceName}” was deleted.`, { title: "Voice deleted" });
      await reload();
    } catch (err) {
      showErrorNotification(errorMessage(err), { title: "Could not delete voice" });
    } finally {
      setDeletingId(null);
    }
  };

  const testVoice = async () => {
    const errors = {
      voiceId: testVoiceId.trim() ? undefined : "Please fill in the voice ID.",
      text: testText.trim() ? undefined : "Please fill in the text to speak.",
    };
    setTestErrors(errors);
    if (errors.voiceId || errors.text) return;
    setTestingVoice(true);
    setPreviewError(null);
    setPreviewAudioUrl("");
    const form = new FormData();
    form.set("text", testText.trim());
    form.set("language_code", testLanguage);
    form.set("voice_id", testVoiceId.trim());
    form.set("output_audio_codec", "mp3");

    try {
      const result = await synthesizeSarvamVoice(form);
      setPreviewAudioUrl(audioUrlFromResponse(result, "mp3"));
    } catch (err) {
      setPreviewError(errorMessage(err));
      showErrorNotification(errorMessage(err), { title: "Voice preview failed" });
    } finally {
      setTestingVoice(false);
    }
  };

  return (
    <section className="space-y-8">
      <SectionHeader
        title="Agent Voice"
        description="Create and manage cloned Sarvam voices for your calling agents."
      />

      <div className="max-w-3xl rounded-lg border border-hairline bg-surface p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-heading">Create a cloned voice</h3>
        <p className="mt-1 text-sm text-muted">
          Upload a clear 10–15 second recording with one speaker. Supported formats include WAV, MP3, FLAC, OPUS and AAC.
        </p>
        <form onSubmit={createVoice} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Voice name">
              <TextInput value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="e.g. Support voice" />
            </Field>
            <Field label="Reference recording language">
              <select value={language} onChange={(event) => setLanguage(event.target.value)} required className="h-10 w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading outline-none focus:border-accent">
                {SARVAM_LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label} ({code})</option>)}
              </select>
            </Field>
            <Field label="Speaking style">
              <TextInput value={style} onChange={(event) => setStyle(event.target.value)} placeholder="conversational" />
            </Field>
            <Field label="Gender (optional)">
              <select value={gender} onChange={(event) => setGender(event.target.value)} className="h-10 w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading outline-none focus:border-accent">
                <option value="">Not specified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </Field>
          </div>

          <Field label="Reference audio">
            <label
              htmlFor="sarvam-reference-audio"
              onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingFile(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingFile(false);
                const droppedFile = event.dataTransfer.files[0];
                if (droppedFile) setFile(droppedFile);
              }}
              className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${isDraggingFile ? "border-accent bg-raised" : "border-hairline-strong hover:border-accent hover:bg-raised"}`}
            >
              <AudioLines size={24} className="mb-2 text-accent-text" />
              <span className="text-sm font-medium text-heading">
                {file ? file.name : "Drop an audio file here or click to browse"}
              </span>
              <span className="mt-1 text-xs text-muted">
                {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · Click to choose another file` : "WAV, MP3, FLAC, OPUS or AAC · Max 50 MB"}
              </span>
              <input
                id="sarvam-reference-audio"
                type="file"
                accept="audio/wav,audio/mpeg,audio/flac,audio/ogg,audio/aac,.wav,.mp3,.flac,.opus,.aac"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={creating || !file || !name.trim() || !language.trim()}>
              <Plus size={16} /> {creating ? "Creating voice…" : "Create Sarvam voice"}
            </Button>
          </div>
        </form>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-heading">Custom voice library</h3>
            <p className="mt-1 text-sm text-muted">Cloned voices available to this account.</p>
          </div>
          <Button variant="secondary" onClick={() => void reload()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
        <div className="mb-5 rounded-lg border border-hairline bg-surface p-4">
          <h4 className="font-medium text-heading">Test a custom voice</h4>
          <p className="mt-1 text-sm text-muted">Enter sample text and a saved Sarvam custom voice ID. The preview is generated by Sarvam.</p>
          <div className="mt-4 grid gap-4">
            <Field label="Output language">
              <select value={testLanguage} onChange={(event) => setTestLanguage(event.target.value)} className="h-10 w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading">
                {SARVAM_LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label} ({code})</option>)}
              </select>
            </Field>
            <Field label="Custom voice ID" required error={testErrors.voiceId}>
              <TextInput value={testVoiceId} aria-invalid={Boolean(testErrors.voiceId)} onChange={(event) => { setTestVoiceId(event.target.value); setTestErrors((current) => ({ ...current, voiceId: undefined })); }} placeholder="svc-…" />
            </Field>
            <Field label="Text to speak" required error={testErrors.text}>
              <TextArea value={testText} aria-invalid={Boolean(testErrors.text)} onChange={(event) => { setTestText(event.target.value); setTestErrors((current) => ({ ...current, text: undefined })); }} maxLength={1000} rows={3} placeholder="Enter text for the voice to speak" />
            </Field>
            <div className="flex justify-end">
              <Button onClick={() => void testVoice()} disabled={testingVoice}>
                <AudioLines size={16} /> {testingVoice ? "Generating preview…" : "Test voice"}
              </Button>
            </div>
            {previewError && <ErrorBanner message={previewError} />}
            {previewAudioUrl && <div>
              <p className="mb-2 text-sm font-medium text-heading">Voice preview</p>
              <audio controls autoPlay className="w-full" src={previewAudioUrl} />
            </div>}
          </div>
        </div>
        <ErrorBanner message={error} />
        {loading && !data ? (
          <Loading />
        ) : voices.length === 0 ? (
          <EmptyState title="No cloned voices yet" text="Create a Sarvam voice using a reference recording above." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-sm">
            <ul className="divide-y divide-hairline">
              {voices.map((voice) => (
                <li key={voice.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <AudioLines size={18} className="mt-0.5 shrink-0 text-accent-text" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-heading">{voice.name}</p>
                      <p className="mt-0.5 break-all text-xs text-muted">{voice.id}</p>
                      <p className="mt-1 text-xs text-muted">{[voice.language, voice.gender, voice.accent, voice.style].filter(Boolean).join(" · ") || "Sarvam cloned voice"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setTestVoiceId(voice.id)}>Test</Button>
                    <Button variant="secondary" onClick={() => void inspectVoice(voice.id)} aria-label={`View ${voice.name} details`}>
                      <Eye size={15} /> Details
                    </Button>
                    <Button variant="danger" onClick={() => void removeVoice(voice.id, voice.name)} disabled={deletingId === voice.id} aria-label={`Delete ${voice.name}`}>
                      <Trash2 size={15} /> {deletingId === voice.id ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {detailOpen && (
        <Drawer
          title="Voice details"
          description="Voice data returned by Sarvam."
          onClose={closeDetails}
          footer={<Button variant="secondary" onClick={closeDetails}>Close</Button>}
        >
            {detailLoading ? <Loading /> : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Voice name"><TextInput value={detailValue("name")} readOnly /></Field>
                <Field label="Voice ID"><TextInput value={detailValue("voice_id", "id")} readOnly /></Field>
                <Field label="Language"><TextInput value={detailValue("language", "language_code")} readOnly /></Field>
                <Field label="Gender"><TextInput value={detailValue("gender")} readOnly /></Field>
                <Field label="Accent"><TextInput value={detailValue("accent")} readOnly /></Field>
                <Field label="Style"><TextInput value={detailValue("style")} readOnly /></Field>
                <div className="sm:col-span-2">
                  <Field label="Reference transcript">
                    <TextArea value={detailValue("reference_text", "transcript")} readOnly rows={4} />
                  </Field>
                </div>
                <Field label="Created"><TextInput value={detailValue("created_at")} readOnly /></Field>
                {referenceAudioUrl && <div className="sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-heading">Original uploaded recording</span>
                  <audio controls preload="none" className="w-full" src={referenceAudioUrl} />
                </div>}
                {recordedAudioUrl && <div className="sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-heading">Recorded voice</span>
                  <audio controls preload="none" className="w-full" src={recordedAudioUrl} />
                </div>}
                {detailsPreviewAudioUrl && <div className="sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-heading">Voice preview</span>
                  <audio controls preload="none" className="w-full" src={detailsPreviewAudioUrl} />
                </div>}
              </div>
            )}
        </Drawer>
      )}
    </section>
  );
}

type CatalogVoice = { voice_id: string; speaker: string; language_code: string; style?: string; [key: string]: unknown };
const SPEECH_MODELS = ["bulbul:v4-flash", "bulbul:v3", "bulbul:v2"];
const SARVAM_SAMPLE_RATE = 24000;

function rowsFrom(value: unknown): Record<string, unknown>[] {
  const root = unwrap(value);
  const rows = Array.isArray(root) ? root : isRecord(root) ? root.voices ?? root.items ?? root.results ?? root.samples ?? [] : [];
  return Array.isArray(rows) ? rows.filter(isRecord) : [];
}

function SarvamVoicesTab() {
  const { data, error, loading, reload } = useLoad(listSarvamVoiceCatalog);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [speakers, setSpeakers] = useState("");
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [model, setModel] = useState("bulbul:v4-flash");
  const [pace, setPace] = useState("1");
  const [generating, setGenerating] = useState(false);
  const [sampleId, setSampleId] = useState("");
  const [sampleDetail, setSampleDetail] = useState<unknown>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [samples, setSamples] = useState<Record<string, unknown>[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleQuery, setSampleQuery] = useState("");
  const [samplePage, setSamplePage] = useState(0);
  const [sampleInfo, setSampleInfo] = useState<unknown>(null);
  const [sampleInfoOpen, setSampleInfoOpen] = useState(false);
  const [sampleInfoLoading, setSampleInfoLoading] = useState(false);
  const voices = useMemo(() => rowsFrom(data).map((row) => ({
    voice_id: String(row.voice_id ?? row.id ?? ""),
    speaker: String(row.speaker ?? ""),
    language_code: String(row.language_code ?? row.lang_tag ?? ""),
    style: typeof row.style === "string" ? row.style : undefined,
  } satisfies CatalogVoice)).filter((row) => row.voice_id), [data]);
  const filtered = voices.filter((voice) => `${voice.voice_id} ${voice.speaker} ${voice.language_code}`.toLowerCase().includes(query.toLowerCase()));
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const speakerOptions = voices.filter((voice) => voice.speaker);
  const filteredSamples = samples.filter((sample) => {
    const searchable = [sample.id, sample.sample_id, sample.speaker, sample.target_language_code, sample.language_code, sample.text, sample.voice_id].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(sampleQuery.toLowerCase());
  });
  const samplePageSize = 10;
  const samplePageCount = Math.max(1, Math.ceil(filteredSamples.length / samplePageSize));
  const visibleSamples = filteredSamples.slice(samplePage * samplePageSize, (samplePage + 1) * samplePageSize);

  useEffect(() => {
    if (!speakerOptions.length) return;
    setSpeakers((current) => current || speakerOptions[0].voice_id);
  }, [speakerOptions.join("|")]);
  useEffect(() => () => { if (audioUrl.startsWith("blob:")) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const refreshSamples = async () => {
    setSampleLoading(true);
    try { setSamples(rowsFrom(await listSarvamSpeakSamples({ limit: "50" }))); }
    catch (err) { showErrorNotification(errorMessage(err), { title: "Could not load speech samples" }); }
    finally { setSampleLoading(false); }
  };
  useEffect(() => { void refreshSamples(); }, []);

  const uploadCatalog = async (file?: File) => {
    if (!file) return;
    const form = new FormData(); form.set("file", file);
    setUploading(true);
    try {
      await uploadSarvamVoiceCatalog(form);
      showSuccessNotification("Sarvam voice catalog uploaded.", { title: "Catalog updated" });
      setPage(0); await reload();
    } catch (err) { showErrorNotification(errorMessage(err), { title: "Catalog upload failed" }); }
    finally { setUploading(false); }
  };
  const removeCatalogVoice = async (voice: CatalogVoice) => {
    if (!await confirmDialog({ title: "Delete catalog voice?", message: `Remove ${voice.voice_id} from the Sarvam catalog?`, confirmLabel: "Delete voice" })) return;
    try { await deleteSarvamVoiceCatalogEntry(voice.voice_id); showSuccessNotification("Catalog voice deleted.", { title: "Voice deleted" }); await reload(); }
    catch (err) { showErrorNotification(errorMessage(err), { title: "Could not delete voice" }); }
  };
  const clearCatalog = async () => {
    if (!await confirmDialog({ title: "Delete entire voice catalog?", message: "This removes every stock voice from the Sarvam catalog.", confirmLabel: "Delete catalog" })) return;
    try { await deleteSarvamVoiceCatalog(); showSuccessNotification("The voice catalog was deleted.", { title: "Catalog deleted" }); setPage(0); await reload(); }
    catch (err) { showErrorNotification(errorMessage(err), { title: "Could not delete catalog" }); }
  };
  const playSample = async (id: string) => {
    try {
      const [detail, audio] = await Promise.all([getSarvamSpeakSample(id), getSarvamSpeakAudio(id)]);
      setSampleDetail(detail); setSampleId(id);
      let playable = audio;
      if (audio.type.includes("json") || audio.type.startsWith("text/")) {
        const responseText = await audio.text();
        let payload: unknown = responseText;
        try { payload = JSON.parse(responseText); } catch { /* some endpoints return a plain string */ }
        const root = unwrap(payload);
        const record = isRecord(root) ? root : {};
        const audioValue = record.audio_b64 ?? record.audio_base64 ?? record.audio ?? record.audio_url ?? record.url ?? root;
        if (typeof audioValue === "string" && /^(https?:|\/)/i.test(audioValue)) {
          const token = getToken();
          const response = await fetch(new URL(audioValue, `${API_BASE}/`).toString(), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (!response.ok) throw new Error(`Could not load sample audio (${response.status}).`);
          playable = await response.blob();
        } else if (typeof audioValue === "string") {
          const base64 = audioValue.replace(/^data:audio\/[^;]+;base64,/, "");
          const binary = window.atob(base64);
          const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
          playable = new Blob([bytes], { type: "audio/mpeg" });
        } else {
          throw new Error("The sample audio response did not contain playable audio.");
        }
      }
      if (audioUrl.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(playable));
    } catch (err) { showErrorNotification(errorMessage(err), { title: "Could not load speech sample" }); }
  };
  const showSampleInfo = async (id: string) => {
    setSampleInfoOpen(true);
    setSampleInfoLoading(true);
    setSampleInfo(null);
    try { setSampleInfo(await getSarvamSpeakSample(id)); }
    catch (err) { showErrorNotification(errorMessage(err), { title: "Could not load sample data" }); }
    finally { setSampleInfoLoading(false); }
  };
  const speak = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!text.trim() || !speakers) return;
    setGenerating(true); setAudioUrl(""); setSampleId(""); setSampleDetail(null);
    try {
      const result = await createSarvamSpeakSample({ text: text.trim(), speaker: speakers, target_language_code: language, model, pace: Number(pace), speech_sample_rate: SARVAM_SAMPLE_RATE, output_audio_codec: "mp3" });
      const root = unwrap(result); const record = isRecord(root) ? root : {};
      const id = String(record.id ?? record.sample_id ?? "");
      if (!id) throw new Error("Sarvam created the sample but did not return its ID.");
      setSampleId(id);
      const [detail, audio] = await Promise.all([getSarvamSpeakSample(id), getSarvamSpeakAudio(id)]);
      setSampleDetail(detail); setAudioUrl(URL.createObjectURL(audio));
      await refreshSamples();
      showSuccessNotification(`Speech sample ${id} is ready.`, { title: "Speech generated" });
    } catch (err) { showErrorNotification(errorMessage(err), { title: "Could not generate speech" }); }
    finally { setGenerating(false); }
  };
  const removeSample = async (id: string) => {
    if (!await confirmDialog({ title: "Delete speech sample?", message: `Sample ${id} will be permanently deleted.`, confirmLabel: "Delete sample" })) return;
    try { await deleteSarvamSpeakSample(id); if (sampleId === id) { setSampleId(""); setSampleDetail(null); setAudioUrl(""); } await refreshSamples(); }
    catch (err) { showErrorNotification(errorMessage(err), { title: "Could not delete sample" }); }
  };

  return <div className="space-y-8">
    <section className="rounded-lg border border-hairline bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-heading">Stock voice catalog</h3><p className="mt-1 text-sm text-muted">Upload a CSV or Excel file with voice_id, speaker and language_code. Each voice_id must be unique.</p></div>
        <div className="flex gap-2"><Button size="sm" variant="danger" onClick={() => void clearCatalog()} disabled={!voices.length}>Delete catalog</Button><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-hairline-strong bg-surface px-4 text-sm font-medium text-heading hover:bg-surface-hover"><UploadCloud size={16}/>{uploading ? "Uploading…" : "Upload CSV / Excel"}<input type="file" accept=".csv,.xlsx,.xls" className="sr-only" disabled={uploading} onChange={(e) => { void uploadCatalog(e.target.files?.[0]); e.currentTarget.value = ""; }}/></label></div>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><Field label="Search voice ID or speaker"><div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted"/><TextInput className="pl-9" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search catalog…"/></div></Field><Button variant="secondary" onClick={() => void reload()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Refresh</Button></div>
      <ErrorBanner message={error}/>
      {loading && !data ? <Loading/> : pageRows.length === 0 ? <EmptyState title="No catalog voices" text="Upload a CSV or Excel catalog, or change the search."/> : <div className="mt-4 overflow-x-auto rounded-lg border border-hairline"><table className="w-full text-left text-sm"><thead className="bg-raised text-muted"><tr><th className="p-3">Voice ID</th><th className="p-3">Speaker name</th><th className="p-3">Language</th><th className="p-3">Style</th><th className="p-3">Actions</th></tr></thead><tbody className="divide-y divide-hairline">{pageRows.map((voice) => <tr key={voice.voice_id}><td className="p-3 font-mono text-xs">{voice.voice_id}</td><td className="p-3">{voice.speaker || "—"}</td><td className="p-3">{voice.language_code || "—"}</td><td className="p-3">{voice.style || "—"}</td><td className="p-3"><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setSpeakers(voice.voice_id); setLanguage(voice.language_code || "en-IN"); setModel("bulbul:v4-flash"); document.getElementById("sarvam-speak-text")?.focus(); }} disabled={!voice.speaker}><AudioLines size={14}/>Select / test</Button><Button size="sm" variant="danger" onClick={() => void removeCatalogVoice(voice)}><Trash2 size={14}/>Delete</Button></div></td></tr>)}</tbody></table></div>}
      <div className="mt-3 flex items-center justify-between text-sm text-muted"><span>{filtered.length} voices · Page {page + 1} of {pageCount}</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={15}/>Previous</Button><Button size="sm" variant="secondary" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight size={15}/></Button></div></div>
    </section>
    <section className="rounded-lg border border-hairline bg-surface p-5 shadow-sm"><h3 className="font-semibold text-heading">Speak with a stock voice</h3><p className="mt-1 text-sm text-muted">Generate speech with a speaker from the uploaded catalog.</p>
      <form className="mt-4 space-y-4" onSubmit={speak}><Field label="Text to speak"><TextArea id="sarvam-speak-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} required placeholder="Enter text to synthesize"/></Field>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Language"><select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-10 w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading">{SARVAM_LANGUAGES.map(([code,label]) => <option key={code} value={code}>{label} ({code})</option>)}</select></Field>
          <Field label="Speaker voice"><select value={speakers} onChange={(e) => setSpeakers(e.target.value)} className="h-10 w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading"><option value="">Select speaker voice</option>{speakerOptions.map((voice) => <option key={voice.voice_id} value={voice.voice_id}>{voice.speaker} · {voice.voice_id}</option>)}</select></Field>
          <Field label="Model"><select value={model} onChange={(e) => setModel(e.target.value)} className="h-10 w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading">{SPEECH_MODELS.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Pace"><TextInput type="number" min="0.5" max="2" step="0.1" value={pace} onChange={(e) => setPace(e.target.value)} required/></Field>
        </div><p className="text-xs text-muted">Speech sample rate: {SARVAM_SAMPLE_RATE} Hz · Output: MP3</p>
        <div className="flex justify-end"><Button type="submit" disabled={generating || !speakerOptions.length || !text.trim()}><AudioLines size={16}/>{generating ? "Generating…" : "Generate speech"}</Button></div>
      </form>
      {sampleId && <div className="mt-5 rounded-md border border-hairline bg-raised p-4"><p className="text-sm font-medium text-heading">Sample ID: <span className="font-mono">{sampleId}</span></p>{audioUrl && <audio controls className="mt-3 w-full" src={audioUrl}/>}</div>}
    </section>
    <section className="rounded-lg border border-hairline bg-surface p-5"><div className="flex justify-between"><div><h3 className="font-semibold text-heading">Recent speech samples</h3><p className="mt-1 text-sm text-muted">Stored samples can be played or deleted.</p></div><Button size="sm" variant="secondary" onClick={() => void refreshSamples()} disabled={sampleLoading}><RefreshCw size={14}/>Refresh</Button></div>
      <div className="mt-4 max-w-md"><Field label="Search samples by ID, voice, language, or text"><div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted"/><TextInput className="pl-9" value={sampleQuery} onChange={(e) => { setSampleQuery(e.target.value); setSamplePage(0); }} placeholder="Find a sample…"/></div></Field></div>
      {samples.length === 0 ? <p className="mt-4 text-sm text-muted">{sampleLoading ? "Loading samples…" : "No stored speech samples."}</p> : visibleSamples.length === 0 ? <p className="mt-4 text-sm text-muted">No samples match that search.</p> : <ul className="mt-3 divide-y divide-hairline">{visibleSamples.map((sample, index) => { const id = String(sample.id ?? sample.sample_id ?? index); const sampleText = String(sample.text ?? sample.input_text ?? ""); const sampleSpeaker = String(sample.speaker ?? "Unknown speaker"); const sampleLanguage = String(sample.target_language_code ?? sample.language_code ?? "Unknown language"); const sampleVoiceId = String(sample.voice_id ?? ""); const createdAt = String(sample.created_at ?? sample.createdAt ?? ""); return <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-medium text-heading">{sampleSpeaker} · {sampleLanguage}{sampleVoiceId ? ` · ${sampleVoiceId}` : ""}</p><p className="font-mono text-xs text-muted">Sample ID: {id}</p>{sampleText && <p className="mt-1 max-w-2xl truncate text-sm text-body" title={sampleText}>{sampleText}</p>}{createdAt && <p className="mt-1 text-xs text-muted">{createdAt}</p>}{id === sampleId && audioUrl && <audio controls autoPlay className="mt-2 w-full max-w-xl" src={audioUrl}/>}</div><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => void playSample(id)}><AudioLines size={14}/>Play</Button><Button size="sm" variant="secondary" onClick={() => void showSampleInfo(id)}><Info size={14}/>Show data</Button><Button size="sm" variant="danger" onClick={() => void removeSample(id)}><Trash2 size={14}/>Delete</Button></div></li>; })}</ul>}
      {filteredSamples.length > 0 && <div className="mt-3 flex items-center justify-between text-sm text-muted"><span>{filteredSamples.length} samples · Page {samplePage + 1} of {samplePageCount}</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={samplePage === 0} onClick={() => setSamplePage((p) => p - 1)}><ChevronLeft size={15}/>Previous</Button><Button size="sm" variant="secondary" disabled={samplePage + 1 >= samplePageCount} onClick={() => setSamplePage((p) => p + 1)}>Next<ChevronRight size={15}/></Button></div></div>}
    </section>
    {sampleInfoOpen && <Drawer title="Speech sample data" description="Voice details and the full response returned by Sarvam." wide onClose={() => { setSampleInfoOpen(false); setSampleInfo(null); }} footer={<Button variant="secondary" onClick={() => { setSampleInfoOpen(false); setSampleInfo(null); }}>Close</Button>}>
      {sampleInfoLoading ? <Loading/> : (() => {
        const root = unwrap(sampleInfo);
        const record = isRecord(root) && isRecord(root.sample) ? root.sample : isRecord(root) ? root : {};
        const fields: Array<[string, unknown]> = [["Sample ID", record.id], ["Voice / speaker", record.speaker], ["Voice ID", record.voice_id], ["Language", record.target_language_code ?? record.language_code], ["Model", record.model], ["Text", record.text], ["Pace", record.pace], ["Sample rate", record.speech_sample_rate], ["Audio format", record.output_audio_codec], ["Audio size", typeof record.size_bytes === "number" ? `${record.size_bytes.toLocaleString()} bytes` : record.size_bytes], ["Created", record.created_at], ["Audio URL", record.audio_url]];
        return <dl className="grid gap-4 sm:grid-cols-2">{fields.filter(([, value]) => value !== undefined && value !== null && value !== "").map(([label, value]) => <div key={label} className={label === "Text" || label === "Audio URL" ? "sm:col-span-2" : ""}><dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 break-all text-sm text-heading">{String(value)}</dd></div>)}</dl>;
      })()}
    </Drawer>}
  </div>;
}

export default function AgentVoiceTab() {
  const tabs = [{ id: "sarvam", label: "Sarvam voices" }, { id: "custom", label: "Custom voices" }] as const;
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("sarvam");
  return <section className="space-y-6"><SectionHeader title="Agent Voice" description="Manage Sarvam stock voices and your custom cloned voices."/><Tabs label="Agent voice types" tabs={tabs} active={active} onChange={setActive}/>{active === "sarvam" ? <SarvamVoicesTab/> : <CustomVoiceTab/>}</section>;
}
