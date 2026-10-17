"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Period } from "@/lib/exposure";

export const SHORTLIST_LIMIT = 4;

type ShortlistState = {
  shortlist: string[];
  notice: string;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** which part of the year the hours of sun are averaged over */
  period: Period;
  setPeriod: (p: Period) => void;
};

const Ctx = createContext<ShortlistState | null>(null);

/**
 * Holds the shortlist, shared by the explorer, the comparison table and the enquiry form.
 * Kept in memory only - never stored.
 */
export function ShortlistProvider({ children }: { children: ReactNode }) {
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState<Period>("year");

  const toggle = useCallback((id: string) => {
    setShortlist((cur) => {
      if (cur.includes(id)) {
        setNotice(`Removed ${id} from your shortlist.`);
        return cur.filter((x) => x !== id);
      }
      if (cur.length >= SHORTLIST_LIMIT) {
        setNotice(`Your shortlist holds up to ${SHORTLIST_LIMIT} units. Remove one to add ${id}.`);
        return cur;
      }
      setNotice(`Added ${id} to your shortlist.`);
      return [...cur, id];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setShortlist((cur) => cur.filter((x) => x !== id));
    setNotice(`Removed ${id} from your shortlist.`);
  }, []);

  const clear = useCallback(() => {
    setShortlist([]);
    setNotice("Shortlist cleared.");
  }, []);

  const value = useMemo(
    () => ({ shortlist, notice, toggle, remove, clear, period, setPeriod }),
    [shortlist, notice, toggle, remove, clear, period],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShortlist(): ShortlistState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShortlist must be used inside <ShortlistProvider>");
  return ctx;
}
