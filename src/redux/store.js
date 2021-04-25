import { createStore, applyMiddleware, compose } from 'redux';
import { persistStore } from 'redux-persist';
import thunkMiddleware from 'redux-thunk';

import { persistedReducer } from './persistor';

// const logger = () => (next) => (action) => {
//   let result = next(action);
//   return result;
// };

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(
  persistedReducer,
  composeEnhancers(applyMiddleware(thunkMiddleware)),
);

// store.subscribe(() => console.log(store.getState()));

const persistor = persistStore(store);

export { store, persistor };
