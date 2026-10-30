
import { z } from "zod";

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
});

export type CreateTicketInput = z.infer<
  typeof createTicketSchema
>;
