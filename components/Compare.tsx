"use client";

import { useMemo } from "react";
import { computeYearly, formatHours, PERIOD_LABEL } from "@/lib/exposure";
import { formatRM } from "@/lib/format";
import { FACING_LABEL, UNIT_BY_ID } from "@/lib/units";
import { SHORTLIST_LIMIT, useShortlist } from "./ShortlistContext";

export default function Compare() {
  const { shortlist, remove, clear, notice, period } = useShortlist();

  const rows = useMemo(
    () =>
      shortlist
        .map((id) => UNIT_BY_ID.get(id))
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .map((unit) => ({ unit, e: computeYearly(unit, period) })),
    [shortlist, period],
  );

  const coolest = rows.length > 1 ? rows.reduce((a, b) => (b.e.afternoon < a.e.afternoon ? b : a)) : null;
  const brightest = rows.length > 1 ? rows.reduce((a, b) => (b.e.morning > a.e.morning ? b : a)) : null;

  return (
    <section id="compare" className="section section-tint" aria-labelledby="compare-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Shortlist</p>
          <h2 id="compare-title">Compare your shortlist side by side</h2>
          <p className="lead">
            Add up to {SHORTLIST_LIMIT} units from the picker. Hours of sun are averages per day for {PERIOD_LABEL[period].toLowerCase()}.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="empty-state">
            <p>
              <strong>Nothing shortlisted yet.</strong>
            </p>
            <p>
              Use “Shortlist” on any unit in the <a href="#explorer">unit picker</a> and it will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="compare-table">
                <caption className="sr-only">Shortlisted units compared by size, price and hours of direct sun</caption>
                <thead>
                  <tr>
                    <th scope="col">Unit</th>
                    <th scope="col">Facing</th>
                    <th scope="col">Size</th>
                    <th scope="col">Price</th>
                    <th scope="col">Morning sun</th>
                    <th scope="col">Afternoon sun</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ unit, e }) => (
                    <tr key={unit.id}>
                      <th scope="row" data-label="Unit">
                        {unit.id}
                        <span className="unit-sub">Floor {unit.floor}</span>
                      </th>
                      <td data-label="Facing">{FACING_LABEL[unit.facing]}</td>
                      <td data-label="Size">
                        {unit.bedrooms} bed · {unit.sqft.toLocaleString("en-MY")} sq ft
                      </td>
                      <td data-label="Price">{formatRM(unit.priceRM)}</td>
                      <td data-label="Morning sun">{formatHours(e.morning)}</td>
                      <td data-label="Afternoon sun">{formatHours(e.afternoon)}</td>
                      <td data-label="">
                        <button type="button" className="btn btn-quiet" onClick={() => remove(unit.id)}>
                          Remove<span className="sr-only"> unit {unit.id}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {coolest && brightest && (
              <p className="compare-summary">
                Least afternoon sun: <strong>Unit {coolest.unit.id}</strong> ({formatHours(coolest.e.afternoon)}). Most
                morning sun: <strong>Unit {brightest.unit.id}</strong> ({formatHours(brightest.e.morning)}).
              </p>
            )}
            <div className="compare-actions">
              <a className="btn btn-primary" href="#enquiry">
                Book a viewing for these units
              </a>
              <button type="button" className="btn btn-quiet" onClick={clear}>
                Clear shortlist
              </button>
            </div>
          </>
        )}
        <p className="sr-only" aria-live="polite">
          {notice}
        </p>
      </div>
    </section>
  );
}
