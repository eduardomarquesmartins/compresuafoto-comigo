"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";

const photoPublicPrefix = "/compresuafoto";

export const isPhotoPublicPath = (pathname?: string) => {
    const currentPath = pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);
    return currentPath === photoPublicPrefix || currentPath.startsWith(`${photoPublicPrefix}/`);
};

export const publicAppPath = (path = "", pathname?: string | null) => {
    const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";
    const prefix = isPhotoPublicPath(pathname ?? undefined) ? photoPublicPrefix : "";

    return `${prefix}${normalizedPath}` || "/";
};

export const usePublicAppPath = () => {
    const pathname = usePathname();

    return useCallback((path = "") => publicAppPath(path, pathname), [pathname]);
};
