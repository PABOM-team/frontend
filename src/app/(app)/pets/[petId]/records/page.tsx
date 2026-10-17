import type { Metadata } from "next";
import { PetRecordsScreen } from "./pet-records-screen";

export const metadata: Metadata = { title: "전체 기록" };

export default function PetRecordsPage() {
  return <PetRecordsScreen />;
}
