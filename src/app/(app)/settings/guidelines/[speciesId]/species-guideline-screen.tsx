"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useParams } from "next/navigation";
import { Fragment } from "react";
import { speciesQueries } from "@/entities/species";
import {
  CARE_DISCLAIMER,
  formatInterval,
  RECORD_KIND,
  RECORD_KIND_LABEL,
  ROUTINE_LABEL,
} from "@/shared/domain/care";
import { speciesIdSchema } from "@/shared/domain/species";
import { Skeleton, StateMessage } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-S04 3 종 가이드라인. 표의 항목·주기는 확정 전 예시 */
export function SpeciesGuidelineScreen() {
  const params = useParams<{ speciesId: string }>();
  const parsed = speciesIdSchema.safeParse(params.speciesId);
  const speciesList = useQuery(speciesQueries.list());
  const table = useQuery({
    ...speciesQueries.careStandards(parsed.success ? parsed.data : "crested_gecko"),
    enabled: parsed.success,
  });
  const species = speciesList.data?.find((s) => s.id === params.speciesId);

  if (!parsed.success) {
    return (
      <Screen>
        <TopBar title="가이드라인" fallbackHref="/settings/guidelines" />
        <StateMessage className="flex-1 justify-center" title="지원하지 않는 종이에요" />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        title={species?.commonName ?? "가이드라인"}
        fallbackHref="/settings/guidelines?group=lizard"
      />
      <ScreenBody>
        {table.isPending || !species ? (
          <Skeleton className="h-72" />
        ) : table.isError ? (
          <StateMessage
            title="가이드라인을 불러오지 못했어요"
            action={{ label: "다시 시도", onClick: () => table.refetch() }}
          />
        ) : (
          <>
            <p className="text-[12.5px] text-[#888]">
              {table.data.version} · {table.data.effectiveFrom} 적용
              {table.data.isDraft ? " (예시)" : ""}
            </p>
            <table className="mt-3 w-full text-left text-[13px]">
              <thead>
                <tr className="bg-[#f3f3f3] text-[12px] text-[#555]">
                  <th className="px-1.5 py-2 font-normal">생애 단계</th>
                  <th className="px-1.5 py-2 font-normal">항목</th>
                  <th className="px-1.5 py-2 font-normal">주기</th>
                  <th className="px-1.5 py-2 font-normal">기록</th>
                </tr>
              </thead>
              <tbody>
                {species.lifeStages.map((stage) => {
                  const rows = table.data.standards.filter((s) => s.lifeStageCode === stage.code);
                  return (
                    <Fragment key={stage.code}>
                      {rows.map((row, i) => (
                        <tr key={row.careItem} className="border-b border-border">
                          <td className="px-1.5 py-2.5">{i === 0 ? stage.name : ""}</td>
                          <td className="px-1.5 py-2.5">{ROUTINE_LABEL[row.careItem]}</td>
                          <td className="px-1.5 py-2.5">{formatInterval(row.intervalDays)}</td>
                          <td className="px-1.5 py-2.5">
                            {RECORD_KIND_LABEL[RECORD_KIND[row.careItem]]}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 rounded-[12px] bg-[#f3f3f3] p-3.5 text-[12.5px]">
              <p className="font-bold">이렇게 만들었어요</p>
              {table.data.references.map((ref) => (
                <p key={ref.title} className="mt-1 flex items-center gap-1 text-[#555]">
                  {ref.title}
                  <ArrowUpRight className="size-3.5" />
                </p>
              ))}
              {table.data.reviewNote ? (
                <p className="mt-1 text-primary">{table.data.reviewNote}</p>
              ) : null}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-[#888]">{CARE_DISCLAIMER}</p>
          </>
        )}
      </ScreenBody>
    </Screen>
  );
}
