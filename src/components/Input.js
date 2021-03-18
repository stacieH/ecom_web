import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';

function Input(props, ref) {
  const { id, name, value, type, onChange, label, required } = props;
  return (
    <div>
      <label htmlFor={id}>
        {label} {required && <span className="req-mark">*</span>}
      </label>
      <input
        id={id}
        type={type}
        ref={ref}
        name={name}
        value={value}
        required={required}
        onChange={onChange}
      />
    </div>
  );
}

Input.propTypes = {
  id: PropTypes.any.isRequired,
  name: PropTypes.any,
  value: PropTypes.string,
  type: PropTypes.any,
  onChange: PropTypes.func,
  label: PropTypes.string,
  required: PropTypes.boolean,
};

const InputForwardRef = forwardRef(Input);

export default InputForwardRef;
