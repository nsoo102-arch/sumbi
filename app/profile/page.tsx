"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import PageLayout from "@/components/PageLayout";
import { getSumbiData, saveSumbiData } from "@/lib/storage";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [breathName, setBreathName] = useState("");

  useEffect(() => {
    const data = getSumbiData();
    if (data.profile) {
      setName(data.profile.name);
      setBreathName(data.profile.breathName);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveSumbiData({ profile: { name, breathName } });
    router.push("/today");
  };

  return (
    <PageLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-12">
        <h1 className="text-xl font-light text-primary">프로필</h1>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm text-foreground/60">
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-b border-foreground/20 bg-transparent py-3 text-base outline-none transition-colors focus:border-primary"
              placeholder="이름을 입력하세요"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="breathName" className="text-sm text-foreground/60">
              숨이름
            </label>
            <input
              id="breathName"
              type="text"
              value={breathName}
              onChange={(e) => setBreathName(e.target.value)}
              className="border-b border-foreground/20 bg-transparent py-3 text-base outline-none transition-colors focus:border-primary"
              placeholder="숨이름을 입력하세요"
            />
          </div>
        </div>

        <Button type="submit" fullWidth>
          다음
        </Button>
      </form>
    </PageLayout>
  );
}
