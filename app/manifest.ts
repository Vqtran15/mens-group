import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Men's Group",
    short_name: "Men's Group",
    description: "Calendar, topics, and chat for our men's group",
    start_url: "/",
    display: "standalone",
    background_color: "#ede7e3",
    theme_color: "#264653",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
