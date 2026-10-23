import React from 'react';
import { StudentProvider, useStudent, type StudentProfile } from './StudentContext';

export const ProfileProvider = StudentProvider;
export const useProfile = useStudent;
export type { StudentProfile };
export default ProfileProvider;
