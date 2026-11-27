/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,

  images: {
    domains: [
      "lh3.googleusercontent.com",
      "ui-avatars.com", //  ADD THIS
    ],
  },

  async redirects() {
    return [
      { source: "/dashboard", destination: "/?tab=dashboard", permanent: false },
      { source: "/campaigns", destination: "/?tab=campaigns", permanent: false },
      { source: "/number-pool", destination: "/?tab=number-pool", permanent: false },
      { source: "/calling-agent", destination: "/?tab=calling-agent", permanent: false },
      { source: "/templates", destination: "/?tab=templates", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
