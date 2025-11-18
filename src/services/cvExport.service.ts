/**
 * CV Export Service
 * 
 * Export CV to PDF using HTML template
 */

import { Paths, File } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { CVData } from '@/types/cv.types';
import { Alert } from 'react-native';

class CVExportService {
  /**
   * Generate HTML from CV Data
   */
  private generateHTML(cvData: CVData): string {
    const { personalInfo, objective, education, skills, experience } = cvData;

    const educationHTML = education.map(edu => `
      <div class="entry">
        <h4>${edu.school}</h4>
        <p><strong>${edu.degree}${edu.major ? ` - ${edu.major}` : ''}</strong></p>
        <p class="date">${edu.startDate} - ${edu.endDate || 'Hiện tại'}</p>
        ${edu.gpa ? `<p>GPA: ${edu.gpa}</p>` : ''}
      </div>
    `).join('');

    const skillsHTML = skills.map(category => `
      <div class="skill-category">
        <h4>${category.categoryName}</h4>
        <ul>
          ${category.skills.map(skill => `
            <li>${skill.name}${skill.levelText ? ` (${skill.levelText})` : ''}</li>
          `).join('')}
        </ul>
      </div>
    `).join('');

    const experienceHTML = experience.map(exp => `
      <div class="entry">
        <h4>${exp.position}</h4>
        <p><strong>${exp.company}</strong>${exp.location ? ` - ${exp.location}` : ''}</p>
        <p class="date">${exp.startDate} - ${exp.endDate || 'Hiện tại'}</p>
        ${exp.description ? `<p>${exp.description}</p>` : ''}
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${personalInfo.fullName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      padding: 40px 60px;
    }
    
    h1 {
      font-size: 24pt;
      color: #2563eb;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .contact-info {
      margin-bottom: 20px;
      color: #666;
    }
    
    .contact-info p {
      margin: 2px 0;
    }
    
    h2 {
      font-size: 14pt;
      color: #2563eb;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 5px;
      margin-top: 20px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    h3 {
      font-size: 12pt;
      margin-top: 15px;
      margin-bottom: 8px;
    }
    
    h4 {
      font-size: 11pt;
      color: #333;
      margin-bottom: 3px;
    }
    
    p {
      margin: 5px 0;
    }
    
    .date {
      color: #666;
      font-style: italic;
      font-size: 10pt;
    }
    
    .entry {
      margin-bottom: 15px;
    }
    
    .skill-category {
      margin-bottom: 10px;
    }
    
    ul {
      margin-left: 20px;
    }
    
    li {
      margin: 3px 0;
    }
    
    .objective {
      text-align: justify;
      margin-bottom: 15px;
    }
    
    @media print {
      body {
        padding: 20px 30px;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <h1>${personalInfo.fullName}</h1>
  <div class="contact-info">
    <p>📧 ${personalInfo.email}</p>
    <p>📱 ${personalInfo.phone}</p>
    ${personalInfo.address ? `<p>📍 ${personalInfo.address}</p>` : ''}
  </div>

  ${objective ? `
  <!-- Objective -->
  <h2>Mục tiêu nghề nghiệp</h2>
  <p class="objective">${objective}</p>
  ` : ''}

  <!-- Education -->
  ${education.length > 0 ? `
  <h2>Học vấn</h2>
  ${educationHTML}
  ` : ''}

  <!-- Skills -->
  ${skills.length > 0 ? `
  <h2>Kỹ năng</h2>
  ${skillsHTML}
  ` : ''}

  <!-- Experience -->
  ${experience.length > 0 ? `
  <h2>Kinh nghiệm làm việc</h2>
  ${experienceHTML}
  ` : ''}

  <div style="margin-top: 40px; text-align: center; color: #999; font-size: 9pt;">
    CV được tạo từ Job_4S - ${new Date().toLocaleDateString('vi-VN')}
  </div>
</body>
</html>
    `;
  }

  /**
   * Open CV in external browser (Chrome/Safari)
   */
  async openInBrowser(cvData: CVData): Promise<void> {
    try {
      const html = this.generateHTML(cvData);
      const fileName = `CV_${cvData.personalInfo.fullName.replace(/\s/g, '_')}_${Date.now()}.html`;
      
      // Create file in document directory
      const file = new File(Paths.document, fileName);
      
      // Write HTML content using writable stream
      const writer = file.writableStream().getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(html));
      await writer.close();

      // Open in external browser
      await WebBrowser.openBrowserAsync(file.uri, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: '#4A80F0',
        toolbarColor: '#ffffff',
      });
    } catch (error) {
      console.error('Open browser error:', error);
      Alert.alert('Lỗi', 'Không thể mở trình duyệt. Vui lòng thử lại.');
    }
  }

  /**
   * Share CV file (for saving or sending via email)
   */
  async shareCV(cvData: CVData): Promise<void> {
    try {
      const html = this.generateHTML(cvData);
      const fileName = `CV_${cvData.personalInfo.fullName.replace(/\s/g, '_')}_${Date.now()}.html`;
      
      // Create file in document directory
      const file = new File(Paths.document, fileName);
      
      // Write HTML content using writable stream
      const writer = file.writableStream().getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(html));
      await writer.close();

      // Share file
      await shareAsync(file.uri, {
        mimeType: 'text/html',
        dialogTitle: 'Lưu hoặc Chia sẻ CV',
        UTI: 'public.html',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ CV. Vui lòng thử lại.');
    }
  }

  /**
   * Export CV to PDF (legacy method - kept for backward compatibility)
   */
  async exportToPDF(cvData: CVData): Promise<void> {
    try {
      const html = this.generateHTML(cvData);
      const fileName = `CV_${cvData.personalInfo.fullName.replace(/\s/g, '_')}_${Date.now()}.html`;
      
      // Create file in document directory
      const file = new File(Paths.document, fileName);
      
      // Write HTML content using writable stream
      const writer = file.writableStream().getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(html));
      await writer.close();

      // Share file
      await shareAsync(file.uri, {
        mimeType: 'text/html',
        dialogTitle: 'Lưu hoặc Chia sẻ CV',
        UTI: 'public.html',
      });

      // expo-sharing doesn't return result on success, only throws on error
      // If we get here, sharing dialog was shown (user may or may not have shared)
      // Show instruction instead of success message
      Alert.alert(
        'Xuất CV',
        'File HTML đã được tạo.\n\n' +
        '📱 Cách chuyển sang PDF:\n' +
        '1. Lưu file HTML vào Files\n' +
        '2. Mở bằng Chrome/Safari\n' +
        '3. Chọn Print → Save as PDF\n\n' +
        '💡 Hoặc gửi email ngay để xử lý trên máy tính.'
      );
      // If dismissed, do nothing (no error, no success alert)
    } catch (error) {
      console.error('Export PDF error:', error);
      Alert.alert('Lỗi', 'Không thể xuất CV. Vui lòng thử lại.');
    }
  }

  /**
   * Preview CV HTML
   */
  async previewCV(cvData: CVData): Promise<string> {
    return this.generateHTML(cvData);
  }
}

export const cvExportService = new CVExportService();
