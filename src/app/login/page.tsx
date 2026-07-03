"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components";

const loginButtonClass =
  "flex w-full items-center justify-center gap-3 rounded-sumbi bg-sumbi-primary px-12 py-3.5 text-[0.9375rem] font-normal tracking-wide text-white transition-opacity hover:opacity-90";

function GoogleIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2045C17.64 8.5665 17.5827 7.95225 17.4764 7.36377H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5612V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.2045Z"
        fill="#ffffff"
      />
      <path
        d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5612C11.2418 14.1012 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
        fill="#ffffff"
      />
      <path
        d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
        fill="#ffffff"
      />
      <path
        d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
        fill="#ffffff"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="18"
      viewBox="0 0 16 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.015 9.54545C13.0286 8.31818 13.4218 7.12727 14.14 6.16364C13.4218 5.45455 12.4764 4.90909 11.4218 4.63636C10.4218 4.38182 9.36727 4.63636 8.61273 5.31818C7.85818 4.63636 6.80364 4.38182 5.80364 4.63636C4.74909 4.90909 3.80364 5.45455 3.08545 6.16364C1.61273 8.12727 2.17636 11.2364 4.08545 12.8182C4.74909 13.3818 5.50364 13.7273 6.28545 13.6909C7.06727 13.6545 7.74909 13.2364 8.61273 13.2364C9.47636 13.2364 10.0855 13.6909 10.9127 13.7091C11.7855 13.7273 12.6127 13.3273 13.2764 12.7636C13.7673 12.3273 14.1491 11.7818 14.3855 11.1727C13.2036 10.6182 12.5036 9.38182 13.015 9.54545ZM10.9127 2.90909C11.4764 2.21818 11.8218 1.32727 11.7855 0.418182C10.9127 0.472727 9.96727 0.872727 9.27636 1.50909C8.61273 2.12727 8.23091 2.98182 8.26727 3.85455C9.14 3.92727 9.99455 3.54545 10.9127 2.90909Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  function goToProfile() {
    router.push("/profile");
  }

  return (
    <section className="-my-6 flex min-h-[100dvh] flex-col items-center justify-center text-center text-sumbi-text">
      <h1 className="mb-16 text-[2.0125rem] font-normal tracking-[0.08em]">
        숨 접속
      </h1>

      <Card className="w-full max-w-sm space-y-4">
        <button type="button" className={loginButtonClass} onClick={goToProfile}>
          <GoogleIcon />
          Google로 시작하기
        </button>
        <button type="button" className={loginButtonClass} onClick={goToProfile}>
          <AppleIcon />
          Apple로 시작하기
        </button>
        <button type="button" className={loginButtonClass} onClick={goToProfile}>
          이메일로 시작하기
        </button>
      </Card>
    </section>
  );
}
