import React, { Fragment, Suspense, lazy } from 'react';

import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';

const MainComponent = lazy(() => import('./pages/Main'));

function App() {
  return (
    <Fragment>
      <Header />
      <ErrorBoundary>
        <Suspense fallback={<div>loading</div>}>
          <MainComponent />
        </Suspense>
      </ErrorBoundary>
    </Fragment>
  );
}

export default App;
