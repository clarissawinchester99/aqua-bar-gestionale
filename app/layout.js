import "./globals.css";

export const metadata = {
  title: "AQUA BAR | Gestionale",
  description: "Gestionale ufficiale AQUA BAR",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
