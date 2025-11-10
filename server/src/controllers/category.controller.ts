import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import categoryService from '../services/category.service';

export const getAllCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const categories = await categoryService.getAllCategories(limit);
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    res.json(category);
  } catch (error) {
    next(error);
  }
};

