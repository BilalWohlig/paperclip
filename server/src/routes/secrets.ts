import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  SECRET_PROVIDERS,
  type SecretProvider,
  createSecretSchema,
  rotateSecretSchema,
  updateSecretSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { logActivity, secretService } from "../services/index.js";

export function secretRoutes(db: Db) {
  const router = Router();
  const svc = secretService(db);
  const configuredDefaultProvider = process.env.PAPERCLIP_SECRETS_PROVIDER;
  const defaultProvider = (
    configuredDefaultProvider && SECRET_PROVIDERS.includes(configuredDefaultProvider as SecretProvider)
      ? configuredDefaultProvider
      : "local_encrypted"
  ) as SecretProvider;

  router.get("/companies/:companyId/secret-providers", (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(svc.listProviders());
  });

  router.get("/companies/:companyId/secrets", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const secrets = await svc.list(companyId);
    res.json(secrets);
  });

  router.post("/companies/:companyId/secrets", validate(createSecretSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const created = await svc.create(
      companyId,
      {
        name: req.body.name,
        provider: req.body.provider ?? defaultProvider,
        value: req.body.value,
        description: req.body.description,
        externalRef: req.body.externalRef,
      },
      { userId: req.actor.userId ?? "board", agentId: null },
    );

    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "secret.created",
      entityType: "secret",
      entityId: created.id,
      details: { name: created.name, provider: created.provider },
    });

    res.status(201).json(created);
  });

  router.post("/secrets/:id/rotate", validate(rotateSecretSchema), async (req, res) => {
    assertBoard(req);
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Secret not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);

    const rotated = await svc.rotate(
      id,
      {
        value: req.body.value,
        externalRef: req.body.externalRef,
      },
      { userId: req.actor.userId ?? "board", agentId: null },
    );

    await logActivity(db, {
      companyId: rotated.companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "secret.rotated",
      entityType: "secret",
      entityId: rotated.id,
      details: { version: rotated.latestVersion },
    });

    res.json(rotated);
  });

  router.patch("/secrets/:id", validate(updateSecretSchema), async (req, res) => {
    assertBoard(req);
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Secret not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);

    const updated = await svc.update(id, {
      name: req.body.name,
      description: req.body.description,
      externalRef: req.body.externalRef,
    });

    if (!updated) {
      res.status(404).json({ error: "Secret not found" });
      return;
    }

    await logActivity(db, {
      companyId: updated.companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "secret.updated",
      entityType: "secret",
      entityId: updated.id,
      details: { name: updated.name },
    });

    res.json(updated);
  });

  // ── GitHub token convenience endpoints ──

  const GITHUB_TOKEN_SECRET_NAME = "GITHUB_TOKEN";

  router.get("/companies/:companyId/github-token", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const secret = await svc.getByName(companyId, GITHUB_TOKEN_SECRET_NAME);
    if (secret) {
      res.json({ exists: true, secretId: secret.id });
    } else {
      res.json({ exists: false });
    }
  });

  router.post("/companies/:companyId/github-token/validate-repo", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const { repoUrl } = req.body as { repoUrl?: string };
    if (!repoUrl || typeof repoUrl !== "string") {
      res.status(400).json({ error: "repoUrl is required" });
      return;
    }

    const secret = await svc.getByName(companyId, GITHUB_TOKEN_SECRET_NAME);
    if (!secret) {
      res.json({ accessible: false, reason: "no_token" });
      return;
    }

    // Resolve the token value
    let token: string;
    try {
      const { env } = await svc.resolveEnvBindings(companyId, {
        GITHUB_TOKEN: { type: "secret_ref", secretId: secret.id, version: "latest" },
      });
      token = env.GITHUB_TOKEN;
    } catch {
      res.json({ accessible: false, reason: "token_resolve_failed" });
      return;
    }

    // Extract owner/repo from URL
    let owner: string;
    let repo: string;
    try {
      const parsed = new URL(repoUrl);
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length < 2) {
        res.json({ accessible: false, reason: "invalid_repo_url" });
        return;
      }
      owner = segments[0];
      repo = segments[1].replace(/\.git$/i, "");
    } catch {
      res.json({ accessible: false, reason: "invalid_repo_url" });
      return;
    }

    // Check access via GitHub API
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });
      if (response.ok) {
        res.json({ accessible: true });
      } else if (response.status === 404 || response.status === 403) {
        res.json({ accessible: false, reason: "token_no_access" });
      } else {
        res.json({ accessible: false, reason: "github_api_error", status: response.status });
      }
    } catch {
      res.json({ accessible: false, reason: "github_api_error" });
    }
  });

  router.delete("/secrets/:id", async (req, res) => {
    assertBoard(req);
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Secret not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);

    const removed = await svc.remove(id);
    if (!removed) {
      res.status(404).json({ error: "Secret not found" });
      return;
    }

    await logActivity(db, {
      companyId: removed.companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "secret.deleted",
      entityType: "secret",
      entityId: removed.id,
      details: { name: removed.name },
    });

    res.json({ ok: true });
  });

  return router;
}
