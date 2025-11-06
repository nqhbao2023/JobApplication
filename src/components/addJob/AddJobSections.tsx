import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Modal,
} from 'react-native';
import { AI_TEMPLATES, type ExpandedSections } from '@/constants/addJob.constants';

export const SectionCard = memo(({
  title,
  section,
  children,
  isComplete,
  expandedSections,
  toggleSection,
}: {
  title: string;
  section: keyof ExpandedSections;
  children: React.ReactNode;
  isComplete?: boolean;
  expandedSections: ExpandedSections;
  toggleSection: (section: keyof ExpandedSections) => void;
}) => {
  const fadeAnim = useMemo(() => new Animated.Value(1), []);

  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(section)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          {isComplete && <Text style={styles.checkmark}>✓</Text>}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Text style={styles.chevron}>{expandedSections[section] ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {expandedSections[section] && (
        <Animated.View style={[styles.sectionContent, { opacity: fadeAnim }]}>
          {children}
        </Animated.View>
      )}
    </View>
  );
});

SectionCard.displayName = 'SectionCard';

export const AITemplateModal = memo(({
  visible,
  onClose,
  onSelectTemplate,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (key: keyof typeof AI_TEMPLATES) => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>✨ Tạo công việc bằng AI</Text>
        <Text style={styles.modalSubtitle}>Chọn mẫu phù hợp để bắt đầu nhanh</Text>

        {Object.entries(AI_TEMPLATES).map(([key, template]) => (
          <TouchableOpacity
            key={key}
            style={styles.templateBtn}
            onPress={() => onSelectTemplate(key as keyof typeof AI_TEMPLATES)}
          >
            <Text style={styles.templateTitle}>{template.title}</Text>
            <Text style={styles.templateDesc} numberOfLines={2}>
              {template.jobDescription}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
          <Text style={styles.modalCloseBtnText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
));

AITemplateModal.displayName = 'AITemplateModal';

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 18,
    color: '#10b981',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  chevron: { fontSize: 14, color: '#999' },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  templateBtn: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalCloseBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseBtnText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '600',
  },
});