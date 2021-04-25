import React, { Fragment, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { addItem } from '../redux/action';
import thunks from '../redux/thunks';

import Card from '../components/Card';
import { ChatPortal } from '../components/ChatPortal';
import LoadingCard from '../components/LoadingCard';

function Main() {
  const dispatch = useDispatch();
  const state = useSelector((state) => state.main);
  const { foods, isFoodLoading } = state;

  useEffect(() => {
    dispatch(thunks.fetchFoods());
  }, []);

  const handleAddItem = (food) => {
    dispatch(addItem({ ...food, added_date: new Date() }));
  };

  if (!isFoodLoading && foods.length === 0) {
    throw new Error('error catching foods');
  }
  const emptyCard = Array(10)
    .fill('')
    .map((_, index) => <LoadingCard key={index} />);

  return (
    <Fragment>
      <div className="card-container">
        {isFoodLoading ? (
          emptyCard
        ) : (
          <Card foods={foods} addItem={handleAddItem} />
        )}
      </div>
      <ChatPortal />
    </Fragment>
  );
}

export default Main;
