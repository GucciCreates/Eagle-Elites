'use client';

import { optionLabel, toHHMM, type TimeOption } from '@/lib/time-options';

type TimeSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: TimeOption[];
  className: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

/**
 * Dropdown of admin-defined times. Falls back to a plain time input when
 * no options are configured, so nothing breaks before admins set them up.
 */
export default function TimeSelect({
  id,
  value,
  onChange,
  options,
  className,
  placeholder = 'Select a time…',
  required,
  disabled,
}: TimeSelectProps) {
  if (options.length === 0) {
    return (
      <input
        id={id}
        type="time"
        value={toHHMM(value)}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        required={required}
        disabled={disabled}
      />
    );
  }

  const current = toHHMM(value);
  const known = options.some((o) => toHHMM(o.time_value) === current);

  return (
    <select
      id={id}
      value={known ? current : ''}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      required={required}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={toHHMM(option.time_value)}>
          {optionLabel(option)}
        </option>
      ))}
    </select>
  );
}
