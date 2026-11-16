interface Env {
  NEON_AUTH_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

type PagesFunctionContext = {
  request: Request;
  env: Env;
};

type NeonJwk = JsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
};

type OtpEvent = {
  event_id: string;
  event_type: string;
  event_data: {
    otp_code: string;
    otp_type: "sign-in" | "email-verification" | "forget-password";
    expires_at: string;
    delivery_preference?: "email" | "sms";
  };
  user: {
    email: string;
  };
};

const MAX_BODY_BYTES = 16_384;
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1_000;
const RESEND_FROM_EMAIL = "OppSift <noreply@getoppsift.com>";

function jsonResponse(status: number, message: string) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64Url(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function readOtpEvent(value: unknown): OtpEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const event = value as Partial<OtpEvent>;
  const data = event.event_data;
  const user = event.user;
  if (
    event.event_type !== "send.otp" ||
    typeof event.event_id !== "string" ||
    !event.event_id ||
    typeof data !== "object" ||
    data === null ||
    typeof user !== "object" ||
    user === null ||
    typeof user.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) ||
    typeof data.otp_code !== "string" ||
    !/^\d{6}$/.test(data.otp_code) ||
    !["sign-in", "email-verification", "forget-password"].includes(data.otp_type) ||
    typeof data.expires_at !== "string" ||
    !Number.isFinite(Date.parse(data.expires_at)) ||
    (data.delivery_preference !== undefined &&
      data.delivery_preference !== "email" &&
      data.delivery_preference !== "sms")
  ) {
    return null;
  }
  return event as OtpEvent;
}

