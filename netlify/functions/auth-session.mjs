import { errorResponse, json, requireSession } from "./_lib/core.mjs";

export default async (req) => {
  try {
    if (req.method !== "GET") return json({ message: "Método não permitido." }, 405);

    try {
      const { account } = await requireSession(req, { allowPasswordChange: true });
      return json({
        authenticated: true,
        mustChangePassword: account.mustChangePassword,
        email: account.email
      });
    } catch (error) {
      if (error.status === 401) return json({ authenticated: false, mustChangePassword: false }, 200);
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/auth/session" };
