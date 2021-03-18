import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

function CardItem(props) {
  const { food, addItem, removeItem } = props;
  const { image, label, source, id } = food;
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
        <div className="product-action">
          {addItem && <button onClick={() => addItem(food)}>ADD</button>}
          {removeItem && <button onClick={() => removeItem(id)}>REMOVE</button>}
        </div>
      </div>
    </Fragment>
  );
}

CardItem.propTypes = {
  food: PropTypes.object.isRequired,
  addItem: PropTypes.func,
  removeItem: PropTypes.func,
};

export default CardItem;
