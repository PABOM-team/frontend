"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { filesApi } from "@/shared/api/endpoints";
import type { Photo } from "@/shared/domain/record";
import { resizeImage } from "@/shared/lib/image";
import { cn } from "@/shared/lib/utils";
import { Spinner } from "./display";

type Pending = { key: string; file: File; status: "uploading" | "failed" };

/**
 * 사진 칸 (R03·R02). 고르면 바로 줄여서 올리고, 실패하면 그 칸에서 다시 시도한다 (C2-4).
 * 올린 사진을 누르면 크게 보기. 최대 장수를 넘게 고르면 넘친 사진은 올리지 않는다.
 * 백엔드 기록은 사진을 한 장만 받아서 기본 최대 장수는 1
 */
export function PhotoInput({
  value,
  onChange,
  max = 1,
  onView,
  onBusyChange,
}: {
  value: Photo[];
  onChange: (photos: Photo[]) => void;
  max?: number;
  onView?: (index: number) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  // 여러 장을 동시에 올릴 때 마지막 값에 이어 붙이려고 최신 목록을 들고 있는다
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  // 올리는 중인지 부모(저장 버튼)에 알린다. 상태 갱신 함수 안에서 부르면 렌더 중 갱신 경고가 난다
  const busy = pending.some((p) => p.status === "uploading");
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const upload = async (item: Pending) => {
    setPending((list) => list.map((p) => (p.key === item.key ? { ...p, status: "uploading" } : p)));
    try {
      const blob = await resizeImage(item.file);
      const photo = await filesApi.upload(blob, "record");
      latest.current = [...latest.current, photo];
      onChange(latest.current);
      setPending((list) => list.filter((p) => p.key !== item.key));
    } catch {
      // 실패는 그 칸에 '다시 시도'로 보여 준다 (C2-4)
      setPending((list) =>
        list.map((p) => (p.key === item.key ? { ...p, status: "failed" as const } : p)),
      );
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const room = max - value.length - pending.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    const items = picked.map((file) => ({
      key: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      status: "uploading" as const,
    }));
    if (!items.length) return;
    setPending((list) => [...list, ...items]);
    items.forEach(upload);
  };

  const box =
    "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl";

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((photo, index) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onView?.(index)}
          className={cn(box, "border border-[#ddd]")}
          aria-label={`사진 ${index + 1} 크게 보기`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="" className="size-full object-cover" />
        </button>
      ))}
      {pending.map((item) => (
        <button
          key={item.key}
          type="button"
          disabled={item.status === "uploading"}
          onClick={() => upload(item)}
          className={cn(
            box,
            "flex-col gap-0.5 border-[1.5px] border-dashed text-[11px]",
            item.status === "failed"
              ? "border-destructive text-destructive"
              : "border-[#bbb] bg-placeholder",
          )}
          aria-label={item.status === "failed" ? "사진 다시 올리기" : "사진 올리는 중"}
        >
          {item.status === "uploading" ? (
            <>
              <Spinner className="scale-75" />
              <span className="text-[#888]">올리는 중</span>
            </>
          ) : (
            <>
              <span className="text-[15px] leading-none font-bold">!</span>
              다시 시도
            </>
          )}
        </button>
      ))}
      {value.length + pending.length < max ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="사진 추가"
          className={cn(
            box,
            "border-[1.5px] border-dashed border-[#bbb] bg-placeholder text-[#999]",
          )}
        >
          <Plus className="size-5" />
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
