/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Add allowed domains if you use <Image src="https://..." />
  },
};

module.exports = nextConfig;
