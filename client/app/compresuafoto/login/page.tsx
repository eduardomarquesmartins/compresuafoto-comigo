import { Suspense } from "react";
import { LoginContent } from "@/components/LoginPage";
import GoogleWrapper from "@/components/GoogleWrapper";

export default function PhotoLoginPage() {
    return (
        <Suspense fallback={null}>
            <GoogleWrapper>
                <LoginContent publicBase="/compresuafoto" />
            </GoogleWrapper>
        </Suspense>
    );
}
