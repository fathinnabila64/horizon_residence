"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#why", label: "Why sunlight" },
  { href: "#explorer", label: "Unit picker" },
  { href: "#compare", label: "Shortlist" },
  { href: "#faq", label: "FAQ" },
];

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <a href="#top" className={`wordmark${onDark ? " on-dark" : ""}`} aria-label="Horizon Residence, back to top">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
        <circle cx="14" cy="14" r="6" fill="#F2B13C" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={14 + Math.cos(a) * 9}
              y1={14 + Math.sin(a) * 9}
              x2={14 + Math.cos(a) * 12.5}
              y2={14 + Math.sin(a) * 12.5}
              stroke="#F2B13C"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <span>
        Horizon<span className="wordmark-thin"> Residence</span>
      </span>
    </a>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  // Escape closes the mobile menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header" id="top">
      <div className="container header-inner">
        <Wordmark />
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav id="primary-nav" className={`primary-nav${open ? " is-open" : ""}`} aria-label="Primary">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a className="btn btn-primary btn-small" href="#enquiry" onClick={() => setOpen(false)}>
                Book a viewing
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
