const path = require("path");
const multer = require("multer");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");
const cors = require("cors");

const app = express();

app.use(cors());

const fileStorage = multer.diskStorage({
  destination: (request, file, callBack) => {
    callBack(null, "images");
  },
  filename: (request, file, callBack) => {
    callBack(null, Date.now().toString() + "-" + file.originalname);
  },
});

const fileFilter = (request, file, callBack) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    callBack(null, true);
  } else {
    callBack(null, false);
  }
};

app.use(bodyParser.json());

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  next();
});

app.use("/feed", feedRoutes);
app.use("/auth", authRoutes);

app.use((error, request, response, next) => {
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  response.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    "mongodb+srv://ahmedosamaalsawah:Mongo742002@rest-api.l5nsp9i.mongodb.net/?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => app.listen(8080))
  .catch((err) => console.log(err));
