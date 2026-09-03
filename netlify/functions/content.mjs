import { contentStore, errorResponse, json } from "./_lib/core.mjs";

export default async (req) => {
  try {
    if (req.method !== "GET") return json({ message: "Método não permitido." }, 405);
    const store = contentStore();
    const [services, profile] = await Promise.all([
      store.get("services", { type: "json", consistency: "strong" }),
      store.get("profile", { type: "json", consistency: "strong" })
    ]);

    return json({
      services: Array.isArray(services) ? services : null,
      photoUrl: profile && profile.photoUpdatedAt ? "/profile-photo?v=" + profile.photoUpdatedAt : null
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/content" };
