import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import CartDrawer from "@/components/CartDrawer";
import GoogleWrapper from "@/components/GoogleWrapper";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "& CONTI - Marketing Digital",
  description: "Econti Marketing Digital",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

import Footer from "@/components/Footer";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import SecurityWrapper from "@/components/SecurityWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" dir="ltr" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${montserrat.variable} ${geist.variable} ${geistMono.variable} font-sans antialiased text-foreground bg-background`}>
        <SecurityWrapper>
          <GoogleWrapper>
            <BackgroundWrapper>
              <div className="flex-grow">
                {children}
              </div>
              <Footer />
            </BackgroundWrapper>
            <CartDrawer />
          </GoogleWrapper>
        </SecurityWrapper>
      </body>
    </html>
  );
}
