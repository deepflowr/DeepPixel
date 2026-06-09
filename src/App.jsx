import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ControlPage from './pages/ControlPage';
import ViewerPage from './pages/ViewerPage';

function App() {
  return (
    <Routes>
      <Route path="/DeepPixel/viewer" element={<ViewerPage />} />
      <Route path="/DeepPixel/" element={<ControlPage />} />
      {/* Fallback — redirect to control page */}
      <Route path="*" element={<Navigate to="/DeepPixel/" replace />} />
    </Routes>
  );
}

export default App;
