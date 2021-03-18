import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { removeFood, filterCartFoods } from '../redux/action';

import useFields from '../customHook/useFields';
import Card from '../components/Card';
import LoadingCard from '../components/LoadingCard';
import Input from '../components/Input';

function Cart() {
  const [foods, setFoods] = useState([]);
  const [fields, setFields] = useFields();
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { cart } = useSelector((state) => state);

  useEffect(() => {
    setFoods(cart);
    setLoading(false);
  }, [loading]);

  const handleRemoveFood = (id) => {
    setLoading(true);
    dispatch(removeFood(id));
  };

  const handleFilterCartFood = () => {
    setLoading(true);
    dispatch(filterCartFoods(fields));
  };

  const emptyCard = Array(10)
    .fill('')
    .map((_, index) => <LoadingCard key={index} />);

  return (
    <Fragment>
      <div>Filter:</div>
      <Input
        type="radio"
        name="direction"
        label="ascending"
        value="ascending"
        onChange={setFields}
      />
      <Input
        type="radio"
        name="direction"
        label="descending"
        value="descending"
        onChange={setFields}
      />
      <Input
        type="radio"
        name="sort_by"
        label="label"
        value="label"
        onChange={setFields}
      />
      <Input
        type="radio"
        name="sort_by"
        label="source"
        value="source"
        onChange={setFields}
      />
      <button onClick={handleFilterCartFood}>Filter</button>
      <div className="card-container">
        {loading ? (
          emptyCard
        ) : (
          <Card foods={foods} removeItem={handleRemoveFood} />
        )}
      </div>
    </Fragment>
  );
}

export default Cart;
