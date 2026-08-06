import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="space-y-6 rounded-xl bg-white p-10 shadow-lg w-[400px]">
        <h1 className="text-3xl font-bold text-center">Online Proctoring PoC</h1>

        <p className="text-center text-slate-500">Choose your role</p>

        <div className="flex flex-col gap-4">
          <Link href="/examinee" className="rounded-lg bg-blue-600 py-3 text-center text-white hover:bg-blue-700">
            Examinee
          </Link>
          <Link href="/proctor" className="rounded-lg bg-emerald-600 py-3 text-center text-white hover:bg-emerald-700">
            Proctor
          </Link>
        </div>
      </div>
    </main>
  );
}
