
import mongoose, { Schema, type Model } from "mongoose";
import Counter from "./Counter";
import type { TicketPriority } from "./Category";
import User from "./User";

export type TicketStatus =
  | "Open"
  | "In Progress"
  | "Waiting on User"
  | "Resolved"
  | "Closed";

export interface IAttachment {
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface ITicket {
  ticketNumber?: string;
  title: string;
  description: string;
  category: mongoose.Types.ObjectId;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: mongoose.Types.ObjectId;
  assignedAgent?: mongoose.Types.ObjectId | null;
  attachments: IAttachment[];
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
  firstRespondedAt?: Date | null;
  resolvedAt?: Date | null;
  autoCloseAt?: Date | null;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
      immutable: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10000,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Open",
        "In Progress",
        "Waiting on User",
        "Resolved",
        "Closed",
      ],
      default: "Open",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
      validate: {
        validator: async function (value: mongoose.Types.ObjectId | null) {
          if (!value) return true;

          const User = mongoose.models.User;
          if (!User) return false;

          return Boolean(
            await User.exists({
              _id: value,
              role: "agent",
              active: true,
            })
          );
        },
        message: "Assigned user must be an active agent.",
      },
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: (items: IAttachment[]) => items.length <= 3,
        message: "A ticket can have at most 3 attachments.",
      },
    },
    firstResponseDueAt: {
      type: Date,
      required: true,
    },
    resolutionDueAt: {
      type: Date,
      required: true,
    },
    firstRespondedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    autoCloseAt: {
      type: Date,
      default: null,
    },
    firstResponseBreached: {
      type: Boolean,
      default: false,
    },
    resolutionBreached: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Generate a unique ticket number for new tickets.
ticketSchema.pre("validate", async function () {
  if (!this.isNew || this.ticketNumber) return;

  const counter = await Counter.findByIdAndUpdate(
    "ticket",
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  if (!counter) {
    throw new Error("Could not generate ticket number.");
  }

  this.ticketNumber = `TKT-${String(counter.sequence).padStart(4, "0")}`;
});

const Ticket: Model<ITicket> =
  mongoose.models.Ticket ||
  mongoose.model<ITicket>("Ticket", ticketSchema);

export default Ticket;
