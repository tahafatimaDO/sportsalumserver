import React, { useEffect } from "react";
//import useStateWithCallback from 'use-state-with-callback';
import AuthService from "../services/auth.service";

const Profile = (props) => {
  const currentUser = AuthService.getCurrentUser();
  console.log("Profile");

  useEffect(() => {
    console.log("Profile");
    const user = AuthService.getCurrentUser();

    if (!user) {
      props.history.push("/login");
      window.location.reload();
    }

  }, []);
  
  return (
    <>
      {currentUser && (
      <div className="container">
        <header className="jumbotron">
          <h3>
            <strong>{currentUser.username}</strong> Profile
          </h3>
        </header>
        <p>
          <strong>Token:</strong> {currentUser.accessToken.substring(0, 20)} ...{" "}
          {currentUser.accessToken.substr(currentUser.accessToken.length - 20)}
        </p>
        <p>
          <strong>Id:</strong> {currentUser.id}
        </p>
        <p>
          <strong>Email:</strong> {currentUser.email}
        </p>
        <strong>Authorities:</strong>
        <ul>
          {currentUser.roles &&
            currentUser.roles.map((role, index) => <li key={index}>{role}</li>)}
        </ul>
      </div>)}
    </>
  );
};

export default Profile;
