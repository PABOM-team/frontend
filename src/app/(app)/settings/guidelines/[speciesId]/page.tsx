import type { Metadata } from "next";
import { SpeciesGuidelineScreen } from "./species-guideline-screen";

export const metadata: Metadata = { title: "종 가이드라인" };

export default function SpeciesGuidelinePage() {
  return <SpeciesGuidelineScreen />;
}
