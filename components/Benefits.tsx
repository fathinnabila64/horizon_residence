const ITEMS = [
  {
    title: "East or west? Know your heat",
    body: "Near the equator the sun rises in the east and sets in the west all year. A west-facing window can take hours of direct sun in the late afternoon; an east-facing one gets it before lunch.",
  },
  {
    title: "Floors and neighbours matter",
    body: "A lower unit may sit in the shadow of the block next door. The model includes two neighbouring buildings, so you can see which floors clear the shade.",
  },
  {
    title: "Decide with numbers, not hunches",
    body: "Every unit gets its average hours of morning and afternoon sun across the year. Shortlist up to four and compare them side by side before you book a viewing.",
  },
];

export default function Benefits() {
  return (
    <section id="why" className="section" aria-labelledby="why-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Why sunlight</p>
          <h2 id="why-title">The decision brochures never show you</h2>
        </header>
        <ul className="cards">
          {ITEMS.map((item, i) => (
            <li className="card" key={item.title}>
              <span className="card-num" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
