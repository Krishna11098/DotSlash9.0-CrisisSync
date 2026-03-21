export const ADMIN_AUTH_COOKIE_NAME = "xspark_admin_auth";

const ADMIN_SESSION_HASH_PREFIX = "xspark-admin-session-v1";

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const hashValue = async (rawValue: string) => {
  const encoded = new TextEncoder().encode(rawValue);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(digest);
};

export const getAdminCredentials = () => {
  const id = process.env.ADMIN_LOGIN_ID;
  const password = process.env.ADMIN_LOGIN_PASSWORD;

  return {
    id,
    password,
    configured: Boolean(id && password),
  };
};

export const verifyAdminCredentials = (inputId: string, inputPassword: string) => {
  const { id, password, configured } = getAdminCredentials();

  if (!configured || !id || !password) {
    return false;
  }

  return inputId === id && inputPassword === password;
};

export const getAdminSessionValue = async () => {
  const { id, password, configured } = getAdminCredentials();
  if (!configured || !id || !password) {
    return null;
  }

  return hashValue(`${ADMIN_SESSION_HASH_PREFIX}:${id}:${password}`);
};

export const isValidAdminSession = async (cookieValue?: string) => {
  if (!cookieValue) {
    return false;
  }

  const expectedValue = await getAdminSessionValue();
  if (!expectedValue) {
    return false;
  }

  return cookieValue === expectedValue;
};
