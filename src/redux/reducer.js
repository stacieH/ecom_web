import { GET_FOODS, ADD_FOOD, REMOVE_FOOD } from './action';

const foodState = {
  foods: [],
  cart: [],
};

function foods(state = foodState, action) {
  switch (action.type) {
    case GET_FOODS:
      return { ...state, foods: action.foods };
    case ADD_FOOD:
      return { ...state, cart: [action.payload, ...state.cart] };
    case REMOVE_FOOD:
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.id),
      };
    default:
      return state;
  }
}

const reducer = foods;

export default reducer;
