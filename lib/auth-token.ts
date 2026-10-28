import { createHmac, timingSafeEqual } from "node:crypto";

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionToken(secret: string, expiresAt = Date.now() + 1000 * 60 * 60 * 12) {
  const expires = String(expiresAt);
  return `${expires}.${signature(expires, secret)}`;
}

export function isValidSessionToken(token: string | undefined, secret: string) {
  if (!token) return false;
  const [expires, suppliedSignature] = token.split(".");
  if (!expires || !suppliedSignature || Number(expires) <= Date.now()) return false;
  const expectedSignature = signature(expires, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
