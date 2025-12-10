/**
 * CV Preview Modal
 * 
 * Modal hiển thị preview CV dạng HTML với các tùy chọn:
 * - Xem trước trong WebView
 * - Mở trong trình duyệt (Chrome/Safari)
 * - Chia sẻ/Lưu file
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { CVData } from '@/types/cv.types';

interface CVPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  cvData: CVData | null;
  onOpenBrowser: () => void;
  onShare: () => void;
}

export default function CVPreviewModal({
  visible,
  onClose,
  cvData,
  onOpenBrowser,
  onShare,
}: CVPreviewModalProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && cvData) {
      generateHTML();
    }
  }, [visible, cvData]);

  const generateHTML = () => {
    if (!cvData) return;

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

    const html = `
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
      padding: 20px;
      background: white;
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

    setHtmlContent(html);
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xem trước CV</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* WebView Preview */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A80F0" />
            <Text style={styles.loadingText}>Đang tạo CV...</Text>
          </View>
        ) : (
          <WebView
            source={{ html: htmlContent }}
            style={styles.webview}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.browserButton]}
            onPress={onOpenBrowser}
          >
            <Ionicons name="globe-outline" size={22} color="white" />
            <Text style={styles.actionButtonText}>Xem trong trình duyệt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={onShare}
          >
            <Ionicons name="share-outline" size={22} color="white" />
            <Text style={styles.actionButtonText}>Chia sẻ / Lưu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  webview: {
    flex: 1,
    backgroundColor: 'white',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  browserButton: {
    backgroundColor: '#4A80F0',
  },
  shareButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});
