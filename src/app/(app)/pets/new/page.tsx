import type { Metadata } from "next";
import { RegisterPetFlow } from "@/features/pet-form";

export const metadata: Metadata = { title: "개체 등록" };

export default async function NewPetPage({ searchParams }: PageProps<"/pets/new">) {
  const { onboarding } = await searchParams;
  return <RegisterPetFlow onboarding={onboarding === "1"} />;
}
