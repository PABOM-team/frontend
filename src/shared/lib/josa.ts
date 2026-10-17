/** 받침 여부에 맞춰 조사를 붙인다. 콩이를 / 별을, 콩이는 / 별은 */
export function josa(word: string, pair: "을/를" | "은/는" | "이/가" | "과/와" | "으로/로") {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const jong = isHangul ? (last - 0xac00) % 28 : 0;
  const [withBatchim, without] = pair.split("/") as [string, string];
  // '로'는 ㄹ 받침 뒤에도 '로'
  if (pair === "으로/로" && jong === 8) return `${word}${without}`;
  return `${word}${jong > 0 ? withBatchim : without}`;
}
