import { useDebugValue, useState } from 'react';

function useUserLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const setUser = (e) => {
    const {
      target: { name, value },
    } = e;
    name === 'username' ? setUsername(value) : setPassword(value);
  };

  useDebugValue({ username }, (i) => `here's the values ${JSON.stringify(i)}`);

  return [{ username, password }, setUser];
}

export default useUserLogin;
