import CameraPreview from "@/components/examinee/CameraPreview";
import ScreenShareStatus from "@/components/examinee/ScreenShareStatus";

export default function ExamineePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Exam area */}
        <section className="col-span-9 rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">Online Examination</h1>

          <div className="mt-6">
            <h2 className="font-semibold">Question 1</h2>
            <p className="mt-2">Explain the difference between HTTP and HTTPS.</p>
            <textarea className="mt-4 h-64 w-full rounded-lg border p-4" placeholder="Your answer..." />
          </div>
        </section>

        {/* Right panel */}
        <aside className="col-span-3 space-y-5">
          <CameraPreview />
          <ScreenShareStatus />

          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="font-semibold">Status</h2>

            <p className="mt-2">
              Camera:
              <span className="ml-2">Ready</span>
            </p>
            <p>
              Screen:
              <span className="ml-2">Not Sharing</span>
            </p>
          </div>

          {/* Questions */}
          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="font-semibold mb-3">Questions</h2>

            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }).map((_, index) => (
                <button key={index} className="rounded bg-slate-200 py-2 hover:bg-blue-500 hover:text-white">
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
