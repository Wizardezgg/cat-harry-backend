import { Schema, model, Document } from 'mongoose';
import { IStudio } from '../types';

export interface IStudioDocument extends Omit<IStudio, '_id'>, Document {}

const studioSchema = new Schema<IStudioDocument>(
  {
    title: {
      type: String,
      required: [true, 'Studio title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Photo Studio',
        'Film Soundstage',
        'Recording & Podcast Suite',
        'Dance & Rehearsal Hall',
        'Art & Ceramic Atelier',
      ],
      required: true,
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Price per hour is required'],
      min: 1,
    },
    location: {
      type: String,
      required: [true, 'Studio location is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      required: true,
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
    rules: {
      type: [String],
      default: [],
    },
    sqft: {
      type: Number,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      default: 15,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    ownerId: {
      type: String,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    ownerPhone: {
      type: String,
      trim: true,
    },
    instantBooking: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals to ensure compatibility with client expectations
studioSchema.virtual('hourlyRate').get(function (this: IStudioDocument) {
  return this.pricePerHour;
});

studioSchema.virtual('imageUrl').get(function (this: IStudioDocument) {
  return this.images && this.images.length > 0 ? this.images[0] : '';
});

studioSchema.virtual('overview').get(function (this: IStudioDocument) {
  return this.description;
});

export const Studio = model<IStudioDocument>('Studio', studioSchema);
