import { useDebugValue, useState } from 'react';

function useUserLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const setUser = (props) => {
    const name = Object.keys(props);
    name && name[0] === 'username'
      ? setUsername(props[name])
      : setPassword(props[name]);
  };

  useDebugValue({ username }, (i) => `here's the values ${JSON.stringify(i)}`);

  return [{ username, password }, setUser];
}

export default useUserLogin;
