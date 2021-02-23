import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const MainComponent = lazy(() => import('./pages/Main'));
const LoginComponent = lazy(() => import('./pages/Login'));
const NotFoundComponent = lazy(() => import('./components/NotFound'));

function RouterLists() {
  return (
    <Routes>
      <Route path="/" element={<MainComponent />} />
      <Route path="login" element={<LoginComponent />} />
      <Route path="*" element={<NotFoundComponent />} />
    </Routes>
  );
}

export default RouterLists;
