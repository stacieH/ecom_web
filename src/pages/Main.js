import React, { Fragment, useEffect, useState } from 'react';

import Card from '../components/Card';
import LoadingCard from '../components/LoadingCard';

import * as API from '../utils/API';

function Main() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getFoodie() {
      try {
        const res = await API.getFoods('seafood');
        const { hits } = res;
        const foods = await hits.map((d) => {
          const { recipe } = d;
          if (recipe) {
            const { image, label, source } = recipe;
            return { image, label, source };
          }
          return d;
        });
        await setFoods(foods);
        await setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
    getFoodie();
  }, []);

  if (!loading && foods.length === 0) {
    throw new Error('error catching foods');
  }

  const emptyCard = Array(10)
    .fill(' ')
    .map((x, index) => <LoadingCard key={index} />);

  return (
    <Fragment>
      <div className="card-container">
        {loading ? emptyCard : <Card foods={foods} />}
      </div>
    </Fragment>
  );
}

export default Main;
