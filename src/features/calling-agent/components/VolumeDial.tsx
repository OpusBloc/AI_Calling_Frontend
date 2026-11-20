"use client";

import { useEffect, useRef, useState } from "react";

type VolumeDialProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
};

const MIN = 0;
const MAX = 5;
const STEP = 0.1;
const CENTER = 48;
const RADIUS = 38;
const ARC_LENGTH = (2 * Math.PI * RADIUS * 270) / 360;

const clampAndRound = (value: number) => Math.min(MAX, Math.max(MIN, Math.round(value * 10) / 10));

function pointOnArc(value: number) {
  const angle = ((135 + (clampAndRound(value) / MAX) * 270) * Math.PI) / 180;
  return { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) };
}

export default function VolumeDial({ value, onChange, label = "Playback volume" }: VolumeDialProps) {
  const [draft, setDraft] = useState(value.toFixed(1));
  const editingRef = useRef(false);
  const cancelBlurRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!editingRef.current) setDraft(value.toFixed(1));
  }, [value]);

  const commitDraft = () => {
    editingRef.current = false;
    if (cancelBlurRef.current) {
      cancelBlurRef.current = false;
      return;
    }
    const parsed = Number(draft);
    if (draft.trim() && Number.isFinite(parsed)) {
      const next = clampAndRound(parsed);
      onChange(next);
      setDraft(next.toFixed(1));
    } else {
      setDraft(value.toFixed(1));
    }
  };

  const setFromPointer = (clientX: number, clientY: number) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = clientX - bounds.left - bounds.width / 2;
    const y = clientY - bounds.top - bounds.height / 2;
    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    let position = angle - 135;
    if (position < 0) position += 360;
    if (position > 270) position = position <= 315 ? 270 : 0;
    onChange(clampAndRound((position / 270) * MAX));
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromPointer(event.clientX, event.clientY);
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    let next = value;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next += STEP;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next -= STEP;
    else if (event.key === "Home") next = MIN;
    else if (event.key === "End") next = MAX;
    else return;
    event.preventDefault();
    onChange(clampAndRound(next));
  };

  const handleTextKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelBlurRef.current = true;
      editingRef.current = false;
      setDraft(value.toFixed(1));
      event.currentTarget.blur();
    }
  };

  const handle = pointOnArc(value);

  return (
    <div className="relative h-24 w-24 shrink-0">
        <svg
          ref={svgRef}
          viewBox="0 0 96 96"
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={value}
          aria-valuetext={`${value.toFixed(1)} of 5`}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          className="absolute inset-0 touch-none cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46b5] focus-visible:ring-offset-2"
        >
          <title>{label}</title>
          <path d="M 21.13 74.87 A 38 38 0 1 1 74.87 74.87" fill="none" stroke="#d9d6f0" strokeWidth="6" strokeLinecap="round" />
          <path d="M 21.13 74.87 A 38 38 0 1 1 74.87 74.87" fill="none" stroke="#4f46b5" strokeWidth="6" strokeLinecap="round" strokeDasharray={ARC_LENGTH} strokeDashoffset={ARC_LENGTH * (1 - clampAndRound(value) / MAX)} />
          <circle cx={handle.x} cy={handle.y} r="6" fill="white" stroke="#4f46b5" strokeWidth="2.5" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            aria-label={`${label} value`}
            onFocus={() => { editingRef.current = true; }}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={handleTextKeyDown}
            className="pointer-events-auto h-7 w-9 rounded border border-[#d9d6f0] bg-white px-0.5 text-center text-base font-semibold tabular-nums text-[#312e81] outline-none focus-visible:ring-2 focus-visible:ring-[#4f46b5]"
          />
          <span className="text-[9px] leading-tight text-[#68658b]">of 5</span>
        </div>
    </div>
  );
}
