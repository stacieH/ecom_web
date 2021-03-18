import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { removeFood } from '../redux/action';

import Card from '../components/Card';
import LoadingCard from '../components/LoadingCard';

function Cart() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);

  useEffect(() => {
    setLoading(false);
  }, []);
  useEffect(() => {
    setFoods(cart);
  });

  const handleRemoveFood = (id) => {
    dispatch(removeFood(id));
  };

  const emptyCard = Array(10)
    .fill('')
    .map((_, index) => <LoadingCard key={index} />);

  return (
    <Fragment>
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
