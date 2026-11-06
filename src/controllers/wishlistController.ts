import { Request, Response } from 'express';
import { Wishlist } from '../models/Wishlist';
import { Studio } from '../models/Studio';

// @desc    Toggle studio in user wishlist (save / unsave)
// @route   POST /api/wishlist/toggle
export async function toggleWishlist(req: Request, res: Response): Promise<void> {
  try {
    const { studioId, userId: reqUserId, userEmail: reqUserEmail } = req.body;
    const userId =
      (req as any).user?._id ||
      (req as any).user?.email ||
      reqUserId ||
      reqUserEmail ||
      'creator_guest';

    if (!studioId) {
      res.status(400).json({
        success: false,
        message: 'studioId is required to toggle wishlist.',
      });
      return;
    }

    const existing = await Wishlist.findOne({ userId, studioId });

    if (existing) {
      await Wishlist.findByIdAndDelete(existing._id);
      res.status(200).json({
        success: true,
        saved: false,
        isSaved: false,
        message: 'Studio removed from saved wishlist',
      });
      return;
    }

    await Wishlist.create({ userId, studioId });
    res.status(200).json({
      success: true,
      saved: true,
      isSaved: true,
      message: 'Studio saved to wishlist',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle studio in wishlist',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Get all saved studios for user
// @route   GET /api/wishlist
export async function getWishlist(req: Request, res: Response): Promise<void> {
  try {
    const userId =
      (req as any).user?._id ||
      (req as any).user?.email ||
      req.query.userId ||
      req.query.userEmail ||
      'creator_guest';

    const wishlistItems = await Wishlist.find({ userId }).sort({ createdAt: -1 });
    const studioIds = wishlistItems.map((item) => item.studioId);

    // Fetch full studio objects for all saved IDs
    const studios = await Studio.find({ _id: { $in: studioIds } });

    res.status(200).json({
      success: true,
      count: studios.length,
      studioIds,
      studios,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wishlist',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Check if a specific studio is in user wishlist
// @route   GET /api/wishlist/check/:studioId
export async function checkWishlistStatus(req: Request, res: Response): Promise<void> {
  try {
    const { studioId } = req.params;
    const userId = (req as any).user?._id || req.query.userId;
    if (!userId) {
      res.status(200).json({ success: true, isSaved: false });
      return;
    }

    const existing = await Wishlist.findOne({ userId, studioId });

    res.status(200).json({
      success: true,
      isSaved: Boolean(existing),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist status',
      error: err?.message || 'Server error',
    });
  }
}
