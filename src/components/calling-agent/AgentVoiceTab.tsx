"use client";

import { useEffect, useState } from "react";
import { AudioLines, Eye, Plus, RefreshCw, Trash2 } from "lucide-react";

import { confirmDialog } from "@/components/ConfirmDialog";
import { showErrorNotification, showSuccessNotification } from "@/hooks/useNotification";
import {
  createSarvamVoice,
  deleteSarvamVoice,
  getSarvamVoice,
  listSarvamVoices,
  synthesizeSarvamVoice,
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
  errorMessage,
  useLoad,
} from "./ui";

const PREFERRED_VOICE_KEY = "calling-agent:preferred-sarvam-voice";
const PREFERRED_LANGUAGE_KEY = "calling-agent:preferred-sarvam-language";

const SARVAM_LANGUAGES = [
  ["as-IN", "Assamese"], ["bn-IN", "Bengali"], ["en-IN", "English (Indian)"],
  ["gu-IN", "Gujarati"], ["hi-IN", "Hindi"], ["kn-IN", "Kannada"],
  ["ml-IN", "Malayalam"], ["mr-IN", "Marathi"], ["od-IN", "Odia"],
  ["pa-IN", "Punjabi"], ["ta-IN", "Tamil"], ["te-IN", "Telugu"],
] as const;

const BULBUL_V3_SPEAKERS = [
  "aditya", "ritu", "ashutosh", "priya", "neha", "rahul", "pooja", "rohan",
  "simran", "kavya", "amit", "dev", "ishita", "shreya", "ratan", "varun",
  "manan", "sumit", "roopa", "kabir", "aayan", "shubh", "advait", "anand",
  "tanya", "tarun", "sunny", "mani", "gokul", "vijay", "shruti", "suhani",
  "mohit", "kavitha", "rehan", "soham", "rupali",
];

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

