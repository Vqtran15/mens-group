import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { SplashScreen } from "@/components/SplashScreen";
import { ChunkErrorRecovery } from "@/components/ChunkErrorRecovery";
import "./globals.css";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Men's Group",
  description: "Calendar, topics, and chat for our men's group",
  appleWebApp: {
    // Without this, iOS never treats "Add to Home Screen" as a true
    // standalone app launch - it just opens the URL in a regular Safari
    // tab. With it, iOS also auto-generates a launch screen from the icon
    // + manifest background_color, closing the blank/black gap that
    // otherwise shows between tapping the icon and our own SplashScreen's
    // first paint.
    capable: true,
    statusBarStyle: "default",
    title: "Men's Group",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Matches manifest.ts's theme_color - a mismatch here previously caused
  // the status bar/chrome tint to briefly disagree with the PWA manifest.
  themeColor: "#264653",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${plusJakartaSans.variable}`}>
      <body className="min-h-full flex flex-col">
        {GA4_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA4_ID}');
            `}</Script>
          </>
        )}
        <SplashScreen />
        <ChunkErrorRecovery />
        {children}
      </body>
    </html>
  );
}
