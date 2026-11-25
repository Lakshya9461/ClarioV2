import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'teacher', 'admin']).optional().default('student'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const askQuestionSchema = z.object({
  question: z.string().min(2, 'Question must be at least 2 characters long').max(1000, 'Question too long'),
  parentQuestionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid question ID').optional(),
  history: z.array(z.any()).optional(),
});

export const followUpSchema = z.object({
  question: z.string().min(2, 'Follow-up question must be at least 2 characters').max(1000),
});

export const simplifySchema = z.object({
  questionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid question ID format'),
});

export const studyListCreateSchema = z.object({
  name: z.string().min(1, 'List name is required').max(100),
  description: z.string().max(300).optional().default(''),
  questionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid question ID').optional(),
});

export const studyListUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(300).optional(),
  questionIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  addQuestionId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  removeQuestionId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

export const feedbackSchema = z.object({
  questionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid question ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().max(1000).optional().default(''),
});

export const shortsQuerySchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(200, 'Topic is too long'),
  prompt: z.string().trim().max(500, 'Prompt is too long').optional(),
});

const conceptIdSchema = z
  .string()
  .trim()
  .max(64)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, 'Use a lowercase concept slug');

export const learningConceptSchema = z.object({
  conceptId: conceptIdSchema,
  name: z.string().trim().min(2).max(120),
  statement: z.string().trim().max(1000).optional().default(''),
});

export const learningAssessmentSchema = z.object({
  status: z.enum(['unknown', 'developing', 'demonstrated']),
  evidence: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  summary: z.string().trim().max(1000).optional().default(''),
});

export const learningRelationshipSchema = z.object({
  from: conceptIdSchema,
  to: conceptIdSchema,
  type: z.enum(['prerequisite', 'related']),
});

export const learningSessionSchema = z.object({
  goalConceptId: conceptIdSchema,
});

export const learningProgressSchema = z.object({
  nodeId: conceptIdSchema,
  evidence: z.string().trim().max(1000).optional().default(''),
});

export const learningQuestionLinkSchema = z.object({
  questionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid question ID'),
  nodeId: conceptIdSchema,
  kind: z.enum(['predict', 'check']),
});
