import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import { seedState } from "@/lib/fakeData";
import { AccountRole, AuthSession, PortalAccess } from "@/lib/types";

const SESSION_COOKIE = "bliss_session";
const STATE_COOKIE = "bliss_oauth_state";
const DEFAULT_SECRET = "local-dev-auth-secret-change-me";

type ProviderMode = "local" | "google" | "oidc";

export type ManagedAuthStatus = {
  configured: boolean;
  mode: ProviderMode;
  providerLabel: string;
  missing: string[];
  loginUrl: string;
  logoutUrl: string;
  session: AuthSession & {
    userName: string;
    email: string;
    portalAccess: PortalAccess;
  };
  sessionSource: "cookie" | "local";
  productionReady: boolean;
};

type OAuthProfile = {
  sub?: string;
  email?: string;
  name?: string;
  hd?: string;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function providerMode(): ProviderMode {
  const configured = env("BLISS_AUTH_PROVIDER").toLowerCase();
  if (configured === "google" || configured === "oidc") return configured;
  return "local";
}

function authSecret() {
  return env("BLISS_AUTH_SESSION_SECRET") || env("NEXTAUTH_SECRET") || DEFAULT_SECRET;
}

function baseUrl() {
  const explicit = env("BLISS_PUBLIC_APP_URL") || env("NEXTAUTH_URL") || env("RENDER_EXTERNAL_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  return "http://127.0.0.1:3000";
}

function issuerUrl() {
  return env("BLISS_AUTH_ISSUER") || "https://accounts.google.com";
}

function authEndpoint() {
  if (providerMode() === "google") return "https://accounts.google.com/o/oauth2/v2/auth";
  return `${issuerUrl().replace(/\/$/, "")}/authorize`;
}

function tokenEndpoint() {
  if (providerMode() === "google") return "https://oauth2.googleapis.com/token";
  return `${issuerUrl().replace(/\/$/, "")}/oauth/token`;
}

function userInfoEndpoint() {
  if (providerMode() === "google") return "https://openidconnect.googleapis.com/v1/userinfo";
  return `${issuerUrl().replace(/\/$/, "")}/userinfo`;
}

function redirectUri() {
  return env("BLISS_AUTH_REDIRECT_URI") || `${baseUrl()}/api/auth/callback`;
}

function requiredConfig() {
  const mode = providerMode();
  if (mode === "local") return [];
  return ["BLISS_AUTH_CLIENT_ID", "BLISS_AUTH_CLIENT_SECRET", "BLISS_AUTH_SESSION_SECRET", "BLISS_PUBLIC_APP_URL"].filter(
    (key) => !env(key)
  );
}

function csvEnv(name: string) {
  return env(name)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isRole(value: string): value is AccountRole {
  return ["OWNER", "PLANNER", "PRODUCTION", "CLIENT", "VENDOR", "VIEWER"].includes(value);
}

function roleProfile(email: string): Pick<AuthSession, "role"> & { portalAccess: PortalAccess } {
  const normalized = email.toLowerCase();
  if (csvEnv("BLISS_PORTAL_CLIENT_EMAILS").includes(normalized)) {
    return { role: "CLIENT", portalAccess: "CLIENT_PORTAL" };
  }
  if (csvEnv("BLISS_PORTAL_VENDOR_EMAILS").includes(normalized)) {
    return { role: "VENDOR", portalAccess: "VENDOR_PORTAL" };
  }
  if (csvEnv("BLISS_PRODUCTION_EMAILS").includes(normalized)) {
    return { role: "PRODUCTION", portalAccess: "FULL_WORKSPACE" };
  }
  if (csvEnv("BLISS_ADMIN_EMAILS").includes(normalized) || csvEnv("BLISS_PLANNER_EMAILS").includes(normalized)) {
    return { role: "OWNER", portalAccess: "FULL_WORKSPACE" };
  }
  const defaultRole = env("BLISS_AUTH_DEFAULT_ROLE").toUpperCase();
  if (isRole(defaultRole)) {
    return {
      role: defaultRole,
      portalAccess: defaultRole === "CLIENT" ? "CLIENT_PORTAL" : defaultRole === "VENDOR" ? "VENDOR_PORTAL" : defaultRole === "VIEWER" ? "NONE" : "FULL_WORKSPACE"
    };
  }
  if (providerMode() !== "local") {
    return { role: "VIEWER", portalAccess: "NONE" };
  }
  return { role: "OWNER", portalAccess: "FULL_WORKSPACE" };
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function encodeSession(session: AuthSession & { userName: string; email: string; portalAccess: PortalAccess }) {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(raw: string | undefined) {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ManagedAuthStatus["session"];
  if (new Date(session.expiresAt).getTime() <= Date.now()) return null;
  return session;
}

function localSession(): ManagedAuthStatus["session"] {
  const user = seedState.users.find((item) => item.id === seedState.session.userId) ?? seedState.users[0];
  return {
    ...seedState.session,
    userName: user.name,
    email: user.email,
    portalAccess: user.portalAccess
  };
}

export function managedAuthConfig() {
  const mode = providerMode();
  const missing = requiredConfig();
  return {
    configured: missing.length === 0,
    mode,
    providerLabel: mode === "google" ? "Google Workspace" : mode === "oidc" ? "Managed OIDC" : "Local development",
    missing
  };
}

export async function getManagedAuthStatus(): Promise<ManagedAuthStatus> {
  const config = managedAuthConfig();
  const cookieStore = await cookies();
  const cookieSession = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  const session = cookieSession ?? localSession();
  return {
    ...config,
    loginUrl: "/api/auth/login",
    logoutUrl: "/api/auth/logout",
    session,
    sessionSource: cookieSession ? "cookie" : "local",
    productionReady: config.configured && config.mode !== "local"
  };
}

export async function requireManagedAccess(options: {
  portalAccess?: PortalAccess[];
  roles?: AccountRole[];
}) {
  const auth = await getManagedAuthStatus();
  const requiresCookie = auth.productionReady && auth.sessionSource !== "cookie";
  const portalAllowed = !options.portalAccess?.length || options.portalAccess.includes(auth.session.portalAccess);
  const roleAllowed = !options.roles?.length || options.roles.includes(auth.session.role);
  return {
    auth,
    allowed: !requiresCookie && portalAllowed && roleAllowed,
    reason: requiresCookie ? "LOGIN_REQUIRED" : !portalAllowed ? "PORTAL_ACCESS_REQUIRED" : !roleAllowed ? "ROLE_REQUIRED" : ""
  };
}

export async function beginManagedLogin() {
  const config = managedAuthConfig();
  if (config.mode === "local" || !config.configured) {
    return { redirectTo: "/", error: config.missing.join(", ") };
  }
  const state = randomBytes(16).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: baseUrl().startsWith("https://"),
    path: "/",
    maxAge: 10 * 60
  });
  const url = new URL(authEndpoint());
  url.searchParams.set("client_id", env("BLISS_AUTH_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", env("BLISS_AUTH_SCOPE") || "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return { redirectTo: url.toString() };
}

export async function completeManagedLogin(request: NextRequest) {
  const config = managedAuthConfig();
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value || "";
  cookieStore.delete(STATE_COOKIE);

  if (!config.configured || !code || !state || state !== expectedState) {
    return { redirectTo: "/?auth=failed" };
  }

  const tokenResponse = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("BLISS_AUTH_CLIENT_ID"),
      client_secret: env("BLISS_AUTH_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri()
    })
  });
  if (!tokenResponse.ok) return { redirectTo: "/?auth=token_failed" };
  const tokenPayload = await tokenResponse.json();
  const userInfoResponse = await fetch(userInfoEndpoint(), {
    headers: { authorization: `Bearer ${tokenPayload.access_token}` }
  });
  if (!userInfoResponse.ok) return { redirectTo: "/?auth=profile_failed" };
  const profile = (await userInfoResponse.json()) as OAuthProfile;
  const allowedDomain = env("BLISS_AUTH_ALLOWED_DOMAIN");
  if (allowedDomain && profile.email && !profile.email.endsWith(`@${allowedDomain}`)) {
    return { redirectTo: "/?auth=domain_denied" };
  }

  const mapped = roleProfile(profile.email || "");
  const session: ManagedAuthStatus["session"] = {
    userId: profile.sub || profile.email || "managed-user",
    workspaceId: seedState.workspace.id,
    role: mapped.role,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    userName: profile.name || profile.email || "Managed planner",
    email: profile.email || "planner@example.com",
    portalAccess: mapped.portalAccess
  };

  cookieStore.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: baseUrl().startsWith("https://"),
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });
  return { redirectTo: "/" };
}

export async function clearManagedLogin() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(STATE_COOKIE);
}

export async function requestOrigin() {
  const headerStore = await headers();
  return headerStore.get("origin") || baseUrl();
}
