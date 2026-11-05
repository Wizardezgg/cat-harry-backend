import { Schema, model, Document } from 'mongoose';
import { IUser } from '../types';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    photoUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    role: {
      type: String,
      enum: ['creator', 'host', 'admin'],
      default: 'creator',
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUserDocument>('User', userSchema);
