'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

/** Soft App Router navigation — prefer next/link over view-transition Link. */
export function TransitionLink(props: ComponentProps<typeof Link>) {
  return <Link prefetch {...props} />;
}
