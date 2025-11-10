import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import companyService from '../services/company.service';

export const getAllCompanies = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const companies = await companyService.getAllCompanies(limit);
    res.json(companies);
  } catch (error) {
    next(error);
  }
};

export const getCompanyById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const company = await companyService.getCompanyById(id);
    res.json(company);
  } catch (error) {
    next(error);
  }
};

