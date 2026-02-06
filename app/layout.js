import "./globals.css";
import { AuthContextProvider } from "@/lib/auth-context";

export const metadata = {
  title: "Dieta",
  description: "Monitora la tua nutrizione con l'AI",
  manifest: "/manifest.json?v=2",
  icons: {
    icon: "/globe.svg",
    apple: "/globe.svg",
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>

      </head>
      <body className="antialiased min-h-screen pb-20 safe-area-inset-bottom">
        <AuthContextProvider>
          <main className="max-w-md mx-auto min-h-screen relative bg-slate-900 shadow-2xl overflow-hidden">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[100px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 h-full flex flex-col">
              {children}
            </div>
          </main>
        </AuthContextProvider>
      </body>
    </html>
  );
}
