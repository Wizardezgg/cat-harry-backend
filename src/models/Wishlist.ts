import { Schema, model, Document } from 'mongoose';
import { IWishlist } from '../types';

export interface IWishlistDocument extends Omit<IWishlist, '_id'>, Document {}

const wishlistSchema = new Schema<IWishlistDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    studioId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

wishlistSchema.index({ userId: 1, studioId: 1 }, { unique: true });

export const Wishlist = model<IWishlistDocument>('Wishlist', wishlistSchema);
