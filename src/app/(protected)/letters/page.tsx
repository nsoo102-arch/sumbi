"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import {
  formatLetterDate,
  getLetterPreview,
  getLetterTitle,
  isUnreadLetter,
} from "@/lib/letters";
import type { SumbiLetter } from "@/types";

type LettersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; letters: SumbiLetter[] };

function LetterListCard({
  letter,
  unread = false,
}: {
  letter: SumbiLetter;
  unread?: boolean;
}) {
  const title = getLetterTitle(letter.message);
  const preview = getLetterPreview(letter.message);

  return (
    <Link
      href={`/letters/${encodeURIComponent(letter.id)}`}
      className={
        unread ? "sumbi-letter-card block" : "sumbi-letter-card-past block"
      }
    >
      <p className="sumbi-caption mb-2">
        {formatLetterDate(letter.sent_at)}
      </p>
      <p className="mb-2 flex items-center gap-2 text-[1.0625rem] font-normal tracking-[0.04em] text-sumbi-primary">
        {unread && (
          <span
            className="sumbi-letter-unread-dot"
            aria-label="읽지 않은 편지"
          />
        )}
        <span className="min-w-0 break-words">{title}</span>
      </p>
      {preview ? (
        <p className="sumbi-letter-preview">{preview}</p>
      ) : null}
    </Link>
  );
}

export default function LettersMailboxPage() {
  const [state, setState] = useState<LettersState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadLetters() {
      const session = getSession();
      if (!session?.email) {
        if (!cancelled) {
          setState({ status: "ready", letters: [] });
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

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "숨편지를 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setState({
            status: "ready",
            letters: Array.isArray(payload.data) ? payload.data : [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
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

  const unreadLetters =
    state.status === "ready" ? state.letters.filter(isUnreadLetter) : [];
  const pastLetters =
    state.status === "ready"
      ? state.letters.filter((letter) => !isUnreadLetter(letter))
      : [];

  return (
    <section className="sumbi-page-scroll items-center">
      <h1 className="sumbi-letters-title">숨편지</h1>
      <p className="sumbi-letters-intro">
        숨을 기록하면,
        <br />
        편지가 되어 돌아옵니다.
      </p>

      <div className="sumbi-content mb-10 w-full space-y-10">
        {state.status === "loading" && (
          <div className="sumbi-letters-empty">
            <p className="sumbi-loading">숨편지를 확인하는 중…</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="sumbi-letters-empty">
            <p className="sumbi-error-center">{state.message}</p>
          </div>
        )}

        {state.status === "ready" && (
          <>
            <section>
              <h2 className="sumbi-subheading">새로 온 숨편지</h2>
              {unreadLetters.length === 0 ? (
                <div className="sumbi-letters-empty">
                  <p className="sumbi-letters-empty-text">
                    숨편지를 기다리세요.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {unreadLetters.map((letter) => (
                    <li key={letter.id}>
                      <LetterListCard letter={letter} unread />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="sumbi-subheading">지난 숨편지</h2>
              {pastLetters.length === 0 ? (
                <div className="sumbi-letters-empty">
                  <p className="sumbi-letters-empty-text">
                    아직 받은 숨편지가 없습니다.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {pastLetters.map((letter) => (
                    <li key={letter.id}>
                      <LetterListCard letter={letter} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <div className="flex justify-center">
        <Link href="/home" className="sumbi-letters-back">
          ← 숨 쉬는 곳으로
        </Link>
      </div>
    </section>
  );
}
