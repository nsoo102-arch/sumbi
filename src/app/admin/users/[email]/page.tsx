"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AdminNote, MemberDetail, SumbiLetter } from "@/types/sheets";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; detail: MemberDetail };

type SendState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "success" }
  | { status: "error"; message: string };

type NoteSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success" }
  | { status: "error"; message: string };

function formatJoinedAt(value: string): string {
  if (!value.trim()) {
    return "가입일 미기록";
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

function formatDateTimeKst(value: string): string {
  if (!value.trim()) {
    return "시각 미기록";
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isLetterRead(letter: SumbiLetter): boolean {
  return letter.status === "read" || Boolean(letter.read_at?.trim());
}

function formatRecordDate(dateValue: string, timestamp: string): string {
  const raw = dateValue.trim() || timestamp.trim();
  if (!raw) {
    return "날짜 미기록";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function decodeEmailParam(raw: string | string[] | undefined): string {
  if (!raw) {
    return "";
  }

  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function shouldFocusLetterCompose(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace("#", "");
  return params.get("focus") === "letter" || hash === "letter";
}

export default function AdminUserDetailPage() {
  const params = useParams<{ email: string }>();
  const email = decodeEmailParam(params?.email);
  const letterSectionRef = useRef<HTMLElement | null>(null);
  const letterTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [letters, setLetters] = useState<SumbiLetter[]>([]);
  const [lettersLoading, setLettersLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sendState, setSendState] = useState<SendState>({ status: "idle" });
  const [adminNote, setAdminNote] = useState("");
  const [noteUpdatedAt, setNoteUpdatedAt] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaveState, setNoteSaveState] = useState<NoteSaveState>({
    status: "idle",
  });

  const loadLetters = useCallback(async (memberEmail: string) => {
    setLettersLoading(true);
    try {
      const response = await fetch(
        `/api/sheets/letters?email=${encodeURIComponent(memberEmail)}&limit=5`,
        { method: "GET", cache: "no-store" },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: SumbiLetter[];
        error?: string;
      };

      if (response.ok && payload.ok && Array.isArray(payload.data)) {
        setLetters(payload.data.slice(0, 5));
      }
    } catch {
      // 목록 실패는 상세 화면을 막지 않음
    } finally {
      setLettersLoading(false);
    }
  }, []);

  const loadAdminNote = useCallback(async (memberEmail: string) => {
    setNoteLoading(true);
    setNoteSaveState({ status: "idle" });
    try {
      const response = await fetch(
        `/api/sheets/admin-note?email=${encodeURIComponent(memberEmail)}`,
        { method: "GET", cache: "no-store" },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: AdminNote;
        error?: string;
      };

      if (response.ok && payload.ok && payload.data) {
        setAdminNote(payload.data.note || "");
        setNoteUpdatedAt(payload.data.updated_at || "");
      } else {
        setAdminNote("");
        setNoteUpdatedAt("");
      }
    } catch {
      setAdminNote("");
      setNoteUpdatedAt("");
    } finally {
      setNoteLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!email.trim()) {
        setState({
          status: "error",
          message: "회원 이메일이 올바르지 않습니다.",
        });
        return;
      }

      setState({ status: "loading" });

      try {
        const response = await fetch(
          `/api/sheets/member?email=${encodeURIComponent(email.trim())}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: MemberDetail;
          error?: string;
        };

        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(
            payload.error || "회원 상세를 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          setState({ status: "ready", detail: payload.data });
          void loadLetters(payload.data.member.email);
          void loadAdminNote(payload.data.member.email);
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "회원 상세를 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [email, loadLetters, loadAdminNote]);

  useEffect(() => {
    if (state.status !== "ready" || !shouldFocusLetterCompose()) {
      return;
    }

    const timer = window.setTimeout(() => {
      letterSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      letterTextareaRef.current?.focus();
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state.status]);

  async function handleSaveAdminNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state.status !== "ready") {
      return;
    }

    setNoteSaveState({ status: "saving" });

    try {
      const memberEmail = state.detail.member.email;
      const response = await fetch("/api/sheets/admin-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: memberEmail,
          note: adminNote,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: AdminNote;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error || "운영 메모를 저장하지 못했습니다.");
      }

      setAdminNote(payload.data.note || "");
      setNoteUpdatedAt(payload.data.updated_at || "");
      setNoteSaveState({ status: "success" });
    } catch (error) {
      setNoteSaveState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "운영 메모를 저장하지 못했습니다.",
      });
    }
  }

  async function handleSendLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state.status !== "ready") {
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      setSendState({
        status: "error",
        message: "편지 내용을 적어 주세요.",
      });
      return;
    }

    setSendState({ status: "sending" });

    try {
      const member = state.detail.member;
      const response = await fetch("/api/sheets/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: member.email,
          name: member.name,
          nickname: member.nickname,
          message: trimmed,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: SumbiLetter;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "숨편지를 보내지 못했습니다.");
      }

      setMessage("");
      setSendState({ status: "success" });
      void loadLetters(member.email);
    } catch (error) {
      setSendState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "숨편지를 보내지 못했습니다.",
      });
    }
  }

  const title =
    state.status === "ready"
      ? state.detail.member.name || "이름 없음"
      : "회원 상세";

  const recipientLabel =
    state.status === "ready"
      ? state.detail.member.nickname ||
        state.detail.member.name ||
        state.detail.member.email
      : "";

  return (
    <main className="admin-page">
      <div className="admin-container">
        <Link href="/admin/users" className="admin-back">
          ← 회원으로
        </Link>

        <h1 className="admin-title">{title}</h1>

        {state.status === "loading" && (
          <p className="admin-muted mt-7 leading-[1.8]">
            회원 정보를 불러오는 중…
          </p>
        )}

        {state.status === "error" && (
          <div className="admin-card mt-7">
            <p className="admin-error m-0">{state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="admin-btn mt-5"
            >
              다시 시도
            </button>
          </div>
        )}

        {state.status === "ready" && (
          <div className="mt-8 grid gap-5">
            <section className="admin-card">
              <h2 className="admin-section-title">기본정보</h2>
              <dl className="m-0 grid gap-3.5">
                <div>
                  <dt className="admin-label m-0">이름</dt>
                  <dd className="mt-1 mb-0 tracking-[0.03em] text-sumbi-text">
                    {state.detail.member.name || "이름 없음"}
                  </dd>
                </div>
                <div>
                  <dt className="admin-label m-0">활동이름</dt>
                  <dd className="mt-1 mb-0 tracking-[0.03em] text-sumbi-primary">
                    {state.detail.member.nickname || "활동이름 없음"}
                  </dd>
                </div>
                <div>
                  <dt className="admin-label m-0">이메일</dt>
                  <dd className="admin-body admin-break mt-1 mb-0">
                    {state.detail.member.email || "이메일 없음"}
                  </dd>
                </div>
                <div>
                  <dt className="admin-label m-0">가입일</dt>
                  <dd className="admin-body mt-1 mb-0">
                    {formatJoinedAt(state.detail.member.created_at)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="admin-card">
              <h2 className="admin-section-title">나의 숨비소리</h2>
              {!state.detail.weekly ||
              state.detail.weekly.rituals.length === 0 ? (
                <p className="admin-muted m-0 leading-[1.8]">
                  아직 등록된 숨비소리가 없습니다.
                </p>
              ) : (
                <>
                  {state.detail.weekly.week_start_date ? (
                    <p className="admin-label mb-3.5 mt-0">
                      주 시작일 ·{" "}
                      {formatJoinedAt(state.detail.weekly.week_start_date)}
                    </p>
                  ) : null}
                  <ol className="m-0 grid gap-2.5 pl-5 leading-[1.7] tracking-[0.03em] text-sumbi-text">
                    {state.detail.weekly.rituals.map((ritual, index) => (
                      <li key={`${ritual}-${index}`}>{ritual}</li>
                    ))}
                  </ol>
                </>
              )}
            </section>

            <section className="admin-card">
              <h2 className="admin-section-title">최근 숨 기록</h2>
              {state.detail.records.length === 0 ? (
                <p className="admin-muted m-0 leading-[1.8]">
                  아직 남긴 숨 기록이 없습니다.
                </p>
              ) : (
                <ul className="m-0 grid list-none gap-3.5 p-0">
                  {state.detail.records.map((record, index) => (
                    <li
                      key={`${record.timestamp}-${record.date}-${index}`}
                      className={
                        index === 0
                          ? "pt-0"
                          : "border-t border-[#EFEBE3] pt-3.5"
                      }
                    >
                      <p className="m-0 text-[0.875rem] tracking-[0.03em] text-sumbi-primary">
                        {formatRecordDate(record.date, record.timestamp)}
                      </p>
                      <p className="mt-2 mb-0 text-[0.9375rem] leading-[1.6] tracking-[0.02em] text-sumbi-text/80">
                        {record.completed_rituals || "실행한 숨비소리 없음"}
                      </p>
                      <p className="admin-body admin-break mt-2 mb-0 whitespace-pre-wrap">
                        {record.memo || "기록 텍스트 없음"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              id="letter"
              ref={letterSectionRef}
              className="admin-card"
              style={{ scrollMarginTop: 24 }}
            >
              <h2 className="admin-section-title">숨편지 쓰기</h2>
              <p className="admin-body mb-4 mt-0">
                {recipientLabel}님에게 짧은 숨편지를 전합니다.
              </p>
              <form onSubmit={handleSendLetter}>
                <textarea
                  ref={letterTextareaRef}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    if (sendState.status !== "idle") {
                      setSendState({ status: "idle" });
                    }
                  }}
                  rows={6}
                  placeholder="마음을 담아 적어 주세요."
                  className="admin-control"
                  style={{ resize: "vertical", lineHeight: 1.7 }}
                />
                <button
                  type="submit"
                  disabled={sendState.status === "sending"}
                  className="admin-btn mt-4"
                >
                  {sendState.status === "sending"
                    ? "보내는 중…"
                    : "숨편지 보내기"}
                </button>
                {sendState.status === "success" && (
                  <p className="mt-3.5 mb-0 text-[0.875rem] tracking-[0.03em] text-sumbi-primary">
                    숨편지를 보냈습니다.
                  </p>
                )}
                {sendState.status === "error" && (
                  <p className="admin-error mt-3.5 mb-0 text-[0.875rem]">
                    {sendState.message}
                  </p>
                )}
              </form>
            </section>

            <section className="admin-card">
              <h2 className="admin-section-title">보낸 숨편지</h2>
              <p className="admin-body mb-4 mt-0">
                최근 보낸 숨편지 5개입니다. 기록을 읽고 직접 쓴 편지의 흐름을
                살펴봅니다.
              </p>
              {lettersLoading && letters.length === 0 ? (
                <p className="admin-muted m-0 leading-[1.8]">
                  보낸 편지를 불러오는 중…
                </p>
              ) : letters.length === 0 ? (
                <p className="admin-muted m-0 leading-[1.8]">
                  아직 보낸 숨편지가 없습니다.
                </p>
              ) : (
                <>
                  <ul className="m-0 grid list-none gap-3.5 p-0">
                    {letters.map((letter, index) => {
                      const read = isLetterRead(letter);

                      return (
                        <li
                          key={letter.id || `${letter.sent_at}-${index}`}
                          className={
                            index === 0
                              ? "pt-0"
                              : "border-t border-[#EFEBE3] pt-3.5"
                          }
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="m-0 text-[0.875rem] tracking-[0.03em] text-sumbi-primary">
                              보낸 시각 · {formatDateTimeKst(letter.sent_at)}
                            </p>
                            <span
                              className={`text-[0.75rem] tracking-[0.04em] ${
                                read ? "text-sumbi-muted" : "text-sumbi-primary"
                              }`}
                            >
                              {read ? "읽음" : "읽지 않음"}
                            </span>
                          </div>
                          {read && letter.read_at.trim() ? (
                            <p className="admin-label mt-1.5 mb-0">
                              읽은 시각 · {formatDateTimeKst(letter.read_at)}
                            </p>
                          ) : null}
                          <p className="admin-break mt-2.5 mb-0 text-[0.9375rem] leading-[1.7] tracking-[0.02em] text-sumbi-text/80 whitespace-pre-wrap">
                            {letter.message}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    href={`/admin/users/${encodeURIComponent(state.detail.member.email)}/letters`}
                    className="admin-btn-outline mt-5"
                  >
                    이전 숨편지 더 보기
                  </Link>
                </>
              )}
            </section>

            <section className="admin-card">
              <h2 className="admin-section-title">운영 메모</h2>
              <p className="admin-body mb-4 mt-0">
                관리자만 볼 수 있는 메모입니다. 회원에게는 보이지 않습니다.
              </p>
              {noteLoading ? (
                <p className="admin-muted m-0 leading-[1.8]">
                  운영 메모를 불러오는 중…
                </p>
              ) : (
                <form onSubmit={handleSaveAdminNote}>
                  <textarea
                    value={adminNote}
                    onChange={(event) => {
                      setAdminNote(event.target.value);
                      if (noteSaveState.status !== "idle") {
                        setNoteSaveState({ status: "idle" });
                      }
                    }}
                    rows={5}
                    placeholder="이 회원에 대해 기억해 둘 내용을 적어 주세요."
                    className="admin-control"
                    style={{ resize: "vertical", lineHeight: 1.7 }}
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={noteSaveState.status === "saving"}
                      className="admin-btn"
                    >
                      {noteSaveState.status === "saving"
                        ? "저장 중…"
                        : "저장"}
                    </button>
                    {noteUpdatedAt ? (
                      <span className="admin-label">
                        최근 저장 · {formatJoinedAt(noteUpdatedAt)}
                      </span>
                    ) : null}
                  </div>
                  {noteSaveState.status === "success" && (
                    <p className="mt-3.5 mb-0 text-[0.875rem] tracking-[0.03em] text-sumbi-primary">
                      운영 메모를 저장했습니다.
                    </p>
                  )}
                  {noteSaveState.status === "error" && (
                    <p className="admin-error mt-3.5 mb-0 text-[0.875rem]">
                      {noteSaveState.message}
                    </p>
                  )}
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
