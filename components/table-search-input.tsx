"use client";

import { useId } from "react";

type TableSearchInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function TableSearchInput({
  label,
  placeholder,
  value,
  onChange,
}: TableSearchInputProps) {
  const inputId = useId();

  return (
    <label className="table-search" htmlFor={inputId}>
      <span aria-hidden="true" className="table-search-icon">
        <svg fill="none" viewBox="0 0 16 16">
          <path
            d="M11.5 11.5L14 14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
          <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <input
        aria-label={label}
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        role="searchbox"
        value={value}
      />
    </label>
  );
}
