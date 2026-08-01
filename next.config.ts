import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  /* config options here */
};

const isDev = process.env.NODE_ENV === "development";

// `withSerwistInit` always attaches a `webpack` key to the config (even when
// `disable: true`), and Next 16's Turbopack (the `next dev` default) refuses
// to start if it sees one at all. So in dev we skip wrapping entirely instead
// of relying on Serwist's own `disable` flag — the service worker isn't
// needed in dev anyway (see README "Menguji PWA Kurir").
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
});

export default isDev ? nextConfig : withSerwist(nextConfig);
