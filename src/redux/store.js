import { createStore, applyMiddleware, compose } from 'redux';
import { persistStore } from 'redux-persist';

import { persistedReducer } from './persistor';

const logger = () => (next) => (action) => {
  let result = next(action);
  return result;
};

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const store = createStore(
  persistedReducer,
  composeEnhancers(applyMiddleware(logger)),
);

export const persistor = persistStore(store);
