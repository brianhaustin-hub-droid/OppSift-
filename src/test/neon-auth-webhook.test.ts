import { webcrypto, generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "../../functions/api/neon-auth-webhook";

const consoleErrorSpies: { mockRestore: () => void }[] = [];

const authUrl = "https://auth.example.test/neondb/auth";
const fromEmail = "OppSift <noreply@getoppsift.com>";
const eventBody = JSON.stringify({
  event_id: "event-test-1",
  event_type: "send.otp",
  event_data: {
    otp_code: "123456",
    otp_type: "email-verification",
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  },
  user: {
    email: "person@example.test",
  },
});

function spyOnConsoleError() {
  const spy = vi.spyOn(console, "error");
  consoleErrorSpies.push(spy);
  return spy;
}

function makeSignedRequest(
  body = eventBody,
  timestamp = String(Date.now()),
  signatureOverride?: string,
) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" });
  const keyId = "test-key";
  const protectedHeader = btoa(JSON.stringify({ alg: "EdDSA", kid: keyId }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const payload = btoa(body)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const signaturePayload = btoa(`${timestamp}.${payload}`)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const signingInput = `${protectedHeader}.${signaturePayload}`;
  const signature = sign(null, Buffer.from(signingInput), privateKey).toString(
    "base64url",
  );
  const headers = new Headers({
    "content-type": "application/json",
    "x-neon-signature": `${protectedHeader}..${signatureOverride ?? signature}`,
    "x-neon-signature-kid": keyId,
    "x-neon-timestamp": timestamp,
    "x-neon-event-type": "send.otp",
    "x-neon-event-id": "event-test-1",
  });
  const request = new Request("https://oppsift.test/api/neon-auth-webhook", {
    method: "POST",
    headers,
    body,
  });
  return { request, jwk };
}

describe("Neon Auth email webhook", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const spy of consoleErrorSpies.splice(0)) spy.mockRestore();
  });

  it("verifies Neon signatures and sends a branded verification email via Resend", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const { request, jwk } = makeSignedRequest();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          keys: [{ ...jwk, kid: "test-key", alg: "EdDSA", use: "sig" }],
        }),
      )
      .mockResolvedValueOnce(Response.json({ id: "email-test-1" }));
    vi.stubGlobal("fetch", fetch);

    const response = await onRequestPost({
      request,
      env: {
        NEON_AUTH_URL: authUrl,
        RESEND_API_KEY: "mock-only-not-a-credential",
        RESEND_FROM_EMAIL: fromEmail,
      },
    });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "https://auth.example.test/neondb/auth/.well-known/jwks.json",
    );
    const [resendUrl, resendOptions] = fetch.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(resendUrl).toBe("https://api.resend.com/emails");
    expect(resendOptions.method).toBe("POST");
    expect(new Headers(resendOptions.headers).get("authorization")).toBe(
      "Bearer mock-only-not-a-credential",
    );
    expect(new Headers(resendOptions.headers).get("idempotency-key")).toBe(
      "event-test-1",
    );
    const email = JSON.parse(String(resendOptions.body)) as {
      from: string;
      subject: string;
      text: string;
      html: string;
      to: string[];
    };
    expect(email.from).toBe(fromEmail);
    expect(email.to).toEqual(["person@example.test"]);
    expect(email.subject).toBe("Verify your email address — OppSift");
    expect(email.text).toContain("123456");
    expect(email.text).toContain("Never share this code");
    expect(email.html).toContain("OppSift");
    expect(email.html).toContain("123456");
  });

  it("rejects unsigned requests before calling Resend", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await onRequestPost({
      request: new Request("https://oppsift.test/api/neon-auth-webhook", {
        method: "POST",
        body: eventBody,
      }),
      env: {
        NEON_AUTH_URL: authUrl,
        RESEND_API_KEY: "test-key",
        RESEND_FROM_EMAIL: fromEmail,
      },
    });

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when the sender binding is missing", async () => {
    const errorSpy = spyOnConsoleError();
    const { request } = makeSignedRequest();

    const response = await onRequestPost({
      request,
      env: {
        NEON_AUTH_URL: authUrl,
        RESEND_API_KEY: "mock-only-not-a-credential",
      },
    });
    expect(response.status).toBe(503);
    expect(errorSpy).toHaveBeenCalledWith(
      "Neon Auth email delivery is missing required configuration.",
    );
  });

  it("rejects stale signatures without sending email", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const staleTimestamp = String(Date.now() - 6 * 60_000);
    const { request } = makeSignedRequest(eventBody, staleTimestamp);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await onRequestPost({
      request,
      env: {
        NEON_AUTH_URL: authUrl,
        RESEND_API_KEY: "mock-only-not-a-credential",
        RESEND_FROM_EMAIL: fromEmail,
      },
    });

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when the webhook is not configured", async () => {
    const errorSpy = spyOnConsoleError();
    const response = await onRequestPost({
      request: new Request("https://oppsift.test/api/neon-auth-webhook", {
        method: "POST",
        body: "{}",
      }),
      env: {},
    });

    expect(response.status).toBe(503);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("handles Resend errors without exposing the API key or OTP", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const errorSpy = spyOnConsoleError();
    const { request, jwk } = makeSignedRequest();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        Response.json({
          keys: [{ ...jwk, kid: "test-key", alg: "EdDSA", use: "sig" }],
        }),
      ).mockResolvedValueOnce(
        Response.json(
          {
            name: "restricted_api_key",
            statusCode: 403,
            message: "private details containing 123456",
          },
          { status: 403 },
        ),
      ),
    );

    const response = await onRequestPost({
      request,
      env: {
        NEON_AUTH_URL: authUrl,
        RESEND_API_KEY: "mock-only-not-a-credential",
        RESEND_FROM_EMAIL: fromEmail,
      },
    });

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private details");
    expect(errorSpy).toHaveBeenCalledWith(
      "Resend email delivery failed.",
      { name: "restricted_api_key", statusCode: 403 },
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("123456");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("mock-only-not-a-credential");
  });

  it("returns an error when the Resend request rejects", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const errorSpy = spyOnConsoleError();
    const { request, jwk } = makeSignedRequest();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          keys: [{ ...jwk, kid: "test-key", alg: "EdDSA", use: "sig" }],
        }),
      )
      .mockRejectedValueOnce(new Error("provider details"));
    vi.stubGlobal("fetch", fetch);

    const response = await onRequestPost({
      request,
      env: {
        NEON_AUTH_URL: authUrl,
        RESEND_API_KEY: "mock-only-not-a-credential",
        RESEND_FROM_EMAIL: fromEmail,
      },
    });

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("provider details");
    expect(errorSpy).toHaveBeenCalledWith(
      "Resend email delivery request failed.",
      { name: "Error" },
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("provider details");
  });
});
