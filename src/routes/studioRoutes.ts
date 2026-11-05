import { Router } from 'express';
import {
  getStudios,
  getFeaturedStudios,
  getStudioById,
  createStudio,
  updateStudio,
  deleteStudio,
  getMyListings,
} from '../controllers/studioController';

const router = Router();

// Public Discovery Endpoints
router.get('/', getStudios);
router.get('/featured', getFeaturedStudios);
router.get('/my-listings', getMyListings);
router.get('/:id', getStudioById);

// Studio Management Endpoints
router.post('/', createStudio);
router.patch('/:id', updateStudio);
router.put('/:id', updateStudio);
router.delete('/:id', deleteStudio);

export default router;
