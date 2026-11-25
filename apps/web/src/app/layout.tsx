import type { Metadata, Viewport } from "next";
import { Anek_Latin } from "next/font/google";
import "./myfinancespace.css";
import { AppShell } from "@/components/shell/AppShell";
import { APPEARANCE_SCRIPT } from "@/components/shell/appearance-script";

const anek = Anek_Latin({
  variable: "--font-anek",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://myfinancespace.com"),
  title: {
    default: "MyFinanceSpace · Overview",
    template: "%s · MyFinanceSpace",
  },
  description: "Your complete financial position, commitments and wealth in one connected workspace.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#15171e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${anek.variable} antialiased`} data-theme="light" data-density="comfortable" data-rail="open" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
