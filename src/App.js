import React, { Fragment, Suspense, useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

// React Redux: Hook
// import {Provider, createStoreHook} from 'react-redux'

import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import RouterLists from './RouterLists';

// React Hook: Context
import { UserContext } from './components/MyContext';
const Provider = UserContext.Provider;

// use css from scratch
import './styles/Card.css';
import './styles/Header.css';
import './styles/index.css';

function App() {
  const [loginUser, setLoginUser] = useState(null);

  const value = useMemo(() => ({ loginUser, setLoginUser }), [
    loginUser,
    setLoginUser,
  ]);

  return (
    <Fragment>
      <Provider value={value}>
        <BrowserRouter>
          <Header />
          <ErrorBoundary>
            <Suspense fallback={<div>loading</div>}>
              <RouterLists />
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </Provider>
    </Fragment>
  );
}

export default App;
