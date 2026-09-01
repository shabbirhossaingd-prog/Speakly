import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speakly — Study, Tasks & Project Workspace",
  description:
    "A personal workspace for tasks, project updates, notes, semester files, exam preparation, progress tracking and built-in English learning tools.",
};

const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('speakly-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
