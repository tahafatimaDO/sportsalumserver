const db = require("../models");
const config = require("../config/auth.config");
const User = db.user;
const Role = db.role;

const Op = db.Sequelize.Op;

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");

exports.signup = (req, res) => {
  // Save User to Database
  User.create({
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    username: req.body.username,
    email: req.body.email,
    amateur_id: req.body.amateur_id,
    pro_id: req.body.pro_id,
    claimed: req.body.claimed,
    password: bcrypt.hashSync(req.body.password, 8)
  })
    .then(user => {
      if (req.body.roles) {
        Role.findAll({
          where: {
            name: {
              [Op.or]: req.body.roles
            }
          }
        }).then(roles => {
          user.setRoles(roles).then(() => {
            res.send({ message: "User registered successfully!" });
          });
        });
      } else {
        // user role = 1
        user.setRoles([1]).then(() => {
          res.send({ message: "User registered successfully!" });
        });
      }
    })
    .catch(err => {
      res.status(500).send({ message: err.message });
    });
};

exports.saveuser = (req, res) => {

  User.findOne({
    where: {
      username: req.body.username
    }
  }).then( user => {
    return user.update({
      firstname: req.body.firstname
    }).then( r => {
      
      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: 86400 // 24 hours
      });

      return res.status(200).send({
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        accessToken: token
      });
    }).catch(e => {
      return res.status(400).json({msg: 'error ' +e});
    })
  }).catch( e => {
    return res.status(400).json({msg: 'error ' +e});
  });
}

exports.refreshuser = (req, res) => {
  User.findOne({
    where: {
      username: req.body.username
    }
  }).then( user => {
      return res.status(200).send({
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        claimed: user.claimed,
        amateur_id: user.amateur_id,
        pro_id: user.pro_id
      });
  }).catch( e => {
    return res.status(400).json({msg: 'error ' +e});
  });
}

exports.signin = (req, res) => {
  User.findOne({
    where: {
      username: req.body.username
    }
  })
    .then(user => {
      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!"
        });
      }

      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: 86400 // 24 hours
      });

      var authorities = [];
      user.getRoles().then(roles => {
        for (let i = 0; i < roles.length; i++) {
          authorities.push("ROLE_" + roles[i].name.toUpperCase());
        }
        res.status(200).send({
          id: user.id,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          claimed: user.claimed,
          amateur_id: user.amateur_id,
          pro_id: user.pro_id,
          roles: authorities,
          accessToken: token
        });
      });
    })
    .catch(err => {
      res.status(500).send({ message: err.message });
    });
};

exports.getusers = (req, res) => {
  console.log("1:getusers");
  User.findAll()
    .then(users => {
      let userArray = [];
      console.log("users: ", users[0].dataValues);
      for (let i = 0; i < users.length; i++) {
        console.log("users[i]: ", users[i]);
        let userItem = {};
        userItem.id = users[i].dataValues.id;
        userItem.username = users[i].dataValues.username;
        userItem.email = users[i].dataValues.email;
        userItem.firstname = users[i].dataValues.firstname;
        userItem.lastname = users[i].dataValues.lastname;
        userItem.claimed = users[i].dataValues.claimed;
        userItem.amateur_id = users[i].dataValues.amateur_id;
        userItem.pro_id = users[i].dataValues.pro_id;
        userArray.push(userItem);
      }
      
      console.log("userArray: ", userArray);

      //var token = jwt.sign({ id: user.id }, config.secret, {
      //  expiresIn: 86400 // 24 hours
      //});

      res.status(200).send({
        users: userArray
      });
    })
    .catch(err => {
      res.status(500).send({ message: err.message });
    });
};