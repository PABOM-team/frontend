import type { Metadata } from "next";
import { PetsScreen } from "./pets-screen";

export const metadata: Metadata = { title: "개체" };

export default function PetsPage() {
  return <PetsScreen />;
}
