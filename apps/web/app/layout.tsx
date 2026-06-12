import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://www.7openclinic.com";
const siteName = "OpenClinic";
const siteTitle = "OpenClinic | Plataforma de medicina digital para clínicas";
const siteDescription =
  "OpenClinic conecta agenda, pacientes, caja, reportes médicos por voz y automatización local segura para clínicas modernas.";
const socialImage = "/images/openclinic-social-preview.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    "OpenClinic",
    "medicina digital",
    "software clínico",
    "gestión de clínicas",
    "automatización médica",
    "reportes médicos por voz",
    "agenda médica",
    "caja clínica",
    "OpenClaw",
    "7openclinic"
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: siteUrl
  },
  openGraph: {
    type: "website",
    locale: "es_CR",
    url: siteUrl,
    siteName,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: "OpenClinic, plataforma de inteligencia clínica y medicina digital",
        type: "image/png"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [socialImage]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.webmanifest",
  category: "healthcare"
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#06182f"
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/icon-512.png`,
      image: `${siteUrl}${socialImage}`
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: siteName,
      inLanguage: "es",
      publisher: {
        "@id": `${siteUrl}/#organization`
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: siteName,
      url: siteUrl,
      image: `${siteUrl}${socialImage}`,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      inLanguage: "es",
      description: siteDescription,
      provider: {
        "@id": `${siteUrl}/#organization`
      },
      featureList: [
        "Gestión de pacientes",
        "Agenda médica",
        "Reportes médicos por voz",
        "Caja y cierres contables",
        "Automatización local segura por clínica"
      ]
    }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
