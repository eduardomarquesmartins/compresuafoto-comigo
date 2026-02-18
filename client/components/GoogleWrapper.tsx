"use client";
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function GoogleWrapper({ children }: { children: React.ReactNode }) {
    // Hardcoded for debugging purposes to bypass potential env var issues on Render
    const clientId = "897496433419-a2gq014rho7phue7t2gkp02i32t1gkhh.apps.googleusercontent.com";

    return (
        <GoogleOAuthProvider clientId={clientId}>
            {children}
        </GoogleOAuthProvider>
    );
}
