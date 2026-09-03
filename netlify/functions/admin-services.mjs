import {
  assertSameOrigin, contentStore, errorResponse, json, requireSession, validateServices
} from "./_lib/core.mjs";

export default async (req) => {
  try {
    await requireSession(req);

    if (req.method === "GET") {
      const services = await contentStore().get("services", { type: "json", consistency: "strong" });
      return json({ services: Array.isArray(services) ? services : null });
    }

    if (req.method === "PUT") {
      assertSameOrigin(req);
      const body = await req.json().catch(() => ({}));
      const services = validateServices(body.services);
      await contentStore().setJSON("services", services);
      return json({ success: true, services });
    }

    return json({ message: "Método não permitido." }, 405);
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/admin/services" };
