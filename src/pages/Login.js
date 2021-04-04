import React, { useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import useUserLogin from '../customHook/useUserLogin';
import { UserContext } from '../components/MyContext';
import Input from '../components/Input';

import '../styles/Login.scss';

function Login() {
  const { setLoginUser } = useContext(UserContext);
  const userNameRef = useRef(null);
  const navigate = useNavigate(); //v5 -> useHistory()

  // custom hook
  const [{ username, password }, setUser] = useUserLogin();

  useEffect(() => {
    userNameRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      await setLoginUser({ username, password });
      await navigate('/');
    } catch (err) {
      throw new Error(err);
    }
  };

  return (
    <main className="login-wrapper">
      <div>Hello, put image here</div>
      <form onSubmit={handleSubmit}>
        <Input
          id="username"
          label="Username"
          type="text"
          name="username"
          value={username}
          required
          ref={userNameRef}
          onChange={setUser}
        />
        <Input
          id="password"
          label="Password"
          type="password"
          name="password"
          required
          value={password}
          onChange={setUser}
        />
        <a href="/forgot-password">Forgot Password?</a>
        <div>gmail</div>
        <div>facebook</div>
        <p>
          Do wou have an account? <a href="/register">Register now!</a>
        </p>

        <button>Login</button>
      </form>
    </main>
  );
}

export default Login;
