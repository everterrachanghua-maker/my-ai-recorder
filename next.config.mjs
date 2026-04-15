/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 構建時忽略 ESLint 檢查
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 構建時忽略 TypeScript 類型錯誤
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
