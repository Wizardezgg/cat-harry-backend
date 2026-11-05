import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getStudioBookedSlots,
} from '../controllers/bookingController';

const router = Router();

// Booking Operations
router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.patch('/:id/cancel', cancelBooking);
router.get('/studio/:studioId', getStudioBookedSlots);

export default router;
