import Link from "next/link";

import { Header } from "@/shared/ui/Header";

export default function HomePage() {
  return (
    <>
      <Header />
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl flex-col justify-center px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-normal text-foreground">
          勤怠管理 Web システム
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          出退勤の打刻、離業、勤怠の確認・修正までを 1 つの画面で行えます。
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/member/dashboard"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            メンバー画面
          </Link>
          <Link
            href="/admin/dashboard"
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            管理者画面
          </Link>
        </div>
      </section>
    </>
  );
}
