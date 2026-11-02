export type StudioCategory =
  | 'Photo Studio'
  | 'Film Soundstage'
  | 'Recording & Podcast Suite'
  | 'Dance & Rehearsal Hall'
  | 'Art & Ceramic Atelier';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  photoUrl?: string;
  role: 'creator' | 'host' | 'admin';
  createdAt: string;
}

export interface IStudio {
  _id: string;
  title: string;
  description: string;
  category: StudioCategory;
  pricePerHour: number;
  location: string;
  address?: string;
  city?: string;
  images: string[];
  amenities: string[];
  rules?: string[];
  sqft: number;
  capacity: number;
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  instantBooking?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface IBooking {
  _id: string;
  studioId: string;
  studioTitle: string;
  studioImage: string;
  studioLocation: string;
  pricePerHour: number;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:MM (24-hour format)
  endTime: string;     // HH:MM (24-hour format)
  totalHours: number;
  totalPrice: number;
  specialRequests?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
}

export interface IWishlist {
  _id: string;
  userId: string;
  studioId: string;
  createdAt: string;
}

export interface IReview {
  _id: string;
  studioId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: string;
}
