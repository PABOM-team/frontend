"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { meQueries } from "@/entities/session";
import { LoginButtons, safeNext } from "@/features/auth";
import { PabomAppIcon, PabomLogo } from "@/shared/ui/pabom-logo";
import { Screen, ScreenFooter } from "@/shared/ui/screen";

/** SCR-A01 첫 화면. Figma 그대로: 로고와 카카오·구글 버튼만 */
export function WelcomeScreen() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { data: me } = useQuery({ ...meQueries.detail(), retry: false });

  useEffect(() => {
    if (me) router.replace(me.status === "PENDING_TERMS" ? "/agreements" : (next ?? "/home"));
  }, [me, next, router]);

  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <PabomAppIcon size={72} className="mb-5 shadow-[0_8px_24px_rgba(41,153,255,0.3)]" />
        <PabomLogo size="lg" />
      </div>
      <ScreenFooter className="pb-[max(26px,env(safe-area-inset-bottom))]">
        <LoginButtons next={next} />
      </ScreenFooter>
    </Screen>
  );
}
