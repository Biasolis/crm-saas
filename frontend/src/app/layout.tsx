import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM SaaS",
  description: "Gerencie seus clientes, vendas e propostas em um só lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* A propriedade suppressHydrationWarning aqui previne o erro 
      quando extensões do navegador (como LanguageTool/Grammarly) 
      injetam atributos na tag html.
    */
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}