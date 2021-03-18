import { GET_FOODS, ADD_FOOD, REMOVE_FOOD, FILTER_CART } from './action';

const foodState = {
  foods: [],
  cart: [],
};

function foods(state = foodState, action) {
  switch (action.type) {
    case GET_FOODS:
      return { ...state, foods: action.foods };
    case ADD_FOOD:
      return {
        ...state,
        cart: [action.payload, ...state.cart],
      };
    case REMOVE_FOOD:
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.id),
      };
    case FILTER_CART:
      const state_cart = state.cart;
      const {
        filter: { direction, sort_by },
      } = action;
      let dir;
      direction.toLowerCase() === 'ascending' ? (dir = 1) : (dir = -1);
      const cart = state_cart.sort((a, b) => {
        if (a[sort_by].toLowerCase() < b[sort_by].toLowerCase()) {
          return -1 * dir;
        } else {
          return 1 * dir;
        }
      });
      return { ...state, cart };
    default:
      return state;
  }
}

const reducer = foods;

export default reducer;
