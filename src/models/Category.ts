
import mongoose, { Schema, type Model } from "mongoose";

export type TicketPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Urgent";

export interface ICategory {
  name: string;
  description: string;
  defaultPriority: TicketPriority;
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    defaultPriority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
      required: true,
    },
  },
  { timestamps: true }
);

const Category: Model<ICategory> =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", categorySchema);

export default Category;
