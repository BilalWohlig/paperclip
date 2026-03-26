import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { projectsApi } from "../api/projects";
import { goalsApi } from "../api/goals";
import { assetsApi } from "../api/assets";
import { secretsApi, githubTokenApi } from "../api/secrets";
import { queryKeys } from "../lib/queryKeys";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Maximize2,
  Minimize2,
  Target,
  Calendar,
  Plus,
  X,
  FolderOpen,
  Github,
  GitBranch,
  Check,
  AlertCircle,
} from "lucide-react";
import { PROJECT_COLORS } from "@paperclipai/shared";
import { cn } from "../lib/utils";
import { MarkdownEditor, type MarkdownEditorRef } from "./MarkdownEditor";
import { StatusBadge } from "./StatusBadge";
import { ChoosePathButton } from "./PathInstructionsModal";

const projectStatuses = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

type WorkspaceSetup = "none" | "local" | "repo" | "both";
const REPO_ONLY_CWD_SENTINEL = "/__paperclip_repo_only__";

function parseEnvString(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    // Support both KEY=value and KEY: value formats
    const eqIdx = trimmed.indexOf("=");
    const colonIdx = trimmed.indexOf(": ");
    let key: string;
    let value: string;
    if (eqIdx >= 1 && (colonIdx < 0 || eqIdx < colonIdx)) {
      key = trimmed.slice(0, eqIdx).trim();
      value = trimmed.slice(eqIdx + 1).trim();
    } else if (colonIdx >= 1) {
      key = trimmed.slice(0, colonIdx).trim();
      value = trimmed.slice(colonIdx + 2).trim();
    } else {
      continue;
    }
    // Strip surrounding quotes from values
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function NewProjectDialog() {
  const { newProjectOpen, closeNewProject } = useDialog();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planned");
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [workspaceSetup, setWorkspaceSetup] = useState<WorkspaceSetup>("none");
  const [workspaceLocalPath, setWorkspaceLocalPath] = useState("");
  const [workspaceRepoUrl, setWorkspaceRepoUrl] = useState("");
  const [workspaceRepoBranch, setWorkspaceRepoBranch] = useState("");
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceEnvRaw, setWorkspaceEnvRaw] = useState("");
  const [envExpanded, setEnvExpanded] = useState(false);
  const [integrationBranchEnabled, setIntegrationBranchEnabled] = useState(false);
  const [integrationBranchTemplate, setIntegrationBranchTemplate] = useState("");

  const [statusOpen, setStatusOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [inlineToken, setInlineToken] = useState("");
  const descriptionEditorRef = useRef<MarkdownEditorRef>(null);

  const { data: goals } = useQuery({
    queryKey: queryKeys.goals.list(selectedCompanyId!),
    queryFn: () => goalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && newProjectOpen,
  });

  const showRepoSetup = workspaceSetup === "repo" || workspaceSetup === "both";

  const { data: tokenStatus } = useQuery({
    queryKey: queryKeys.githubToken.status(selectedCompanyId!),
    queryFn: () => githubTokenApi.status(selectedCompanyId!),
    enabled: !!selectedCompanyId && newProjectOpen && showRepoSetup,
  });

  const saveInlineToken = useMutation({
    mutationFn: (value: string) =>
      secretsApi.create(selectedCompanyId!, {
        name: "GITHUB_TOKEN",
        value,
        description: "Company-level GitHub personal access token",
      }),
    onSuccess: () => {
      setInlineToken("");
      queryClient.invalidateQueries({ queryKey: queryKeys.githubToken.status(selectedCompanyId!) });
    },
  });

  const createProject = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      projectsApi.create(selectedCompanyId!, data),
  });

  const uploadDescriptionImage = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      return assetsApi.uploadImage(selectedCompanyId, file, "projects/drafts");
    },
  });

  function reset() {
    setName("");
    setDescription("");
    setStatus("planned");
    setGoalIds([]);
    setTargetDate("");
    setExpanded(false);
    setWorkspaceSetup("none");
    setWorkspaceLocalPath("");
    setWorkspaceRepoUrl("");
    setWorkspaceRepoBranch("");
    setWorkspaceEnvRaw("");
    setEnvExpanded(false);
    setWorkspaceError(null);
    setInlineToken("");
    setIntegrationBranchEnabled(false);
    setIntegrationBranchTemplate("");
  }

  const isAbsolutePath = (value: string) => value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);

  const isGitHubRepoUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      const host = parsed.hostname.toLowerCase();
      if (host !== "github.com" && host !== "www.github.com") return false;
      const segments = parsed.pathname.split("/").filter(Boolean);
      return segments.length >= 2;
    } catch {
      return false;
    }
  };

  const deriveWorkspaceNameFromPath = (value: string) => {
    const normalized = value.trim().replace(/[\\/]+$/, "");
    const segments = normalized.split(/[\\/]/).filter(Boolean);
    return segments[segments.length - 1] ?? "Local folder";
  };

  const deriveWorkspaceNameFromRepo = (value: string) => {
    try {
      const parsed = new URL(value);
      const segments = parsed.pathname.split("/").filter(Boolean);
      const repo = segments[segments.length - 1]?.replace(/\.git$/i, "") ?? "";
      return repo || "GitHub repo";
    } catch {
      return "GitHub repo";
    }
  };

  const toggleWorkspaceSetup = (next: WorkspaceSetup) => {
    setWorkspaceSetup((prev) => (prev === next ? "none" : next));
    setWorkspaceError(null);
  };

  async function handleSubmit() {
    if (!selectedCompanyId || !name.trim()) return;
    const localRequired = workspaceSetup === "local" || workspaceSetup === "both";
    const repoRequired = workspaceSetup === "repo" || workspaceSetup === "both";
    const localPath = workspaceLocalPath.trim();
    const repoUrl = workspaceRepoUrl.trim();

    if (localRequired && !isAbsolutePath(localPath)) {
      setWorkspaceError("Local folder must be a full absolute path.");
      return;
    }
    if (repoRequired && !isGitHubRepoUrl(repoUrl)) {
      setWorkspaceError("Repo workspace must use a valid GitHub repo URL.");
      return;
    }

    setWorkspaceError(null);

    try {
      const created = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
        ...(goalIds.length > 0 ? { goalIds } : {}),
        ...(targetDate ? { targetDate } : {}),
      });

      const branch = workspaceRepoBranch.trim() || undefined;
      const parsedEnv = workspaceEnvRaw.trim() ? parseEnvString(workspaceEnvRaw) : null;
      const envPayload = parsedEnv && Object.keys(parsedEnv).length > 0 ? { env: parsedEnv } : {};
      const workspacePayloads: Array<Record<string, unknown>> = [];
      if (localRequired && repoRequired) {
        workspacePayloads.push({
          name: deriveWorkspaceNameFromPath(localPath),
          cwd: localPath,
          repoUrl,
          ...(branch ? { repoRef: branch } : {}),
          ...envPayload,
        });
      } else if (localRequired) {
        workspacePayloads.push({
          name: deriveWorkspaceNameFromPath(localPath),
          cwd: localPath,
          ...envPayload,
        });
      } else if (repoRequired) {
        workspacePayloads.push({
          name: deriveWorkspaceNameFromRepo(repoUrl),
          cwd: REPO_ONLY_CWD_SENTINEL,
          repoUrl,
          ...(branch ? { repoRef: branch } : {}),
          ...envPayload,
        });
      }
      for (const workspacePayload of workspacePayloads) {
        await projectsApi.createWorkspace(created.id, {
          ...workspacePayload,
        });
      }

      if (integrationBranchEnabled && repoRequired) {
        await projectsApi.update(created.id, {
          executionWorkspacePolicy: {
            enabled: true,
            defaultMode: "isolated",
            branchPolicy: {
              integrationBranchEnabled: true,
              integrationBranchTemplate: integrationBranchTemplate.trim() || null,
            },
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(selectedCompanyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(created.id) });
      reset();
      closeNewProject();
    } catch {
      // surface through createProject.isError
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const selectedGoals = (goals ?? []).filter((g) => goalIds.includes(g.id));
  const availableGoals = (goals ?? []).filter((g) => !goalIds.includes(g.id));

  return (
    <Dialog
      open={newProjectOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          closeNewProject();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn("p-0 gap-0", expanded ? "sm:max-w-2xl" : "sm:max-w-lg")}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {selectedCompany && (
              <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-medium">
                {selectedCompany.name.slice(0, 3).toUpperCase()}
              </span>
            )}
            <span className="text-muted-foreground/60">&rsaquo;</span>
            <span>New project</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() => { reset(); closeNewProject(); }}
            >
              <span className="text-lg leading-none">&times;</span>
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
        {/* Name */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <input
            className="w-full text-lg font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                descriptionEditorRef.current?.focus();
              }
            }}
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="px-4 pb-2">
          <MarkdownEditor
            ref={descriptionEditorRef}
            value={description}
            onChange={setDescription}
            placeholder="Add description..."
            bordered={false}
            contentClassName={cn("text-sm text-muted-foreground", expanded ? "min-h-[220px]" : "min-h-[120px]")}
            imageUploadHandler={async (file) => {
              const asset = await uploadDescriptionImage.mutateAsync(file);
              return asset.contentPath;
            }}
          />
        </div>

        <div className="px-4 pb-3 space-y-3 border-t border-border">
          <div className="pt-3">
            <p className="text-sm font-medium">Where will work be done on this project?</p>
            <p className="text-xs text-muted-foreground">Add local folder and/or GitHub repo workspace hints.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition-colors",
                workspaceSetup === "local" ? "border-foreground bg-accent/40" : "border-border hover:bg-accent/30",
              )}
              onClick={() => toggleWorkspaceSetup("local")}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <FolderOpen className="h-4 w-4" />
                A local folder
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Use a full path on this machine.</p>
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition-colors",
                workspaceSetup === "repo" ? "border-foreground bg-accent/40" : "border-border hover:bg-accent/30",
              )}
              onClick={() => toggleWorkspaceSetup("repo")}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Github className="h-4 w-4" />
                A github repo
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Paste a GitHub URL.</p>
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition-colors",
                workspaceSetup === "both" ? "border-foreground bg-accent/40" : "border-border hover:bg-accent/30",
              )}
              onClick={() => toggleWorkspaceSetup("both")}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <GitBranch className="h-4 w-4" />
                Both
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Configure local + repo hints.</p>
            </button>
          </div>

          {(workspaceSetup === "local" || workspaceSetup === "both") && (
            <div className="rounded-md border border-border p-2 space-y-2">
              <label className="mb-1 block text-xs text-muted-foreground">Local folder (full path)</label>
              <div className="flex items-center gap-2">
                <input
                  className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs font-mono outline-none"
                  value={workspaceLocalPath}
                  onChange={(e) => setWorkspaceLocalPath(e.target.value)}
                  placeholder="/absolute/path/to/workspace"
                />
                <ChoosePathButton />
              </div>
              {workspaceSetup === "local" && (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setEnvExpanded(!envExpanded)}
                  >
                    <span className="text-[10px]">{envExpanded ? "\u25BC" : "\u25B6"}</span>
                    <span>Environment variables (.env)</span>
                  </button>
                  {envExpanded && (
                    <textarea
                      className="w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs font-mono outline-none resize-y min-h-[80px]"
                      value={workspaceEnvRaw}
                      onChange={(e) => setWorkspaceEnvRaw(e.target.value)}
                      placeholder={"# Paste your .env file here\nDATABASE_URL=postgres://...\nAPI_KEY=sk-..."}
                      rows={5}
                    />
                  )}
                </>
              )}
            </div>
          )}
          {showRepoSetup && (
            <div className="rounded-md border border-border p-2 space-y-2">
              <label className="mb-1 block text-xs text-muted-foreground">GitHub repo URL</label>
              <input
                className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs outline-none"
                value={workspaceRepoUrl}
                onChange={(e) => setWorkspaceRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
              />
              <label className="block text-xs text-muted-foreground">Base branch</label>
              <input
                className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs font-mono outline-none"
                value={workspaceRepoBranch}
                onChange={(e) => setWorkspaceRepoBranch(e.target.value)}
                placeholder="main"
              />
              {workspaceRepoBranch.trim() && (
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={integrationBranchEnabled}
                      onChange={(e) => setIntegrationBranchEnabled(e.target.checked)}
                      className="rounded border-border"
                    />
                    Use integration branch (e.g., {workspaceRepoBranch.trim()}-integration)
                  </label>
                  {integrationBranchEnabled && (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Branch name template</label>
                      <input
                        className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs font-mono outline-none"
                        value={integrationBranchTemplate}
                        onChange={(e) => setIntegrationBranchTemplate(e.target.value)}
                        placeholder={"{{workspace.repoRef}}-integration"}
                      />
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setEnvExpanded(!envExpanded)}
              >
                <span className="text-[10px]">{envExpanded ? "\u25BC" : "\u25B6"}</span>
                <span>Environment variables (.env)</span>
              </button>
              {envExpanded && (
                <textarea
                  className="w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs font-mono outline-none resize-y min-h-[80px]"
                  value={workspaceEnvRaw}
                  onChange={(e) => setWorkspaceEnvRaw(e.target.value)}
                  placeholder={"# Paste your .env file here\nDATABASE_URL=postgres://...\nAPI_KEY=sk-..."}
                  rows={5}
                />
              )}
              {tokenStatus?.exists ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <Check className="h-3.5 w-3.5" />
                  GitHub token configured
                </div>
              ) : tokenStatus && !tokenStatus.exists ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    No GitHub token set — required for private repos
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs font-mono outline-none"
                      type="password"
                      value={inlineToken}
                      onChange={(e) => setInlineToken(e.target.value)}
                      placeholder="ghp_..."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={!inlineToken.trim() || saveInlineToken.isPending}
                      onClick={() => saveInlineToken.mutate(inlineToken.trim())}
                    >
                      {saveInlineToken.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  {saveInlineToken.isError && (
                    <p className="text-xs text-destructive">
                      {saveInlineToken.error instanceof Error ? saveInlineToken.error.message : "Failed to save token"}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}
          {workspaceError && (
            <p className="text-xs text-destructive">{workspaceError}</p>
          )}
        </div>
        </div>

        {/* Property chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-border flex-wrap">
          {/* Status */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/50 transition-colors">
                <StatusBadge status={status} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {projectStatuses.map((s) => (
                <button
                  key={s.value}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50",
                    s.value === status && "bg-accent"
                  )}
                  onClick={() => { setStatus(s.value); setStatusOpen(false); }}
                >
                  {s.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {selectedGoals.map((goal) => (
            <span
              key={goal.id}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
            >
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-[160px] truncate">{goal.title}</span>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setGoalIds((prev) => prev.filter((id) => id !== goal.id))}
                aria-label={`Remove goal ${goal.title}`}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          <Popover open={goalOpen} onOpenChange={setGoalOpen}>
            <PopoverTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/50 transition-colors disabled:opacity-60"
                disabled={selectedGoals.length > 0 && availableGoals.length === 0}
              >
                {selectedGoals.length > 0 ? <Plus className="h-3 w-3 text-muted-foreground" /> : <Target className="h-3 w-3 text-muted-foreground" />}
                {selectedGoals.length > 0 ? "+ Goal" : "Goal"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start">
              {selectedGoals.length === 0 && (
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50 text-muted-foreground"
                  onClick={() => setGoalOpen(false)}
                >
                  No goal
                </button>
              )}
              {availableGoals.map((g) => (
                <button
                  key={g.id}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50 truncate"
                  onClick={() => {
                    setGoalIds((prev) => [...prev, g.id]);
                    setGoalOpen(false);
                  }}
                >
                  {g.title}
                </button>
              ))}
              {selectedGoals.length > 0 && availableGoals.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  All goals already selected.
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Target date */}
          <div className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <input
              type="date"
              className="bg-transparent outline-none text-xs w-24"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              placeholder="Target date"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          {createProject.isError ? (
            <p className="text-xs text-destructive">Failed to create project.</p>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            disabled={!name.trim() || createProject.isPending}
            onClick={handleSubmit}
          >
            {createProject.isPending ? "Creating…" : "Create project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
