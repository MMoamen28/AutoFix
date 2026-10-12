import React from 'react';
import AppRouter from './router/AppRouter';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="app-root">
      <AppRouter />
    </div>
  );
};

export default App;
