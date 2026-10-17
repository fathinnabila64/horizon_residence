import Benefits from "@/components/Benefits";
import Compare from "@/components/Compare";
import EnquiryForm from "@/components/EnquiryForm";
import Explorer from "@/components/Explorer";
import Faq from "@/components/Faq";
import Hero from "@/components/Hero";
import { ShortlistProvider } from "@/components/ShortlistContext";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export default function Home() {
  return (
    <ShortlistProvider>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Benefits />
        <Explorer />
        <Compare />
        <Faq />
        <EnquiryForm />
      </main>
      <SiteFooter />
    </ShortlistProvider>
  );
}
