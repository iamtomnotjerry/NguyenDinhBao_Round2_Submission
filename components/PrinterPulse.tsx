'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PrinterPulseProps {
  className?: string;
  loop?: boolean;
}

export default function PrinterPulse({ className, loop = true }: PrinterPulseProps) {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/lottie/printer-pulse.json')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div
        className={cn(
          'w-16 h-16 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin',
          className,
        )}
      />
    );
  }

  return (
    <Lottie animationData={data} loop={loop} className={cn('w-20 h-20', className)} aria-hidden />
  );
}
