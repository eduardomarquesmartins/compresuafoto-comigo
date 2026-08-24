"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PhotoAdminLoginPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/compresuafoto/login?redirectTo=/compresuafoto/admin/dashboard");
    }, [router]);

    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Redirecionando para o login...</div>;
}
