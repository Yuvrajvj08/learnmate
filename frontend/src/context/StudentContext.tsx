import React, { createContext, useContext, useState } from 'react';

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
}

interface StudentContextType {
  student: StudentProfile;
  setStudent: (student: StudentProfile) => void;
}

const DEFAULT_STUDENT: StudentProfile = {
  id: 'demo-student-001',
  name: 'Alex Johnson',
  email: 'demo@learnmate.local',
  avatarInitials: 'AJ',
};

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<StudentProfile>(DEFAULT_STUDENT);

  return (
    <StudentContext.Provider value={{ student, setStudent }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
