import { Languages } from "lucide-react";
import { useI18n } from "./I18nContext";
import { locales, type LocaleCode } from "./locales";

type LanguageSwitcherProps = {
  variant?: "light" | "dark";
  compact?: boolean;
};

export function LanguageSwitcher({ variant = "light", compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const base =
    variant === "dark"
      ? "border-white/15 bg-white/5 text-white"
      : "border-[#E2E8F0] bg-white text-[#172033] dark:border-white/12 dark:bg-white/5 dark:text-[#F8FAFC]";

  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium ${base}`}
      title={t("common.language")}
    >
      <Languages className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleCode)}
        className="bg-transparent text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B59] rounded-sm"
        aria-label={t("common.language")}
      >
        {locales.map((option) => (
          <option key={option.code} value={option.code} className="text-[#172033]">
            {compact ? option.code.toUpperCase() : option.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
