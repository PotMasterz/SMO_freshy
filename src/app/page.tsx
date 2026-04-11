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
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">SMO Freshy</p>
        <h1 className="text-4xl font-bold sm:text-5xl">Crack the codes.</h1>
        <p className="text-slate-300">
          Find the riddles around the venue, work out the 4-digit answer for each one, and punch
          it in here.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
