import React from 'react';
import { NavLink } from 'react-router-dom';

function Header() {
  return (
    <header>
      <h1>
        <NavLink to="/">Food</NavLink>
      </h1>
    </header>
  );
}

export default Header;
