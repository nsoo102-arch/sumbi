"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import PageLayout from "@/components/PageLayout";
import { saveSumbiData } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailLogin = (e: FormEvent) => {
    e.preventDefault();
    saveSumbiData({ email, loginMethod: "email" });
    router.push("/profile");
  };

  const handleGoogleLogin = () => {
    saveSumbiData({ loginMethod: "google" });
    router.push("/profile");
  };

  const handleGuestLogin = () => {
    saveSumbiData({ loginMethod: "guest" });
    router.push("/profile");
  };

  return (
    <PageLayout>
      <div className="flex flex-col gap-12">
        <h1 className="text-xl font-light text-primary">로그인</h1>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm text-foreground/60">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-b border-foreground/20 bg-transparent py-3 text-base outline-none transition-colors focus:border-primary"
              placeholder="email@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm text-foreground/60">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-b border-foreground/20 bg-transparent py-3 text-base outline-none transition-colors focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" fullWidth>
            로그인
          </Button>
        </form>

        <div className="flex flex-col gap-4">
          <Button variant="secondary" fullWidth onClick={handleGoogleLogin}>
            Google Login
          </Button>
          <Button variant="secondary" fullWidth onClick={handleGuestLogin}>
            Guest
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
