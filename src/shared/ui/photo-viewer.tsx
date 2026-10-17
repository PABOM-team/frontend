"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { usePortalContainer } from "./portal";

/** 사진 크게 보기 (U9). 검은 바탕, 옆으로 밀면 다음 사진, × 또는 뒤로 가기로 닫힘 */
export function PhotoViewer({
  open,
  onOpenChange,
  photos,
  initialIndex = 0,
  caption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: { id: string; url: string }[];
  initialIndex?: number;
  caption?: ReactNode;
}) {
  const container = usePortalContainer();
  const [index, setIndex] = useState(initialIndex);
  const [lastOpen, setLastOpen] = useState(open);
  const trackRef = useRef<HTMLDivElement>(null);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setIndex(initialIndex);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            trackRef.current?.scrollTo({ left: initialIndex * trackRef.current.clientWidth });
          }}
          className="absolute inset-0 flex flex-col bg-[#111] text-white outline-none"
        >
          <Dialog.Title className="sr-only">사진 크게 보기</Dialog.Title>
          <Dialog.Description className="sr-only">
            옆으로 밀면 다음 사진을 볼 수 있어요
          </Dialog.Description>
          <div className="flex h-[52px] shrink-0 items-center justify-between px-2">
            <Dialog.Close
              aria-label="닫기"
              className="flex size-10 items-center justify-center rounded-full hover:bg-white/10"
            >
              <X className="size-6" />
            </Dialog.Close>
            <span className="pr-3 text-[15px]">
              {index + 1} / {photos.length}
            </span>
          </div>
          <div
            ref={trackRef}
            onScroll={(event) => {
              const el = event.currentTarget;
              setIndex(Math.round(el.scrollLeft / el.clientWidth));
            }}
            className="scrollbar-none flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto"
          >
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex w-full shrink-0 snap-center items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="max-h-full w-full object-contain" />
              </div>
            ))}
          </div>
          <div className="shrink-0 px-[18px] pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
            {photos.length > 1 ? (
              <div className="mb-3 flex justify-center gap-1.5" aria-hidden>
                {photos.map((photo, i) => (
                  <span
                    key={photo.id}
                    className={cn(
                      "size-1.5 rounded-full",
                      i === index ? "bg-white" : "bg-white/40",
                    )}
                  />
                ))}
              </div>
            ) : null}
            {caption ? <div className="text-[13.5px] leading-relaxed">{caption}</div> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
