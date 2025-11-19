/**
 * INTEGRATION EXAMPLE - Documentation Only
 * 
 * This file shows how to use CV components.
 * Not meant to be imported - for reference only.
 * 
 * ============================================
 * 1. ADDRESS INPUT WITH SMART SEARCH
 * ============================================
 * 
 * Features:
 * - Search without diacritics (type "ha noi" finds "Hà Nội")
 * - 63 provinces + common student addresses
 * - Scrollable suggestions
 * 
 * Usage:
 * import { AddressInput } from '@/components/cv/AddressInput';
 * 
 * <AddressInput
 *   value={address}
 *   onChangeText={setAddress}
 *   placeholder="Nhập địa chỉ..."
 * />
 * 
 * ============================================
 * 2. EDUCATION SECTION
 * ============================================
 * 
 * Features:
 * - School autocomplete (150+ VN universities)
 * - Degree picker with common options
 * - Major picker with categories
 * 
 * Usage:
 * import { EducationSection } from '@/components/cv/EducationSection';
 * 
 * <EducationSection
 *   education={cvData.education}
 *   onAdd={addEducation}
 *   onUpdate={updateEducation}
 *   onRemove={removeEducation}
 * />
 */

export {};
