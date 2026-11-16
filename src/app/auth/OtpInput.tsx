import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

type OtpInputProps = {
  digits: string[];
  onChange: (digits: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  label?: string;
};

export function OtpInput({
  digits,
  onChange,
  onComplete,
  disabled = false,
  label = "6-Digit Verification Code",
}: OtpInputProps) {
  const length = digits.length;
  const fieldRefs = useRef<(HTMLInputElement | null)[]>([]);
  const previousComplete = useRef(digits.every((digit) => digit !== ""));

  function focusField(index: number) {
    const clamped = Math.min(Math.max(index, 0), length - 1);
    fieldRefs.current[clamped]?.focus();
    fieldRefs.current[clamped]?.select();
  }

  function commit(next: string[], lastEditedIndex: number) {
    onChange(next);
    const isComplete = next.every((digit) => digit !== "");
    if (isComplete && !previousComplete.current) {
      previousComplete.current = true;
      onComplete?.(next.join(""));
    } else if (!isComplete) {
      previousComplete.current = false;
    }
    focusField(lastEditedIndex + 1 >= length ? lastEditedIndex : lastEditedIndex + 1);
  }

  function handleChange(index: number, rawValue: string) {
    const entered = rawValue.replace(/\D/g, "").slice(0, length - index);
    if (!entered) {
      const cleared = [...digits];
      cleared[index] = "";
      onChange(cleared);
      previousComplete.current = false;
      return;
    }

    const next = [...digits];
    for (let offset = 0; offset < entered.length; offset += 1) {
      next[index + offset] = entered[offset];
    }
    commit(next, index + entered.length - 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index]) {
      event.preventDefault();
      const next = [...digits];
      next[Math.max(index - 1, 0)] = "";
      onChange(next);
      previousComplete.current = false;
      focusField(Math.max(index - 1, 0));
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusField(index - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusField(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    handleChange(0, pasted);
  }

  return (
    <div className="otp-group" aria-label={label} role="group">
      {digits.map((digit, index) => (
        <input
          aria-label={`${label} digit ${index + 1} of ${length}`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          className="otp-group__field"
          disabled={disabled}
          inputMode="numeric"
          key={index}
          maxLength={1}
          onChange={(event) => handleChange(index, event.currentTarget.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          pattern="[0-9]*"
          ref={(element) => {
            fieldRefs.current[index] = element;
          }}
          type="text"
          value={digit}
        />
      ))}
    </div>
  );
}
