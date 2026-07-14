const stripApiSuffix = (value: string) => value.replace(/\/+$/, '').replace(/\/api$/, '');

export const getPublicAppUrl = () => {
    const envValue = process.env.NEXT_PUBLIC_API_URL;
    if (envValue) return stripApiSuffix(envValue);

    if (typeof window !== "undefined") {
        const { protocol, hostname } = window.location;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return `${protocol}//${hostname}:3002`;
        }
    }

    return "https://compresuafoto-comigo.onrender.com";
};
