import { Severity } from "@prisma/client";
import { z } from "zod";

export const annotationSchema = z.object({
  ruleId: z.string(),
  blockIndex: z.number().int().min(0),
  paragraphIndex: z.number().int().min(0).optional(),
  issue: z.string().min(1),
  suggestion: z.string().min(1),
  severity: z.nativeEnum(Severity),
  evidenceText: z.string().optional(),
});

export const ruleFindingSchema = z.object({
  ruleId: z.string(),
  conclusion: z.string().min(1),
  annotations: z.array(annotationSchema),
});

export const reviewResponseSchema = z.object({
  summary: z.string().min(1),
  overallScore: z.number().int().min(0).max(100).optional(),
  ruleFindings: z.array(ruleFindingSchema),
});

export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
