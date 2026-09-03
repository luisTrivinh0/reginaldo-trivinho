import {
  assertMethod,
  assertSameOrigin,
  bootstrapOrAuthenticate,
  checkLoginRate,
  clearLoginFailures,
  createSession,
  errorResponse,
  json,
  recordLoginFailure
} from "./_lib/core.mjs";

export default async (req, context) => {
  try {
    assertMethod(req, ["POST"]);
    assertSameOrigin(req);

    const rate = await checkLoginRate(context.ip);
    const body = await req.json().catch(() => ({}));

    try {
      const user = await bootstrapOrAuthenticate(body.email, body.password);
      await clearLoginFailures(rate.key);
      const session = await createSession(user);

      return json(
        {
          authenticated: true,
          mustChangePassword: user.mustChangePassword,
          user: {
            id: user.id,
            name: user.name || "",
            email: user.email,
            role: user.role
          }
        },
        200,
        { "Set-Cookie": session.cookie }
      );
    } catch (error) {
      if (error.status === 401) await recordLoginFailure(rate.key, rate.state);
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/auth/login" };
