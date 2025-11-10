import { db } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';

const CATEGORIES_COLLECTION = 'job_categories';

export interface Category {
  $id: string;
  category_name?: string;
  icon_name?: string;
  color?: string;
}

export class CategoryService {
  async getAllCategories(limit?: number): Promise<Category[]> {
    try {
      let query = db.collection(CATEGORIES_COLLECTION).orderBy('category_name', 'asc');
      
      if (limit) {
        query = query.limit(limit) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        $id: doc.id,
        ...doc.data(),
      })) as Category[];
    } catch (error: any) {
      throw new AppError(`Failed to fetch categories: ${error.message}`, 500);
    }
  }

  async getCategoryById(categoryId: string): Promise<Category> {
    try {
      const doc = await db.collection(CATEGORIES_COLLECTION).doc(categoryId).get();

      if (!doc.exists) {
        throw new AppError('Category not found', 404);
      }

      return { $id: doc.id, ...doc.data() } as Category;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to fetch category: ${error.message}`, 500);
    }
  }
}

export default new CategoryService();

