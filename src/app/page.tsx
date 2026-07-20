import { StartButton } from "@/components";

export default function HomePage() {
  return (
    <section className="sumbi-page items-center text-center">
      <h1 className="sumbi-landing-title">숨비소리</h1>

      <div className="sumbi-landing-verse mb-36 space-y-7">
        <p>오늘 하루도</p>
        <p>욕심내지 말고</p>
        <p>너의 숨만큼만</p>
        <p>있다 오거라.</p>
      </div>

      <StartButton />
    </section>
  );
}
