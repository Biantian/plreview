"use client";

import { useId } from "react";

type TableSearchInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function TableSearchInput({
  label,
  value,
  onChange,
}: TableSearchInputProps) {
  const inputId = useId();

  return (
    <label className="stack table-search" htmlFor={inputId}>
      <span className="muted">{label}</span>
      <input
        aria-label={label}
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        placeholder="输入关键词筛选"
        role="searchbox"
        value={value}
      />
    </label>
  );
}
