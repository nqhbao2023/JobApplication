import { db } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';

const COMPANIES_COLLECTION = 'companies';

export interface Company {
  $id: string;
  corp_name?: string;
  nation?: string;
  corp_description?: string;
  city?: string;
  image?: string;
  color?: string;
}

export class CompanyService {
  async getAllCompanies(limit?: number): Promise<Company[]> {
    try {
      let query = db.collection(COMPANIES_COLLECTION).orderBy('corp_name', 'asc');
      
      if (limit) {
        query = query.limit(limit) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        $id: doc.id,
        ...doc.data(),
      })) as Company[];
    } catch (error: any) {
      throw new AppError(`Failed to fetch companies: ${error.message}`, 500);
    }
  }

  async getCompanyById(companyId: string): Promise<Company> {
    try {
      const doc = await db.collection(COMPANIES_COLLECTION).doc(companyId).get();

      if (!doc.exists) {
        throw new AppError('Company not found', 404);
      }

      return { $id: doc.id, ...doc.data() } as Company;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to fetch company: ${error.message}`, 500);
    }
  }
}

export default new CompanyService();

