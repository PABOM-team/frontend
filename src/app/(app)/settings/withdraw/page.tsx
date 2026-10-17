import type { Metadata } from "next";
import { WithdrawScreen } from "./withdraw-screen";

export const metadata: Metadata = { title: "회원 탈퇴" };

export default function WithdrawPage() {
  return <WithdrawScreen />;
}