async function verifyNeonSignature(
  request: Request,
  rawBody: string,
  authUrl: string,
): Promise<"valid" | "invalid" | "unavailable"> {
  const signatureHeader = request.headers.get("x-neon-signature");
  const keyId = request.headers.get("x-neon-signature-kid");
  const timestamp = request.headers.get("x-neon-timestamp");
  const eventType = request.headers.get("x-neon-event-type");
  const eventId = request.headers.get("x-neon-event-id");
  if (!signatureHeader || !keyId || !timestamp || !eventType || !eventId) {
    return "invalid";
  }

  const timestampNumber = Number(timestamp);
  if (
    !Number.isSafeInteger(timestampNumber) ||
    Math.abs(Date.now() - timestampNumber) > MAX_SIGNATURE_AGE_MS
  ) {
    return "invalid";
  }

  const signatureParts = signatureHeader.split(".");
  if (
    signatureParts.length !== 3 ||
    !signatureParts[0] ||
    signatureParts[1] !== "" ||
    !signatureParts[2]
  ) {
    return "invalid";
  }

  let protectedHeader: { alg?: string; kid?: string };
  let signature: Uint8Array;
  try {
    protectedHeader = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(signatureParts[0])),
    ) as { alg?: string; kid?: string };
    signature = decodeBase64Url(signatureParts[2]);
  } catch {
    return "invalid";
  }
  if (protectedHeader.alg !== "EdDSA" || protectedHeader.kid !== keyId) {
    return "invalid";
  }

  let jwksUrl: URL;
  try {
    const authEndpoint = new URL(authUrl);
    if (
      authEndpoint.protocol !== "https:" ||
      authEndpoint.username ||
      authEndpoint.password ||
      authEndpoint.search ||
      authEndpoint.hash
    ) {
      return "invalid";
    }
    jwksUrl = new URL(
      `${authEndpoint.pathname.replace(/\/+$/, "")}/.well-known/jwks.json`,
      authEndpoint.origin,
    );
  } catch {
    return "invalid";
  }

  let keys: NeonJwk[];
  try {
    const response = await fetch(jwksUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return "unavailable";
    const jwks = (await response.json()) as { keys?: NeonJwk[] };
    if (!Array.isArray(jwks.keys)) return "unavailable";
    keys = jwks.keys;
  } catch {
    return "unavailable";
  }

  const jwk = keys.find(
    (candidate) =>
      candidate.kid === keyId &&
      candidate.kty === "OKP" &&
      candidate.crv === "Ed25519" &&
      (candidate.alg === undefined || candidate.alg === "EdDSA") &&
      (candidate.use === undefined || candidate.use === "sig"),
  );
  if (!jwk) return "invalid";

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const payload = encodeBase64Url(new TextEncoder().encode(rawBody));
    const signaturePayload = encodeBase64Url(
      new TextEncoder().encode(`${timestamp}.${payload}`),
    );
    const signingInput = new TextEncoder().encode(
      `${signatureParts[0]}.${signaturePayload}`,
    );
    return (await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      new Uint8Array(signature),
      signingInput,
    ))
      ? "valid"
      : "invalid";
  } catch {
    return "unavailable";
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailContent(event: OtpEvent) {
  const { otp_code: code, otp_type: type, expires_at: expiresAt } = event.event_data;
  const expiration = new Date(expiresAt).toUTCString();
  const verification = type === "email-verification";
  const reset = type === "forget-password";
  const subject = verification
    ? "Verify your email address — OppSift"
    : reset
      ? "Reset your password — OppSift"
      : "Your OppSift sign-in code";
  const action = verification
    ? "verify your email address"
    : reset
      ? "reset your password"
      : "sign in";
  const safeCode = escapeHtml(code);
  const safeExpiration = escapeHtml(expiration);
  const text = [
    "OppSift",
    "",
    `Use this code to ${action}: ${code}`,
    `This code expires at ${expiration}.`,
    "If you did not request this code, you can ignore this message. Never share this code with anyone.",
  ].join("\n");
  const html = `<div style="background:#f4f6f8;padding:32px;font-family:Arial,sans-serif;color:#142332"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px"><p style="font-size:13px;font-weight:bold;letter-spacing:2px;color:#087e76">OPPSIFT</p><h1 style="font-size:24px">Confirm it’s you</h1><p>Use this code to ${escapeHtml(action)}:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f4f6f8;text-align:center;border-radius:8px">${safeCode}</p><p>This code expires at <strong>${safeExpiration} (UTC)</strong>.</p><p>If you did not request this code, you can ignore this message. For your security, never share this code with anyone.</p><p style="font-size:12px;color:#687783">OppSift · Global Opportunity Intelligence</p></div></div>`;
  return { subject, text, html };
}

export async function onRequestPost({
  request,
  env,
}: PagesFunctionContext): Promise<Response> {
  if (
    !env.NEON_AUTH_URL ||
    !env.RESEND_API_KEY ||
    env.RESEND_FROM_EMAIL !== RESEND_FROM_EMAIL
  ) {
    console.error("Neon Auth email delivery is missing required configuration.");
    return jsonResponse(503, "Email delivery is not configured.");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonResponse(413, "Request is too large.");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonResponse(413, "Request is too large.");
  }

  const signature = await verifyNeonSignature(request, rawBody, env.NEON_AUTH_URL);
  if (signature === "unavailable") {
    return jsonResponse(503, "Email delivery verification is temporarily unavailable.");
  }
  if (signature !== "valid") {
    return jsonResponse(401, "Webhook signature is invalid.");
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonResponse(400, "Webhook payload is invalid.");
  }
  const event = readOtpEvent(parsedBody);
  if (
    !event ||
    event.event_id !== request.headers.get("x-neon-event-id") ||
    event.event_type !== request.headers.get("x-neon-event-type")
  ) {
    return jsonResponse(400, "Webhook payload is invalid.");
  }
  if (
    event.event_data.delivery_preference === "sms" ||
    Date.parse(event.event_data.expires_at) <= Date.now()
  ) {
    return jsonResponse(422, "This verification code cannot be delivered.");
  }

  const email = emailContent(event);
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
        "idempotency-key": event.event_id,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [event.user.email],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(6_000),
    });
  } catch (error) {
    console.error("Resend email delivery request failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse(503, "Email delivery is temporarily unavailable.");
  }
  if (!response.ok) {
    let errorName = "UnknownError";
    try {
      const errorBody: unknown = await response.json();
      if (
        typeof errorBody === "object" &&
        errorBody !== null &&
        "name" in errorBody &&
        typeof errorBody.name === "string"
      ) {
        errorName = errorBody.name;
      }
    } catch {
      errorName = "UnknownError";
    }
    console.error("Resend email delivery failed.", {
      name: errorName,
      statusCode: response.status,
    });
    return jsonResponse(503, "Email delivery is temporarily unavailable.");
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    console.error("Resend email delivery returned an invalid response.");
    return jsonResponse(503, "Email delivery is temporarily unavailable.");
  }
  if (
    typeof result !== "object" ||
    result === null ||
    !("id" in result) ||
    typeof result.id !== "string" ||
    !result.id
  ) {
    console.error("Resend email delivery returned no message ID.");
    return jsonResponse(503, "Email delivery is temporarily unavailable.");
  }
  return jsonResponse(200, "Email delivered.");
}
