import type { Metadata } from "next";
import { PetDetailScreen } from "./pet-detail-screen";

export const metadata: Metadata = { title: "개체 상세" };

export default function PetDetailPage() {
  return <PetDetailScreen />;
}
