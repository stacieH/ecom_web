import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

function CardItem(props) {
  const { food } = props;
  const { image, label, source } = food;
  return (
    <Fragment>
      <div className="card">
        <img
          className="product-image"
          src={image}
          alt="Simple Seafood Platter"
        />
        <div className="product-details">
          <b className="label">{label}</b>
          <br />
          <span className="source">{source}</span>
        </div>
        <button>Add Cart</button>
      </div>
    </Fragment>
  );
}

CardItem.propTypes = {
  food: PropTypes.object.isRequired,
};

export default CardItem;
