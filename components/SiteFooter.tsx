import { Wordmark } from "./SiteHeader";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Wordmark onDark />
          <p className="footer-note">
            Horizon Residence is a fictional project created for a web designer practical assessment. Units, prices and
            surrounding buildings are invented. No personal data is collected.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul>
            <li><a href="#explorer">Unit picker</a></li>
            <li><a href="#compare">Shortlist</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#enquiry">Book a viewing</a></li>
            <li><a href="#top">Back to top</a></li>
          </ul>
        </nav>
        <p className="credits">
          Built with Next.js, React Three Fiber and three.js (MIT). Fonts: Fraunces and DM Sans via Fontsource (SIL OFL).
          Sun position: NOAA solar equations. Illustrations are original.
        </p>
      </div>
    </footer>
  );
}
