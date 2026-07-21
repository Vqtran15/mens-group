import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ycjgfmdaecufftqzfmqj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // chat-photos is a private bucket resolved via signed URLs, which
        // live under /object/sign/ rather than /object/public/ - avatars
        // and any other still-public bucket keep using the pattern above.
        protocol: "https",
        hostname: "ycjgfmdaecufftqzfmqj.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;
