import {
  assertMethod,
  assertSameOrigin,
  changePassword,
  createSession,
  destroySession,
  errorResponse,
  json,
  requireSession
} from "./_lib/core.mjs";

export default async (req) => {
  try {
    assertMethod(req, ["POST"]);
    assertSameOrigin(req);

    const { user, token } = await requireSession(req, { allowPasswordChange: true });
    const body = await req.json().catch(() => ({}));
    const updated = await changePassword(user, body.currentPassword, body.newPassword);

    await destroySession(token);
    const session = await createSession(updated);

    return json(
      {
        success: true,
        mustChangePassword: false,
        user: {
          id: updated.id,
          name: updated.name || "",
          email: updated.email,
          role: updated.role
        }
      },
      200,
      { "Set-Cookie": session.cookie }
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/auth/change-password" };
