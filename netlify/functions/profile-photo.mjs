import { contentStore } from "./_lib/core.mjs";

export default async (req) => {
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  const entry = await contentStore().getWithMetadata("profile-photo", {
    type: "arrayBuffer",
    consistency: "strong"
  });

  if (!entry || !entry.data) return new Response("Not Found", { status: 404 });

  return new Response(entry.data, {
    status: 200,
    headers: {
      "Content-Type": entry.metadata && entry.metadata.contentType
        ? entry.metadata.contentType
        : "application/octet-stream",
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
};

export const config = { path: "/profile-photo" };
