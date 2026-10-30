
import { z } from "zod";

const attachmentSchema = z.object({
  url: z.string().url("Invalid attachment URL"),
  publicId: z.string().min(1, "Attachment ID is required"),
  originalName: z.string().min(1, "File name is required"),
  mimeType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]),
  size: z.number().positive().max(5 * 1024 * 1024),
});

export const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must contain at least 5 characters")
    .max(150, "Title cannot exceed 150 characters"),

  description: z
    .string()
    .trim()
    .min(10, "Description must contain at least 10 characters")
    .max(10000, "Description cannot exceed 10,000 characters"),

  category: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Please select a valid category"),

  priority: z.enum(["Low", "Medium", "High", "Urgent"]),

  attachments: z
    .array(attachmentSchema)
    .max(3, "You can upload a maximum of 3 attachments")
    .default([]),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
