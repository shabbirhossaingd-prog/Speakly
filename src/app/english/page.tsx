import { AppShell } from "@/components/app-shell";
import { EnglishHomeClient } from "@/components/english/english-home-client";

export default function EnglishHomePage() {
  return (
    <AppShell subtitle="CEFR-aligned learning vertical" title="English Home">
      <EnglishHomeClient />
    </AppShell>
  );
}
