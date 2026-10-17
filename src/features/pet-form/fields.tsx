"use client";

import { useRef, useState } from "react";
import { filesApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { lifeStageFromHatch, type Species } from "@/shared/domain/species";
import { todayYmd } from "@/shared/lib/date";
import { resizeImage } from "@/shared/lib/image";
import { cn } from "@/shared/lib/utils";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { Avatar, InfoBox, Spinner } from "@/shared/ui/display";
import { Checkbox, Field, Input } from "@/shared/ui/form";
import { toast } from "@/shared/ui/toast";

export type PhotoValue = { fileId: string | null; url: string | null };

/** 동그란 개체 사진 칸. 고르면 줄여서 바로 올린다 */
export function PetPhotoPicker({
  value,
  onChange,
  variant = "register",
  onBusyChange,
}: {
  value: PhotoValue;
  onChange: (value: PhotoValue) => void;
  variant?: "register" | "edit";
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    onBusyChange?.(true);
    try {
      const photo = await filesApi.upload(await resizeImage(file), "pet");
      onChange({ fileId: photo.id, url: photo.url });
    } catch (error) {
      toast(getErrorMessage(error, "사진을 올리지 못했어요."));
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={value.url ? "사진 바꾸기" : "사진 추가"}
        className="relative"
      >
        {/* 등록(P02)은 점선 동그라미에 '+ 사진', 정보 수정(P05)은 동그라미만 */}
        <Avatar
          src={value.url}
          size={72}
          className={cn(
            !value.url && variant !== "edit" && "border-[1.5px] border-dashed border-[#bbb]",
          )}
        >
          {uploading ? (
            <Spinner />
          ) : variant === "edit" ? null : (
            <span className="flex items-center gap-0.5 text-[11px]">+ 사진</span>
          )}
        </Avatar>
      </button>
      <span
        className={cn(
          "text-[12px]",
          variant === "edit" ? "font-medium text-primary" : "text-[#888]",
        )}
      >
        {variant === "edit" ? "사진 바꾸기" : "사진 (선택)"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** 단계를 직접 고를 때 '정확하지 않아요'를 고를 수 있는 단계 (U5) */
const UNCERTAIN_STAGES = ["hatchling", "juvenile"];

export type HatchPatch = {
  hatchedOn?: string | null;
  hatchUnknown?: boolean;
  lifeStageCode?: string | null;
  stageUncertain?: boolean;
};

/**
 * 부화일 + '부화일을 몰라요' + 생애 단계 (P02 4/4, U5).
 * 부화일을 알면 단계는 자동, 모르면 날짜 칸이 '모름'으로 잠기고 단계를 직접 고른다.
 * 해츨링·준성체일 때만 '정확하지 않아요'가 보인다.
 */
export function HatchFields({
  species,
  hatchedOn,
  hatchUnknown,
  lifeStageCode,
  stageUncertain,
  variant = "register",
  onChange,
  error,
}: {
  species: Species | undefined;
  hatchedOn: string | null;
  hatchUnknown: boolean;
  lifeStageCode: string | null;
  stageUncertain: boolean;
  variant?: "register" | "edit";
  onChange: (patch: HatchPatch) => void;
  error?: string;
}) {
  const auto = species ? lifeStageFromHatch(species, hatchedOn) : null;
  const canBeUncertain = lifeStageCode !== null && UNCERTAIN_STAGES.includes(lifeStageCode);

  return (
    <div className="space-y-3">
      <Field label="부화일" htmlFor="pet-hatched" error={error}>
        <DateField
          id="pet-hatched"
          title="부화일"
          value={hatchUnknown ? null : hatchedOn}
          placeholder={hatchUnknown ? "모름" : undefined}
          disabled={hatchUnknown}
          invalid={Boolean(error)}
          max={todayYmd()}
          hint="오늘 뒤 날짜는 고를 수 없어요 · 연·월을 눌러 빠르게 옮겨요"
          onChange={(ymd) => onChange({ hatchedOn: ymd })}
        />
      </Field>
      <label className="flex items-center gap-2 text-[13px] text-[#555]">
        <Checkbox
          checked={hatchUnknown}
          onCheckedChange={(on) =>
            onChange({
              hatchUnknown: on === true,
              hatchedOn: on === true ? null : hatchedOn,
              stageUncertain: on === true ? stageUncertain : false,
            })
          }
        />
        부화일을 몰라요
      </label>
      {hatchUnknown ? (
        <>
          <Field label={variant === "register" ? "생애 단계를 골라 주세요" : "생애 단계"}>
            <ChipGroup
              label="생애 단계"
              size="sm"
              options={(species?.lifeStages ?? []).map((s) => ({ value: s.code, label: s.name }))}
              value={lifeStageCode}
              onChange={(code) =>
                onChange({
                  lifeStageCode: code,
                  stageUncertain: code && UNCERTAIN_STAGES.includes(code) ? stageUncertain : false,
                })
              }
            />
          </Field>
          {canBeUncertain ? (
            <label className="flex items-center gap-2 text-[13px] text-[#555]">
              <Checkbox
                checked={stageUncertain}
                onCheckedChange={(on) => onChange({ stageUncertain: on === true })}
              />
              정확하지 않아요
            </label>
          ) : null}
          <p className="text-[12px] text-[#888]">
            {variant === "register"
              ? "'정확하지 않아요'는 해츨링·준성체일 때만 보여요"
              : "성체를 고르면 '정확하지 않아요'가 사라져요"}
          </p>
        </>
      ) : auto && variant === "edit" ? (
        // 정보 수정(P05)은 회색 글 두 줄
        <div className="space-y-1.5 text-[13px] text-[#777]">
          <p>생애 단계 · {auto.name} (자동)</p>
          <p className="text-[12px] leading-relaxed text-[#999]">
            부화일을 모르면: 단계를 직접 고르고, 해츨링·준성체일 때만 &apos;정확하지 않아요&apos;를
            고를 수 있어요
          </p>
        </div>
      ) : auto ? (
        <InfoBox tone="blue">
          생애 단계 · <strong>{auto.name}</strong> (부화일 기준으로 자동)
        </InfoBox>
      ) : null}
    </div>
  );
}

const MORPH_MAX = 40;

/** 모프 칩 2열 + 기타(직접 입력) (P02 3/4, U4) */
export function MorphPicker({
  species,
  value,
  onChange,
}: {
  species: Species | undefined;
  value: string | null;
  onChange: (morph: string | null) => void;
}) {
  const known = species?.morphs ?? [];
  const [other, setOther] = useState(Boolean(value && !known.includes(value)));
  const choice = other ? "__other" : value;

  return (
    <div className="space-y-3">
      <ChipGroup
        label="모프"
        columns={2}
        options={[
          ...known.map((m) => ({ value: m, label: m })),
          { value: "__other", label: "기타(직접 입력)" },
        ]}
        value={choice}
        onChange={(v) => {
          if (v === "__other") {
            setOther(true);
            onChange(value && !known.includes(value) ? value : "");
          } else {
            setOther(false);
            onChange(v);
          }
        }}
      />
      {other ? (
        <Field label="모프 이름" htmlFor="morph-other">
          <Input
            id="morph-other"
            autoFocus
            maxLength={MORPH_MAX}
            placeholder="모프 이름을 적어 주세요"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="-mt-1 text-right text-[11.5px] text-[#999]">
            {(value ?? "").length} / {MORPH_MAX}자
          </p>
        </Field>
      ) : null}
    </div>
  );
}
