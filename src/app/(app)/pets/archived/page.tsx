import type { Metadata } from "next";
import { ArchivedPetsScreen } from "./archived-pets-screen";

export const metadata: Metadata = { title: "함께했던 개체" };

export default function ArchivedPetsPage() {
  return <ArchivedPetsScreen />;
}
