import type { Metadata } from "next";
import { PetList } from "./pet-list";

export const metadata: Metadata = { title: "개체" };

export default function PetsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">내 개체</h1>
      <PetList />
    </section>
  );
}
