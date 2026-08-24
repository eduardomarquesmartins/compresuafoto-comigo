/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
            { source: '/events/:path*', destination: '/compresuafoto/events/:path*', permanent: true },
            { source: '/event/:path*', destination: '/compresuafoto/events/:path*', permanent: true },
            { source: '/register', destination: '/compresuafoto/register', permanent: true },
            { source: '/forgot-password', destination: '/compresuafoto/forgot-password', permanent: true },
            { source: '/my-orders', destination: '/compresuafoto/my-orders', permanent: true },
            { source: '/profile', destination: '/compresuafoto/profile', permanent: true },
            { source: '/orders/:path*', destination: '/compresuafoto/orders/:path*', permanent: true },
        ];
    },
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
