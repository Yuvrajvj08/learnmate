import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { StudentProvider } from '@/context/StudentContext';
import { AppRouter } from '@/router/AppRouter';

export function App() {
  return (
    <ThemeProvider>
      <StudentProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </StudentProvider>
    </ThemeProvider>
  );
}

export default App;
