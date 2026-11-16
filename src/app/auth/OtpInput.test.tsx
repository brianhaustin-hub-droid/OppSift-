import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OtpInput } from "./OtpInput";

const CODE_LABEL = "6-Digit Verification Code";

function field(index: number) {
  return screen.getByRole("textbox", {
    name: `${CODE_LABEL} digit ${index + 1} of 6`,
  });
}

function ControlledOtp({
  onComplete,
  disabled = false,
}: {
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(6).fill(""));
  return (
    <OtpInput
      digits={digits}
      disabled={disabled}
      onComplete={onComplete}
      onChange={setDigits}
    />
  );
}

describe("segmented OTP input", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("labels the segmented group and its individual boxes", () => {
    render(<ControlledOtp />);

    expect(screen.getByRole("group", { name: CODE_LABEL })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    expect(field(0)).toHaveAttribute("autocomplete", "one-time-code");
    expect(field(1)).toHaveAttribute("autocomplete", "off");
    expect(field(0)).toHaveAttribute("inputmode", "numeric");
  });

  it("advances one box per digit and reports the code once it is complete", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<ControlledOtp onComplete={onComplete} />);

    for (let index = 0; index < 6; index += 1) {
      await user.type(field(index), String(index + 1));
    }

    for (let index = 0; index < 6; index += 1) {
      expect(field(index)).toHaveValue(String(index + 1));
    }
    expect(document.activeElement).toBe(field(5));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("distributes a pasted code across the boxes instead of stacking it", () => {
    const onComplete = vi.fn();
    render(<ControlledOtp onComplete={onComplete} />);

    fireEvent.change(field(0), { target: { value: "123456" } });

    expect(field(0)).toHaveValue("1");
    expect(field(1)).toHaveValue("2");
    expect(field(2)).toHaveValue("3");
    expect(field(3)).toHaveValue("4");
    expect(field(4)).toHaveValue("5");
    expect(field(5)).toHaveValue("6");
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("carries a short paste into the following boxes", () => {
    render(<ControlledOtp />);

    fireEvent.change(field(3), { target: { value: "89" } });

    expect(field(3)).toHaveValue("8");
    expect(field(4)).toHaveValue("9");
    expect(field(5)).toHaveValue("");
  });

  it("ignores non-digit keystrokes for completion purposes", () => {
    const onComplete = vi.fn();
    render(<ControlledOtp onComplete={onComplete} />);

    fireEvent.change(field(0), { target: { value: "abc" } });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("releases the complete callback after the code becomes incomplete again", () => {
    const onComplete = vi.fn();
    render(<ControlledOtp onComplete={onComplete} />);

    fireEvent.change(field(0), { target: { value: "123456" } });
    expect(onComplete).toHaveBeenCalledTimes(1);

    fireEvent.change(field(5), { target: { value: "" } });
    expect(onComplete).toHaveBeenCalledTimes(1);

    fireEvent.change(field(5), { target: { value: "7" } });
    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenLastCalledWith("123457");
  });

  it("backspaces from an empty box into the previous one", () => {
    render(<ControlledOtp />);

    fireEvent.change(field(0), { target: { value: "1234" } });
    fireEvent.keyDown(field(4), { key: "Backspace" });

    expect(field(3)).toHaveValue("");
    expect(field(4)).toHaveValue("");
    expect(document.activeElement).toBe(field(3));
  });

  it("moves focus with the arrow keys", () => {
    render(<ControlledOtp />);

    fireEvent.keyDown(field(0), { key: "ArrowRight" });
    expect(document.activeElement).toBe(field(1));

    fireEvent.keyDown(field(1), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(field(0));

    fireEvent.keyDown(field(0), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(field(0));
  });

  it("stays usable while the parent reports a pending request", () => {
    render(<ControlledOtp disabled />);

    expect(field(0)).toBeDisabled();
    expect(field(5)).toBeDisabled();
  });

  it("reads the pasted text from the clipboard payload", () => {
    const onComplete = vi.fn();
    render(<ControlledOtp onComplete={onComplete} />);

    fireEvent.paste(field(0), {
      clipboardData: { getData: () => "  314159  " },
    });

    expect(onComplete).toHaveBeenCalledWith("314159");
    expect(field(0)).toHaveValue("3");
  });
});
