import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import useUserLogin from './useUserLogin';
import { UserContext } from '../components/MyContext';

function Login() {
  const { setLoginUser } = useContext(UserContext);
  const navigate = useNavigate(); //v5 -> useHistory()

  // custom hook
  const [{ username, password }, setUser] = useUserLogin();

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      await setLoginUser({ username, password });
      await navigate('/');
    } catch (err) {
      throw new Error(err);
    }
  };

  const handleChange = (e) => {
    const {
      target: { name, value },
    } = e;
    setUser({ [name]: value });
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input
          type="text"
          name="username"
          value={username}
          onChange={handleChange}
        />

        <label>Password</label>
        <input
          type="password"
          name="password"
          value={password}
          onChange={handleChange}
        />

        <button>Login</button>
      </form>
    </div>
  );
}

export default Login;
