"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button, Card } from "@/components";
import { getSession } from "@/lib/auth";
import {
  formatLetterDate,
  getLetterTitle,
  isUnreadLetter,
} from "@/lib/letters";
import type { LetterReply, SumbiLetter } from "@/types";

type LetterState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; letter: SumbiLetter };

type ReplyState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; reply: LetterReply }
  | { status: "error"; message: string };

export default function LetterDetailPage() {
  const params = useParams<{ id: string }>();
  const letterId = decodeURIComponent(params.id ?? "");

  const [letterState, setLetterState] = useState<LetterState>({
    status: "loading",
  });
  const [replyState, setReplyState] = useState<ReplyState>({
    status: "loading",
  });
  const [replyDraft, setReplyDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [sentNotice, setSentNotice] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = getSession();
      if (!session?.email || !letterId) {
        if (!cancelled) {
          setLetterState({
            status: "error",
            message: "편지를 열 수 없습니다.",
          });
          setReplyState({ status: "empty" });
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/sheets/letters?email=${encodeURIComponent(session.email)}&limit=50`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: SumbiLetter[];
          error?: string;
        };

        if (!response.ok || !payload.ok || !Array.isArray(payload.data)) {
          throw new Error(payload.error || "숨편지를 불러오지 못했습니다.");
        }

        const letter = payload.data.find((item) => item.id === letterId);
        if (!letter) {
          throw new Error("편지를 찾을 수 없습니다.");
        }

        if (!cancelled) {
          setLetterState({ status: "ready", letter });
        }

        if (isUnreadLetter(letter)) {
          try {
            const readResponse = await fetch("/api/sheets/letters/read", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: letter.id,
                email: session.email,
              }),
            });
            const readPayload = (await readResponse.json()) as {
              ok?: boolean;
              data?: SumbiLetter;
            };
            if (
              !cancelled &&
              readResponse.ok &&
              readPayload.ok &&
              readPayload.data
            ) {
              setLetterState({ status: "ready", letter: readPayload.data });
            }
          } catch {
            // 읽음 실패해도 본문은 보여 줌
          }
        }

        const replyResponse = await fetch(
          `/api/sheets/letters/replies?letterId=${encodeURIComponent(letterId)}&email=${encodeURIComponent(session.email)}`,
          { method: "GET", cache: "no-store" },
        );
        const replyPayload = (await replyResponse.json()) as {
          ok?: boolean;
          data?: LetterReply[];
          error?: string;
        };

        if (!cancelled) {
          if (
            replyResponse.ok &&
            replyPayload.ok &&
            Array.isArray(replyPayload.data) &&
            replyPayload.data.length > 0
          ) {
            setReplyState({ status: "ready", reply: replyPayload.data[0] });
          } else {
            setReplyState({ status: "empty" });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLetterState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "숨편지를 불러오지 못했습니다.",
          });
          setReplyState({ status: "empty" });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [letterId]);

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReplyError("");
    setSentNotice(false);

    const session = getSession();
    const content = replyDraft.trim();
    if (!session?.email || !content || letterState.status !== "ready") {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/sheets/letters/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterId,
          email: session.email,
          userId: session.userId,
          nickname: session.nickname || session.name || "",
          replyContent: content,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: LetterReply;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error || "답장을 보내지 못했습니다.");
      }

      setReplyState({ status: "ready", reply: payload.data });
      setReplyDraft("");
      setSentNotice(true);
    } catch (error) {
      setReplyError(
        error instanceof Error ? error.message : "답장을 보내지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="sumbi-page-scroll items-center">
      <h1 className="sumbi-heading-form">숨편지</h1>

      <div className="sumbi-content mb-10 w-full space-y-8">
        {letterState.status === "loading" && (
          <Card compact>
            <p className="sumbi-loading">편지를 여는 중…</p>
          </Card>
        )}

        {letterState.status === "error" && (
          <Card compact>
            <p className="sumbi-error-center">{letterState.message}</p>
          </Card>
        )}

        {letterState.status === "ready" && (
          <>
            <article className="sumbi-letter-card space-y-4">
              <p className="sumbi-caption">
                작성일 · {formatLetterDate(letterState.letter.sent_at)}
              </p>
              <h2 className="text-[1.125rem] font-normal tracking-[0.04em] text-sumbi-primary">
                {getLetterTitle(letterState.letter.message)}
              </h2>
              <p className="whitespace-pre-wrap break-words text-[0.9375rem] font-light leading-[1.9] tracking-[0.03em] text-sumbi-text">
                {letterState.letter.message}
              </p>
              <p className="sumbi-caption">보낸 사람 · 수</p>
            </article>

            <section className="space-y-4">
              <div className="text-center">
                <h3 className="sumbi-subheading mb-2">답장 남기기</h3>
                <p className="sumbi-muted text-[0.9375rem] leading-relaxed">
                  편지를 읽고 떠오른 마음이 있다면 남겨보세요.
                </p>
              </div>

              {replyState.status === "loading" && (
                <Card compact>
                  <p className="sumbi-loading">답장을 확인하는 중…</p>
                </Card>
              )}

              {replyState.status === "ready" && (
                <Card compact className="space-y-3 text-left">
                  {sentNotice && (
                    <p className="sumbi-body text-center text-sumbi-primary">
                      수에게 답장을 보냈습니다.
                    </p>
                  )}
                  <p className="sumbi-caption">나의 답장</p>
                  <p className="whitespace-pre-wrap break-words text-[0.9375rem] font-light leading-[1.9] tracking-[0.03em] text-sumbi-text">
                    {replyState.reply.replyContent}
                  </p>
                  <p className="sumbi-caption">
                    작성일 · {formatLetterDate(replyState.reply.createdAt)}
                  </p>
                </Card>
              )}

              {replyState.status === "empty" && (
                <Card className="w-full">
                  <form onSubmit={(event) => void handleReplySubmit(event)} className="space-y-4">
                    <textarea
                      value={replyDraft}
                      onChange={(event) => setReplyDraft(event.target.value)}
                      aria-label="답장 내용"
                      placeholder="짧은 마음을 남겨보세요."
                      className="sumbi-textarea min-h-[160px] text-left"
                    />
                    {replyError && (
                      <p className="sumbi-error" role="alert">
                        {replyError}
                      </p>
                    )}
                    <div className="flex justify-center">
                      <Button
                        type="submit"
                        disabled={submitting || !replyDraft.trim()}
                      >
                        {submitting ? "보내는 중…" : "답장 보내기"}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </section>
          </>
        )}
      </div>

      <div className="flex justify-center gap-6">
        <Link href="/letters" className="sumbi-link text-[0.9375rem]">
          편지함으로
        </Link>
        <Link href="/home" className="sumbi-link-muted text-[0.9375rem]">
          홈으로
        </Link>
      </div>
    </section>
  );
}
