
import mongoose, { Schema, type Model } from "mongoose";
import type { IAttachment } from "./Ticket";

export interface IMessage {
  ticket: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  body: string;
  attachments: IAttachment[];
  internal: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    ticket: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      trim: true,
      default: "",
      maxlength: 10000,
    },
    attachments: {
      type: [
        new Schema<IAttachment>(
          {
            url: { type: String, required: true },
            publicId: { type: String, required: true },
            originalName: { type: String, required: true },
            mimeType: { type: String, required: true },
            size: { type: Number, required: true, min: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
      validate: {
        validator: (items: IAttachment[]) => items.length <= 3,
        message: "A message can have at most 3 attachments.",
      },
    },
    internal: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { timestamps: true }
);

// A message must contain text, an attachment, or both.
messageSchema.pre("validate", function () {
  if (!this.body?.trim() && this.attachments.length === 0) {
    this.invalidate(
      "body",
      "A message must contain text or at least one attachment"
    );
  }
});

// Sort messages chronologically within each ticket.
messageSchema.index({ ticket: 1, createdAt: 1 });

const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", messageSchema);

export default Message;
