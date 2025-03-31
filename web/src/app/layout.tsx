import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../components/theme-provider';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SUI Liquidity Sniper',
  description: 'Ein leistungsstarkes Tool zum Snipen von Liquiditätspools auf der SUI-Blockchain.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-16 items-center">
                <div className="flex items-center space-x-3 mr-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 text-primary"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <span className="font-bold text-xl hidden md:inline-block">SUI Liquidity Sniper</span>
                </div>
                <nav className="flex items-center space-x-1 md:space-x-6 flex-1 justify-start">
                  <Link 
                    href="/" 
                    className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/pools" 
                    className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Pools
                  </Link>
                  <Link 
                    href="/trades" 
                    className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Trades
                  </Link>
                  <Link 
                    href="/settings" 
                    className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Einstellungen
                  </Link>
                </nav>
                <div className="ml-auto flex items-center space-x-4">
                  <div className="hidden md:flex items-center space-x-2 border-l border-border pl-4">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-muted-foreground">Verbunden</span>
                  </div>
                  <button 
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-10 w-10"
                    title="Thema wechseln"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2" />
                      <path d="M12 20v2" />
                      <path d="M4.93 4.93l1.41 1.41" />
                      <path d="M17.66 17.66l1.41 1.41" />
                      <path d="M2 12h2" />
                      <path d="M20 12h2" />
                      <path d="M6.34 17.66l-1.41 1.41" />
                      <path d="M19.07 4.93l-1.41 1.41" />
                    </svg>
                  </button>
                </div>
              </div>
            </header>
            <main className="flex-1 container py-6 max-w-[1600px] px-4 md:px-6">
              {children}
            </main>
            <footer className="border-t py-4 bg-background">
              <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} SUI Liquidity Sniper. Alle Rechte vorbehalten.
                </p>
                <div className="flex items-center space-x-4">
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    Dokumentation
                  </a>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    GitHub
                  </a>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    Support
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
} 