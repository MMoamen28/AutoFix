import React from 'react';
import AppRouter from './router/AppRouter';
import Layout from './components/layout/Layout';
import './index.css';

import { BrowserRouter } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <div className="app-root">
      <BrowserRouter>
        <Layout>
          <AppRouter />
        </Layout>
      </BrowserRouter>
    </div>
  );
};

export default App;
