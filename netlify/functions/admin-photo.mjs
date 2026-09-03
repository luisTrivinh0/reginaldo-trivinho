import {
  assertMethod, assertSameOrigin, contentStore, errorResponse, fail, json, requireSession
} from "./_lib/core.mjs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export default async (req) => {
  try {
    assertMethod(req, ["POST"]);
    assertSameOrigin(req);
    await requireSession(req);
    const form = await req.formData();
    const file = form.get("photo");

    if (!file || typeof file.arrayBuffer !== "function") throw fail("Selecione uma imagem válida.", 400);
    if (!allowedTypes.has(file.type)) throw fail("Use uma imagem JPG, PNG ou WebP.", 400);
    if (file.size <= 0 || file.size > 4_000_000) throw fail("A imagem deve ter no máximo 4 MB.", 400);

    const store = contentStore();
    const updatedAt = Date.now();

    await store.set("profile-photo", await file.arrayBuffer(), {
      metadata: { contentType: file.type, uploadedAt: updatedAt }
    });
    await store.setJSON("profile", { photoUpdatedAt: updatedAt });

    return json({ success: true, photoUrl: "/profile-photo?v=" + updatedAt });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config = { path: "/api/admin/photo" };
