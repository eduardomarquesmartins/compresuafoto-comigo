/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
            { source: '/events/:path*', destination: '/compresuafoto/events/:path*', permanent: true },
            { source: '/event/:path*', destination: '/compresuafoto/events/:path*', permanent: true },
            { source: '/register', destination: '/compresuafoto/register', permanent: true },
            { source: '/my-orders', destination: '/compresuafoto/my-orders', permanent: true },
            { source: '/profile', destination: '/compresuafoto/profile', permanent: true },
            { source: '/orders/:path*', destination: '/compresuafoto/orders/:path*', permanent: true },
            { source: '/admin/dashboard', destination: '/compresuafoto/admin/dashboard', permanent: true },
            { source: '/admin/events/:path*', destination: '/compresuafoto/admin/events/:path*', permanent: true },
            { source: '/admin/orders', destination: '/compresuafoto/admin/orders', permanent: true },
            { source: '/admin/coupons', destination: '/compresuafoto/admin/coupons', permanent: true },
            { source: '/admin/users', destination: '/compresuafoto/admin/users', permanent: true },
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
