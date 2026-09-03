import {
  assertMethod, assertSameOrigin, destroySession, errorResponse,
  expiredCookie, json, requireSession
} from "./_lib/core.mjs";

export default async (req) => {
  try {
    assertMethod(req, ["POST"]);
    assertSameOrigin(req);
    let token = "";
    try {
      token = (await requireSession(req, { allowPasswordChange: true })).token;
    } catch {}
    await destroySession(token);
    return json({ success: true }, 200, { "Set-Cookie": expiredCookie });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/auth/logout" };
