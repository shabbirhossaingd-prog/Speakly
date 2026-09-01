import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { LearnClient } from "@/components/learn/learn-client";

export default function LearnPage() {
  return (
    <AppShell subtitle="CEFR task-based learning" title="Structured Lessons">
      <Suspense fallback={<div className="card p-6 text-sm text-muted">Loading structured lessons…</div>}>
        <LearnClient />
      </Suspense>
    </AppShell>
  );
}
