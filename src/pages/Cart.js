import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { removeItem, filterItem } from '../redux/action';

import useFields from '../customHook/useFields';
import Card from '../components/Card';
import LoadingCard from '../components/LoadingCard';
import Input from '../components/Input';

function Cart() {
  const [fields, setFields] = useFields();
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const { cart } = useSelector((state) => state.cart);

  useEffect(() => {
    setLoading(false);
  }, [loading]);

  const handleRemoveItem = (id) => {
    setLoading(true);
    dispatch(removeItem(id));
  };

  const handleFilterItem = () => {
    setLoading(true);

    dispatch(filterItem(cart, fields));
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
      <button onClick={handleFilterItem}>Filter</button>
      <div className="card-container">
        {loading ? (
          emptyCard
        ) : (
          <Card foods={cart} removeItem={handleRemoveItem} />
        )}
      </div>
    </Fragment>
  );
}

export default Cart;
