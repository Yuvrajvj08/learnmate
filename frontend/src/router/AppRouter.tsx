import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { StudyMaterialsScreen } from '@/screens/materials/StudyMaterialsScreen';
import { AiTutorScreen } from '@/screens/tutor/AiTutorScreen';
import { QuizzesScreen } from '@/screens/quizzes/QuizzesScreen';
import { KnowledgeRevisionScreen } from '@/screens/knowledge/KnowledgeRevisionScreen';
import { ProgressAnalyticsScreen } from '@/screens/progress/ProgressAnalyticsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { AuthScreen } from '@/screens/auth/AuthScreen';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Standalone Auth Screen */}
      <Route path="/auth" element={<AuthScreen />} />

      {/* Main Workspace Layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/materials" element={<StudyMaterialsScreen />} />
        <Route path="/tutor" element={<AiTutorScreen />} />
        <Route path="/quizzes" element={<QuizzesScreen />} />
        <Route path="/knowledge" element={<KnowledgeRevisionScreen />} />
        <Route path="/progress" element={<ProgressAnalyticsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
