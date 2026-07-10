"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminDailyRecord } from "@/types/sheets";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; records: AdminDailyRecord[]; date: string };

function getKoreaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateLabel(value: string): string {
  if (!value.trim()) {
    return "";
  }

  const date = new Date(`${value}T12:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatDateTime(timestamp: string, date: string): string {
  const raw = timestamp.trim() || date.trim();
  if (!raw) {
    return "시간 미기록";
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

/** 배열·JSON·쉼표 구분 문자열 등 다양한 체크 형태를 읽기 좋게 정규화 */
function formatCompletedRituals(value: unknown): string {
  if (value == null) {
    return "실행한 숨비소리 없음";
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => String(item).trim())
      .filter(Boolean);
    return items.length > 0 ? items.join(" · ") : "실행한 숨비소리 없음";
  }

  const raw = String(value).trim();
  if (!raw) {
    return "실행한 숨비소리 없음";
  }

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return formatCompletedRituals(parsed);
      }
    } catch {
      // 일반 문자열로 처리
    }
  }

  const parts = raw
    .split(/[,|·]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts.join(" · ");
  }

  return raw;
}

function memberDetailHref(email: string): string {
  return `/admin/users/${encodeURIComponent(email)}`;
}

function letterComposeHref(email: string): string {
  return `/admin/users/${encodeURIComponent(email)}?focus=letter#letter`;
}

export default function AdminRecordsPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setState({ status: "loading" });
      const today = getKoreaToday();

      try {
        const response = await fetch(
          `/api/sheets/daily?date=${encodeURIComponent(today)}`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: AdminDailyRecord[];
          date?: string;
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error || "오늘 숨 기록을 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          const records = Array.isArray(payload.data) ? payload.data : [];
          records.sort((a, b) => {
            const aKey = a.timestamp || a.date || "";
            const bKey = b.timestamp || b.date || "";
            return aKey < bKey ? 1 : aKey > bKey ? -1 : 0;
          });
          setState({
            status: "ready",
            records,
            date: payload.date || today,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "오늘 숨 기록을 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="admin-page">
      <div className="admin-container">
        <Link href="/admin" className="admin-back">
          ← 관리자 홈으로
        </Link>

        <h1 className="admin-title">오늘 숨 읽기</h1>

        <p className="admin-lead">
          {state.status === "ready"
            ? `${formatDateLabel(state.date)}에 남겨진 숨을 살펴봅니다.`
            : "오늘 남겨진 숨을 살펴봅니다."}
        </p>

        {state.status === "loading" && (
          <p className="admin-muted">오늘 숨 기록을 불러오는 중…</p>
        )}

        {state.status === "error" && (
          <div className="admin-card">
            <p className="admin-error m-0">{state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="admin-btn mt-4"
            >
              다시 시도
            </button>
          </div>
        )}

        {state.status === "ready" && state.records.length === 0 && (
          <div className="admin-card py-10 text-center">
            <p className="admin-empty m-0">오늘은 아직 남겨진 숨이 없습니다.</p>
          </div>
        )}

        {state.status === "ready" && state.records.length > 0 && (
          <ul className="m-0 grid list-none gap-6 p-0">
            {state.records.map((record, index) => {
              const email = record.email.trim();
              const detailHref = email ? memberDetailHref(email) : null;
              const letterHref = email ? letterComposeHref(email) : null;
              const memo = record.memo.trim();

              return (
                <li
                  key={`${record.user_id}-${record.timestamp}-${index}`}
                  className="admin-card"
                >
                  <div
                    className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-[#EEEAE2] pb-4"
                  >
                    <div>
                      <p className="m-0 text-[1.125rem] font-medium tracking-[0.03em] text-sumbi-text">
                        {record.name || "이름 없음"}
                      </p>
                      <p className="mt-1.5 mb-0 text-[0.9375rem] tracking-[0.03em] text-sumbi-primary">
                        {record.nickname || "활동이름 없음"}
                      </p>
                    </div>
                    <p className="admin-muted m-0 text-[0.875rem]">
                      {formatDateTime(record.timestamp, record.date)}
                    </p>
                  </div>

                  <dl className="m-0 grid gap-4">
                    <div>
                      <dt className="admin-label m-0">이메일</dt>
                      <dd className="admin-body admin-break mt-1 mb-0">
                        {email || "이메일 미연결"}
                      </dd>
                    </div>

                    <div>
                      <dt className="admin-label m-0">실행한 숨비소리</dt>
                      <dd className="mt-1 mb-0 text-[0.9375rem] leading-[1.7] tracking-[0.02em] text-sumbi-text/80">
                        {formatCompletedRituals(record.completed_rituals)}
                      </dd>
                    </div>

                    <div>
                      <dt className="admin-label m-0">기록 내용</dt>
                      <dd
                        className={`admin-break mt-1 mb-0 text-[0.9375rem] leading-[1.8] tracking-[0.02em] whitespace-pre-wrap ${
                          memo ? "text-sumbi-text/80" : "text-sumbi-muted"
                        }`}
                      >
                        {memo || "남긴 글은 없습니다."}
                      </dd>
                    </div>
                  </dl>

                  {(detailHref || letterHref) && (
                    <div className="mt-6 flex flex-wrap gap-2.5">
                      {detailHref ? (
                        <Link href={detailHref} className="admin-btn-outline">
                          회원 상세보기
                        </Link>
                      ) : null}
                      {letterHref ? (
                        <Link href={letterHref} className="admin-btn">
                          숨편지 쓰기
                        </Link>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
