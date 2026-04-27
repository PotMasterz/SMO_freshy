import Link from "next/link";
import { getCallerProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const profile = await getCallerProfile();
  if (profile) {
    redirect(profile.is_admin ? "/admin" : "/play");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl space-y-6">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-indigo-400">SMO FRESHY</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">ถอดรหัสให้ได้</h1>
        <p className="text-lg text-slate-300">
          หากล่องคำถามในห้องสมบัติ เพื่อใส่รหัสที่นี่
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-indigo-500 px-6 py-3 text-lg font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    </main>
  );
}
