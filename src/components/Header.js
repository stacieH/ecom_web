import React from 'react';
import { NavLink } from 'react-router-dom';

import '../styles/Header.scss';

function Header() {
  return (
    <header>
      <h1>
        <NavLink to="/" activeClassName="brandname">
          Food
        </NavLink>
      </h1>
      <nav>
        {/* <NavLink to="/login">Login</NavLink> */}
        <NavLink to="/cart">Cart</NavLink>
      </nav>
    </header>
  );
}

export default Header;
