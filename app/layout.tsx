import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Meme Atlas", template: "%s | Meme Atlas" },
  description: "Un archivo visual de historias, formatos y cultura de internet.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
