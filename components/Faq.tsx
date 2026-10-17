const QA = [
  {
    q: "How accurate is the sun model?",
    a: "The sun's position uses the NOAA solar equations for Petaling Jaya's latitude and longitude, accurate to roughly a tenth of a degree. Shading uses simple box shapes for the towers, so real balconies, trees, cloud and haze are not included. Treat the hours as a guide, not a guarantee.",
  },
  {
    q: "What does “direct sun” mean here?",
    a: "A window counts as sunlit when the sun is more than 4° above the horizon, the window faces the sun, and nothing blocks a straight line from the window to the sun. Samples are taken every 10 minutes between 6:00 am and 7:30 pm.",
  },
  {
    q: "Why split morning and afternoon at solar noon?",
    a: "In Malaysia the sun is highest around 1:10 to 1:25 pm on the clock, not 12:00. Splitting at solar noon puts east-facing sun in the morning column and west-facing sun in the afternoon column, which is how people actually feel it.",
  },
  {
    q: "Are the prices and units real?",
    a: "No. Horizon Residence is a fictional project made for a web design assessment. Sizes, prices and the surrounding buildings are invented demo content.",
  },
  {
    q: "What happens to the details I enter?",
    a: "Nothing. The viewing form is a demo: it validates your input in the browser and shows a confirmation, but it never sends, stores or logs what you type. The shortlist lives in memory and disappears when you refresh.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="section" aria-labelledby="faq-title">
      <div className="container container-narrow">
        <header className="section-head">
          <p className="eyebrow">Good to know</p>
          <h2 id="faq-title">Questions buyers ask</h2>
        </header>
        <div className="faq">
          {QA.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
