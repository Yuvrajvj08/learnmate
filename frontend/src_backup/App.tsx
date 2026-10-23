import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { AppRouter } from '@/app/router';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ProfileProvider>
          <AppRouter />
        </ProfileProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
