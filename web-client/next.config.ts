import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // Enable React strict mode
    reactStrictMode: true,

    // Optimize images
    images: {
        unoptimized: true,
    },
}

export default nextConfig
