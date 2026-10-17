import type { Metadata } from "next";
import { CreateHandoverScreen } from "./create-handover-screen";

export const metadata: Metadata = { title: "인계 카드 만들기" };

export default function CreateHandoverPage() {
  return <CreateHandoverScreen />;
}
