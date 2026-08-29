"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthApiError } from "@/lib/api/auth";

type Lang = "en" | "ar";

const T = {
  en: {
    back: "← Back to Home",
    brand: "TORTA LAB",
    title: "Welcome Back",
    subtitle: "Sign in to your Torta Lab account.",
    username: "Username",
    password: "Password",
    submit: "Sign In",
    submitting: "Signing in...",
    noAccount: "Don't have an account?",
    signUp: "Sign Up",
    errorRequired: "Please fill in both fields.",
    errorGeneric: "Invalid username or password.",
  },
  ar: {
    back: "→ رجوع للرئيسية",
    brand: "تورتا لاب",
    title: "أهلاً بيك تاني",
    subtitle: "سجّل دخولك لحسابك في تورتا لاب.",
    username: "اسم المستخدم",
    password: "كلمة السر",
    submit: "تسجيل الدخول",
    submitting: "بنسجل دخولك...",
    noAccount: "لسه معملتش حساب؟",
    signUp: "صمّم حسابك",
    errorRequired: "من فضلك املأ الحقلين.",
    errorGeneric: "اسم المستخدم أو كلمة السر غلط.",
  },
};

export default function SignInPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = T[lang];
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t.errorRequired);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      router.push("/");
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) {
        setError(t.errorGeneric);
      } else {
        setError(t.errorGeneric);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir={dir} lang={lang} className="bg-[#FFF9F3] text-[#33221C] min-h-screen font-sans">
      <nav className="sticky top-0 z-50 bg-[#FFF9F3]/95 backdrop-blur border-b border-[#E8D8CC]">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-[#633B2C]">{t.back}</Link>
          <span className="text-xl font-serif font-bold">{t.brand}</span>
          <div className="flex items-center bg-[#F8EEE5] border border-[#E8D8CC] rounded-full p-1">
            <button onClick={() => setLang("en")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "en" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>EN</button>
            <button onClick={() => setLang("ar")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "ar" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>AR</button>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[460px] bg-[#FFFCF8] rounded-3xl p-8 md:p-10 shadow-[0_4px_20px_rgba(99,59,44,0.08)]">
          <h1 className="text-2xl font-serif font-bold text-center">{t.title}</h1>
          <p className="text-sm text-[#79665E] text-center mt-2">{t.subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.username}</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.password}</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
              />
            </div>

            {error && <p className="text-[#D96C7C] text-sm font-semibold">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full py-3 font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? t.submitting : t.submit}
            </button>
          </form>

          <p className="text-center text-sm text-[#79665E] mt-6">
            {t.noAccount}{" "}
            <Link href="/sign-up" className="text-[#D96C7C] font-semibold">{t.signUp}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
