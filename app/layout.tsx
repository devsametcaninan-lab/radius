import type { Metadata } from "next";
import "./globals.css";

// Uygulamanın arkadaşlarına giderken görünecek resmi ismi ve açıklaması burası kardo
export const metadata: Metadata = {
  title: "radius | yakınındakilerle maskeli tartış",
  description: "Maskeni tak, konumunu aç ve yakınındaki insanlarla tamamen anonim şekilde konuşmaya başla.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        {/* Nextjs logosunu tamamen ezen dinamik maske ikonu etiketimiz */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎭</text></svg>" />
      </head>
      <body className="antialiased bg-[#030303]">
        {children}
      </body>
    </html>
  );
}