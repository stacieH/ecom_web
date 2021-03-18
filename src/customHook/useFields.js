import { useDebugValue, useState } from 'react';

function useUserLogin() {
  const [fields, setFields] = useState({});

  const handleChange = (e) => {
    const {
      target: { name, value },
    } = e;
    setFields({ ...fields, [name]: value });
  };

  useDebugValue(fields, (i) => `here's the values ${JSON.stringify(i)}`);

  console.log(fields);
  return [fields, handleChange];
}

export default useUserLogin;
