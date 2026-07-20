"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components";
import { getSession } from "@/lib/auth";
import {
  formatLetterDate,
  getLetterTitle,
  isUnreadLetter,
} from "@/lib/letters";
import type { SumbiLetter } from "@/types";

type LettersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; letters: SumbiLetter[] };

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
      <h1 className="sumbi-heading-form">숨편지</h1>

      <div className="sumbi-content mb-10 w-full space-y-10">
        {state.status === "loading" && (
          <Card compact>
            <p className="sumbi-loading">숨편지를 확인하는 중…</p>
          </Card>
        )}

        {state.status === "error" && (
          <Card compact>
            <p className="sumbi-error-center">{state.message}</p>
          </Card>
        )}

        {state.status === "ready" && (
          <>
            <section>
              <h2 className="sumbi-subheading">새로 도착한 숨편지</h2>
              {unreadLetters.length === 0 ? (
                <Card compact>
                  <p className="sumbi-loading">
                    새로 도착한 숨편지가 없습니다.
                  </p>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {unreadLetters.map((letter) => (
                    <li key={letter.id}>
                      <Link
                        href={`/letters/${encodeURIComponent(letter.id)}`}
                        className="sumbi-letter-card block"
                      >
                        <p className="mb-2 text-[1.0625rem] font-normal tracking-[0.04em] text-sumbi-primary">
                          {getLetterTitle(letter.message)}
                        </p>
                        <p className="sumbi-caption">
                          {formatLetterDate(letter.sent_at)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="sumbi-subheading">지난 숨편지</h2>
              {pastLetters.length === 0 ? (
                <Card compact>
                  <p className="sumbi-loading">지난 숨편지가 아직 없습니다.</p>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {pastLetters.map((letter) => (
                    <li key={letter.id}>
                      <Link
                        href={`/letters/${encodeURIComponent(letter.id)}`}
                        className="sumbi-letter-card-past block"
                      >
                        <p className="sumbi-caption mb-2">
                          {formatLetterDate(letter.sent_at)}
                        </p>
                        <p className="truncate text-[0.9375rem] font-light tracking-[0.03em] text-sumbi-text/80">
                          {getLetterTitle(letter.message)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <div className="flex justify-center">
        <Link href="/home" className="sumbi-link-muted text-[0.9375rem]">
          홈으로
        </Link>
      </div>
    </section>
  );
}
