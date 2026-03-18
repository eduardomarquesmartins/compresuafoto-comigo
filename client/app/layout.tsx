import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import CartDrawer from "@/components/CartDrawer";
import GoogleWrapper from "@/components/GoogleWrapper";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Compre sua Foto",
  description: "Registre seus melhores momentos",
  icons: {
    icon: "/favicon.ico",
  },
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
    <html lang="en">
      <body className={`${montserrat.variable} font-sans antialiased text-foreground bg-background`}>
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
