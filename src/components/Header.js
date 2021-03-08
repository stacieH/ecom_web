import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { UserContext } from './MyContext';

function Header() {
  const location = useLocation();

  const isLogin = location.pathname.includes('login');
  const { loginUser } = useContext(UserContext);

  return (
    <header>
      <h1>
        <Link to="/">Food</Link>
      </h1>
      {!isLogin && (
        <nav className="navigation">
          <ul>
            <li className="cart-navigation">
              <Link to="cart">Cart</Link>
            </li>
            <li>
              {loginUser ? (
                <span>Hi {loginUser.username}</span>
              ) : (
                <Link to="login">Login</Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Header;
