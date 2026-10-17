"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { parseISODate, type DateParts } from "@/lib/sun";

export const SHORTLIST_LIMIT = 4;
export const DEFAULT_DATE = "2026-03-20";

type ShortlistState = {
  shortlist: string[];
  notice: string;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** raw value of the date input */
  dateInput: string;
  setDateInput: (value: string) => void;
  /** last valid date, used for all sun calculations */
  date: DateParts;
  dateError: boolean;
};

const Ctx = createContext<ShortlistState | null>(null);

function isSupportedYear(d: DateParts | null): d is DateParts {
  return d !== null && d.year >= 2020 && d.year <= 2100;
}

/**
 * Holds the state shared by the explorer, the comparison table and the enquiry form:
 * the shortlist (kept in memory only - never stored) and the chosen date.
 */
export function ShortlistProvider({ children }: { children: ReactNode }) {
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [dateInput, setDateInputRaw] = useState(DEFAULT_DATE);
  const [date, setDate] = useState<DateParts>(() => parseISODate(DEFAULT_DATE)!);
  const [dateError, setDateError] = useState(false);

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

  const setDateInput = useCallback((value: string) => {
    setDateInputRaw(value);
    const parsed = parseISODate(value);
    if (isSupportedYear(parsed)) {
      setDate(parsed);
      setDateError(false);
    } else {
      setDateError(true);
    }
  }, []);

  const value = useMemo(
    () => ({ shortlist, notice, toggle, remove, clear, dateInput, setDateInput, date, dateError }),
    [shortlist, notice, toggle, remove, clear, dateInput, setDateInput, date, dateError],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShortlist(): ShortlistState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShortlist must be used inside <ShortlistProvider>");
  return ctx;
}
