import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { StudentProfile } from '@/types';
import { profilesApi } from '@/api/profiles';

interface ProfileContextType {
  activeProfile: StudentProfile | null;
  profiles: StudentProfile[];
  loading: boolean;
  error: string | null;
  setActiveProfile: (profile: StudentProfile) => void;
  createProfile: (name: string, language?: string) => Promise<StudentProfile>;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY = 'learnmate_active_profile_id';

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await profilesApi.list();
      setProfiles(list);

      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = list.find((p) => p.id === savedId);
        if (found) {
          setActiveProfileState(found);
          setLoading(false);
          return;
        }
      }

      if (list.length > 0) {
        setActiveProfileState(list[0]);
        localStorage.setItem(STORAGE_KEY, list[0].id);
      } else {
        // Auto-seed initial default student profile
        try {
          const defaultStudent = await profilesApi.create({
            display_name: 'Alex Rivera',
            preferred_language: 'English',
          });
          setProfiles([defaultStudent]);
          setActiveProfileState(defaultStudent);
          localStorage.setItem(STORAGE_KEY, defaultStudent.id);
        } catch (e: any) {
          console.error('Failed to auto-seed default profile:', e);
        }
      }
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      setError(err.message || 'Could not connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  const setActiveProfile = (profile: StudentProfile) => {
    setActiveProfileState(profile);
    localStorage.setItem(STORAGE_KEY, profile.id);
  };

  const createProfile = async (name: string, language: string = 'English') => {
    const created = await profilesApi.create({
      display_name: name,
      preferred_language: language,
    });
    setProfiles((prev) => [created, ...prev]);
    setActiveProfile(created);
    return created;
  };

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        profiles,
        loading,
        error,
        setActiveProfile,
        createProfile,
        refreshProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
