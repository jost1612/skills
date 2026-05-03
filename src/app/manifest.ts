import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kinetic Matrix",
    short_name: "Matrix",
    description: "Kompetenz- und Task-Management für Ihre Abteilung",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#D30018",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
