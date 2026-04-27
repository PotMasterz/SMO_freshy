import LoginForm from "./LoginForm";
import { getCallerProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const profile = await getCallerProfile();
  if (profile) {
    redirect(profile.is_admin ? "/admin" : "/play");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <div className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-400">SMO FRESHY</p>
          <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
          <p className="text-sm text-slate-400">
            ใส่ชื่อผู้ใช้และรหัสผ่านที่ได้รับจากผู้จัดงาน
          </p>
        </div>
        <LoginForm next={searchParams.next} />
      </div>
    </main>
  );
}
