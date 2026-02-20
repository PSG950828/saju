import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "사주 에너지 운영",
    short_name: "사주에너지",
    description: "사주 기반 개인 에너지 루틴 플랫폼",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#6c5ce7",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
