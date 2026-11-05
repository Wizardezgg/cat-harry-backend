import { Schema, model, Document } from 'mongoose';
import { IBooking } from '../types';

export interface IBookingDocument extends Omit<IBooking, '_id'>, Document {
  securityDeposit?: number;
  totalAmount?: number;
}

const bookingSchema = new Schema<IBookingDocument>(
  {
    studioId: {
      type: String,
      required: true,
      index: true,
    },
    studioTitle: {
      type: String,
      required: true,
    },
    studioImage: {
      type: String,
      default: '',
    },
    studioLocation: {
      type: String,
      default: '',
    },
    pricePerHour: {
      type: Number,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    userPhone: {
      type: String,
    },
    bookingDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    startTime: {
      type: String, // HH:MM (24-hour format)
      required: true,
    },
    endTime: {
      type: String, // HH:MM (24-hour format)
      required: true,
    },
    totalHours: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    securityDeposit: {
      type: Number,
      default: 150,
    },
    specialRequests: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookingSchema.virtual('studioHourlyRate').get(function (this: IBookingDocument) {
  return this.pricePerHour;
});

bookingSchema.virtual('totalAmount').get(function (this: IBookingDocument) {
  return this.totalPrice;
});

export const Booking = model<IBookingDocument>('Booking', bookingSchema);
