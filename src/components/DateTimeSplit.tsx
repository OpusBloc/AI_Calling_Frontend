"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import TimeSelect from "@/components/TimeSelect";

const splitValue = (value: string) => {
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
};

export default function DateTimeSplit({
  value,
  onChange,
  label,
  className,
}: {
  /** datetime-local value, formatted YYYY-MM-DDTHH:mm. */
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const [parts, setParts] = useState(() => splitValue(value));

  useEffect(() => setParts(splitValue(value)), [value]);

  const changeDate = (date: string) => {
    const time = parts.time || "00:00";
    setParts({ date, time: date ? time : parts.time });
    onChange(date ? `${date}T${time}` : "");
  };

  const changeTime = (time: string) => {
    setParts((current) => ({ ...current, time }));
    if (parts.date) onChange(`${parts.date}T${time || "00:00"}`);
  };

  return (
    <div className={clsx("w-full min-w-0 space-y-2", className)}>
      <input
        type="date"
        aria-label={`${label} date`}
        value={parts.date}
        onChange={(event) => changeDate(event.target.value)}
        className="min-h-[44px] w-full min-w-0 rounded-md border border-hairline-strong bg-surface-input px-3 text-base text-heading outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)] dark:[color-scheme:dark]"
      />
      <TimeSelect label={`${label} time`} value={parts.time} onChange={changeTime} />
    </div>
  );
}
