import { Router } from 'express';
import {
  toggleWishlist,
  getWishlist,
  checkWishlistStatus,
} from '../controllers/wishlistController';

const router = Router();

// Wishlist Endpoints
router.post('/toggle', toggleWishlist);
router.get('/', getWishlist);
router.get('/check/:studioId', checkWishlistStatus);

export default router;
