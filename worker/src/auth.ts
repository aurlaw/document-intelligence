export async function verifyTurnstile(
  token: string,
  secret: string,
  ip?: string,
): Promise<boolean> {
  if (!token) return false;
  const body: Record<string, string> = { secret, response: token };
  if (ip) body.remoteip = ip;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function mintAskToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 600; // 10-min window
  const message = String(exp);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${exp}.${sigHex}`;
}

export async function verifyAskToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sigHex] = parts;
  const exp = Number(expStr);
  if (!Number.isInteger(exp) || Math.floor(Date.now() / 1000) > exp) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = new Uint8Array(
    (sigHex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)),
  );
  try {
    return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(expStr));
  } catch {
    return false;
  }
}
