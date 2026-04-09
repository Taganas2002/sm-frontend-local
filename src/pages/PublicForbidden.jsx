import { Link } from "react-router-dom";
import { getTranslations } from "../translations";

export default function PublicForbidden({ language = "fr" }) {
  const t = getTranslations(language);
  const isRtl = language === "ar";

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.forbiddenTitle}</h1>
        <p className="mt-3 text-gray-600">{t.forbiddenMessage}</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-[#193d79] px-5 py-2.5 text-white font-medium hover:opacity-90"
        >
          {t.forbiddenBackHome}
        </Link>
      </div>
    </div>
  );
}
