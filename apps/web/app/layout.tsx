import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lux Aeterna Clinical AI",
  description: "Hybrid clinical AI command center for Vercel and local OpenClaw Docker nodes."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
