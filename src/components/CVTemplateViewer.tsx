/**
 * CV Template Viewer
 * 
 * Component to display CV data in a modal when employer views a candidate's CV
 * This handles template CVs that haven't been exported to PDF
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CVData } from '@/types/cv.types';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  visible: boolean;
  onClose: () => void;
  cvData: CVData | null;
}

export default function CVTemplateViewer({ visible, onClose, cvData }: Props) {
  if (!cvData) return null;

  const renderSection = (title: string, icon: string, content: React.ReactNode) => {
    if (!content) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon as any} size={20} color="#4A80F0" />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionContent}>
          {content}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient colors={['#4A80F0', '#357AE8']} style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
            <Text style={styles.closeText}>Đóng</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Xem CV</Text>
          <View style={{ width: 64 }} />
        </LinearGradient>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Personal Info */}
          <View style={styles.personalInfoCard}>
            <View style={styles.avatarContainer}>
              {cvData.personalInfo.avatar ? (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {cvData.personalInfo.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              ) : (
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={40} color="#fff" />
                </View>
              )}
            </View>
            <Text style={styles.fullName}>{cvData.personalInfo.fullName || 'Chưa có tên'}</Text>
            
            <View style={styles.contactInfo}>
              {cvData.personalInfo.email && (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={16} color="#64748b" />
                  <Text style={styles.contactText}>{cvData.personalInfo.email}</Text>
                </View>
              )}
              {cvData.personalInfo.phone && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={16} color="#64748b" />
                  <Text style={styles.contactText}>{cvData.personalInfo.phone}</Text>
                </View>
              )}
              {cvData.personalInfo.address && (
                <View style={styles.contactRow}>
                  <Ionicons name="location-outline" size={16} color="#64748b" />
                  <Text style={styles.contactText}>{cvData.personalInfo.address}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Objective */}
          {cvData.objective && renderSection(
            'Mục tiêu nghề nghiệp',
            'flag-outline',
            <Text style={styles.objectiveText}>{cvData.objective}</Text>
          )}

          {/* Education */}
          {cvData.education && cvData.education.length > 0 && renderSection(
            'Học vấn',
            'school-outline',
            <View>
              {cvData.education.map((edu, index) => (
                <View key={edu.id || index} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{edu.degree}</Text>
                  <Text style={styles.listItemSubtitle}>{edu.school}</Text>
                  {edu.major && <Text style={styles.listItemDetail}>Ngành: {edu.major}</Text>}
                  <Text style={styles.listItemDetail}>
                    {edu.startDate} - {edu.endDate || 'Hiện tại'}
                  </Text>
                  {edu.gpa && <Text style={styles.listItemDetail}>GPA: {edu.gpa}/4.0</Text>}
                  {edu.achievements && edu.achievements.length > 0 && (
                    <View style={styles.achievementsList}>
                      {edu.achievements.map((achievement, idx) => (
                        <Text key={idx} style={styles.achievementItem}>• {achievement}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Skills */}
          {cvData.skills && cvData.skills.length > 0 && renderSection(
            'Kỹ năng',
            'sparkles-outline',
            <View>
              {cvData.skills.map((category, index) => (
                <View key={category.id || index} style={styles.skillCategory}>
                  <Text style={styles.skillCategoryName}>{category.categoryName}</Text>
                  <View style={styles.skillsGrid}>
                    {category.skills.map((skill, idx) => (
                      <View key={idx} style={styles.skillChip}>
                        <Text style={styles.skillName}>{skill.name}</Text>
                        {skill.levelText && (
                          <Text style={styles.skillLevel}>({skill.levelText})</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Experience */}
          {cvData.experience && cvData.experience.length > 0 && renderSection(
            'Kinh nghiệm làm việc',
            'briefcase-outline',
            <View>
              {cvData.experience.map((exp, index) => (
                <View key={exp.id || index} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{exp.position}</Text>
                  <Text style={styles.listItemSubtitle}>{exp.company}</Text>
                  {exp.location && <Text style={styles.listItemDetail}>📍 {exp.location}</Text>}
                  <Text style={styles.listItemDetail}>
                    {exp.startDate} - {exp.endDate || 'Hiện tại'}
                  </Text>
                  {exp.description && (
                    <Text style={styles.descriptionText}>{exp.description}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Projects */}
          {cvData.projects && cvData.projects.length > 0 && renderSection(
            'Dự án',
            'code-slash-outline',
            <View>
              {cvData.projects.map((project, index) => (
                <View key={project.id || index} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{project.name}</Text>
                  {project.role && <Text style={styles.listItemDetail}>Vai trò: {project.role}</Text>}
                  {(project.startDate || project.endDate) && (
                    <Text style={styles.listItemDetail}>
                      {project.startDate} - {project.endDate || 'Hiện tại'}
                    </Text>
                  )}
                  {project.description && (
                    <Text style={styles.descriptionText}>{project.description}</Text>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <View style={styles.techList}>
                      {project.technologies.map((tech, idx) => (
                        <Text key={idx} style={styles.techItem}>{tech}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Activities */}
          {cvData.activities && cvData.activities.length > 0 && renderSection(
            'Hoạt động',
            'people-outline',
            <View>
              {cvData.activities.map((activity, index) => (
                <View key={activity.id || index} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{activity.name}</Text>
                  {activity.organization && (
                    <Text style={styles.listItemSubtitle}>{activity.organization}</Text>
                  )}
                  {activity.role && <Text style={styles.listItemDetail}>Vai trò: {activity.role}</Text>}
                  {(activity.startDate || activity.endDate) && (
                    <Text style={styles.listItemDetail}>
                      {activity.startDate} - {activity.endDate || 'Hiện tại'}
                    </Text>
                  )}
                  {activity.description && (
                    <Text style={styles.descriptionText}>{activity.description}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Certifications */}
          {cvData.certifications && cvData.certifications.length > 0 && renderSection(
            'Chứng chỉ',
            'ribbon-outline',
            <View>
              {cvData.certifications.map((cert, index) => (
                <View key={cert.id || index} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{cert.name}</Text>
                  {cert.issuer && <Text style={styles.listItemSubtitle}>{cert.issuer}</Text>}
                  {cert.issueDate && <Text style={styles.listItemDetail}>Ngày cấp: {cert.issueDate}</Text>}
                  {cert.expiryDate && <Text style={styles.listItemDetail}>Hết hạn: {cert.expiryDate}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Languages */}
          {cvData.languages && cvData.languages.length > 0 && renderSection(
            'Ngoại ngữ',
            'language-outline',
            <View>
              {cvData.languages.map((lang, index) => (
                <View key={lang.id || index} style={styles.languageItem}>
                  <Text style={styles.languageName}>{lang.language}</Text>
                  <Text style={styles.languageLevel}>{lang.proficiencyText || lang.proficiency}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  personalInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A80F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  contactInfo: {
    width: '100%',
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionContent: {
    gap: 12,
  },
  objectiveText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  listItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#4A80F0',
    marginBottom: 4,
  },
  listItemDetail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginTop: 4,
  },
  achievementsList: {
    marginTop: 8,
    gap: 4,
  },
  achievementItem: {
    fontSize: 13,
    color: '#6b7280',
  },
  skillCategory: {
    marginBottom: 16,
  },
  skillCategoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  skillName: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
  },
  skillLevel: {
    fontSize: 12,
    color: '#60a5fa',
    marginLeft: 4,
  },
  techList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  techItem: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  languageName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  languageLevel: {
    fontSize: 13,
    color: '#4A80F0',
  },
});
