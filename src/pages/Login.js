import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import useUserLogin from '../customHook/useUserLogin';
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
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            value={username}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={password}
            onChange={handleChange}
          />
        </div>
        <a href="/password">Forgot Password?</a>
        <div>gmail</div>
        <div>facebook</div>
        <p>
          Do wou have an account? <a>Register now!</a>
        </p>

        <button>Login</button>
      </form>
    </div>
  );
}

export default Login;
