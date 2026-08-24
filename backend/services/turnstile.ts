import "server-only";

interface TurnstileResponse {
  readonly success: boolean;
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return false;
  const result: unknown = await response.json();
  return typeof result === "object" && result !== null && "success" in result
    ? (result as TurnstileResponse).success === true
    : false;
}
