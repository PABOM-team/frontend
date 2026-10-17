import type { Metadata } from "next";
import { EditPetScreen } from "./edit-pet-screen";

export const metadata: Metadata = { title: "개체 정보 수정" };

export default function EditPetPage() {
  return <EditPetScreen />;
}
