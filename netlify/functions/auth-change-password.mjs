import {
  assertMethod, assertSameOrigin, changePassword, createSession,
  destroySession, errorResponse, json, requireSession
} from "./_lib/core.mjs";

export default async (req) => {
  try {
    assertMethod(req, ["POST"]);
    assertSameOrigin(req);
    const { account, token } = await requireSession(req, { allowPasswordChange: true });
    const body = await req.json().catch(() => ({}));
    const updated = await changePassword(account, body.currentPassword, body.newPassword);
    await destroySession(token);
    const session = await createSession(updated);
    return json({ success: true, mustChangePassword: false }, 200, { "Set-Cookie": session.cookie });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/auth/change-password" };
