import { PRICE_RANGE, TOWER, UNITS } from "@/lib/units";
import { formatRMShort } from "@/lib/format";

function HeroArt() {
  // Original illustration: a tower, a neighbour and the sun's arc over them.
  return (
    <svg className="hero-art" viewBox="0 0 480 420" role="img" aria-label="Illustration of a condo tower with the sun's path arcing over it">
      <path d="M40 330 Q240 -40 440 330" fill="none" stroke="#B4561F" strokeWidth="2.5" strokeDasharray="3 9" strokeLinecap="round" />
      <circle cx="372" cy="150" r="30" fill="#F2B13C" />
      <circle cx="372" cy="150" r="46" fill="#F2B13C" opacity="0.22" />
      <rect x="40" y="330" width="400" height="6" rx="3" fill="#1F2A30" opacity="0.85" />
      <rect x="86" y="230" width="86" height="100" fill="#CFC6B2" />
      <rect x="196" y="110" width="116" height="220" fill="#1E5A5F" />
      {Array.from({ length: 9 }, (_, r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={208 + c * 34}
            y={124 + r * 22}
            width="24"
            height="12"
            rx="2"
            fill={c === 2 && r > 1 && r < 6 ? "#F2B13C" : "#9FD0D6"}
          />
        )),
      )}
      <polygon points="312,330 312,300 372,330" fill="#1F2A30" opacity="0.14" />
      <rect x="336" y="260" width="70" height="70" fill="#B9B3A6" />
    </svg>
  );
}

export default function Hero() {
  const total = UNITS.length;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">Horizon Residence · Petaling Jaya · fictional demo project</p>
          <h1 id="hero-title">Choosing a condo? See where the sun goes before you sign.</h1>
          <p className="lead">
            Two homes can share a floor plan and feel nothing alike. Pick a unit, scrub through the day in 3D, and know
            which one stays cool at 4 pm or bright at 8 am.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#explorer">
              Explore units by sunlight
            </a>
            <a className="btn btn-secondary" href="#enquiry">
              Book a viewing
            </a>
          </div>
          <dl className="facts">
            <div>
              <dt>Homes</dt>
              <dd>{total} in one {TOWER.lastFloor}-storey tower</dd>
            </div>
            <div>
              <dt>Sizes</dt>
              <dd>2–3 bedrooms</dd>
            </div>
            <div>
              <dt>From</dt>
              <dd>{formatRMShort(PRICE_RANGE.min)}</dd>
            </div>
          </dl>
        </div>
        <div className="hero-visual">
          <HeroArt />
        </div>
      </div>
    </section>
  );
}
