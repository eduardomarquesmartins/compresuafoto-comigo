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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-sans antialiased text-foreground bg-background`}>
        <GoogleWrapper>
          <div className="flex flex-col min-h-screen">
            <div className="flex-grow">
              {children}
            </div>
            <Footer />
          </div>
          <CartDrawer />
        </GoogleWrapper>
      </body>
    </html>
  );
}
