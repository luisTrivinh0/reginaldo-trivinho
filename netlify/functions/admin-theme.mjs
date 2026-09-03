import {
  assertSameOrigin,
  contentStore,
  errorResponse,
  fail,
  json,
  requireOwner,
  requireSession
} from "./_lib/core.mjs";

const DEFAULT_THEME = {
  primaryColor: "#132238",
  secondaryColor: "#A77943"
};

const normalizeColor = (value, name) => {
  const color = String(value || "").trim().toUpperCase();

  if (!/^#[0-9A-F]{6}$/.test(color)) {
    throw fail("Informe uma " + name + " válida no formato hexadecimal.", 400);
  }

  return color;
};

export default async (req) => {
  try {
    const { user } = await requireSession(req);
    requireOwner(user);

    if (req.method === "GET") {
      const stored = await contentStore().get("theme", {
        type: "json",
        consistency: "strong"
      });

      return json({
        theme: stored && stored.primaryColor && stored.secondaryColor
          ? stored
          : DEFAULT_THEME
      });
    }

    if (req.method === "PUT") {
      assertSameOrigin(req);
      const body = await req.json().catch(() => ({}));
      const theme = {
        primaryColor: normalizeColor(body.primaryColor, "cor primária"),
        secondaryColor: normalizeColor(body.secondaryColor, "cor secundária"),
        updatedAt: Date.now()
      };

      await contentStore().setJSON("theme", theme);
      return json({ success: true, theme });
    }

    return json({ message: "Método não permitido." }, 405);
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/admin/theme" };
