import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nContext";
import { noticeLanguage, translateNoticeText } from "./noticeTranslation";

export type NoticeTranslationState = {
  text: string;
  isTranslated: boolean;
  pending: boolean;
  unavailable: boolean;
  /** Detected language of the original notice, e.g. "pt". */
  sourceLanguage: string | null;
  showOriginal: boolean;
  toggleOriginal: () => void;
};

/**
 * Resolves a notice title/description into the reader's chosen language.
 *
 * The original text is always available: a translation failure keeps the
 * source wording and reports `unavailable`, and the reader can switch back at
 * any time. Nothing is translated when the notice already matches the locale.
 */
export function useNoticeTranslation(text: string): NoticeTranslationState {
  const { locale } = useI18n();
  const value = text ?? "";
  const source = noticeLanguage(value);
  const shouldTranslate = Boolean(value) && source !== null && source !== locale;

  const [state, setState] = useState<{ forKey: string; translated: string | null; failed: boolean }>({
    forKey: "",
    translated: null,
    failed: false,
  });
  const [showOriginal, setShowOriginal] = useState(false);
  const mounted = useRef(true);

  const key = `${locale}|${value}`;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setShowOriginal(false);
    if (!shouldTranslate) {
      setState({ forKey: key, translated: null, failed: false });
      return;
    }
    let cancelled = false;
    // Mark the request as pending for this exact text/locale pair so a stale
    // translation can never be shown against a different notice.
    setState({ forKey: key, translated: null, failed: false });
    void translateNoticeText(value, locale)
      .then((result) => {
        if (cancelled || !mounted.current) return;
        setState({
          forKey: key,
          translated: result?.text ?? null,
          failed: result === null,
        });
      })
      .catch(() => {
        if (cancelled || !mounted.current) return;
        setState({ forKey: key, translated: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, locale, shouldTranslate, value]);

  const settled = state.forKey === key;
  const translated = settled && !showOriginal ? state.translated : null;
  const pending = shouldTranslate && settled && !state.translated && !state.failed;

  return {
    text: translated ?? value,
    isTranslated: Boolean(translated),
    pending,
    unavailable: shouldTranslate && settled && state.failed,
    sourceLanguage: source,
    showOriginal: showOriginal && Boolean(translated),
    toggleOriginal: () => setShowOriginal((current) => !current),
  };
}
