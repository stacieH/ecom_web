import React from 'react';
// import {Link} from 'react-router-dom'
import '../styles/Header.css';

function Header() {
  return (
    <header>
      <h1>Food Catalog</h1>
      <nav className="navigation">
        <ul>{/* <li className='cart-navigation'>Cart</li> */}</ul>
      </nav>
    </header>
  );
}

export default Header;
