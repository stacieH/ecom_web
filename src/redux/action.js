export const SET_FOODS = 'SET_FOODS';
export const ADD_ITEM = 'ADD_ITEM';
export const REMOVE_ITEM = 'REMOVE_ITEM';
export const FILTER_ITEM = 'FILTER_ITEM';
export const SET_FOODS_LOADING = 'SET_FOODS_LOADING';

import { sorting } from '../utils/helper';

export const setFoods = (foods) => {
  return { type: SET_FOODS, foods };
};

export const addItem = (payload) => {
  return { type: ADD_ITEM, payload };
};

export const removeItem = (id) => {
  return { type: REMOVE_ITEM, id };
};

export const filterItem = (foods, actions) => {
  const payload = sorting(foods, actions);
  return { type: FILTER_ITEM, cart: payload };
};

export const setFoodsLoading = (payload) => {
  return { type: SET_FOODS_LOADING, payload };
};
