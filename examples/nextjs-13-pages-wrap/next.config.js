/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disabled due to errors when building. See
  // https://nextjs.org/docs/messages/failed-loading-swc
  swcMinify: false,
}

module.exports = nextConfig