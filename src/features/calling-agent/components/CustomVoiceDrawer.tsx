"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SkeletonBoundary, AudioPreviewSkeleton } from "@/components/skeletons";
import { createVoice } from "@/lib/api/voices";
import { showSuccessNotification } from "@/hooks/useNotification";
import { Button, Drawer, ErrorBanner, Field, FileDrop, Select, TextInput } from "@/components/ui";
import { CLIP_MAX_SECONDS, CLIP_MIN_SECONDS, LANGUAGES } from "./voicePickerShared";

/* ------------------------------ Custom voice ------------------------------ */

/**
 * Clone a voice from a short recording. The backend speaks `text` with the new voice
 * straight away, so it can be heard before it's used.
 */
/** Flow: collect a recording and voice settings, create the clone, then preview its greeting. */
export default function CustomVoiceDrawer({
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
            <Button variant="secondary" className="btn-blue" onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button className="btn-blue-filled" onClick={submit} loading={create.isPending}>
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
          {audioUrl ? (
            <SkeletonBoundary loading={previewLoading} skeleton={<AudioPreviewSkeleton />}>
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
            </SkeletonBoundary>
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
