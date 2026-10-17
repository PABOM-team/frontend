/**
 * 올리기 전에 사진을 줄인다 (FE-C09): 긴 변 1600px · JPEG 품질 0.85.
 * 캔버스에 다시 그려서 위치 정보(EXIF)를 지우고 방향을 바로잡는다.
 */
export async function resizeImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("사진 파일만 올릴 수 있어요.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("사진을 줄이지 못했어요.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("사진을 줄이지 못했어요."))),
      "image/jpeg",
      quality,
    ),
  );
}
