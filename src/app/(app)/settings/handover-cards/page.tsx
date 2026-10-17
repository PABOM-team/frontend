import type { Metadata } from "next";
import { HandoverCardsScreen } from "./handover-cards-screen";

export const metadata: Metadata = { title: "보낸 인계 카드" };

export default function HandoverCardsPage() {
  return <HandoverCardsScreen />;
}
