"use client";

import { useId, useState } from "react";
import { Eye, EyeSlash, type Icon } from "@phosphor-icons/react";

export function AuthTextField({
  label,
  type = "text",
  icon: IconComponent,
  value,
  onChange,
  required,
  autoComplete,
}: {
  label: string;
  type?: string;
  icon: Icon;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-secondary">
        {label}
      </label>
      <div className="relative">
        <IconComponent
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          id={id}
          type={inputType}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-background/50 py-2.5 pl-10 pr-10 text-base outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
          >
            {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
