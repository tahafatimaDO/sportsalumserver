import axios from "axios";

//const API_URL = "http://localhost:8080/api/auth/";
const API_URL = "/api/auth/";

const users = () => {
  return axios.get(API_URL + "users")
    .then((response) => {
      console.log("auth.service:users:response: ", response);
      return response.data;
    });
};

const register = (firstname, lastname, username, email, password, amateur_id, pro_id, claimed) => {
  return axios.post(API_URL + "signup", {
    firstname,
    lastname,
    username,
    email,
    password,
    amateur_id,
    pro_id,
    claimed
  });
};

const saveuser = (username, email, firstname, lastname) => {
  return axios.post(API_URL + "saveuser", {
    username, 
    email, 
    firstname, 
    lastname
  })
  .then((response) => {
    if (response.data.accessToken) {
      console.log("localStorage.setItem(user:response.data: ", response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
    }

    return response.data;
  });
};

const refreshuser = (username) => {
  return axios.post(API_URL + "refreshuser", {
    username
  })
  .then((response) => {
    //console.log("auth.service:refreshuser:response: ", response);
    localStorage.setItem("user", JSON.stringify(response.data));
    /*if (response.data.accessToken) {
      console.log("localStorage.setItem(user:response.data: ", response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
    }*/

    return response.data;
  });
};

const login = (username, password) => {
  console.log("login");
  return axios
    .post(API_URL + "signin", {
      username,
      password,
    })
    .then((response) => {
      if (response.data.accessToken) {
        console.log("localStorage.setItem(user:response.data: ", response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
      }

      return response.data;
    });
};

const logout = () => {
  localStorage.removeItem("user");
};

const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem("user"));
};

export default {
  users,
  register,
  saveuser,
  refreshuser,
  login,
  logout,
  getCurrentUser
};
