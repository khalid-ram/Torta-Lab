"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthNetworkError } from "@/lib/api/auth";

type Lang = "en" | "ar";

const T = {
  en: {
    brand: "TORTA LAB",
    badge: "Admin",
    title: "Admin Sign In",
    subtitle: "Sign in with your admin account.",
    username: "Username",
    password: "Password",
    submit: "Sign In",
    submitting: "Signing in...",
    errorRequired: "Please fill in both fields.",
    errorGeneric: "Invalid username or password.",
    errorNotAdmin: "This account does not have admin access.",
    networkError: "Could not connect to the server. Check your connection and try again.",
  },
  ar: {
    brand: "تورتا لاب",
    badge: "مدير",
    title: "تسجيل الدخول",
    subtitle: "سجّل دخولك بحساب المدير الخاص بك.",
    username: "اسم المستخدم",
    password: "كلمة السر",
    submit: "تسجيل الدخول",
    submitting: "بنسجل دخولك...",
    errorRequired: "من فضلك املأ الحقلين.",
    errorGeneric: "اسم المستخدم أو كلمة السر غلط.",
    errorNotAdmin: "هذا الحساب لا يملك صلاحية الوصول للوحة التحكم.",
    networkError: "تعذر الاتصال بالسيرفر. تأكد من اتصالك بالإنترنت وحاول تاني.",
  },
};

export default function AdminLoginPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = T[lang];
  const router = useRouter();
  const { login, logout } = useAuth();

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
      const user = await login({ username: username.trim(), password });
      if (user.role !== "admin") {
        await logout();
        setError(t.errorNotAdmin);
        return;
      }
      router.push("/admin");
    } catch (err) {
      setError(err instanceof AuthNetworkError ? t.networkError : t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir={dir} lang={lang} className="bg-white text-[#33221C] min-h-screen font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-6">
          <span className="text-2xl font-serif font-bold">{t.brand}</span>
          <span className="text-xs font-semibold text-[#D96C7C] mt-1">{t.badge}</span>
        </div>

        <div className="bg-[#FFFCF8] border border-[#E8D8CC] rounded-3xl p-8 md:p-10 shadow-[0_4px_20px_rgba(99,59,44,0.08)]">
          <h1 className="text-xl font-serif font-bold text-center">{t.title}</h1>
          <p className="text-sm text-[#79665E] text-center mt-2">{t.subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="admin-username" className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.username}</label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.password}</label>
              <input
                id="admin-password"
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
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="text-sm font-medium text-[#79665E] hover:text-[#633B2C] transition"
          >
            {lang === "ar" ? "English" : "عربي"}
          </button>
        </div>
      </div>
    </div>
  );
}
