import { Request, Response } from 'express';
import { Studio } from '../models/Studio';

// @desc    Get all studios with dynamic search, category, price range, and sort
// @route   GET /api/studios
export async function getStudios(req: Request, res: Response): Promise<void> {
  try {
    const {
      search,
      category,
      city,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const filter: Record<string, any> = {};

    // Text search query
    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { city: searchRegex },
        { amenities: { $in: [searchRegex] } },
      ];
    }

    // Category filter
    if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    // City filter
    if (city && typeof city === 'string' && city.toLowerCase() !== 'all') {
      filter.city = new RegExp(city.trim(), 'i');
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.pricePerHour = {};
      if (minPrice) filter.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerHour.$lte = Number(maxPrice);
    }

    // Sort order
    let sortOptions: Record<string, any> = { createdAt: -1 };
    if (sort === 'price_asc') {
      sortOptions = { pricePerHour: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { pricePerHour: -1 };
    } else if (sort === 'rating') {
      sortOptions = { rating: -1, reviewsCount: -1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [studios, total] = await Promise.all([
      Studio.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
      Studio.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: studios.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      studios,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch studios',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Get top 6 featured studios using .limit(6)
// @route   GET /api/studios/featured
export async function getFeaturedStudios(req: Request, res: Response): Promise<void> {
  try {
    const featured = await Studio.find({
      $or: [{ featured: true }, { rating: { $gte: 4.9 } }],
    })
      .sort({ rating: -1, reviewsCount: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      count: featured.length,
      studios: featured,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured studios',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Get single studio by ID
// @route   GET /api/studios/:id
export async function getStudioById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const studio = await Studio.findById(id);

    if (!studio) {
      res.status(404).json({
        success: false,
        message: `Studio not found with id: ${id}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      studio,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving studio',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Create new studio listing
// @route   POST /api/studios
export async function createStudio(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body;

    const hourlyRate = body.hourlyRate || body.pricePerHour;
    const overview = body.overview || body.description;
    const images = Array.isArray(body.images) && body.images.length > 0
      ? body.images
      : body.imageUrl
      ? [body.imageUrl]
      : [];

    const locationStr =
      typeof body.location === 'object'
        ? `${body.location.address || ''}, ${body.location.city || ''}, ${body.location.state || ''}`
        : body.location;

    const cityStr =
      typeof body.location === 'object' && body.location.city
        ? body.location.city
        : body.city || 'New York';

    const addressStr =
      typeof body.location === 'object' && body.location.address
        ? body.location.address
        : body.address || locationStr;

    const newStudio = await Studio.create({
      title: body.title,
      description: overview,
      category: body.category,
      pricePerHour: Number(hourlyRate),
      location: locationStr,
      address: addressStr,
      city: cityStr,
      images,
      amenities: body.amenities || [],
      rules: body.rules || [],
      sqft: body.sqft || 2500,
      capacity: body.maxCapacity || body.capacity || 20,
      rating: 5.0,
      reviewsCount: 0,
      featured: Boolean(body.featured),
      ownerId: body.ownerId || (req as any).user?._id || 'host_elena',
      ownerName: body.ownerName || (req as any).user?.name || 'Elena Rostova',
      ownerEmail: (body.ownerEmail || (req as any).user?.email || 'host@studiospace.com').toLowerCase(),
      ownerPhone: body.ownerPhone || '+1 (718) 555-0192',
      instantBooking: true,
    });

    res.status(201).json({
      success: true,
      message: 'Studio listing created successfully',
      studio: newStudio,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to create studio listing',
      error: err?.message || 'Validation error',
    });
  }
}

// @desc    Update existing studio listing
// @route   PATCH /api/studios/:id or PUT /api/studios/:id
export async function updateStudio(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await Studio.findById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        message: `Studio not found with id: ${id}`,
      });
      return;
    }

    // Normalize updates
    if (body.title) existing.title = body.title;
    if (body.description || body.overview) existing.description = body.description || body.overview;
    if (body.category) existing.category = body.category;
    if (body.hourlyRate || body.pricePerHour) existing.pricePerHour = Number(body.hourlyRate || body.pricePerHour);
    if (body.capacity || body.maxCapacity) existing.capacity = Number(body.capacity || body.maxCapacity);
    if (body.amenities) existing.amenities = body.amenities;
    if (body.rules) existing.rules = body.rules;
    if (body.sqft) existing.sqft = Number(body.sqft);
    if (body.featured !== undefined) existing.featured = Boolean(body.featured);

    if (body.images && Array.isArray(body.images)) {
      existing.images = body.images;
    } else if (body.imageUrl) {
      existing.images = [body.imageUrl, ...(existing.images.slice(1))];
    }

    if (typeof body.location === 'object') {
      existing.location = `${body.location.address || ''}, ${body.location.city || ''}, ${body.location.state || ''}`;
      if (body.location.city) existing.city = body.location.city;
      if (body.location.address) existing.address = body.location.address;
    } else if (typeof body.location === 'string') {
      existing.location = body.location;
    }

    await existing.save();

    res.status(200).json({
      success: true,
      message: 'Studio listing updated successfully',
      studio: existing,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to update studio listing',
      error: err?.message || 'Update error',
    });
  }
}

// @desc    Delete a studio listing
// @route   DELETE /api/studios/:id
export async function deleteStudio(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await Studio.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: `Studio not found with id: ${id}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Studio listing deleted permanently',
      deletedId: id,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete studio listing',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Get all listings hosted by current user
// @route   GET /api/studios/my-listings
export async function getMyListings(req: Request, res: Response): Promise<void> {
  try {
    const ownerEmail =
      (req as any).user?.email ||
      req.query.ownerEmail ||
      req.query.email ||
      'host@studiospace.com';

    const studios = await Studio.find({
      ownerEmail: new RegExp(`^${String(ownerEmail).trim()}$`, 'i'),
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: studios.length,
      studios,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve host listings',
      error: err?.message || 'Server error',
    });
  }
}
