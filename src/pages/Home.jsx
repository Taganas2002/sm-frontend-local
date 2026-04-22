import React, { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../auth/AuthContext";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaCalendarAlt,
  FaUserCheck,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaCloud,
  FaLaptopHouse,
  FaUserLock,
  FaClipboardCheck,
  FaHeadset,
  FaPhone,
  FaEnvelope,
  FaFacebookF,
  FaInstagram,
  FaCheckCircle,
  FaMobileAlt,
} from "react-icons/fa";
import { getTranslations } from "../translations";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_TEL,
  FACEBOOK_URL,
  INSTAGRAM_URL,
} from "../constants/supportContact";
import { SupportEmailTileLabel, SupportPhoneInline } from "../utils/supportContactLabels";
import partnerAlkhawarezmiImg from "../assets/partners/alkhawarezmi.png";
import heroMockupVideo from "../assets/mockup.mp4";
import heroVideoPoster from "../assets/screenshots/classroom.jpg";
const LANDING_TUTORIAL_VIDEO_URL = "https://www.youtube.com/embed/WgTN2iOVFJ4";

function SectionTitle({ children, subtitle, centered, isRtl }) {
  const wrap = centered ? (isRtl ? "text-right" : "text-center") : isRtl ? "text-right" : "text-start";
  return (
    <div className={`mb-5 sm:mb-6 max-w-3xl ${centered ? "mx-auto" : ""} ${wrap}`}>
      <div className={`flex flex-col gap-1.5 ${centered ? "items-center" : isRtl ? "items-end" : "items-start"}`}>
        <h2
          className={`text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 ${isRtl ? "" : "tracking-tight"}`}
        >
          {children}
        </h2>
        <span className="landing-heading-accent" aria-hidden />
        {subtitle && (
          <p
            className={`text-gray-600 text-sm sm:text-base md:text-lg leading-snug sm:leading-relaxed mt-0.5 max-w-2xl ${centered ? "text-center mx-auto" : ""}`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function textLinkButtonClass(isRtl) {
  return `font-semibold text-[#193d79] hover:text-[#142d5c] bg-transparent border-0 cursor-pointer underline-offset-4 hover:underline p-0 ${isRtl ? "text-right" : "text-left"}`;
}

function PlanBullet({ children, isRtl }) {
  return (
    <li
      className={`flex items-start gap-2.5 text-sm sm:text-base text-gray-700 leading-normal ${
        isRtl ? "flex-row-reverse" : ""
      }`}
    >
      <FaCheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

export default function Home({ language, setLanguage }) {
  const { isLogged } = useAuth();
  const t = getTranslations(language);
  const isRtl = language === "ar";

  /**
   * HashRouter: never use href="#…" (breaks #/ routes). Scroll in JS instead.
   * Offers: scroll the pricing grid into view with block "center" so CTAs aren’t clipped at the bottom.
   */
  const scrollToSection = useCallback((sectionId, block = "start") => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block, inline: "nearest" });
  }, []);

  const plans = useMemo(
    () => [
      {
        id: "trial",
        badge: t.landingPlanTrialBadge,
        title: t.landingPlanTrialTitle,
        period: t.landingPlanTrialPeriod,
        price: t.landingPlanPriceTrial,
        note: t.landingPlanTrialNote,
        features: [
          t.landingPlanTrialF1,
          t.landingPlanTrialF2,
          t.landingPlanTrialF3,
          t.landingPlanTrialF4,
        ],
        popular: false,
        primaryToSignup: true,
      },
      {
        id: "3m",
        badge: t.landingPlan3Badge,
        title: t.landingPlan3Title,
        period: t.landingPlan3Period,
        price: null,
        note: t.landingPlan3Note,
        features: [t.landingPlan3F1, t.landingPlan3F2, t.landingPlan3F3],
        popular: false,
        primaryToSignup: false,
      },
      {
        id: "12m",
        badge: t.landingPlan12Badge,
        title: t.landingPlan12Title,
        period: t.landingPlan12Period,
        price: null,
        note: t.landingPlan12Note,
        features: [t.landingPlan12F1, t.landingPlan12F2, t.landingPlan12F3],
        popular: true,
        popularLabel: t.landingPlan12Popular,
        primaryToSignup: false,
      },
      {
        id: "desktop",
        badge: t.landingPlanDesktopBadge,
        title: t.landingPlanDesktopTitle,
        period: t.landingPlanDesktopPeriod,
        price: t.landingPlanPriceDesktop,
        note: t.landingPlanDesktopNote,
        features: [
          t.landingPlanDesktopF1,
          t.landingPlanDesktopF2,
          t.landingPlanDesktopF3,
          t.landingPlanDesktopF4,
        ],
        popular: false,
        primaryToSignup: false,
        desktopAccent: true,
      },
    ],
    [t]
  );

  const paySteps = useMemo(
    () => [
      { title: t.landingPayStep1Title, desc: t.landingPayStep1Desc },
      { title: t.landingPayStep2Title, desc: t.landingPayStep2Desc },
      { title: t.landingPayStep3Title, desc: t.landingPayStep3Desc },
      { title: t.landingPayStep4Title, desc: t.landingPayStep4Desc },
    ],
    [t]
  );

  const features = [
    {
      title: t.landingFeatureStudentsTitle,
      desc: t.landingFeatureStudentsDesc,
      icon: <FaUserGraduate className="text-[#60a5fa]" size={28} />,
    },
    {
      title: t.landingFeatureTeachersTitle,
      desc: t.landingFeatureTeachersDesc,
      icon: <FaChalkboardTeacher className="text-[#60a5fa]" size={28} />,
    },
    {
      title: t.landingFeatureScheduleTitle,
      desc: t.landingFeatureScheduleDesc,
      icon: <FaCalendarAlt className="text-[#60a5fa]" size={28} />,
    },
    {
      title: t.landingFeatureAttendanceTitle,
      desc: t.landingFeatureAttendanceDesc,
      icon: <FaUserCheck className="text-[#60a5fa]" size={28} />,
    },
    {
      title: t.landingFeatureResultsTitle,
      desc: t.landingFeatureResultsDesc,
      icon: <FaClipboardList className="text-[#60a5fa]" size={28} />,
    },
    {
      title: t.landingFeatureFinanceTitle,
      desc: t.landingFeatureFinanceDesc,
      icon: <FaFileInvoiceDollar className="text-[#60a5fa]" size={28} />,
    },
  ];

  const trustItems = [
    { icon: <FaUserLock className="text-[#193d79]" size={22} />, text: t.landingTrustRoles },
    { icon: <FaClipboardCheck className="text-[#193d79]" size={22} />, text: t.landingTrustAudit },
    { icon: <FaHeadset className="text-[#193d79]" size={22} />, text: t.landingTrustSupport },
  ];

  const contactTiles = [
    {
      key: "phone",
      href: SUPPORT_PHONE_TEL,
      label: <SupportPhoneInline t={t} />,
      icon: <FaPhone className="text-xl text-[#193d79]" />,
      external: false,
    },
    {
      key: "email",
      href: `mailto:${SUPPORT_EMAIL}`,
      label: <SupportEmailTileLabel t={t} />,
      icon: <FaEnvelope className="text-xl text-[#193d79]" />,
      external: true,
    },
    {
      key: "facebook",
      href: FACEBOOK_URL,
      label: t.expiredFacebookButton || "Facebook",
      icon: <FaFacebookF className="text-xl text-[#1877F2]" />,
      external: true,
    },
    {
      key: "instagram",
      href: INSTAGRAM_URL,
      label: t.expiredInstagramButton || "Instagram",
      icon: <FaInstagram className="text-xl text-pink-600" />,
      external: true,
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" lang={language} dir={isRtl ? "rtl" : "ltr"}>
      <Navbar language={language} setLanguage={setLanguage} />

      {/* Hero: corporate navy / slate (brand #193d79) — avoids loud purple SaaS cliché */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-[#193d79] to-slate-900 text-white">
        <div
          className="landing-hero-blob pointer-events-none absolute -top-24 -left-24 z-0 h-80 w-80 rounded-full bg-white/[0.06] blur-3xl"
          aria-hidden
        />
        <div
          className="landing-hero-blob pointer-events-none absolute -bottom-24 -right-24 z-0 h-80 w-80 rounded-full bg-[#60a5fa]/15 blur-3xl"
          style={{ animationDelay: "-7s" }}
          aria-hidden
        />

        <div
          className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 md:py-20 text-start ${isRtl ? "text-right" : ""}`}
        >
          <div className="grid items-center gap-6 md:gap-10 md:grid-cols-2">
            <div className="landing-fade-up min-w-0 order-2 md:order-none">
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1.5 text-white text-xs sm:text-sm font-semibold backdrop-blur-sm border border-white/30">
                {t.landingHeroBadge}
              </span>

              <h1 className="landing-hero-title mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.15] text-white drop-shadow-md">
                {t.landingHeroTitle}
              </h1>

              <p className="mt-4 text-white/95 text-sm sm:text-base md:text-lg max-w-xl leading-relaxed">
                {t.landingHeroSubtitle}
              </p>

              <div
                className={`mt-8 flex flex-col sm:flex-row flex-wrap gap-3 ${isRtl ? "sm:justify-end" : "sm:justify-start"}`}
              >
                {!isLogged ? (
                  <>
                    <Link to="/signup" className="w-full sm:w-auto min-w-0">
                      <button
                        type="button"
                        style={{ backgroundColor: "#193d79" }}
                        className="w-full sm:w-auto rounded-xl px-6 py-3.5 font-semibold text-white hover:opacity-95 transition shadow-lg min-h-[48px] border border-white/10"
                      >
                        {t.landingCtaSignup}
                      </button>
                    </Link>
                    <Link to="/login" className="w-full sm:w-auto">
                      <button
                        type="button"
                        className="w-full sm:w-auto rounded-xl bg-white/95 px-6 py-3.5 font-semibold text-gray-900 hover:bg-white transition min-h-[48px] shadow-md"
                      >
                        {t.landingCtaLogin}
                      </button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => scrollToSection("plans-grid", "center")}
                      className="w-full sm:w-auto rounded-xl border-2 border-white/70 bg-white/5 px-6 py-3.5 font-semibold text-white hover:bg-white/12 transition min-h-[48px] flex items-center justify-center"
                    >
                      {t.landingHeroCtaPlans}
                    </button>
                  </>
                ) : (
                  <Link to="/dashboard" className="w-full sm:w-auto">
                    <button
                      type="button"
                      style={{ backgroundColor: "#193d79" }}
                      className="w-full sm:w-auto rounded-xl px-6 py-3.5 font-semibold text-white hover:opacity-90 transition min-h-[48px] shadow-lg"
                    >
                      {t.landingCtaDashboard}
                    </button>
                  </Link>
                )}
              </div>
            </div>

            <div
              className="landing-fade-up order-1 md:order-none rounded-2xl bg-white/10 p-2 md:p-3 backdrop-blur-md border border-white/20 shadow-2xl max-w-lg md:max-w-none mx-auto w-full"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="rounded-xl overflow-hidden ring-1 ring-black/10 bg-slate-900/40">
                <video
                  src={heroMockupVideo}
                  poster={heroVideoPoster}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="rounded-lg w-full h-auto object-cover block bg-slate-900/50"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to use video */}
      <section className={`py-10 sm:py-12 md:py-14 border-t border-gray-200/80 bg-white ${isRtl ? "text-right" : ""}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle centered subtitle={t.landingHowVideoSubtitle} isRtl={isRtl}>
            {t.landingHowVideoTitle}
          </SectionTitle>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-lg">
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={LANDING_TUTORIAL_VIDEO_URL}
                title={t.landingHowVideoTitle}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
          <div className="mt-5 text-center">
            <a
              href="https://youtu.be/WgTN2iOVFJ4?si=u0Xr0yphfZXP8RN5"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#193d79] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 transition"
            >
              {t.landingHowVideoCta}
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="plans"
        dir={isRtl ? "rtl" : "ltr"}
        className={`landing-section-alt scroll-mt-24 py-10 sm:py-12 md:py-14 ${isRtl ? "text-right" : ""}`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle centered subtitle={t.landingPricingSubtitle} isRtl={isRtl}>
            {t.landingPricingTitle}
          </SectionTitle>

          <div
            id="plans-grid"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:items-stretch scroll-mt-24"
          >
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`landing-fade-up landing-card landing-plan-card relative flex flex-col h-full rounded-2xl border bg-white/95 p-5 sm:p-6 shadow-sm backdrop-blur-sm ${
                  plan.popular
                    ? "landing-popular-glow border-[#193d79] z-10"
                    : plan.desktopAccent
                      ? "border-emerald-700/35 bg-gradient-to-b from-white to-emerald-50/40"
                      : "border-gray-200/90"
                }`}
                style={{ animationDelay: `${0.08 + i * 0.07}s` }}
              >
                {plan.popular && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#193d79] px-4 py-1 text-xs font-bold text-white shadow-md ${
                      isRtl ? "normal-case" : "uppercase tracking-wide"
                    }`}
                  >
                    {plan.popularLabel}
                  </div>
                )}
                <div className={`flex flex-wrap items-center gap-2 mb-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {plan.badge}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{plan.title}</h3>
                <p className="mt-0.5 text-sm font-medium text-[#193d79]">{plan.period}</p>
                {plan.price ? (
                  <p className={`mt-2 text-3xl font-extrabold text-gray-900 ${isRtl ? "" : "tracking-tight"}`}>
                    {plan.price}
                  </p>
                ) : (
                  <div className="mt-2 h-9" aria-hidden />
                )}
                <p className="mt-2 text-sm text-gray-600 leading-snug">{plan.note}</p>
                <ul className="mt-3 flex-1 min-h-0 list-none space-y-2 p-0 m-0">
                  {plan.features.map((f) => (
                    <PlanBullet key={f} isRtl={isRtl}>
                      {f}
                    </PlanBullet>
                  ))}
                </ul>
                <div className="mt-auto flex w-full shrink-0 flex-col gap-2 border-t border-slate-100 pt-4">
                  {plan.primaryToSignup ? (
                    <Link to="/signup" className="block w-full">
                      <span className="flex w-full min-h-[48px] items-center justify-center rounded-xl bg-[#193d79] px-4 py-3 text-sm font-semibold text-white hover:opacity-95 transition shadow-md">
                        {t.landingCtaSignup}
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => scrollToSection("landing-contact")}
                      className={`flex w-full min-h-[48px] items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition shadow-md ${
                        plan.desktopAccent
                          ? "bg-emerald-800 text-white hover:bg-emerald-900"
                          : "bg-[#193d79] text-white hover:opacity-95"
                      }`}
                    >
                      {plan.desktopAccent ? t.landingPlanCtaDesktop : t.landingPlanCtaContact}
                    </button>
                  )}
                  <div className="flex min-h-[1.375rem] items-center justify-center">
                    {plan.primaryToSignup ? (
                      <button
                        type="button"
                        onClick={() => scrollToSection("landing-contact")}
                        className="bg-transparent border-0 p-0 text-center text-sm font-medium text-slate-600 hover:text-[#193d79] cursor-pointer"
                      >
                        {t.landingPlanCtaContact}
                      </button>
                    ) : (
                      <span className="pointer-events-none select-none text-sm text-transparent" aria-hidden>
                        .
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment flow — Baridi Mob & Algeria */}
      <section className={`py-10 sm:py-12 md:py-14 border-y border-gray-200/80 bg-white ${isRtl ? "text-right" : ""}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div
            className={`rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#193d79] p-6 sm:p-8 md:p-10 text-white shadow-xl ${isRtl ? "text-right" : ""}`}
          >
            <div className={`flex flex-col md:flex-row md:items-start gap-3 mb-6 ${isRtl ? "md:flex-row-reverse" : ""}`}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 border border-white/20">
                <FaMobileAlt className="text-2xl text-white" aria-hidden />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">{t.landingPayFlowTitle}</h2>
                <p className="mt-2 text-white/85 text-sm sm:text-base max-w-3xl leading-relaxed">
                  {t.landingPayFlowSubtitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-3">
              {paySteps.map((step, i) => (
                <div
                  key={step.title}
                  className="landing-fade-up relative rounded-xl border border-white/15 bg-white/10 p-4 sm:p-5 backdrop-blur-md"
                  style={{ animationDelay: `${0.05 * i}s` }}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-extrabold text-[#193d79] shadow">
                    {i + 1}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold leading-snug">{step.title}</h3>
                  <p className="mt-2 text-sm text-white/85 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SaaS + Desktop */}
      <section className={`landing-section-alt py-10 sm:py-12 ${isRtl ? "text-right" : ""}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle centered subtitle={t.landingOffersSubtitle} isRtl={isRtl}>
            {t.landingOffersTitle}
          </SectionTitle>

          <div className="grid gap-5 md:grid-cols-2">
            {[
              {
                icon: <FaCloud className="text-4xl text-indigo-600 shrink-0" />,
                title: t.landingOfferSaaSTitle,
                body: t.landingOfferSaaSBody,
                grad: "from-white to-sky-50/90",
              },
              {
                icon: <FaLaptopHouse className="text-4xl text-slate-700 shrink-0" />,
                title: t.landingOfferDesktopTitle,
                body: t.landingOfferDesktopBody,
                grad: "from-white to-slate-100/90",
              },
            ].map((offer, i) => (
              <div
                key={offer.title}
                className={`landing-card landing-fade-up group h-full rounded-2xl border border-gray-200/90 p-6 sm:p-7 shadow-sm bg-gradient-to-br ${offer.grad}`}
                style={{ animationDelay: `${0.08 + i * 0.06}s` }}
              >
                <div className={`flex items-start gap-4 mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100 group-hover:scale-105 transition duration-300">
                    {offer.icon}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{offer.title}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{offer.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={`py-8 sm:py-10 md:py-12 ${isRtl ? "text-right" : ""}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle centered subtitle={t.landingFeaturesSubtitle} isRtl={isRtl}>
            {t.landingFeaturesTitle}
          </SectionTitle>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-4 auto-rows-fr">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="landing-card landing-fade-up group flex h-full min-h-[200px] flex-col rounded-2xl border border-gray-200/85 bg-white p-5 shadow-sm hover:border-[#193d79]/30 sm:min-h-[210px]"
                style={{ animationDelay: `${0.04 + i * 0.035}s` }}
              >
                <div className="mb-3 inline-flex shrink-0 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/90 p-3.5 ring-1 ring-slate-200/80 transition duration-300 group-hover:scale-[1.02]">
                  {f.icon}
                </div>
                <h3 className="shrink-0 font-bold text-gray-900 text-base sm:text-lg leading-snug">{f.title}</h3>
                <p className="mt-2 flex-1 text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-slate-200/90 pt-5 text-sm">
            <span className="text-gray-500">{t.landingNextStepLead}</span>
            <button
              type="button"
              onClick={() => scrollToSection("plans-grid", "center")}
              className={textLinkButtonClass(isRtl)}
            >
              {t.landingNextComparePlans}
            </button>
            <span className="hidden text-slate-300 sm:inline" aria-hidden>
              ·
            </span>
            <button
              type="button"
              onClick={() => scrollToSection("landing-contact", "start")}
              className={textLinkButtonClass(isRtl)}
            >
              {t.landingNextContactTeam}
            </button>
          </div>
        </div>
      </section>

      {/* Trust — partner schools + operational guarantees */}
      <section
        className="landing-section-alt py-8 sm:py-10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle centered subtitle={t.landingTrustSubtitle} isRtl={isRtl}>
            {t.landingTrustTitle}
          </SectionTitle>

          <div className="mb-8 flex flex-wrap items-stretch justify-center gap-10 sm:gap-14">
            <figure
              className="landing-fade-up flex max-w-[11rem] flex-col items-center gap-2 text-center"
              style={{ animationDelay: "0.05s" }}
            >
              <div className="rounded-full bg-gradient-to-b from-slate-50 to-white p-1.5 shadow-md ring-1 ring-[#193d79]/15">
                <img
                  src={partnerAlkhawarezmiImg}
                  alt={t.landingTrustPartnerAlkhawarezmiAlt}
                  className="h-24 w-24 rounded-full object-cover object-center sm:h-28 sm:w-28"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption className="text-sm font-semibold leading-snug text-slate-800">
                {t.landingTrustPartnerAlkhawarezmi}
              </figcaption>
            </figure>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
            {trustItems.map((item, i) => (
              <div
                key={i}
                className={`landing-card landing-fade-up flex items-start gap-3 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ${
                  isRtl ? "flex-row-reverse" : ""
                }`}
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                <div className="shrink-0 rounded-xl border border-gray-100 bg-slate-50 p-3">{item.icon}</div>
                <p className="min-w-0 flex-1 text-sm leading-normal text-gray-800 sm:text-base">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="landing-contact"
        className="scroll-mt-20 landing-section-alt py-8 sm:py-10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle centered subtitle={t.landingContactSubtitle} isRtl={isRtl}>
            {t.landingContactTitle}
          </SectionTitle>
          <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-gray-600 leading-snug">
            {t.landingContactHelpLine}{" "}
            <button
              type="button"
              onClick={() => scrollToSection("plans-grid", "center")}
              className="inline font-semibold text-[#193d79] hover:text-[#142d5c] underline-offset-4 hover:underline bg-transparent border-0 cursor-pointer p-0 align-baseline"
            >
              {t.landingNextComparePlans}
            </button>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-3">
            {contactTiles.map((c, i) => (
              <a
                key={c.key}
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="landing-card landing-fade-up landing-card-focusable flex h-full min-h-[104px] flex-col gap-2 rounded-2xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-sm no-underline text-inherit transition items-start text-start"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                  {c.icon}
                </div>
                <span className="text-sm font-semibold text-gray-900 leading-snug break-words">{c.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA footer — navy / slate only (matches hero & brand) */}
      <section className={`mx-auto max-w-7xl px-4 sm:px-6 pb-10 sm:pb-14 pt-2 ${isRtl ? "text-right" : ""}`}>
        <div
          className={`landing-footer-cta flex flex-col items-stretch sm:items-center justify-between gap-4 rounded-2xl px-6 sm:px-9 py-8 sm:py-10 text-white sm:flex-row ${
            isRtl ? "sm:flex-row-reverse" : ""
          }`}
        >
          <div
            className={`${isRtl ? "text-right w-full sm:w-auto" : "w-full sm:w-auto text-center sm:text-start"}`}
          >
            <h3 className="text-xl sm:text-2xl font-bold">
              {isLogged ? t.landingFooterCtaTitleLogged : t.landingFooterCtaTitleGuest}
            </h3>
            <p className="text-white/88 font-medium mt-2 text-sm sm:text-base max-w-xl leading-snug">
              {isLogged ? t.landingFooterCtaSubLogged : t.landingFooterCtaSubGuest}
            </p>
          </div>
          <div className={`flex flex-col sm:flex-row gap-3 font-semibold w-full sm:w-auto ${isRtl ? "sm:justify-end" : ""}`}>
            {isLogged ? (
              <Link
                to="/dashboard"
                className="rounded-xl bg-white px-6 py-3.5 font-semibold text-gray-900 hover:bg-gray-100 text-center min-h-[48px] flex items-center justify-center shadow-md"
              >
                {t.landingFooterDashboard}
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="rounded-xl bg-white px-6 py-3.5 font-semibold text-[#193d79] hover:bg-slate-100 text-center min-h-[48px] flex items-center justify-center shadow-md"
                >
                  {t.landingFooterCtaSignup}
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl border-2 border-white/80 bg-transparent px-6 py-3.5 font-semibold text-white hover:bg-white/10 text-center min-h-[48px] flex items-center justify-center"
                >
                  {t.landingFooterCtaLogin}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