export default function AgentVoiceTab() {
  const { data, error, loading, reload } = useLoad(listSarvamVoices);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  const [style, setStyle] = useState("conversational");
  const [gender, setGender] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [consented, setConsented] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [preferredVoiceId, setPreferredVoiceId] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en-IN");
  const [testVoiceId, setTestVoiceId] = useState("");
  const [testText, setTestText] = useState("Hello! This is a sample of the voice I selected.");
  const [testingVoice, setTestingVoice] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const voices = normalizeVoiceList(data);

  useEffect(() => {
    return () => {
      if (previewAudioUrl.startsWith("blob:")) URL.revokeObjectURL(previewAudioUrl);
    };
  }, [previewAudioUrl]);

  useEffect(() => {
    const savedVoiceId = localStorage.getItem(PREFERRED_VOICE_KEY) ?? "";
    setPreferredVoiceId(savedVoiceId);
    setSelectedVoiceId(savedVoiceId);
    if (savedVoiceId.startsWith("clone:")) setTestVoiceId(savedVoiceId.slice("clone:".length));
    const savedLanguage = localStorage.getItem(PREFERRED_LANGUAGE_KEY) ?? "en-IN";
    setSelectedLanguage(savedLanguage);
    setPreferredLanguage(savedLanguage);
  }, []);

  const createVoice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !name.trim() || !language.trim() || !consented) return;

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
      setConsented(false);
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
      if (preferredVoiceId === `clone:${voiceId}`) {
        localStorage.removeItem(PREFERRED_VOICE_KEY);
        setPreferredVoiceId("");
        setSelectedVoiceId("");
      }
      await reload();
    } catch (err) {
      showErrorNotification(errorMessage(err), { title: "Could not delete voice" });
    } finally {
      setDeletingId(null);
    }
  };

  const saveVoiceSelection = () => {
    if (!selectedVoiceId) return;
    localStorage.setItem(PREFERRED_VOICE_KEY, selectedVoiceId);
    localStorage.setItem(PREFERRED_LANGUAGE_KEY, selectedLanguage);
    setPreferredVoiceId(selectedVoiceId);
    setPreferredLanguage(selectedLanguage);
    showSuccessNotification(
      "Voice and language saved in this browser. The backend agent API does not yet expose settings to apply them to calls.",
      { title: "Voice preference saved" },
    );
  };

  const testVoice = async () => {
    if (!testVoiceId.trim() || !testText.trim()) return;
    setTestingVoice(true);
    setPreviewError(null);
    setPreviewAudioUrl("");
    const form = new FormData();
    form.set("text", testText.trim());
    form.set("language_code", selectedLanguage);
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

          <label className="flex items-start gap-2 text-sm text-body">
            <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} className="mt-1 accent-[var(--accent)]" />
            <span>I have permission to use this person’s voice recording to create a voice clone.</span>
          </label>
          <div className="flex justify-end">
            <Button type="submit" disabled={creating || !file || !consented || !name.trim() || !language.trim()}>
              <Plus size={16} /> {creating ? "Creating voice…" : "Create Sarvam voice"}
            </Button>
          </div>
        </form>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-heading">Sarvam voice library</h3>
            <p className="mt-1 text-sm text-muted">Cloned voices available to this account.</p>
          </div>
          <Button variant="secondary" onClick={() => void reload()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
        <div className="mb-4 grid gap-3 rounded-lg border border-hairline bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-heading">Speaking language</span>
              <select
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value)}
                className="h-10 w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading outline-none focus:border-accent"
              >
                {SARVAM_LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label} ({code})</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-heading">Choose a voice</span>
              <select
                value={selectedVoiceId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedVoiceId(value);
                  setTestVoiceId(value.startsWith("clone:") ? value.slice("clone:".length) : "");
                }}
                className="h-10 w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading outline-none focus:border-accent"
              >
                <option value="">Select a Sarvam voice</option>
                <optgroup label="Sarvam preset voices · Bulbul v3">
                  {BULBUL_V3_SPEAKERS.map((speaker) => <option key={speaker} value={`speaker:${speaker}`}>{speaker}</option>)}
                </optgroup>
                {voices.length > 0 && <optgroup label="Your custom cloned voices">
                  {voices.map((voice) => <option key={voice.id} value={`clone:${voice.id}`}>{voice.name}</option>)}
                </optgroup>}
              </select>
            </label>
            <Button
              onClick={saveVoiceSelection}
              disabled={!selectedVoiceId || (selectedVoiceId === preferredVoiceId && selectedLanguage === preferredLanguage)}
            >
              Save selected voice
            </Button>
        </div>
        <div className="mb-5 rounded-lg border border-hairline bg-surface p-4">
          <h4 className="font-medium text-heading">Test a custom voice</h4>
          <p className="mt-1 text-sm text-muted">Enter sample text and a saved Sarvam custom voice ID. The preview is generated by Sarvam.</p>
          <div className="mt-4 grid gap-4">
            <Field label="Custom voice ID">
              <TextInput value={testVoiceId} onChange={(event) => setTestVoiceId(event.target.value)} placeholder="svc-…" />
            </Field>
            <Field label="Text to speak">
              <TextArea value={testText} onChange={(event) => setTestText(event.target.value)} maxLength={1000} rows={3} placeholder="Enter text for the voice to speak" />
            </Field>
            <div className="flex justify-end">
              <Button onClick={() => void testVoice()} disabled={testingVoice || !testVoiceId.trim() || !testText.trim()}>
                <AudioLines size={16} /> {testingVoice ? "Generating preview…" : "Test voice"}
              </Button>
            </div>
            {previewError && <ErrorBanner message={previewError} />}
            {previewAudioUrl && <div>
              <p className="mb-2 text-sm font-medium text-heading">Voice preview</p>
              <audio controls autoPlay className="w-full" src={previewAudioUrl} />
              <Button className="mt-3" onClick={() => {
                const customSelection = `clone:${testVoiceId.trim()}`;
                setSelectedVoiceId(customSelection);
                localStorage.setItem(PREFERRED_VOICE_KEY, customSelection);
                localStorage.setItem(PREFERRED_LANGUAGE_KEY, selectedLanguage);
                setPreferredVoiceId(customSelection);
                setPreferredLanguage(selectedLanguage);
                showSuccessNotification("This custom voice was saved as your preferred voice in this browser.", { title: "Voice selected" });
              }}>
                Use this voice
              </Button>
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
                      {preferredVoiceId === `clone:${voice.id}` && <span className="mt-1 inline-block text-xs font-medium text-gain">Selected</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => {
                      setSelectedVoiceId(`clone:${voice.id}`);
                      setTestVoiceId(voice.id);
                    }}>
                      {preferredVoiceId === `clone:${voice.id}` ? "Selected" : "Select"}
                    </Button>
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
