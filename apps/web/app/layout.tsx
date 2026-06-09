import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenClinic",
  description: "Premium clinical operations platform with local OpenClaw automation."
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
