import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import CardItem from '../components/CardItem';

import '../styles/Card.css';
function Card(props) {
  const { foods, addItem, removeItem } = props;

  if (foods.length > 0) {
    const foodArray = foods.map((food, id) => ({ id, ...food }));
    const content = foodArray.map((food) => (
      <CardItem
        key={food.id}
        food={food}
        addItem={addItem}
        removeItem={removeItem}
      />
    ));

    return <Fragment>{content}</Fragment>;
  }

  return <Fragment></Fragment>;
}

Card.propTypes = {
  foods: PropTypes.array.isRequired,
};

Card.defaultProps = {
  foods: [],
};

export default Card;
