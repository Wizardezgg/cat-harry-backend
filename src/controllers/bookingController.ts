import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Studio } from '../models/Studio';

// Helper: Convert "HH:MM" (24h) to integer minutes from midnight
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

// @desc    Create new studio booking with double-booking collision prevention (Challenge 2)
// @route   POST /api/bookings
export async function createBooking(req: Request, res: Response): Promise<void> {
  try {
    const {
      studioId,
      studioTitle,
      studioImage,
      studioLocation,
      pricePerHour,
      bookingDate,
      startTime,
      endTime,
      securityDeposit = 150,
      specialRequests,
      userName,
      userEmail,
      userPhone,
    } = req.body;

    // Validate required fields
    if (!studioId || !bookingDate || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: 'Studio ID, date, call time start, and wrap time end are required.',
      });
      return;
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      res.status(400).json({
        success: false,
        message: 'Wrap time must be later than call start time (minimum 1 hour).',
      });
      return;
    }

    const durationHours = (endMinutes - startMinutes) / 60;
    if (durationHours < 1) {
      res.status(400).json({
        success: false,
        message: 'Studio booking duration minimum is 1 hour.',
      });
      return;
    }

    // =========================================================================
    // Challenge 2: Double-Booking Overlap Collision Detection Engine
    // An overlap occurs between interval [A_start, A_end] and [B_start, B_end]
    // if and only if: A_start < B_end AND A_end > B_start
    // =========================================================================
    const existingActiveBookings = await Booking.find({
      studioId,
      bookingDate,
      status: { $in: ['confirmed', 'Confirmed', 'pending', 'Pending'] },
    });

    const collision = existingActiveBookings.find((existing) => {
      const existingStart = timeToMinutes(existing.startTime);
      const existingEnd = timeToMinutes(existing.endTime);
      return startMinutes < existingEnd && endMinutes > existingStart;
    });

    if (collision) {
      res.status(409).json({
        success: false,
        collision: true,
        message: `Schedule Conflict: This studio is already reserved from ${collision.startTime} to ${collision.endTime} on ${bookingDate}. Please select an alternate time window.`,
        conflictingBooking: {
          bookingDate: collision.bookingDate,
          startTime: collision.startTime,
          endTime: collision.endTime,
        },
      });
      return;
    }

    // Determine hourly rate
    let effectiveRate = Number(pricePerHour);
    let resolvedTitle = studioTitle;
    let resolvedImage = studioImage;
    let resolvedLocation = studioLocation;

    if (!effectiveRate || !resolvedTitle) {
      const studio = await Studio.findById(studioId);
      if (studio) {
        effectiveRate = studio.pricePerHour;
        resolvedTitle = studio.title;
        resolvedImage = studio.images?.[0] || '';
        resolvedLocation = studio.location;
      } else {
        effectiveRate = 120;
        resolvedTitle = resolvedTitle || 'Aperture Production Workspace';
      }
    }

    const subtotal = durationHours * effectiveRate;
    const finalDeposit = Number(securityDeposit) || 150;
    const totalPrice = subtotal + finalDeposit;

    const currentUserId = (req as any).user?._id || 'creator_marcus';
    const currentUserName = userName || (req as any).user?.name || 'Marcus Vance';
    const currentUserEmail = (userEmail || (req as any).user?.email || 'creator@studiospace.com').toLowerCase();

    const newBooking = await Booking.create({
      studioId,
      studioTitle: resolvedTitle,
      studioImage: resolvedImage || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      studioLocation: resolvedLocation || 'Creative Arts District',
      pricePerHour: effectiveRate,
      userId: currentUserId,
      userName: currentUserName,
      userEmail: currentUserEmail,
      userPhone: userPhone || '+1 (555) 019-2834',
      bookingDate,
      startTime,
      endTime,
      totalHours: Number(durationHours.toFixed(1)),
      totalPrice,
      securityDeposit: finalDeposit,
      specialRequests: specialRequests || '',
      status: 'confirmed',
    });

    res.status(201).json({
      success: true,
      message: 'Workspace reservation confirmed and locked into escrow.',
      booking: newBooking,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to process workspace reservation',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Get all bookings for the logged-in user
// @route   GET /api/bookings/my-bookings
export async function getMyBookings(req: Request, res: Response): Promise<void> {
  try {
    const userEmail =
      (req as any).user?.email ||
      req.query.userEmail ||
      req.query.email ||
      'creator@studiospace.com';

    const bookings = await Booking.find({
      userEmail: new RegExp(`^${String(userEmail).trim()}$`, 'i'),
    }).sort({ bookingDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Cancel a reservation
// @route   PATCH /api/bookings/:id/cancel
export async function cancelBooking(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: `Booking #${id} not found.`,
      });
      return;
    }

    if (booking.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Booking is already cancelled.',
      });
      return;
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully. Full escrow deposit released.',
      booking,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel reservation',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Get reserved calendar slots for a studio
// @route   GET /api/bookings/studio/:studioId
export async function getStudioBookedSlots(req: Request, res: Response): Promise<void> {
  try {
    const { studioId } = req.params;

    const activeBookings = await Booking.find({
      studioId,
      status: { $in: ['confirmed', 'Confirmed', 'pending', 'Pending'] },
    }).select('bookingDate startTime endTime totalHours status');

    res.status(200).json({
      success: true,
      count: activeBookings.length,
      slots: activeBookings,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve studio booked slots',
      error: err?.message || 'Server error',
    });
  }
}
