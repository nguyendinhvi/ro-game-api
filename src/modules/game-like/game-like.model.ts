import mongoose, { Schema, Document, Model } from 'mongoose';
import { jsonTransform } from '../../utils/mongoose';

interface IGameLikeDocumentRaw {
  user_id: mongoose.Types.ObjectId;
  game_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IGameLikeDocument extends IGameLikeDocumentRaw, Document {
  _id: mongoose.Types.ObjectId;
}

const gameLikeSchema = new Schema<IGameLikeDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    game_id: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
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

gameLikeSchema.index({ user_id: 1, game_id: 1 }, { unique: true });
gameLikeSchema.index({ user_id: 1, created_at: -1 });
gameLikeSchema.index({ game_id: 1, created_at: -1 });

export const GameLikeModel: Model<IGameLikeDocument> = mongoose.model<IGameLikeDocument>(
  'GameLike',
  gameLikeSchema,
);
