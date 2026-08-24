import { Suspense } from "react";
import { LoginContent } from "@/components/LoginPage";

export default function PhotoLoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginContent publicBase="/compresuafoto" />
        </Suspense>
    );
}
