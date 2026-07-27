/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {
        root: new URL('.', import.meta.url).pathname,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
            {
                protocol: 'https',
                hostname: '*.amazonaws.com',
            },
            {
                protocol: 'https',
                hostname: 'compresuafoto-comigo.onrender.com',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
            },
        ],
    },
    reactStrictMode: true,
};

export default nextConfig;
