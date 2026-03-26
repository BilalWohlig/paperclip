import { UserPlus, Lightbulb, ShieldCheck, DollarSign } from "lucide-react";
import { MarkdownBody } from "./MarkdownBody";

export const typeLabel: Record<string, string> = {
  hire_agent: "Hire Agent",
  approve_ceo_strategy: "CEO Strategy",
  budget_increase: "Budget Increase",
};

export const typeIcon: Record<string, typeof UserPlus> = {
  hire_agent: UserPlus,
  approve_ceo_strategy: Lightbulb,
  budget_increase: DollarSign,
};

export const defaultTypeIcon = ShieldCheck;

function PayloadField({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">{label}</span>
      <span>{String(value)}</span>
    </div>
  );
}

export function HireAgentPayload({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Name</span>
        <span className="font-medium">{String(payload.name ?? "—")}</span>
      </div>
      <PayloadField label="Role" value={payload.role} />
      <PayloadField label="Title" value={payload.title} />
      <PayloadField label="Icon" value={payload.icon} />
      {!!payload.capabilities && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs pt-0.5">Capabilities</span>
          <span className="text-muted-foreground">{String(payload.capabilities)}</span>
        </div>
      )}
      {!!payload.adapterType && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Adapter</span>
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {String(payload.adapterType)}
          </span>
        </div>
      )}
    </div>
  );
}

export function CeoStrategyPayload({ payload }: { payload: Record<string, unknown> }) {
  const plan = payload.plan ?? payload.description ?? payload.strategy ?? payload.text;
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <PayloadField label="Title" value={payload.title} />
      {!!plan && (
        <div className="mt-2 rounded-md bg-muted/40 px-3 py-2 max-h-64 overflow-y-auto">
          <MarkdownBody className="text-xs text-muted-foreground">{String(plan)}</MarkdownBody>
        </div>
      )}
      {!plan && (
        <pre className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground overflow-x-auto max-h-48">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function BudgetIncreasePayload({ payload }: { payload: Record<string, unknown> }) {
  const agentName = String(payload.agentName ?? "Unknown Agent");
  const currentBudgetCents = typeof payload.currentBudgetCents === "number" ? payload.currentBudgetCents : 0;
  const spentCents = typeof payload.spentCents === "number" ? payload.spentCents : 0;
  const approvedAdditionalCents = typeof payload.approvedAdditionalCents === "number" ? payload.approvedAdditionalCents : 0;

  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Agent</span>
        <span className="font-medium">{agentName}</span>
      </div>
      <PayloadField label="Budget" value={formatCents(currentBudgetCents)} />
      <PayloadField label="Spent" value={formatCents(spentCents)} />
      <PayloadField label="Overage" value={formatCents(Math.max(0, spentCents - currentBudgetCents))} />
      {approvedAdditionalCents > 0 ? (
        <div className="mt-2 rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-green-700 dark:text-green-300">
          Approved additional budget: <span className="font-medium">{formatCents(approvedAdditionalCents)}</span>
        </div>
      ) : (
        <div className="mt-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          This agent was automatically paused because it exceeded its monthly budget.
          Approve with additional budget to make the agent available for new tasks.
        </div>
      )}
    </div>
  );
}

export function ApprovalPayloadRenderer({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  if (type === "hire_agent") return <HireAgentPayload payload={payload} />;
  if (type === "budget_increase") return <BudgetIncreasePayload payload={payload} />;
  return <CeoStrategyPayload payload={payload} />;
}
