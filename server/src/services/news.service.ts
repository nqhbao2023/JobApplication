import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../config/firebase';
import { NewsArticle } from '../types';
import { AppError } from '../middleware/errorHandler';

const NEWS_COLLECTION = 'news';

export class NewsService {
  async scrapeVietnamWorksNews(): Promise<NewsArticle[]> {
    try {
      const url = 'https://www.vietnamworks.com/career-advice';
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const articles: NewsArticle[] = [];

      $('.article-item').each((_, element) => {
        const title = $(element).find('.article-title').text().trim();
        const url = $(element).find('a').attr('href');
        const description = $(element).find('.article-description').text().trim();

        if (title && url) {
          articles.push({
            title,
            description,
            url: url.startsWith('http') ? url : `https://www.vietnamworks.com${url}`,
            source: 'VietnamWorks',
            category: 'career-advice',
            publishedAt: new Date(),
            createdAt: new Date(),
          });
        }
      });

      return articles;
    } catch (error: any) {
      console.error('VietnamWorks scraping failed:', error.message);
      return [];
    }
  }

  async scrapeTopCVNews(): Promise<NewsArticle[]> {
    try {
      const url = 'https://www.topcv.vn/cam-nang';
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const articles: NewsArticle[] = [];

      $('.news-item, .article-item').each((_, element) => {
        const title = $(element).find('h3, .title').text().trim();
        const url = $(element).find('a').attr('href');
        const description = $(element).find('.description, .excerpt').text().trim();

        if (title && url) {
          articles.push({
            title,
            description,
            url: url.startsWith('http') ? url : `https://www.topcv.vn${url}`,
            source: 'TopCV',
            category: 'career-tips',
            publishedAt: new Date(),
            createdAt: new Date(),
          });
        }
      });

      return articles;
    } catch (error: any) {
      console.error('TopCV scraping failed:', error.message);
      return [];
    }
  }

  async scrapeAllNews(): Promise<NewsArticle[]> {
    try {
      const [vietnamWorksNews, topCVNews] = await Promise.allSettled([
        this.scrapeVietnamWorksNews(),
        this.scrapeTopCVNews(),
      ]);

      const allNews: NewsArticle[] = [];

      if (vietnamWorksNews.status === 'fulfilled') {
        allNews.push(...vietnamWorksNews.value);
      }
      if (topCVNews.status === 'fulfilled') {
        allNews.push(...topCVNews.value);
      }

      return allNews;
    } catch (error: any) {
      throw new AppError(`Failed to scrape news: ${error.message}`, 500);
    }
  }

  async saveNewsToFirestore(articles: NewsArticle[]): Promise<number> {
    try {
      let savedCount = 0;

      for (const article of articles) {
        const existingQuery = await db
          .collection(NEWS_COLLECTION)
          .where('url', '==', article.url)
          .limit(1)
          .get();

        if (existingQuery.empty) {
          const newsRef = db.collection(NEWS_COLLECTION).doc();
          await newsRef.set({
            ...article,
            id: newsRef.id,
          });
          savedCount++;
        }
      }

      return savedCount;
    } catch (error: any) {
      throw new AppError(`Failed to save news: ${error.message}`, 500);
    }
  }

  async getNews(limit: number = 20, category?: string): Promise<NewsArticle[]> {
    try {
      let query = db.collection(NEWS_COLLECTION).orderBy('publishedAt', 'desc');

      if (category) {
        query = query.where('category', '==', category) as any;
      }

      const snapshot = await query.limit(limit).get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NewsArticle[];
    } catch (error: any) {
      throw new AppError(`Failed to fetch news: ${error.message}`, 500);
    }
  }

  async refreshNews(): Promise<{ total: number; saved: number }> {
    try {
      const articles = await this.scrapeAllNews();
      const saved = await this.saveNewsToFirestore(articles);

      return {
        total: articles.length,
        saved,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to refresh news: ${error.message}`, 500);
    }
  }
}

export default new NewsService();

