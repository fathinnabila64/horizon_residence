"use client";

import { useRef, useState, type FormEvent } from "react";
import { useShortlist } from "./ShortlistContext";

type Values = {
  name: string;
  email: string;
  phone: string;
  slot: string;
  notes: string;
  consent: boolean;
};

type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: "", email: "", phone: "", slot: "", notes: "", consent: false };

const SLOTS = [
  { value: "sat-am", label: "Saturday morning" },
  { value: "sat-pm", label: "Saturday afternoon" },
  { value: "sun-am", label: "Sunday morning" },
  { value: "sun-pm", label: "Sunday afternoon" },
];

export function validate(v: Values): Errors {
  const errors: Errors = {};
  const name = v.name.trim();
  if (name.length < 2) errors.name = "Enter your full name (at least 2 characters).";
  if (!v.email.trim()) errors.email = "Enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) errors.email = "Enter a valid email, like name@example.com.";
  const phone = v.phone.replace(/[\s-]/g, "");
  if (phone && !/^(\+?60|0)1\d{8,9}$/.test(phone)) errors.phone = "Use a Malaysian mobile number, like 012-345 6789, or leave it blank.";
  if (!v.slot) errors.slot = "Choose a viewing slot.";
  if (!v.consent) errors.consent = "Please confirm you understand this is a demo.";
  return errors;
}

const ORDER: (keyof Values)[] = ["name", "email", "phone", "slot", "consent"];

export default function EnquiryForm() {
  const { shortlist } = useShortlist();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sentFor, setSentFor] = useState<{ first: string; slot: string; units: string[] } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Values>(key: K, v: Values[K]) => {
    const next = { ...values, [key]: v };
    setValues(next);
    // once a field has shown an error, re-check it as the person fixes it
    if (errors[key]) {
      const fresh = validate(next)[key];
      setErrors((cur) => ({ ...cur, [key]: fresh }));
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    const firstBad = ORDER.find((k) => found[k]);
    if (firstBad) {
      // focus the error summary so keyboard and screen reader users land on it
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    // Demo only: nothing is sent, stored or logged. We keep just enough in memory to show the confirmation.
    setSentFor({
      first: values.name.trim().split(/\s+/)[0],
      slot: SLOTS.find((s) => s.value === values.slot)?.label ?? "",
      units: shortlist,
    });
    setValues(EMPTY);
    window.setTimeout(() => successRef.current?.focus(), 0);
  };

  const errorKeys = ORDER.filter((k) => errors[k]);
  const fieldProps = (key: keyof Values) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });
  const err = (key: keyof Values) =>
    errors[key] ? (
      <p className="field-error" id={`${key}-error`}>
        {errors[key]}
      </p>
    ) : null;

  return (
    <section id="enquiry" className="section" aria-labelledby="enquiry-title">
      <div className="container enquiry-grid">
        <header className="section-head">
          <p className="eyebrow">Book a viewing</p>
          <h2 id="enquiry-title">See it in person, at the right time of day</h2>
          <p className="lead">
            Pick a weekend slot and we will walk you through your shortlisted homes, with the sun where you expect it.
          </p>
          <p className="demo-badge">Demo form: nothing is sent, saved or logged.</p>
        </header>

        {sentFor ? (
          <div className="form-card success" ref={successRef} tabIndex={-1} role="status">
            <h3>Thanks, {sentFor.first}. Your demo viewing request is ready.</h3>
            <p>
              Slot: <strong>{sentFor.slot}</strong>.{" "}
              {sentFor.units.length > 0 ? (
                <>
                  Units: <strong>{sentFor.units.join(", ")}</strong>.
                </>
              ) : (
                "No units were shortlisted."
              )}
            </p>
            <p className="muted">
              This is a fictional project, so no email was sent and your details were not stored. Refreshing the page
              clears everything.
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => setSentFor(null)}>
              Make another request
            </button>
          </div>
        ) : (
          <form className="form-card" onSubmit={onSubmit} noValidate aria-describedby="demo-note">
            {errorKeys.length > 0 && (
              <div className="error-summary" ref={summaryRef} tabIndex={-1} role="alert">
                <h3>Please fix {errorKeys.length === 1 ? "1 problem" : `${errorKeys.length} problems`}</h3>
                <ul>
                  {errorKeys.map((k) => (
                    <li key={k}>
                      <a
                        href={`#${k}`}
                        onClick={(ev) => {
                          ev.preventDefault();
                          document.getElementById(k)?.focus();
                        }}
                      >
                        {errors[k]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="field">
              <label htmlFor="name">
                Full name <span className="req">(required)</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                {...fieldProps("name")}
              />
              {err("name")}
            </div>

            <div className="field">
              <label htmlFor="email">
                Email <span className="req">(required)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                {...fieldProps("email")}
              />
              {err("email")}
            </div>

            <div className="field">
              <label htmlFor="phone">Mobile number (optional)</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="012-345 6789"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
                {...fieldProps("phone")}
              />
              {err("phone")}
            </div>

            <div className="field">
              <label htmlFor="slot">
                Preferred viewing slot <span className="req">(required)</span>
              </label>
              <select id="slot" name="slot" value={values.slot} onChange={(e) => set("slot", e.target.value)} {...fieldProps("slot")}>
                <option value="">Choose a slot…</option>
                {SLOTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {err("slot")}
            </div>

            <div className="field">
              <span className="label-like" id="units-label">
                Units to view
              </span>
              <p className="units-chosen" aria-labelledby="units-label">
                {shortlist.length > 0 ? (
                  shortlist.map((id) => (
                    <span className="tag" key={id}>
                      {id}
                    </span>
                  ))
                ) : (
                  <span className="muted">None yet. Shortlist units in the picker above, or ask us to suggest some.</span>
                )}
              </p>
            </div>

            <div className="field">
              <label htmlFor="notes">Anything else? (optional)</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            <div className="field field-check">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                checked={values.consent}
                onChange={(e) => set("consent", e.target.checked)}
                {...fieldProps("consent")}
              />
              <label htmlFor="consent">I understand this is a demo and my details are not sent or stored.</label>
              {err("consent")}
            </div>

            <p id="demo-note" className="muted small">
              Please don&apos;t enter real personal details. Use made-up ones.
            </p>
            <button type="submit" className="btn btn-primary btn-block">
              Request demo viewing
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
