import { AppShell } from "@/components/app-shell";
import { SpeakingClient } from "@/components/speaking/speaking-client";

export default function SpeakingPage() {
  return (
    <AppShell subtitle="Continuous voice conversation + focused feedback" title="Speaking Lab">
      <SpeakingClient />
    </AppShell>
  );
}
