import "./globals.css";
import { AuthContextProvider } from "@/lib/auth-context";

export const metadata = {
  title: "Dashboard Dieta",
  description: "Monitora la tua nutrizione con l'AI",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-background-light dark:bg-background-dark">
        <AuthContextProvider>
          <main className="w-full min-h-screen relative overflow-x-hidden">
            {children}
          </main>
        </AuthContextProvider>
      </body>
    </html>
  );
}
