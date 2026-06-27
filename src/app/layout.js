import { Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import DBStatusBanner from "@/components/DBStatusBanner";

const outfit = Outfit({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "LegendIn - Premium Interior Designing CRM & ERP",
  description: "Internal ERP, CRM, Designing, and Stock Consolidation console for LegendIn",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const theme = localStorage.getItem('legendin_theme') || 'golden';
            const root = document.documentElement;
            if (theme === 'cherry') {
              root.style.setProperty('--primary', '#d1123f');
              root.style.setProperty('--primary-hover', '#b00c32');
              root.style.setProperty('--primary-light', '#fff0f3');
              root.style.setProperty('--primary-border', '#fcc2cd');
            } else if (theme === 'navy') {
              root.style.setProperty('--primary', '#1e3a8a');
              root.style.setProperty('--primary-hover', '#172554');
              root.style.setProperty('--primary-light', '#eff6ff');
              root.style.setProperty('--primary-border', '#bfdbfe');
            } else if (theme === 'tether') {
              root.style.setProperty('--primary', '#26a17b');
              root.style.setProperty('--primary-hover', '#1e8062');
              root.style.setProperty('--primary-light', '#f0fdf4');
              root.style.setProperty('--primary-border', '#bbf7d0');
            } else if (theme === 'golden') {
              root.style.setProperty('--primary', '#d4af37');
              root.style.setProperty('--primary-hover', '#b89528');
              root.style.setProperty('--primary-light', '#fefce8');
              root.style.setProperty('--primary-border', '#fef08a');
            }
          } catch (e) {}
        `}} />
      </head>
      <body>
        <div className="layout-container">
          <Sidebar />
          <div className="main-content">
            <Header />
            <main className="page-container">
              <DBStatusBanner />
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
