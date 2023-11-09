const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { validationResult } = require("express-validator/check");

exports.signup = (request, response, next) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  const email = request.body.email;
  const name = request.body.name;
  const password = request.body.password;

  User.findOne({ email: email })
    .then((existingUser) => {
      if (existingUser) {
        const error = new Error("E-Mail address already exists!");
        error.statusCode = 422;
        throw error;
      }
      return bcrypt.hash(password, 12);
    })
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        name: name,
      });
      return user.save();
    })
    .then((result) => {
      response
        .status(201)
        .json({ message: "User created!", userId: result._id });
    })
    .catch((error) => {
      !error.statusCode && (error.statusCode = 500);
      next(error);
    });
};

exports.login = (request, response, next) => {
  const email = request.body.email;
  const password = request.body.password;

  let loadedUser;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error("A user with this email could not be found!");
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        "somesupersecretsecret",
        { expiresIn: "1h" }
      );

      response
        .status(200)
        .json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch((error) => {
      !error.statusCode && (error.statusCode = 500);
      next(error);
    });
};
