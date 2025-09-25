  import React from "react";
  import { Link } from "react-router-dom";
  import Navbar from "../components/Navbar";
  import { useAuth } from "../auth/AuthContext";
  import { FaUserGraduate, FaChalkboardTeacher, FaCalendarAlt, FaUserCheck, FaClipboardList, FaFileInvoiceDollar } from "react-icons/fa";


  export default function Home() {
    const { isLogged } = useAuth();

    return (
      <div className="min-h-screen bg-white" dir="rtl" lang="ar">
        <Navbar />

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600"></div>
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"></div>

          <div className="mx-auto max-w-7xl px-6 py-20 text-right text-white">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-gray-900 text-lg">
                  📚 نظام شامل لإدارة المدارس
                </span>

                <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl text-gray-900">
                  مرحباً بكم في{" "} Madrasti Management Software
                </h1>

                <p className="mt-4 text-gray-800 text-base">
                  منصتنا تساعد المدارس على إدارة التلاميذ، الأساتذة، الأقسام،
                  النتائج، الغيابات، والفواتير بكل سهولة واحترافية.
                </p>

                {/* CTA */}
                <div className="mt-8 flex flex-wrap gap-3 justify-end">
                  {!isLogged ? (
                    <>
                      {/* زر إنشاء حساب */}
                      <Link to="/signup">
                  <button
                    style={{ backgroundColor: "#193d79" }}
                    className="rounded-xl px-5 py-3 font-medium text-white hover:opacity-90 transition"
                  >
                    إنشاء حساب
                  </button>
                </Link>


                      {/* زر تسجيل الدخول */}
                      <Link to="/login">
                        <button
                          className="rounded-xl bg-gray-300 px-5 py-3 font-medium text-gray-900 hover:bg-gray-400 transition"
                        >
                          تسجيل الدخول
                        </button>
                      </Link>
                    </>
                  ) : (
                    <Link
                      to="/dashboard"
                      className="rounded-xl bg-white px-5 py-3 font-medium text-indigo-700"
                    >
                    <button style={{ backgroundColor: "#193d79" }}
                    className="rounded-xl px-5 py-3 font-medium text-white hover:opacity-90 transition">
                      الذهاب إلى لوحة التحكم
                      </button>
                  
                    </Link>
                  )}
                </div>
              </div>

              {/* Mock preview card */}
              <div className="rounded-2xl bg-white/10 p-2 backdrop-blur">
  <div className="rounded-xl ">
    <video
              src={`src/assets/mockup.mp4`}
      autoPlay
      loop
      muted
      playsInline
      className="rounded-lg w-full h-auto"
    />
  </div>
</div>

            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-6 py-14 text-right">
          <h2 className="text-center text-3xl font-bold text-gray-900 ">
            كل ما تحتاجه المدرسة في مكان واحد
          </h2>
          <p className="mx-auto mt-2 max-w-4xl text-center text-gray-600 text-lg">
            نظام Madrasti Management Software يوفر حلول متكاملة لإدارة التلاميذ،
            الأساتذة، الأقسام، الدروس، النتائج والفواتير.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 font-bold text-xl">
  {[
    { title: "إدارة التلاميذ", desc: "إضافة، تعديل ومتابعة بيانات التلاميذ بسهولة.", icon: <FaUserGraduate color="#60a5fa" size={30} /> },
    { title: "إدارة الأساتذة", desc: "تنظيم ملفات المعلمين، المواد، وساعات التدريس.", icon: <FaChalkboardTeacher color="#60a5fa" size={30} /> },
    { title: "الأقسام والجداول", desc: "تخطيط الجداول الزمنية ومتابعة الحصص الدراسية.", icon: <FaCalendarAlt color="#60a5fa" size={30} /> },
    { title: "الحضور والغياب", desc: "تسجيل ومتابعة الغيابات بشكل دقيق وسريع.", icon: <FaUserCheck color="#60a5fa" size={30} /> },
    { title: "إدارة النتائج", desc: "إدخال، حساب وطباعة النقاط والتقارير المدرسية.", icon: <FaClipboardList color="#60a5fa" size={30} /> },
    { title: "المحاسبة والفواتير", desc: "إدارة الرسوم المدرسية والمدفوعات بكل شفافية.", icon: <FaFileInvoiceDollar color="#60a5fa" size={30} /> },
  ].map((f) => (
    <div key={f.title} className="rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center">
        {f.icon}
      </div>
      <h3 className="font-semibold text-gray-900">{f.title}</h3>
      <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
    </div>
  ))}
</div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-6 py-14 text-right">
          <h2 className="text-2xl font-bold text-gray-900">كيف يعمل النظام؟</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3 text-xl">
            {[
              { n: "1", t: "التسجيل أو تسجيل الدخول", d: "قم بإنشاء حساب جديد أو الدخول بحسابك." },
              { n: "2", t: "الوصول إلى لوحة التحكم", d: "تمتع بخدمات النظام كاملة. المديرون يحصلون على صلاحيات إضافية." },
              { n: "3", t: "إدارة شاملة", d: "تابع المدرسة، التلاميذ والأساتذة من منصة واحدة." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-gray-200 p-6">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-900 text-white">
                  {s.n}
                </div>
                <h3 className="font-semibold text-gray-900">{s.t}</h3>
                <p className="mt-1 text-sm text-gray-600">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA footer */}
        <section className="mx-auto max-w-7xl px-6 pb-20" dir="rtl">
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-indigo-600 px-6 py-10 text-white sm:flex-row"     style={{ backgroundColor: "#60a5fa" }}>
            <div>
              <h3 className="text-xl font-semibold">
                {isLogged ? "عد إلى عملك" : "هل أنت جاهز للبدء؟"}
              </h3>
              <p className="text-white/90 font-semibold" >
                {isLogged ? "افتح لوحة التحكم للمتابعة." : "قم بإنشاء حسابك الآن وابدأ في تجربة النظام."}
              </p>
            </div>
            <div className="flex gap-3 font-semibold">
              {isLogged ? (
                <Link to="/dashboard" className="rounded-xl bg-white px-5 py-3 font-medium text-gray-900 hover:bg-gray-100">
                  لوحة التحكم
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="rounded-xl bg-white px-5 py-3 font-medium text-indigo-900 hover:bg-gray-100">
                    إنشاء حساب
                  </Link>
                  <Link to="/login" style={{ backgroundColor: "#193d79" }} className="rounded-xl bg-white/10 px-5 py-3 font-medium hover:bg-white/20">
                    تسجيل الدخول
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }
