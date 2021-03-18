import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import CardItem from '../components/CardItem';

import '../styles/Card.css';
function Card(props) {
  const { foods } = props;

  if (foods.length > 0) {
    const content = foods.map((food, index) => (
      <CardItem key={index} food={food} />
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
