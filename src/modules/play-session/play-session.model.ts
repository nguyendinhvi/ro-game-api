import mongoose, { Schema, Document, Model } from 'mongoose';
import { jsonTransform } from '../../utils/mongoose';
import type { PlaySessionStatus } from './play-session.interface';

interface IPlaySessionDocumentRaw {
  user_id: mongoose.Types.ObjectId;
  game_id: mongoose.Types.ObjectId;
  started_at: Date;
  ended_at?: Date;
  duration_seconds: number;
  status: PlaySessionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface IPlaySessionDocument extends IPlaySessionDocumentRaw, Document {
  _id: mongoose.Types.ObjectId;
}

const playSessionSchema = new Schema<IPlaySessionDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    game_id: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    started_at: { type: Date, required: true, default: () => new Date() },
    ended_at: { type: Date },
    duration_seconds: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'completed'] as PlaySessionStatus[],
      default: 'active',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        return jsonTransform(_doc, ret);
      },
    },
    toObject: { virtuals: true, versionKey: false },
  },
);

playSessionSchema.index({ user_id: 1, started_at: -1 });
playSessionSchema.index({ game_id: 1, started_at: -1 });
playSessionSchema.index({ status: 1 });

export const PlaySessionModel: Model<IPlaySessionDocument> =
  mongoose.model<IPlaySessionDocument>('PlaySession', playSessionSchema);
