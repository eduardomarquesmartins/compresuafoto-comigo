const photoAdminPrefix = "/compresuafoto/admin";

export const isPhotoAdminPath = (pathname?: string) => {
    const currentPath = pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);
    return currentPath === photoAdminPrefix || currentPath.startsWith(`${photoAdminPrefix}/`);
};

export const adminPath = (path = "") => {
    const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";
    return `${isPhotoAdminPath() ? photoAdminPrefix : "/admin"}${normalizedPath}`;
};

export const adminLoginPath = () => adminPath("login");

export const adminDashboardPath = () => adminPath(isPhotoAdminPath() ? "dashboard" : "control");
