import { AppShell } from "@/components/app-shell";
import { ProgressClient } from "@/components/progress/progress-client";

export default function ProgressPage() {
  return (
    <AppShell subtitle="Retained, usable language evidence" title="English Progress">
      <ProgressClient />
    </AppShell>
  );
}
