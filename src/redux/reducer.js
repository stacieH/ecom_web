import { combineReducers } from 'redux';
import {
  SET_FOODS,
  ADD_ITEM,
  REMOVE_ITEM,
  FILTER_ITEM,
  SET_FOODS_LOADING,
} from './action';

const foodState = {
  foods: [],
  isFoodLoading: true,
};

const cartState = {
  cart: [],
};

function foods(state = foodState, action) {
  switch (action.type) {
    case SET_FOODS:
      return { ...state, foods: action.foods };

    case SET_FOODS_LOADING:
      return { ...state, isFoodLoading: action.payload };

    default:
      return state;
  }
}

function cart(state = cartState, action) {
  switch (action.type) {
    case ADD_ITEM:
      return {
        ...state,
        cart: [action.payload, ...state.cart],
      };

    case REMOVE_ITEM:
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.id),
      };

    case FILTER_ITEM:
      return { ...state, cart: action.cart };

    default:
      return state;
  }
}

const reducers = combineReducers({
  main: foods,
  cart,
});

export default reducers;
