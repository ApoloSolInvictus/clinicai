import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenClinic - Medicina digital",
    short_name: "OpenClinic",
    description:
      "Plataforma de medicina digital para clínicas con agenda, pacientes, caja, reportes médicos por voz y automatización local segura.",
    id: "https://www.7openclinic.com/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#06182f",
    lang: "es",
    categories: ["health", "medical", "productivity", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
