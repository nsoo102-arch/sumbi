"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LetterReply } from "@/types/sheets";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; replies: LetterReply[] };

function formatCreatedAt(value: string): string {
  if (!value.trim()) {
    return "작성일 미기록";
  }

  const date = new Date(value);
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

export default function AdminLetterRepliesPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReplies() {
      setState({ status: "loading" });

      try {
        const response = await fetch(
          "/api/sheets/letters/replies/unread?limit=100",
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: LetterReply[];
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error || "받은 답장을 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          setState({
            status: "ready",
            replies: Array.isArray(payload.data) ? payload.data : [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "받은 답장을 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadReplies();
    return () => {
      cancelled = true;
    };
  }, []);

  async function markRead(replyId: string) {
    if (markingId) {
      return;
    }

    setMarkingId(replyId);
    try {
      const response = await fetch("/api/sheets/letters/replies/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "읽음 처리에 실패했습니다.");
      }

      setState((prev) => {
        if (prev.status !== "ready") {
          return prev;
        }
        return {
          status: "ready",
          replies: prev.replies.filter((item) => item.replyId !== replyId),
        };
      });
    } catch {
      // 목록은 유지
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <Link href="/admin/letters" className="admin-back">
          ← 숨편지 관리로
        </Link>

        <h1 className="admin-title">받은 답장</h1>
        <p className="admin-lead">
          참여자가 남긴 답장을 천천히 읽어봅니다.
        </p>

        {state.status === "loading" && (
          <p className="admin-muted">답장을 불러오는 중…</p>
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

        {state.status === "ready" && state.replies.length === 0 && (
          <div className="admin-card text-center">
            <p className="admin-empty m-0">새 답장이 없습니다.</p>
          </div>
        )}

        {state.status === "ready" && state.replies.length > 0 && (
          <ul className="m-0 grid list-none gap-4 p-0">
            {state.replies.map((reply) => {
              const detailHref = reply.email.trim()
                ? `/admin/users/${encodeURIComponent(reply.email.trim().toLowerCase())}`
                : null;

              return (
                <li key={reply.replyId} className="admin-card">
                  <p className="admin-label m-0">
                    {formatCreatedAt(reply.createdAt)}
                  </p>
                  <p className="mt-2 mb-0 text-[1.0625rem] tracking-[0.03em] text-sumbi-text">
                    {reply.nickname || "활동이름 없음"}
                  </p>
                  {reply.email ? (
                    <p className="admin-label mt-1.5 mb-0">{reply.email}</p>
                  ) : null}
                  <p className="mt-4 mb-0 whitespace-pre-wrap break-words text-[0.9375rem] font-light leading-[1.8] tracking-[0.03em] text-sumbi-text">
                    {reply.replyContent}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {detailHref ? (
                      <Link href={detailHref} className="admin-btn-outline">
                        회원 보기
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={markingId === reply.replyId}
                      onClick={() => void markRead(reply.replyId)}
                    >
                      {markingId === reply.replyId ? "처리 중…" : "읽음으로 표시"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
