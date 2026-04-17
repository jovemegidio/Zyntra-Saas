import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { DEMO_MODE, DEMO_USER_ID, DEMO_USER } from "./demo";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production"
);

const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = (await import("bcryptjs")).default;
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = (await import("bcryptjs")).default;
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: {
  userId: string;
  sessionId: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; sessionId: string };
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      token: crypto.randomUUID(),
      userAgent: userAgent?.substring(0, 500),
      ipAddress: ipAddress?.substring(0, 45),
      expiresAt,
    },
  });

  const jwt = await createToken({
    userId,
    sessionId: session.id,
  });

  const cookieStore = await cookies();
  cookieStore.set("session", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });

  return session;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Demo mode: return a fake session without touching the database
  if (DEMO_MODE && payload.userId === DEMO_USER_ID) {
    return {
      id: "demo-session",
      userId: DEMO_USER_ID,
      token: "demo-token",
      userAgent: null,
      ipAddress: null,
      expiresAt: new Date(Date.now() + SESSION_DURATION * 1000),
      createdAt: DEMO_USER.createdAt,
      user: DEMO_USER,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (token) {
    const payload = await verifyToken(token);
    // Demo mode: just clear the cookie, no DB record to delete
    if (payload && !(DEMO_MODE && payload.userId === DEMO_USER_ID)) {
      await prisma.session.delete({ where: { id: payload.sessionId } }).catch(() => {});
    }
  }

  cookieStore.delete("session");
}

/** Creates a cookie-based session for the demo user without any DB interaction */
export async function createDemoSession() {
  const jwt = await createToken({ userId: DEMO_USER_ID, sessionId: "demo-session" });
  const cookieStore = await cookies();
  cookieStore.set("session", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return session.user;
}
