"use client";

import { Plus, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { filesApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import type { Photo } from "@/shared/domain/record";
import { resizeImage } from "@/shared/lib/image";
import { cn } from "@/shared/lib/utils";
import { Spinner } from "./display";
import { toast } from "./toast";

type Pending = { key: string; file: File; status: "uploading" | "failed" };

/**
 * 사진 칸 (R03·R02). 고르면 바로 줄여서 올리고, 실패하면 그 칸에서 다시 시도한다 (C2-4).
 * 올린 사진을 누르면 크게 보기.
 */
export function PhotoInput({
  value,
  onChange,
  max = 5,
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
    } catch (error) {
      toast(getErrorMessage(error, "사진을 올리지 못했어요."));
      setPending((list) =>
        list.map((p) => (p.key === item.key ? { ...p, status: "failed" as const } : p)),
      );
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const room = max - value.length - pending.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) toast(`사진은 ${max}장까지 올릴 수 있어요`);
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
        <div key={photo.id} className="relative">
          <button
            type="button"
            onClick={() => onView?.(index)}
            className={cn(box, "border border-[#ddd]")}
            aria-label={`사진 ${index + 1} 크게 보기`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="size-full object-cover" />
          </button>
          <button
            type="button"
            aria-label={`사진 ${index + 1} 빼기`}
            onClick={() => onChange(value.filter((p) => p.id !== photo.id))}
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-inverse text-[11px] text-white"
          >
            ×
          </button>
        </div>
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
            <Spinner className="scale-75" />
          ) : (
            <>
              <RotateCw className="size-4" />
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
