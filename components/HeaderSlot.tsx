'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type HostSetter = (node: HTMLElement | null) => void;

const HeaderActionsElContext = createContext<HTMLElement | null>(null);
const HeaderActionsSetContext = createContext<HostSetter | null>(null);

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const setHost = useCallback<HostSetter>((node) => {
    setEl(node);
  }, []);

  return (
    <HeaderActionsSetContext.Provider value={setHost}>
      <HeaderActionsElContext.Provider value={el}>{children}</HeaderActionsElContext.Provider>
    </HeaderActionsSetContext.Provider>
  );
}

/** Portal mount point inside the global Header — registers before paint via layout effect. */
export function HeaderActionsHost({ className }: { className?: string }) {
  const setHost = useContext(HeaderActionsSetContext);
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    setHost?.(node);
    return () => setHost?.(null);
  }, [node, setHost]);

  return <div ref={setNode} className={className} />;
}

/** Page-specific header controls without remounting the global Header. */
export function HeaderSlot({ children }: { children: ReactNode }) {
  const host = useContext(HeaderActionsElContext);
  if (!host) return null;
  return createPortal(children, host);
}
