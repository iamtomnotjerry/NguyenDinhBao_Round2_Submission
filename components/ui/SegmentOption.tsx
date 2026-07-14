'use client';

import { cn, btnInteractive, hoverIdle } from '@/lib/utils';
import { useCallback, useRef } from 'react';
import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from 'react';

export type SegmentOptionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  /** Dense chips (finishes, sim cards) */
  dense?: boolean;
  /** Use radio semantics when inside role="radiogroup" */
  radio?: boolean;
};

/** Segment / chip control for option groups (print config, saved cards). */
export function SegmentOption({
  selected,
  dense,
  radio,
  className,
  type = 'button',
  ...props
}: SegmentOptionProps) {
  return (
    <button
      type={type}
      role={radio ? 'radio' : undefined}
      aria-checked={radio ? Boolean(selected) : undefined}
      className={cn(
        btnInteractive,
        'rounded-xl border font-bold transition-colors',
        dense ? 'px-2.5 py-1.5 text-[10px] rounded-lg' : 'py-2 px-1 text-xs',
        selected
          ? 'border-emerald-500 bg-emerald-500/5 text-fg'
          : cn('border-edge text-secondary hover:border-edge-strong', hoverIdle),
        className,
      )}
      {...props}
    />
  );
}

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREV_KEYS = ['ArrowLeft', 'ArrowUp'];

/**
 * Wrapper that marks a group of SegmentOptions as a radiogroup.
 * Implements WAI-ARIA radiogroup keyboard support (Arrow / Home / End):
 * moving focus also selects, matching native radio behaviour.
 * Options stay in the natural tab order (no roving tabindex) so groups
 * without a current selection remain keyboard-reachable.
 */
export function SegmentGroup({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const groupRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const isNext = NEXT_KEYS.includes(event.key);
    const isPrev = PREV_KEYS.includes(event.key);
    const isHome = event.key === 'Home';
    const isEnd = event.key === 'End';
    if (!isNext && !isPrev && !isHome && !isEnd) return;

    const group = groupRef.current;
    if (!group) return;

    const radios = Array.from(
      group.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'),
    );
    if (radios.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    const currentIndex = radios.findIndex((radio) => radio === active);

    let targetIndex: number;
    if (isHome) {
      targetIndex = 0;
    } else if (isEnd) {
      targetIndex = radios.length - 1;
    } else if (currentIndex === -1) {
      targetIndex = 0;
    } else {
      const delta = isNext ? 1 : -1;
      targetIndex = (currentIndex + delta + radios.length) % radios.length;
    }

    event.preventDefault();
    const target = radios[targetIndex];
    target.focus();
    target.click();
  }, []);

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      className={className}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
