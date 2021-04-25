import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { addItem } from '../redux/action';

import Card from '../components/Card';
import { ChatPortal } from '../components/ChatPortal';
import LoadingCard from '../components/LoadingCard';

import * as API from '../utils/API';

function Main() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    async function getFoodie() {
      try {
        const res = await API.getFoods('seafood');
        const { hits } = res;
        const foods = await hits.map((hit) => {
          const { recipe } = hit;
          return recipe;
        });
        await dispatch(fetchFoods(foods));
        await setFoods(foods);
        await setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
    getFoodie();
  }, []);

  const handleAddItem = (food) => {
    dispatch(addItem({ ...food, added_date: new Date() }));
  };

  if (!loading && foods.length === 0) {
    throw new Error('error catching foods');
  }
  const emptyCard = Array(10)
    .fill('')
    .map((_, index) => <LoadingCard key={index} />);

  return (
    <Fragment>
      <div className="card-container">
        {loading ? emptyCard : <Card foods={foods} addItem={handleAddFood} />}
      </div>
      <ChatPortal />
    </Fragment>
  );
}

export default Main;
