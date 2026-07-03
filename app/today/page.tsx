"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import PageLayout from "@/components/PageLayout";
import { getSumbiData, saveSumbiData } from "@/lib/storage";

export default function TodayPage() {
  const router = useRouter();
  const [todayNote, setTodayNote] = useState("");

  useEffect(() => {
    const data = getSumbiData();
    if (data.todayNote) {
      setTodayNote(data.todayNote);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveSumbiData({ todayNote });
    router.push("/record");
  };

  return (
    <PageLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-12">
        <p className="text-lg leading-relaxed text-foreground/80">
          오늘 편안한 숨을 위해서
          <br />
          무엇을 할 수 있을까요?
        </p>

        <textarea
          value={todayNote}
          onChange={(e) => setTodayNote(e.target.value)}
          rows={6}
          className="resize-none border-b border-foreground/20 bg-transparent py-3 text-base leading-relaxed outline-none transition-colors focus:border-primary"
          placeholder="오늘의 숨을 위한 생각을 적어보세요"
        />

        <Button type="submit" fullWidth>
          기록하기
        </Button>
      </form>
    </PageLayout>
  );
}
