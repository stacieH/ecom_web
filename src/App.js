import React, { Fragment, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import RouterLists from './RouterLists';

function App() {
  return (
    <Fragment>
      <BrowserRouter>
        <Header />
        <ErrorBoundary>
          <Suspense fallback={<div>loading</div>}>
            <RouterLists />
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </Fragment>
  );
}

export default App;
