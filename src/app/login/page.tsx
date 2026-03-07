import Link from "next/link";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AppleButton } from "@/components/auth/AppleButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Sign in to Xentis Care
          </h1>
          <p className="mt-2 text-slate-600 text-sm">
            Access your study materials and practice exams
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <GoogleButton />
          <AppleButton />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          By signing in, you agree to our{" "}
          <Link href="/legal/terms" className="text-indigo-600 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-indigo-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
