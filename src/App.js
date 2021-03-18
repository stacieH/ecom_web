import React, { Fragment, Suspense, useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

// React Hook: Context
import { UserContext } from './components/MyContext';

// React Redux: Hook
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './redux/store';

// components
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import Loading from './components/Loading';

import RouterLists from './RouterLists';
import './styles/index.css';

function App() {
  const [loginUser, setLoginUser] = useState(null);

  const value = useMemo(() => ({ loginUser, setLoginUser }), [
    loginUser,
    setLoginUser,
  ]);

  return (
    <Fragment>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <BrowserRouter>
            <Header />
            <ErrorBoundary>
              <Suspense fallback={<Loading />}>
                <RouterLists />
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </PersistGate>
      </Provider>
    </Fragment>
  );
}

export default App;
