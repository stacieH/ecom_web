const api_url = 'https://api.edamam.com'
const app_id = "7b7a1a76"
const app_key = "f04c1976b0dcdf3c5f889aeea11f7e35"

export const getFoods = (query='') => {
    return fetch(`${api_url}/search?q=${query}&app_id=${app_id}&app_key=${app_key}`,{
        method: 'GET',
        // headers:{
        //     "Content-Type": 'application/json',
        //     "Accept": 'application/json',
        // },
        // credentials:'include'
    })
    .then(res=>res.json())
}