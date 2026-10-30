
import mongoose, { Schema, type Model } from "mongoose";

export type ActivityAction =
  | "ticket_created"
  | "status_changed"
  | "reassigned"
  | "priority_changed"
  | "reply_added"
  | "internal_note_added"
  | "ticket_resolved"
  | "ticket_closed"
  | "sla_breached";

export interface IActivityLog {
  ticket: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  action: ActivityAction;
  previousValue?: string;
  newValue?: string;
  details?: string;
  createdAt?: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    ticket: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "ticket_created",
        "status_changed",
        "reassigned",
        "priority_changed",
        "reply_added",
        "internal_note_added",
        "ticket_resolved",
        "ticket_closed",
        "sla_breached",
      ],
      required: true,
    },
    previousValue: {
      type: String,
      maxlength: 500,
    },
    newValue: {
      type: String,
      maxlength: 500,
    },
    details: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

activityLogSchema.index({ ticket: 1, createdAt: -1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", activityLogSchema);

export default ActivityLog;
