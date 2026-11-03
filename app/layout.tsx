import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tik-Booth",
  description: "Discover and buy tickets for events across Nigeria and beyond.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${jakarta.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){var theme="light";try{theme=localStorage.getItem("tik-booth-theme")==="dark"?"dark":"light"}catch(error){console.error("[theme:initialize] Unable to read saved theme preference.",error)}document.documentElement.setAttribute("data-theme",theme)})()',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-ink">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
