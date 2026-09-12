import Instagram from "@/components/sections/instagram";
import Landing from "@/components/sections/landing";
import Leadership from "@/components/sections/leadership";
import Projects from "@/components/sections/projects";
import AppDevHacks from "@/components/sections/appdevhacks";
import Roadmap from "@/components/sections/roadmap";
import Sponsors from "@/components/sections/sponsors";
import WhatIsAdc from "@/components/sections/whatIsAdc";
import { showHackathonLink } from "@/data/links-and-feature-flags";

export default function Home() {
  return (
    <main className="w-full flex flex-col items-center justify-center">
      <Landing />
      <WhatIsAdc />
      <Roadmap />
      <Projects />
      <Leadership />
      <Sponsors />
      {showHackathonLink && <AppDevHacks />}
      <Instagram />
    </main>
  );
}
