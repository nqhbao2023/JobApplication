export interface SalaryObject {
  min?: number;
  max?: number;
  currency?: string;
}

export type SalaryValue = string | SalaryObject | null | undefined;

/**
 * Format salary for display - ALWAYS returns a string
 * Handles: string, object {min, max, currency}, null, undefined, and any other types
 */
export const formatSalary = (salary: unknown): string => {
  // Handle null/undefined
  if (salary === null || salary === undefined) return '';
  
  // Handle string
  if (typeof salary === 'string') {
    return salary.trim() || '';
  }
  
  // Handle object
  if (typeof salary === 'object' && salary !== null) {
    const salaryObj = salary as SalaryObject;
    const { min, max, currency = 'VND' } = salaryObj;
    
    // Validate min/max are numbers
    const validMin = typeof min === 'number' && !isNaN(min) ? min : undefined;
    const validMax = typeof max === 'number' && !isNaN(max) ? max : undefined;
    
    if (validMin && validMax) {
      return `${validMin.toLocaleString('vi-VN')} - ${validMax.toLocaleString('vi-VN')} ${currency}`;
    }
    
    if (validMin) {
      return `Từ ${validMin.toLocaleString('vi-VN')} ${currency}`;
    }
    
    if (validMax) {
      return `Lên đến ${validMax.toLocaleString('vi-VN')} ${currency}`;
    }
  }
  
  return '';
};

export const normalizeSalary = (salary: unknown): string => {
  return formatSalary(salary);
};

export const parseSalaryObject = (salary: unknown): SalaryObject | null => {
  if (!salary) return null;
  
  if (typeof salary === 'object' && salary !== null) {
    const obj = salary as SalaryObject;
    return {
      min: typeof obj.min === 'number' ? obj.min : undefined,
      max: typeof obj.max === 'number' ? obj.max : undefined,
      currency: typeof obj.currency === 'string' ? obj.currency : 'VND',
    };
  }
  
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

