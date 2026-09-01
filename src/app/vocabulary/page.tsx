import { AppShell } from "@/components/app-shell";
import { VocabularyClient } from "@/components/vocabulary/vocabulary-client";

export default function VocabularyPage() {
  return (
    <AppShell subtitle="Adaptive spaced retrieval" title="Vocabulary & Review">
      <VocabularyClient />
    </AppShell>
  );
}
