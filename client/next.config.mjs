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
                // S3 URLs include multiple subdomain levels, e.g.
                // bucket.s3.sa-east-1.amazonaws.com.
                hostname: '**.amazonaws.com',
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
