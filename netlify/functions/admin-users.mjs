import {
  assertSameOrigin,
  createManagedUser,
  deleteManagedUser,
  errorResponse,
  json,
  listManagedUsers,
  requireOwner,
  requireSession,
  resetManagedUserPassword,
  updateManagedUser
} from "./_lib/core.mjs";

export default async (req) => {
  try {
    const { user } = await requireSession(req);
    requireOwner(user);

    if (req.method === "GET") {
      return json({ users: await listManagedUsers(), currentUserId: user.id });
    }

    assertSameOrigin(req);
    const body = await req.json().catch(() => ({}));

    if (req.method === "POST") {
      if (body.action === "reset-password") {
        const updated = await resetManagedUserPassword(
          user,
          String(body.id || ""),
          body.temporaryPassword
        );
        return json({ success: true, user: updated });
      }

      const created = await createManagedUser(user, body);
      return json({ success: true, user: created }, 201);
    }

    if (req.method === "PATCH") {
      const updated = await updateManagedUser(user, String(body.id || ""), body);
      return json({ success: true, user: updated });
    }

    if (req.method === "DELETE") {
      await deleteManagedUser(user, String(body.id || ""));
      return json({ success: true });
    }

    return json({ message: "Método não permitido." }, 405);
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/admin/users" };
