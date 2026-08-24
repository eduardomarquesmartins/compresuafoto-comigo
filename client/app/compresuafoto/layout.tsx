import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "& CONTI - Compre sua Foto",
    description: "Registre seus melhores momentos",
};

export default function PhotoLayout({ children }: { children: React.ReactNode }) {
    return children;
}
