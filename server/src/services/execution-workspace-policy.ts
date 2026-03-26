import type {
  BranchPolicy,
  ExecutionWorkspaceMode,
  ExecutionWorkspaceStrategy,
  IssueExecutionWorkspaceSettings,
  ProjectExecutionWorkspacePolicy,
} from "@paperclipai/shared";
import { asString, parseObject } from "../adapters/utils.js";

type ParsedExecutionWorkspaceMode = Exclude<ExecutionWorkspaceMode, "inherit">;

function cloneRecord(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  return { ...value };
}

function parseBranchPolicy(raw: unknown): BranchPolicy | null {
  const parsed = parseObject(raw);
  if (Object.keys(parsed).length === 0) return null;
  const result: BranchPolicy = {};
  if (typeof parsed.integrationBranchEnabled === "boolean") {
    result.integrationBranchEnabled = parsed.integrationBranchEnabled;
  }
  if (typeof parsed.integrationBranchTemplate === "string") {
    result.integrationBranchTemplate = parsed.integrationBranchTemplate;
  }
  if (typeof parsed.integrationBranchRef === "string") {
    result.integrationBranchRef = parsed.integrationBranchRef;
  }
  if (typeof parsed.integrationBranchCreatedAt === "string") {
    result.integrationBranchCreatedAt = parsed.integrationBranchCreatedAt;
  }
  if (typeof parsed.integrationBranchCreatedBy === "string") {
    result.integrationBranchCreatedBy = parsed.integrationBranchCreatedBy;
  }
  return Object.keys(result).length > 0 ? result : null;
}

export function resolveEffectiveBaseRef(input: {
  projectPolicy: ProjectExecutionWorkspacePolicy | null;
}): string | null {
  const branchPolicy = input.projectPolicy?.branchPolicy;
  if (!branchPolicy?.integrationBranchEnabled) return null;
  return branchPolicy.integrationBranchRef ?? null;
}

function parseExecutionWorkspaceStrategy(raw: unknown): ExecutionWorkspaceStrategy | null {
  const parsed = parseObject(raw);
  const type = asString(parsed.type, "");
  if (type !== "project_primary" && type !== "git_worktree") {
    return null;
  }
  return {
    type,
    ...(typeof parsed.baseRef === "string" ? { baseRef: parsed.baseRef } : {}),
    ...(typeof parsed.branchTemplate === "string" ? { branchTemplate: parsed.branchTemplate } : {}),
    ...(typeof parsed.worktreeParentDir === "string" ? { worktreeParentDir: parsed.worktreeParentDir } : {}),
    ...(typeof parsed.provisionCommand === "string" ? { provisionCommand: parsed.provisionCommand } : {}),
    ...(typeof parsed.teardownCommand === "string" ? { teardownCommand: parsed.teardownCommand } : {}),
  };
}

export function parseProjectExecutionWorkspacePolicy(raw: unknown): ProjectExecutionWorkspacePolicy | null {
  const parsed = parseObject(raw);
  if (Object.keys(parsed).length === 0) return null;
  const enabled = typeof parsed.enabled === "boolean" ? parsed.enabled : false;
  const defaultMode = asString(parsed.defaultMode, "");
  const allowIssueOverride =
    typeof parsed.allowIssueOverride === "boolean" ? parsed.allowIssueOverride : undefined;
  return {
    enabled,
    ...(defaultMode === "project_primary" || defaultMode === "isolated" ? { defaultMode } : {}),
    ...(allowIssueOverride !== undefined ? { allowIssueOverride } : {}),
    ...(parseExecutionWorkspaceStrategy(parsed.workspaceStrategy)
      ? { workspaceStrategy: parseExecutionWorkspaceStrategy(parsed.workspaceStrategy) }
      : {}),
    ...(parsed.workspaceRuntime && typeof parsed.workspaceRuntime === "object" && !Array.isArray(parsed.workspaceRuntime)
      ? { workspaceRuntime: { ...(parsed.workspaceRuntime as Record<string, unknown>) } }
      : {}),
    ...(parseBranchPolicy(parsed.branchPolicy)
      ? { branchPolicy: parseBranchPolicy(parsed.branchPolicy) }
      : {}),
    ...(parsed.pullRequestPolicy && typeof parsed.pullRequestPolicy === "object" && !Array.isArray(parsed.pullRequestPolicy)
      ? { pullRequestPolicy: { ...(parsed.pullRequestPolicy as Record<string, unknown>) } }
      : {}),
    ...(parsed.cleanupPolicy && typeof parsed.cleanupPolicy === "object" && !Array.isArray(parsed.cleanupPolicy)
      ? { cleanupPolicy: { ...(parsed.cleanupPolicy as Record<string, unknown>) } }
      : {}),
  };
}

