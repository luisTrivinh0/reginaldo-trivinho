import { errorResponse, json, requireSession } from "./_lib/core.mjs";

export default async (req) => {
  try {
    if (req.method !== "GET") {
      return json({ message: "Método não permitido." }, 405);
    }

    try {
      const { user } = await requireSession(req, { allowPasswordChange: true });
      return json({
        authenticated: true,
        mustChangePassword: user.mustChangePassword,
        user: {
          id: user.id,
          name: user.name || "",
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      if (error.status === 401) {
        return json({ authenticated: false, mustChangePassword: false }, 200);
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/auth/session" };
