import { redirect } from "next/navigation";

// 로그인 안 했으면 RequireAuth가 첫 화면(/welcome)으로 보낸다
export default function RootPage() {
  redirect("/home");
}
