"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { speciesQueries } from "@/entities/species";
import { SPECIES_GROUP_LABEL, SPECIES_GROUPS, type SpeciesGroup } from "@/shared/domain/species";
import { cn } from "@/shared/lib/utils";
import { PhotoBox, Skeleton } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-S04 관리 가이드라인 1 분류 → 2 종. 분류·종 목록은 서버에서 받아 그린다 [제안] */
export function GuidelinesScreen() {
  const group = useSearchParams().get("group") as SpeciesGroup | null;
  const { data, isPending } = useQuery(speciesQueries.list());

  if (group && SPECIES_GROUPS.includes(group)) {
    const list = (data ?? []).filter((s) => s.group === group);
    return (
      <Screen>
        <TopBar title={SPECIES_GROUP_LABEL[group]} fallbackHref="/settings/guidelines" />
        <ScreenBody>
          <h2 className="mb-2 text-[18px] font-bold">어떤 종인가요?</h2>
          {isPending ? <Skeleton className="h-32" /> : null}
          <ul>
            {list.map((s) => (
              <li key={s.id}>
                <Row href={`/settings/guidelines/${s.id}`} title={s.commonName} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-[#888]">종이 늘면 이 목록만 길어져요</p>
        </ScreenBody>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="관리 가이드라인" fallbackHref="/settings" />
      <ScreenBody>
        <h2 className="mb-2 text-[18px] font-bold">어떤 친구의 가이드라인을 볼까요?</h2>
        <ul>
          {SPECIES_GROUPS.map((g) => {
            const count = (data ?? []).filter((s) => s.group === g).length;
            return (
              <li key={g}>
                <Row
                  href={count ? `/settings/guidelines?group=${g}` : undefined}
                  title={SPECIES_GROUP_LABEL[g]}
                  description={count ? `종 ${count}개` : "볼파이톤 · 준비 중이에요"}
                />
              </li>
            );
          })}
        </ul>
      </ScreenBody>
    </Screen>
  );
}

function Row({ href, title, description }: { href?: string; title: string; description?: string }) {
  const body = (
    <>
      <PhotoBox />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{title}</span>
        {description ? <span className="block text-[12px] text-[#888]">{description}</span> : null}
      </span>
      {href ? <ChevronRight className="size-4 text-[#aaa]" /> : null}
    </>
  );
  const className = cn(
    "flex items-center gap-3 border-b border-border py-3",
    !href && "opacity-50",
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
