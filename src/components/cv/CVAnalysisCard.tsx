/**
 * CV Analysis Card - AI-powered CV evaluation
 * Shows CV score, strengths, and improvement suggestions
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aiApiService, CVAnalysis } from '@/services/aiApi.service';
import * as Haptics from 'expo-haptics';

interface CVAnalysisCardProps {
  cvData: {
    personalInfo?: any;
    objective?: string;
    education?: any[];
    skills?: any[];
    experience?: any[];
    projects?: any[];
  };
}

export const CVAnalysisCard: React.FC<CVAnalysisCardProps> = ({ cvData }) => {
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const analyzeCV = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Transform CV data for AI analysis - GỬI ĐẦY ĐỦ THÔNG TIN
      const educationDetails = cvData.education?.map(e => {
        let details = `${e.degree || 'Đang học'} tại ${e.school || 'N/A'}`;
        if (e.major) details += `, chuyên ngành ${e.major}`;
        if (e.gpa) details += `, GPA: ${e.gpa}`;
        if (e.achievements && e.achievements.length > 0) {
          details += `. Thành tích: ${e.achievements.join(', ')}`;
        }
        if (e.startDate) details += ` (${e.startDate}${e.endDate ? ' - ' + e.endDate : ' - Hiện tại'})`;
        return details;
      }).join('; ') || '';

      const experienceDetails = cvData.experience?.map(e => {
        let details = `${e.title || 'Vị trí'} tại ${e.company || 'Công ty'}`;
        if (e.description) details += `: ${e.description}`;
        if (e.startDate) details += ` (${e.startDate}${e.endDate ? ' - ' + e.endDate : ' - Hiện tại'})`;
        return details;
      }).join('; ') || '';

      const projectDetails = cvData.projects?.map(p => {
        let details = p.name || 'Dự án';
        if (p.description) details += `: ${p.description}`;
        if (p.technologies && p.technologies.length > 0) {
          details += `. Công nghệ: ${p.technologies.join(', ')}`;
        }
        if (p.link) details += ` (Link: ${p.link})`;
        return details;
      }).join('; ') || '';

      // Collect all skills with their items
      const allSkills = cvData.skills?.flatMap(s => s.items || []) || [];

      const cvForAnalysis = {
        education: educationDetails,
        experience: experienceDetails,
        skills: allSkills,
        projects: projectDetails,
        summary: cvData.objective || '',
        // Thêm thông tin cá nhân để AI đánh giá tổng thể
        hasPersonalInfo: !!(cvData.personalInfo?.fullName && cvData.personalInfo?.email && cvData.personalInfo?.phone),
      };

      console.log('📊 CV Analysis data sent:', JSON.stringify(cvForAnalysis, null, 2));

      const result = await aiApiService.analyzeCV(cvForAnalysis);
      setAnalysis(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error analyzing CV:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Xuất sắc';
    if (score >= 60) return 'Khá tốt';
    return 'Cần cải thiện';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={24} color="#7c3aed" />
          <Text style={styles.title}>Phân Tích CV bởi AI</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#64748b"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {!analysis ? (
            <View style={styles.analyzePrompt}>
              <Text style={styles.promptText}>
                Sử dụng AI để phân tích điểm mạnh và đưa ra gợi ý cải thiện CV của bạn
              </Text>
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={analyzeCV}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="analytics" size={18} color="#fff" />
                    <Text style={styles.analyzeButtonText}>Phân Tích Ngay</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.results}>
              {/* Score */}
              <View style={styles.scoreSection}>
                <View style={styles.scoreCircle}>
                  <Text style={[styles.scoreNumber, { color: getScoreColor(analysis.score) }]}>
                    {analysis.score}
                  </Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={[styles.scoreLabel, { color: getScoreColor(analysis.score) }]}>
                    {getScoreLabel(analysis.score)}
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${analysis.score}%`,
                          backgroundColor: getScoreColor(analysis.score),
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Strengths */}
              {analysis.strengths.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.sectionTitle}>Điểm Mạnh</Text>
                  </View>
                  {analysis.strengths.map((strength, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listText}>{strength}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Improvements */}
              {analysis.improvements.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="alert-circle" size={20} color="#f59e0b" />
                    <Text style={styles.sectionTitle}>Cần Cải Thiện</Text>
                  </View>
                  {analysis.improvements.map((improvement, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listText}>{improvement}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Suggestions */}
              {analysis.suggestions.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="bulb" size={20} color="#7c3aed" />
                    <Text style={styles.sectionTitle}>Gợi Ý</Text>
                  </View>
                  {analysis.suggestions.map((suggestion, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listText}>{suggestion}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Re-analyze button */}
              <TouchableOpacity
                style={styles.reAnalyzeButton}
                onPress={analyzeCV}
                disabled={loading}
              >
                <Ionicons name="refresh" size={16} color="#7c3aed" />
                <Text style={styles.reAnalyzeText}>Phân Tích Lại</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    marginTop: 16,
  },
  analyzePrompt: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  promptText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  results: {
    gap: 16,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 8,
  },
  bullet: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  reAnalyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7c3aed',
    marginTop: 8,
  },
  reAnalyzeText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '600',
  },
});
