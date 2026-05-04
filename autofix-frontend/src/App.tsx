import React from 'react';
import AppRouter from './router/AppRouter';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="app-root">
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </div>
  );
};

export default App;
