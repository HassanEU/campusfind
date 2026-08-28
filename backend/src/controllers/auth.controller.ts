import type { RequestHandler } from 'express';
import * as authService from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';

export const register: RequestHandler = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
};

export const staffSetup: RequestHandler = async (req, res) => {
  const result = await authService.createStaffAccount(req.body);
  res.status(201).json(result);
};

export const login: RequestHandler = async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
};

export const me: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  res.json({ user: await authService.currentUser(req.user.userId) });
};

/**
 * Tokens are stateless, so signing out is a client-side action: the browser
 * discards the token.  The endpoint exists so the frontend has one place to
 * call and so the action can be logged later if the college ever needs it.
 */
export const logout: RequestHandler = (_req, res) => {
  res.json({ message: 'Signed out.' });
};
