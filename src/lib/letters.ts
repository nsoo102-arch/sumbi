import type { SumbiLetter } from "@/types";

export function isUnreadLetter(letter: SumbiLetter): boolean {
  return letter.status !== "read" && !letter.read_at;
}

export function getLetterTitle(message: string): string {
  const firstLine = message.trim().split(/\r?\n/)[0]?.trim() || "숨편지";
  return firstLine.length > 36 ? `${firstLine.slice(0, 36)}…` : firstLine;
}

/** 제목(첫 줄)을 제외한 짧은 미리보기 */
export function getLetterPreview(message: string): string {
  const lines = message
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  const body =
    lines.length === 1 ? lines[0] : lines.slice(1).join(" ").trim();

  if (!body) {
    return "";
  }

  return body.length > 72 ? `${body.slice(0, 72)}…` : body;
}

export function formatLetterDate(value: string): string {
  if (!value.trim()) {
    return "작성일 미기록";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
