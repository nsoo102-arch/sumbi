"use client";

import Link from "next/link";

const LETTER_MENUS = [
  {
    title: "숨편지 작성",
    description: "참여자를 골라 짧은 숨편지를 전합니다.",
    button: "작성하러 가기",
    href: "/admin/users",
  },
  {
    title: "보낸 숨편지",
    description: "아직 열어보지 않은 보낸 숨편지를 살펴봅니다.",
    button: "보낸 편지 보기",
    href: "/admin/letters/unread",
  },
  {
    title: "받은 답장",
    description: "참여자가 남긴 답장을 읽고 마음을 받습니다.",
    button: "답장 보기",
    href: "/admin/letters/replies",
  },
] as const;

export default function AdminLettersHubPage() {
  return (
    <main className="admin-page">
      <div className="admin-container">
        <Link href="/admin" className="admin-back">
          ← 관리자 홈으로
        </Link>

        <h1 className="admin-title">숨편지 관리</h1>
        <p className="admin-lead">
          작성하고, 보내고, 답장을 받는
          <br />
          숨편지의 공간을 모았습니다.
        </p>

        <div className="grid gap-5">
          {LETTER_MENUS.map((item) => (
            <section key={item.href} className="admin-card">
              <h2 className="m-0 text-[1.125rem] font-medium tracking-[0.04em] text-sumbi-primary">
                {item.title}
              </h2>
              <p className="admin-body my-3 mb-5">{item.description}</p>
              <Link href={item.href} className="admin-btn">
                {item.button}
              </Link>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
