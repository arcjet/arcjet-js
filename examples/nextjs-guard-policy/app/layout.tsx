import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Arcjet Guard policy agent example",
  description: "A Next.js AI agent protected by a remotely configured Arcjet Guard policy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
