import Link from "next/link";

export default function HomePage() {
  return (
    <section className="-my-6 flex min-h-[100dvh] flex-col items-center justify-center text-center text-sumbi-text">
      <h1 className="mb-20 text-[2.0125rem] font-normal tracking-[0.08em]">
        숨비소리
      </h1>

      <div className="mb-36 space-y-7 text-[1.0625rem] font-light leading-[2] tracking-[0.04em]">
        <p>오늘 하루도</p>
        <p>욕심내지 말고</p>
        <p>너의 숨만큼만</p>
        <p>있다 오거라.</p>
      </div>

      <Link
        href="/login"
        className="mt-4 rounded-sumbi bg-sumbi-primary px-12 py-3.5 text-[0.9375rem] font-normal tracking-wide text-white transition-opacity hover:opacity-90"
      >
        시작하기
      </Link>
    </section>
  );
}
