"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthApiError } from "@/lib/api/auth";

type Lang = "en" | "ar";
type FieldKey = "name" | "username" | "phone" | "password";

const T = {
  en: {
    back: "← Back to Home",
    brand: "TORTA LAB",
    title: "Build Your Cake, Build Your Account",
    subtitle: "Four details and your cake — and your account — are ready.",
    name: "Name",
    username: "Username",
    phone: "Phone",
    password: "Password",
    submit: "Create Account",
    submitting: "Baking your account...",
    haveAccount: "Already have an account?",
    signIn: "Sign In",
    usernameHint: "Letters, numbers, and underscores only.",
    phoneHint: "e.g. 01012345678",
    passwordHint: "At least 8 characters.",
    errorName: "Please enter your name.",
    errorUsername: "3–30 characters: letters, numbers, underscores only.",
    errorPhone: "Enter a valid Egyptian phone number.",
    errorPassword: "Password must be at least 8 characters.",
    cakeBuilding: "Your cake is coming together...",
    cakeReady: "Your cake is ready!",
    cakeDone: "Baked! Welcome to Torta Lab.",
    conflictUsername: "already taken",
    conflictPhone: "already registered",
    genericError: "Something went wrong. Please try again.",
  },
  ar: {
    back: "→ رجوع للرئيسية",
    brand: "تورتا لاب",
    title: "صمّم تورتتك، وابدأ حسابك",
    subtitle: "أربع تفاصيل بس وتورتتك، وحسابك، هيبقوا جاهزين.",
    name: "الاسم",
    username: "اسم المستخدم",
    phone: "رقم الموبايل",
    password: "كلمة السر",
    submit: "أنشئ حسابك",
    submitting: "بنجهز حسابك...",
    haveAccount: "عندك حساب بالفعل؟",
    signIn: "سجّل دخولك",
    usernameHint: "حروف وأرقام و underscore بس.",
    phoneHint: "مثال: 01012345678",
    passwordHint: "8 حروف على الأقل.",
    errorName: "من فضلك اكتب اسمك.",
    errorUsername: "من 3 لـ30 حرف: حروف وأرقام و underscore بس.",
    errorPhone: "من فضلك اكتب رقم موبايل مصري صحيح.",
    errorPassword: "كلمة السر لازم تكون 8 حروف على الأقل.",
    cakeBuilding: "تورتتك بتتجمع...",
    cakeReady: "تورتتك جاهزة!",
    cakeDone: "خبزناها! أهلاً بيك في تورتا لاب.",
    conflictUsername: "مستخدم بالفعل",
    conflictPhone: "مسجل بالفعل",
    genericError: "حصل خطأ، حاول تاني.",
  },
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

function isValidEgyptianPhone(raw: string): boolean {
  const stripped = raw.trim().replace(/[\s()-]/g, "");
  let candidate: string;
  if (stripped.startsWith("+20")) candidate = stripped;
  else if (stripped.startsWith("0020")) candidate = `+${stripped.slice(2)}`;
  else if (stripped.startsWith("20")) candidate = `+${stripped}`;
  else if (stripped.startsWith("0")) candidate = `+20${stripped.slice(1)}`;
  else candidate = `+20${stripped}`;
  return /^\+20\d{10}$/.test(candidate);
}

// --- Cake-building signup progress: four triangular slices assemble into
// one round cake as each field becomes valid, rather than a generic bar. ---
const CAKE_CENTER = 100;
const CAKE_RADIUS = 82;

function polarPoint(angleDeg: number, radius = CAKE_RADIUS) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CAKE_CENTER + radius * Math.cos(rad), y: CAKE_CENTER + radius * Math.sin(rad) };
}

