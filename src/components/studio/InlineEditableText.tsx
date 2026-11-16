'use client';

import React, { useRef, useEffect } from 'react';

export interface InlineEditableTextProps {
  value: string;
  editable?: boolean;
  ariaLabel?: string;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  as?: React.ElementType;
  style?: React.CSSProperties;
  onSave: (value: string) => void;
}

export function InlineEditableText({
  value,
  editable = true,
  ariaLabel,
  className = '',
  placeholder = 'Nhấp để chỉnh sửa...',
  multiline = false,
  as: Component = 'span',
  style,
  onSave,
}: InlineEditableTextProps) {
  const ref = useRef<HTMLElement>(null);

  // Sync content with value prop when not actively focused
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.textContent = value || '';
    }
  }, [value]);

  if (!editable) {
    return (
      <Component className={className} style={style}>
        {value || placeholder}
      </Component>
    );
  }

  return (
    <Component
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel || 'Chỉnh sửa trực tiếp'}
      style={style}
      onClick={(event: React.MouseEvent) => {
        if (editable) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onBlur={(event: React.FocusEvent<HTMLElement>) => {
        const nextValue = event.currentTarget.textContent?.trim() ?? '';
        if (nextValue !== value) {
          onSave(nextValue);
        }
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={`${className} cursor-text transition-all rounded px-0.5 hover:bg-amber-100/60 hover:outline-dashed hover:outline-1 hover:outline-amber-400 focus:bg-white focus:outline-2 focus:outline-amber-500 focus:ring-2 focus:ring-amber-200/60`}
      title="Nhấp vào để chỉnh sửa trực tiếp"
    >
      {value || placeholder}
    </Component>
  );
}
