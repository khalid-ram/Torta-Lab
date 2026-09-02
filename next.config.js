/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Narrowly scoped to this project's Supabase Storage public-object
    // URLs (baked cake photos/thumbnails), not a broad *.supabase.co wildcard.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wfovpryqapivswddmmxs.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
module.exports = nextConfig;
