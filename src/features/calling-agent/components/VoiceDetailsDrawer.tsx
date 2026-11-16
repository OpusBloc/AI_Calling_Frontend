"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { getVoice } from "@/lib/api/voices";
import { API_BASE } from "@/lib/api";
import { Drawer, ErrorState, formatDate } from "@/components/ui";
import { SkeletonBoundary, VoiceDetailsSkeleton } from "@/components/skeletons";
import { languageName } from "./voicePickerShared";

export function customVoicePreviewUrl(response: unknown): string | null {
  const candidates: unknown[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      candidates.push(value);
      return;
    }
    if (!recordValue(value)) return;
    for (const key of ["preview_audio_url", "preview_url", "audio_url", "url"]) {
      candidates.push(value[key]);
    }
    if (recordValue(value.data)) visit(value.data);
  };
  visit(response);
  const candidate = candidates.find((value) => typeof value === "string" && value.trim());
  if (typeof candidate !== "string") return null;
  try {
    return new URL(candidate, `${API_BASE}/`).toString();
  } catch {
    return null;
  }
}

/** Flow: fetch a custom voice profile and show its metadata and available audio previews. */
export default function VoiceDetailsDrawer({ voiceId, onClose }: { voiceId: string; onClose: () => void }) {
  const voice = useQuery({
    queryKey: ["custom-voice", voiceId],
    queryFn: () => getVoice(voiceId),
    retry: false,
  });
  const response = voice.data;
  const responseRecord = recordValue(response) ? response : {};
  const payload = responseRecord.data;
  const details = recordValue(payload) ? payload : responseRecord;
  const responseText = typeof response === "string" ? response.trim() : "";
  const name = stringValue(details.name) ?? (responseText || "Custom voice");
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
      <SkeletonBoundary loading={voice.isLoading} skeleton={<VoiceDetailsSkeleton />}>
      {voice.isError ? (
        <ErrorState
          title="Couldn't load voice details"
          message={voice.error instanceof Error ? voice.error.message : "An unexpected error occurred."}
          onRetry={() => voice.refetch()}
        />
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-hairline bg-raised p-4">
            <p className="text-xs text-muted">Voice ID</p>
            <p className="mt-1 break-all font-mono text-sm text-heading">{voiceId}</p>
            {responseText && !stringValue(details.name) && (
              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-body">{responseText}</p>
            )}
          </section>
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
                <span className="rounded-full bg-[var(--input-glow)]/20 px-2.5 py-1 text-xs font-medium text-[var(--input-glow)]">
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
      </SkeletonBoundary>
    </Drawer>
  );
}

function recordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Render one labeled value in the custom voice profile. */
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

/** Render an inline audio player for a profile recording. */
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
