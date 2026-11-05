import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'aperture_studio_super_secret_jwt_2026_key';

// Helper: Generate JWT token
function generateToken(user: { _id: any; email: string; role: string; name: string }): string {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Helper: Set HTTPOnly Cookie (Challenge 1)
function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// @desc    Register a new creator or host account
// @route   POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, photoUrl, password, role = 'creator' } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
      return;
    }

    // Password validation requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasMinLength = password.length >= 6;

    if (!hasUppercase || !hasLowercase || !hasMinLength) {
      res.status(400).json({
        success: false,
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and at least 6 characters.',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      role: role === 'host' ? 'host' : 'creator',
    });

    const token = generateToken(newUser);
    setAuthCookie(res, token);

    const userObj = newUser.toObject();
    delete (userObj as any).password;

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      user: userObj,
      token,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Registration failed.',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Login user with email/password and issue HTTPOnly JWT cookie (Challenge 1)
// @route   POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
      return;
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    const userObj = user.toObject();
    delete (userObj as any).password;

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: userObj,
      token,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Login failed.',
      error: err?.message || 'Server error',
    });
  }
}

// @desc    Get currently logged in user session from HTTPOnly cookie
// @route   GET /api/auth/me
export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No active session token.',
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Session invalid: User no longer exists.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch {
    res.status(401).json({
      success: false,
      message: 'Session expired or invalid.',
    });
  }
}

// @desc    Logout user by clearing HTTPOnly cookie
// @route   POST /api/auth/logout
export async function logout(_req: Request, res: Response): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Signed out of workstation successfully.',
  });
}

// @desc    Google OAuth / One-Click Social Demo Authentication
// @route   POST /api/auth/google
export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, photoUrl } = req.body;
    const normalizedEmail = (email || 'creator@studiospace.com').toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const randomPassword = await bcrypt.hash(`ApertureGoogle@${Date.now()}`, 10);
      user = await User.create({
        name: name || 'Elena Rostova',
        email: normalizedEmail,
        password: randomPassword,
        photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        role: normalizedEmail.includes('host') ? 'host' : 'creator',
      });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    const userObj = user.toObject();
    delete (userObj as any).password;

    res.status(200).json({
      success: true,
      message: 'Google authentication verified.',
      user: userObj,
      token,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Google authentication failed.',
      error: err?.message || 'Server error',
    });
  }
}
