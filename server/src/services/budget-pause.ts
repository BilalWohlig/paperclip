import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, approvals } from "@paperclipai/db";
import { logActivity } from "./activity-log.js";

/**
 * Check if an agent has exceeded its monthly budget. If so, pause it
 * and create a `budget_increase` approval so the board is notified in
 * their inbox.  Returns `true` when the agent was paused.
 */
export async function checkBudgetAndPause(
  db: Db,
  agentId: string,
): Promise<boolean> {
  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .then((rows) => rows[0] ?? null);

  if (!agent) return false;
  if (agent.budgetMonthlyCents <= 0) return false;
  if (agent.spentMonthlyCents < agent.budgetMonthlyCents) return false;
  if (agent.status === "paused" || agent.status === "terminated") return false;

  // Pause the agent
  await db
    .update(agents)
    .set({ status: "paused", updatedAt: new Date() })
    .where(eq(agents.id, agent.id));

  // Deduplicate: skip if there is already a pending budget_increase approval
  const existingApproval = await db
    .select()
    .from(approvals)
    .where(
      and(
        eq(approvals.companyId, agent.companyId),
        eq(approvals.type, "budget_increase"),
        eq(approvals.status, "pending"),
        eq(approvals.requestedByAgentId, agent.id),
      ),
    )
    .then((rows) => rows[0] ?? null);

  if (existingApproval) return true;

  // Create budget_increase approval
  const [approval] = await db
    .insert(approvals)
    .values({
      companyId: agent.companyId,
      type: "budget_increase",
      requestedByAgentId: agent.id,
      status: "pending",
      payload: {
        agentId: agent.id,
        agentName: agent.name,
        currentBudgetCents: agent.budgetMonthlyCents,
        spentCents: agent.spentMonthlyCents,
      },
    })
    .returning();

  await logActivity(db, {
    companyId: agent.companyId,
    actorType: "system",
    actorId: "budget_monitor",
    action: "agent.budget_exceeded",
    entityType: "approval",
    entityId: approval.id,
    agentId: agent.id,
    details: {
      agentName: agent.name,
      budgetMonthlyCents: agent.budgetMonthlyCents,
      spentMonthlyCents: agent.spentMonthlyCents,
    },
  });

  return true;
}
