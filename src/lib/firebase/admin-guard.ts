import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

type AdminIdentity = {
  uid: string;
  email: string | null;
  name: string | null;
};

function getAllowedAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifyAdminRequest(request: Request): Promise<AdminIdentity | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.replace("Bearer ", "").trim();
  if (!idToken) {
    return null;
  }

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    return null;
  }

  const decoded = await adminAuth.verifyIdToken(idToken);
  const email = decoded.email?.toLowerCase() ?? null;
  const allowedEmails = getAllowedAdminEmails();

  if (allowedEmails.length > 0 && (!email || !allowedEmails.includes(email))) {
    return null;
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: decoded.name ?? null
  };
}
