import React, { useState, useEffect } from "react";
import useStateWithCallback from 'use-state-with-callback';
import UserService from "../services/user.service";
import AuthService from "../services/auth.service";
import EventBus from "../common/EventBus";

const BoardAdmin = () => {
  const [content, setContent] = useState("");
  const [users, setUsers] = useStateWithCallback([], users => {
    console.log("setUsers: ", users);
  });
  const [showAdminBoard, setShowAdminBoard] = useState(false);

  useEffect(() => {
    const user = AuthService.getCurrentUser();

    if (user) {
      setShowAdminBoard(user.roles.includes("ROLE_ADMIN"));
    }

    UserService.getAdminBoard().then(
      (response) => {
        setContent(response.data);
      },
      (error) => {
        const _content =
          (error.response &&
            error.response.data &&
            error.response.data.message) ||
          error.message ||
          error.toString();

        setContent(_content);

        if (error.response && error.response.status === 401) {
          EventBus.dispatch("logout");
        }
      }
    );
    AuthService.users().then(
      (response) => {
        console.log("response.users: ", response.users);
        setUsers(response.users);
      },
      (error) => {
        /*const resMessage =
          (error.response &&
            error.response.data &&
            error.response.data.message) ||
          error.message ||
          error.toString();*/
      }
    );
  }, []);

  return (
    <div className="container">
      <header className="jumbotron">
        <h3>{content}</h3>
      </header>
      {showAdminBoard && (
        <>
          <h4>Manage Users</h4>
          <div className="users-table">
            <div className="users-table-hdr-row">
              <div className="users-table-hdr">ID</div>
              <div className="users-table-hdr">Username</div>
              <div className="users-table-hdr">Email</div>
            </div>
            {users.map((user, index) => {
              return (
                <div key={index} className="users-table-row">
                  <div className="users-table-item">{user.id}</div>
                  <div className="users-table-item">{user.username}</div>
                  <div className="users-table-item">{user.email}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      
    </div>
  );
};

export default BoardAdmin;