function wedgePath(startAngle: number, endAngle: number): string {
  const start = polarPoint(startAngle);
  const end = polarPoint(endAngle);
  return `M ${CAKE_CENTER} ${CAKE_CENTER} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${CAKE_RADIUS} ${CAKE_RADIUS} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

const CAKE_SLICES: { field: FieldKey; angles: [number, number]; fill: string }[] = [
  { field: "name", angles: [-135, -45], fill: "#F3C7CC" },
  { field: "username", angles: [-45, 45], fill: "#D96C7C" },
  { field: "phone", angles: [45, 135], fill: "#F3C7CC" },
  { field: "password", angles: [135, 225], fill: "#D96C7C" },
];

function CakeProgress({
  validity,
  finishing,
  caption,
}: {
  validity: Record<FieldKey, boolean>;
  finishing: boolean;
  caption: string;
}) {
  const allValid = CAKE_SLICES.every((slice) => validity[slice.field]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative mx-auto w-full max-w-[220px] aspect-square">
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <circle cx={CAKE_CENTER} cy={CAKE_CENTER} r={90} fill="#F8EEE5" />
          <circle
            cx={CAKE_CENTER}
            cy={CAKE_CENTER}
            r={CAKE_RADIUS + 4}
            fill="none"
            stroke="#E8D8CC"
            strokeWidth={1}
            strokeDasharray="2 5"
          />

          {CAKE_SLICES.map((slice) => {
            const isValid = validity[slice.field];
            return (
              <path
                key={slice.field}
                d={wedgePath(slice.angles[0], slice.angles[1])}
                fill={slice.fill}
                stroke="#FFF9F3"
                strokeWidth={3}
                strokeLinejoin="round"
                style={{
                  transformOrigin: "100px 100px",
                  transform: isValid ? "scale(1)" : "scale(0.55)",
                  opacity: isValid ? 1 : 0,
                  transition: "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease",
                }}
              />
            );
          })}

          <circle
            cx={CAKE_CENTER}
            cy={CAKE_CENTER}
            r={CAKE_RADIUS + 6}
            fill="none"
            stroke="#B8945F"
            strokeWidth={2}
            style={{ opacity: allValid ? 1 : 0, transition: "opacity 500ms ease 150ms" }}
          />

          <circle
            cx={CAKE_CENTER}
            cy={CAKE_CENTER}
            r={9}
            fill="#C55769"
            style={{
              transformOrigin: "100px 100px",
              transform: finishing ? "scale(1)" : "scale(0)",
              transition: "transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-[#79665E] text-center min-h-[1.25rem]">{caption}</p>
    </div>
  );
}

export default function SignUpPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = T[lang];
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const validity: Record<FieldKey, boolean> = useMemo(
    () => ({
      name: name.trim().length >= 2,
      username: USERNAME_PATTERN.test(username.trim()),
      phone: isValidEgyptianPhone(phone),
      password: password.length >= 8,
    }),
    [name, username, phone, password],
  );

  const allValid = validity.name && validity.username && validity.phone && validity.password;
  const caption = finishing ? t.cakeDone : allValid ? t.cakeReady : t.cakeBuilding;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validity.name) return setError(t.errorName);
    if (!validity.username) return setError(t.errorUsername);
    if (!validity.phone) return setError(t.errorPhone);
    if (!validity.password) return setError(t.errorPassword);

    setError("");
    setSubmitting(true);
    try {
      await signup({ name: name.trim(), username: username.trim(), phone: phone.trim(), password });
      setFinishing(true);
      setTimeout(() => router.push("/"), 650);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 409) {
        setError(/username/i.test(err.message) ? `${t.username} ${t.conflictUsername}` : `${t.phone} ${t.conflictPhone}`);
      } else {
        setError(t.genericError);
      }
      setSubmitting(false);
    }
  };

  return (
    <div dir={dir} lang={lang} className="bg-[#FFF9F3] text-[#33221C] min-h-screen font-sans">
      <nav className="sticky top-0 z-50 bg-[#FFF9F3]/95 backdrop-blur border-b border-[#E8D8CC]">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-[#633B2C]">{t.back}</Link>
          <span className="text-xl font-serif font-bold">{t.brand}</span>
          <div className="flex items-center bg-[#F8EEE5] border border-[#E8D8CC] rounded-full p-1">
            <button onClick={() => setLang("en")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "en" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>EN</button>
            <button onClick={() => setLang("ar")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "ar" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>AR</button>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-4xl bg-[#FFFCF8] rounded-3xl p-8 md:p-10 shadow-[0_4px_20px_rgba(99,59,44,0.08)] grid md:grid-cols-[1fr_auto] gap-10 items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold">{t.title}</h1>
            <p className="text-sm text-[#79665E] mt-2">{t.subtitle}</p>

            <div className="md:hidden mt-6 mb-2">
              <CakeProgress validity={validity} finishing={finishing} caption={caption} />
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.name}</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                />
              </div>
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
                <p className="text-xs text-[#B8A99B] mt-1">{t.usernameHint}</p>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.phone}</label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                  placeholder={t.phoneHint}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.password}</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                />
                <p className="text-xs text-[#B8A99B] mt-1">{t.passwordHint}</p>
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
              {t.haveAccount}{" "}
              <Link href="/sign-in" className="text-[#D96C7C] font-semibold">{t.signIn}</Link>
            </p>
          </div>

          <div className="hidden md:block">
            <CakeProgress validity={validity} finishing={finishing} caption={caption} />
          </div>
        </div>
      </div>
    </div>
  );
}
