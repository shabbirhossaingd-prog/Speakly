import { AppShell } from "@/components/app-shell";
import { GrammarClient } from "@/components/grammar/grammar-client";

export default function GrammarPage() {
  return (
    <AppShell subtitle="Basic help for every learner" title="Grammar Hub">
      <GrammarClient />
    </AppShell>
  );
}
