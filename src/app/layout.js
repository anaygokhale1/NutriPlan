export const metadata = {
  title: 'VitalMenu',
  description: 'Your AI-Powered Personalized Nutrition Guide',
  manifest: '/manifest.json',
  themeColor: '#1a4731',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VitalMenu',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VitalMenu" />
        <meta name="theme-color" content="#1a4731" />
      </head>
      <body>{children}</body>
    </html>
  );
}
