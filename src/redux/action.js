export const GET_FOODS = 'GET_FOODS';
export const ADD_FOOD = 'ADD_FOOD';
export const REMOVE_FOOD = 'REMOVE_FOOD';
export const FILTER_CART = 'FILTER_CART';

import { sorting } from '../utils/helper';

export const fetchFoods = (foods) => {
  return { type: GET_FOODS, foods };
};

export const addFood = (payload) => {
  return { type: ADD_FOOD, payload };
};

export const removeFood = (id) => {
  return { type: REMOVE_FOOD, id };
};

export const filterCartFoods = (foods, actions) => {
  const payload = sorting(foods, actions);
  return { type: FILTER_CART, cart: payload };
};
