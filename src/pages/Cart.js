import React, { Fragment, useState } from 'react';

import Card from '../components/Card';
import LoadingCard from '../components/LoadingCard';

function Cart() {
  const [foods] = useState([]);

  const emptyCard = Array(10)
    .fill(' ')
    .map((x, index) => <LoadingCard key={index} />);

  return (
    <Fragment>
      <div className="card-container">
        {foods ? emptyCard : <Card foods={foods} />}
      </div>
    </Fragment>
  );
}

export default Cart;
