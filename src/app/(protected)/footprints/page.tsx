"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components";
import { getSession } from "@/lib/auth";
import { getFootprintsSummary, loadSumbi, normalizeActivities } from "@/lib";
import type { FootprintsSummary } from "@/lib";
import type { SumbiLetter, SumbiRecord } from "@/types";

type LettersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; letters: SumbiLetter[] };

function getTodayRecord(records: SumbiRecord[]): SumbiRecord | undefined {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  return records
    .filter((record) => {
      const savedAt = new Date(record.savedAt);
      return savedAt >= todayStart && savedAt < todayEnd;
    })
    .at(-1);
}

function isUnreadLetter(letter: SumbiLetter): boolean {
  return letter.status !== "read" && !letter.read_at;
}

function formatSentAt(value: string): string {
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

export default function FootprintsPage() {
  const router = useRouter();
  const [todayActivities, setTodayActivities] = useState<string[]>([]);
  const [summary, setSummary] = useState<FootprintsSummary>({
    weekCounts: [],
  });
  const [lettersState, setLettersState] = useState<LettersState>({
    status: "loading",
  });
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    const data = loadSumbi();
    const todayRecord = getTodayRecord(data.records);
    setTodayActivities(
      normalizeActivities(todayRecord?.checkedActivities ?? []),
    );
    setSummary(getFootprintsSummary(data.records));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLetters() {
      const session = getSession();
      if (!session?.email) {
        if (!cancelled) {
          setLettersState({ status: "ready", letters: [] });
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/sheets/letters?email=${encodeURIComponent(session.email)}&limit=30`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: SumbiLetter[];
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error || "숨편지를 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          setLettersState({
            status: "ready",
            letters: Array.isArray(payload.data) ? payload.data : [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLettersState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "숨편지를 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadLetters();

    return () => {
      cancelled = true;
    };
  }, []);

  async function openLetter(letter: SumbiLetter) {
    const session = getSession();
    const email = (session?.email ?? "").trim().toLowerCase();
    if (!email) {
      return;
    }

    setOpenedId(letter.id);

    // 실제로 열었을 때만 읽음 처리. 이미 읽은 편지는 재요청하지 않음.
    if (!isUnreadLetter(letter) || markingId === letter.id) {
      return;
    }

    setMarkingId(letter.id);

    try {
      const response = await fetch("/api/sheets/letters/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: letter.id,
          email,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: SumbiLetter;
        error?: string;
      };

      if (response.ok && payload.ok && payload.data) {
        setLettersState((prev) => {
          if (prev.status !== "ready") {
            return prev;
          }

          return {
            status: "ready",
            letters: prev.letters.map((item) =>
              item.id === letter.id
                ? {
                    ...payload.data!,
                    status: "read",
                    read_at:
                      payload.data!.read_at ||
                      item.read_at ||
                      new Date().toISOString(),
                  }
                : item,
            ),
          };
        });
      }
    } catch {
      // 읽음 실패해도 내용은 보여 줌
    } finally {
      setMarkingId(null);
    }
  }

  function handleSubmit() {
    router.push("/home");
  }

  const unreadLetters =
    lettersState.status === "ready"
      ? lettersState.letters.filter(isUnreadLetter)
      : [];
  const pastLetters =
    lettersState.status === "ready"
      ? lettersState.letters.filter((letter) => !isUnreadLetter(letter))
      : [];

  return (
    <section className="sumbi-page-scroll items-center">
      <h1 className="sumbi-heading-form">숨 기록</h1>

      <div className="sumbi-content mb-14 space-y-10">
        {lettersState.status === "loading" && (
          <Card compact>
            <p className="sumbi-loading">숨편지를 확인하는 중…</p>
          </Card>
        )}

        {lettersState.status === "error" && (
          <Card compact>
            <p className="sumbi-error-center">{lettersState.message}</p>
          </Card>
        )}

        {unreadLetters.length > 0 && (
          <div>
            <ul className="space-y-3">
              {unreadLetters.map((letter) => {
                const isOpen = openedId === letter.id;

                return (
                  <li key={letter.id}>
                    <button
                      type="button"
                      onClick={() => void openLetter(letter)}
                      className="sumbi-letter-card"
                      aria-expanded={isOpen}
                      aria-label="숨편지 읽기"
                    >
                      <p className="mb-3 text-[1.0625rem] font-normal tracking-[0.04em] text-sumbi-primary">
                        숨편지가 도착했습니다.
                      </p>

                      {isOpen ? (
                        <div className="space-y-3">
                          <p className="whitespace-pre-wrap break-words text-[0.9375rem] font-light leading-[1.8] tracking-[0.03em] text-sumbi-text">
                            {letter.message}
                          </p>
                          <p className="sumbi-caption">
                            작성일 · {formatSentAt(letter.sent_at)}
                          </p>
                          <p className="sumbi-caption">보낸 사람 · 수</p>
                        </div>
                      ) : (
                        <p className="sumbi-muted text-left text-[0.875rem]">
                          눌러서 읽어보세요.
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {pastLetters.length > 0 && (
          <div>
            <h2 className="sumbi-subheading">지난 숨편지</h2>
            <ul className="space-y-3">
              {pastLetters.map((letter) => {
                const isOpen = openedId === letter.id;

                return (
                  <li key={letter.id}>
                    <button
                      type="button"
                      onClick={() => void openLetter(letter)}
                      className="sumbi-letter-card-past"
                      aria-expanded={isOpen}
                      aria-label="지난 숨편지 읽기"
                    >
                      <p className="sumbi-caption mb-2">
                        {formatSentAt(letter.sent_at)}
                      </p>
                      {isOpen ? (
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap break-words text-[0.9375rem] font-light leading-[1.8] tracking-[0.03em] text-sumbi-text">
                            {letter.message}
                          </p>
                          <p className="sumbi-caption">보낸 사람 · 수</p>
                        </div>
                      ) : (
                        <p className="truncate text-[0.9375rem] font-light tracking-[0.03em] text-sumbi-text/70">
                          {letter.message}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <h2 className="sumbi-subheading">오늘의 숨</h2>
          <Card compact>
            {todayActivities.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {todayActivities.map((activity) => (
                  <span
                    key={activity}
                    className="rounded-full border border-sumbi-border bg-sumbi-background px-4 py-2 text-[0.9375rem] font-light tracking-[0.04em] text-sumbi-text"
                  >
                    {activity}
                  </span>
                ))}
              </div>
            ) : (
              <p className="sumbi-loading">오늘 남긴 숨이 아직 없습니다.</p>
            )}
          </Card>
        </div>

        <div>
          <h2 className="sumbi-subheading">이번 주의 숨</h2>
          <Card compact>
            {summary.weekCounts.length > 0 ? (
              <ul className="sumbi-body space-y-3 text-left">
                {summary.weekCounts.map(([activity, count]) => (
                  <li
                    key={activity}
                    className="flex items-baseline justify-between gap-6 font-light"
                  >
                    <span className="break-words">{activity}</span>
                    <span className="shrink-0 text-sumbi-text/70">
                      {count}회
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sumbi-loading">이번 주 쌓인 숨이 아직 없습니다.</p>
            )}
          </Card>
        </div>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleSubmit}>숨 완료</Button>
      </div>
    </section>
  );
}
