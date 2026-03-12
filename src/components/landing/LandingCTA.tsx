import Link from "next/link";

export function LandingCTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 p-12 sm:p-16 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
          <div className="relative">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to pass?
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
              Join thousands of nursing students preparing for their board exams.
              Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:bg-white/95 transition-all duration-300 shadow-xl hover:shadow-2xl"
              >
                Start free trial
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 border-2 border-white/80 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300"
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
