import { z } from "zod";
import { COMPANY_STATUSES } from "../constants.js";

export const companySlugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens");

export const createCompanySchema = z.object({
  name: z.string().min(1),
  slug: companySlugSchema.optional(),
  description: z.string().optional().nullable(),
  budgetMonthlyCents: z.number().int().nonnegative().optional().default(0),
});

export type CreateCompany = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema
  .partial()
  .extend({
    slug: companySlugSchema.nullable().optional(),
    status: z.enum(COMPANY_STATUSES).optional(),
    spentMonthlyCents: z.number().int().nonnegative().optional(),
    requireBoardApprovalForNewAgents: z.boolean().optional(),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  });

export type UpdateCompany = z.infer<typeof updateCompanySchema>;
