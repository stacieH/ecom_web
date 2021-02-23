import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Header.css';

function Header() {
  const location = useLocation();

  const isLogin = location.pathname.includes('login');

  return (
    <header>
      <h1>Food Catalog</h1>
      {!isLogin && (
        <nav className="navigation">
          <ul>
            <li className="cart-navigation">
              <Link to="login">Login</Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Header;
