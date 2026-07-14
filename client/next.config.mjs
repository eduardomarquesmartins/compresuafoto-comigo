/** @type {import('next').NextConfig} */
const nextConfig = {
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