export function parseIssueExecutionWorkspaceSettings(raw: unknown): IssueExecutionWorkspaceSettings | null {
  const parsed = parseObject(raw);
  if (Object.keys(parsed).length === 0) return null;
  const mode = asString(parsed.mode, "");
  return {
    ...(mode === "inherit" || mode === "project_primary" || mode === "isolated" || mode === "agent_default"
      ? { mode }
      : {}),
    ...(parseExecutionWorkspaceStrategy(parsed.workspaceStrategy)
      ? { workspaceStrategy: parseExecutionWorkspaceStrategy(parsed.workspaceStrategy) }
      : {}),
    ...(parsed.workspaceRuntime && typeof parsed.workspaceRuntime === "object" && !Array.isArray(parsed.workspaceRuntime)
      ? { workspaceRuntime: { ...(parsed.workspaceRuntime as Record<string, unknown>) } }
      : {}),
  };
}

export function defaultIssueExecutionWorkspaceSettingsForProject(
  projectPolicy: ProjectExecutionWorkspacePolicy | null,
): IssueExecutionWorkspaceSettings | null {
  if (!projectPolicy?.enabled) return null;
  return {
    mode: projectPolicy.defaultMode === "isolated" ? "isolated" : "project_primary",
  };
}

export function resolveExecutionWorkspaceMode(input: {
  projectPolicy: ProjectExecutionWorkspacePolicy | null;
  issueSettings: IssueExecutionWorkspaceSettings | null;
  legacyUseProjectWorkspace: boolean | null;
}): ParsedExecutionWorkspaceMode {
  const issueMode = input.issueSettings?.mode;
  if (issueMode && issueMode !== "inherit") {
    return issueMode;
  }
  if (input.projectPolicy?.enabled) {
    return input.projectPolicy.defaultMode === "isolated" ? "isolated" : "project_primary";
  }
  if (input.legacyUseProjectWorkspace === false) {
    return "agent_default";
  }
  return "project_primary";
}

export function buildExecutionWorkspaceAdapterConfig(input: {
  agentConfig: Record<string, unknown>;
  projectPolicy: ProjectExecutionWorkspacePolicy | null;
  issueSettings: IssueExecutionWorkspaceSettings | null;
  mode: ParsedExecutionWorkspaceMode;
  legacyUseProjectWorkspace: boolean | null;
}): Record<string, unknown> {
  const nextConfig = { ...input.agentConfig };
  const projectHasPolicy = Boolean(input.projectPolicy?.enabled);
  const issueHasWorkspaceOverrides = Boolean(
    input.issueSettings?.mode ||
    input.issueSettings?.workspaceStrategy ||
    input.issueSettings?.workspaceRuntime,
  );
  const hasWorkspaceControl = projectHasPolicy || issueHasWorkspaceOverrides || input.legacyUseProjectWorkspace === false;

  if (hasWorkspaceControl) {
    if (input.mode === "isolated") {
      const strategy =
        input.issueSettings?.workspaceStrategy ??
        input.projectPolicy?.workspaceStrategy ??
        parseExecutionWorkspaceStrategy(nextConfig.workspaceStrategy) ??
        ({ type: "git_worktree" } satisfies ExecutionWorkspaceStrategy);
      nextConfig.workspaceStrategy = strategy as unknown as Record<string, unknown>;
    } else {
      delete nextConfig.workspaceStrategy;
    }

    if (input.mode === "agent_default") {
      delete nextConfig.workspaceRuntime;
    } else if (input.issueSettings?.workspaceRuntime) {
      nextConfig.workspaceRuntime = cloneRecord(input.issueSettings.workspaceRuntime) ?? undefined;
    } else if (input.projectPolicy?.workspaceRuntime) {
      nextConfig.workspaceRuntime = cloneRecord(input.projectPolicy.workspaceRuntime) ?? undefined;
    }
  }

  return nextConfig;
}
