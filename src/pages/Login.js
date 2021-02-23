import React from 'react';
import { useNavigate } from 'react-router-dom';
import useUserLogin from './useUserLogin';

function Login() {
  const [user, setUser] = useUserLogin();
  const { username, password } = user;
  const navigate = useNavigate(); //v6 -> useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/');
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
