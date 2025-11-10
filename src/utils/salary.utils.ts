export interface SalaryObject {
  min?: number;
  max?: number;
  currency?: string;
}

export type SalaryValue = string | SalaryObject | null | undefined;

export const formatSalary = (salary: SalaryValue): string => {
  if (!salary) return '';
  
  if (typeof salary === 'string') return salary;
  
  if (typeof salary === 'object') {
    const { min, max, currency = 'VND' } = salary;
    
    if (min && max) {
      return `${min.toLocaleString('vi-VN')} - ${max.toLocaleString('vi-VN')} ${currency}`;
    }
    
    if (min) {
      return `Từ ${min.toLocaleString('vi-VN')} ${currency}`;
    }
    
    if (max) {
      return `Lên đến ${max.toLocaleString('vi-VN')} ${currency}`;
    }
  }
  
  return '';
};

export const normalizeSalary = (salary: SalaryValue): string => {
  return formatSalary(salary);
};

export const parseSalaryObject = (salary: SalaryValue): SalaryObject | null => {
  if (!salary) return null;
  
  if (typeof salary === 'object') return salary;
  
  if (typeof salary === 'string') {
    const match = salary.match(/(\d+(?:,\d{3})*)\s*-?\s*(\d+(?:,\d{3})*)?/);
    if (match) {
      const min = parseInt(match[1].replace(/,/g, ''));
      const max = match[2] ? parseInt(match[2].replace(/,/g, '')) : undefined;
      return { min, max, currency: 'VND' };
    }
  }
  
  return null;
};

