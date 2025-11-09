import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import newsService from '../services/news.service';

export const getNews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit, category } = req.query;

    const news = await newsService.getNews(
      limit ? parseInt(limit as string, 10) : 20,
      category as string
    );

    res.json(news);
  } catch (error) {
    next(error);
  }
};

export const refreshNews = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await newsService.refreshNews();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const scrapeNews = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const articles = await newsService.scrapeAllNews();
    res.json({ articles, count: articles.length });
  } catch (error) {
    next(error);
  }
};

