import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kilat Nusantara",
    short_name: "Kilat Nusantara",
    description: "Sistem pengiriman paket & penagihan di tempat untuk kurir",
    start_url: "/kurir",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
