
import mongoose, { Schema, type Model } from "mongoose";

export interface ICounter {
  _id: string;
  sequence: number;
}

const counterSchema = new Schema<ICounter>({
  _id: {
    type: String,
    required: true,
  },
  sequence: {
    type: Number,
    required: true,
    default: 0,
  },
});

const Counter: Model<ICounter> =
  mongoose.models.Counter ||
  mongoose.model<ICounter>("Counter", counterSchema);

export default Counter;
