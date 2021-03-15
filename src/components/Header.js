import React from 'react';
import { NavLink } from 'react-router-dom';

import '../styles/Header.css';

function Header() {
  return (
    <header>
      <h1>
        <NavLink to="/" activeClassName="brandname">
          Food
        </NavLink>
      </h1>
    </header>
  );
}

export default Header;
