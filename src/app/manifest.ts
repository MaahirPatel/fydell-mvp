import type { MetadataRoute } from "next";

/** Makes Fydell installable from Edge and Chrome as its own window, with no installer to sign. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Fydell",
    short_name: "Fydell",
    description: "Proof-of-work hiring: show real work, review real evidence.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Projects", url: "/app/candidate/work-record" },
      { name: "Hiring workspace", url: "/app/employer" },
    ],
  };
}
