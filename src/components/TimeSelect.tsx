"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type Parts = { hour: string; minute: string; period: string };

const partsFromValue = (value: string): Parts => {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return { hour: "", minute: "", period: "" };
  const hour24 = Number(match[1]);
  return {
    hour: String(hour24 % 12 || 12),
    minute: match[2],
    period: hour24 < 12 ? "AM" : "PM",
  };
};

const toValue = ({ hour, minute, period }: Parts) => {
  if (!hour || !minute || !period) return "";
  const parsedHour = Number(hour) % 12 + (period === "PM" ? 12 : 0);
  return `${String(parsedHour).padStart(2, "0")}:${minute}`;
};

export default function TimeSelect({
  value,
  onChange,
  label,
  className,
}: {
  /** 24-hour value, formatted HH:mm. */
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const [parts, setParts] = useState<Parts>(() => partsFromValue(value));

  useEffect(() => setParts(partsFromValue(value)), [value]);

  const update = (next: Parts) => {
    setParts(next);
    onChange(toValue(next));
  };

  const selectClass = "min-h-[44px] w-full min-w-0 flex-1 bg-transparent px-1 text-base text-heading outline-none dark:[color-scheme:dark]";

  return (
    <div className={clsx("grid w-full min-w-0 grid-cols-3 divide-x divide-hairline-strong rounded-md border border-hairline-strong bg-surface-input px-1 focus-within:ring-2 focus-within:ring-[var(--input-glow)]", className)}>
      <select aria-label={`${label} hour`} value={parts.hour} onChange={(event) => update({ ...parts, hour: event.target.value })} className={selectClass}>
        <option value="">Hour</option>
        {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
      </select>
      <select aria-label={`${label} minute`} value={parts.minute} onChange={(event) => update({ ...parts, minute: event.target.value })} className={selectClass}>
        <option value="">Min</option>
        {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")).map((minute) => <option key={minute} value={minute}>{minute}</option>)}
      </select>
      <select aria-label={`${label} AM or PM`} value={parts.period} onChange={(event) => update({ ...parts, period: event.target.value })} className={selectClass}>
        <option value="">AM/PM</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
