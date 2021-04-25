import * as API from '../utils/API';
import * as actions from '../redux/action';

const fetchFoods = () => {
  return async (dispatch /*, getState*/) => {
    try {
      const res = await API.getFoods('seafood');
      const { hits } = res;
      const foods = await hits.map((hit) => {
        const { recipe } = hit;
        return recipe;
      });
      await dispatch(actions.setFoods(foods));
      await dispatch(actions.setFoodsLoading(false));
    } catch (err) {
      await dispatch(actions.setFoodsLoading(false));
    }
  };
};

const thunks = {
  fetchFoods,
};

export default thunks;
