const path = require("path");
const fileSystem = require("fs");
const { validationResult } = require("express-validator/check");

const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = (request, response, next) => {
  const currentPage = request.query.page || 1;
  const perPage = 2;
  let totalItems;
  Post.find()
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Post.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then((posts) => {
      response.status(200).json({
        message: "Fetched posts successfully.",
        posts: posts,
        totalItems: totalItems,
      });
    })
    .catch((error) => {
      !error.statusCode && (error.statusCode = 500);
      next(error);
    });
};

exports.createPost = (request, response, next) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  if (!request.file) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = request.file.path;
  const title = request.body.title;
  const content = request.body.content;
  let creator;
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: request.userId,
  });
  post
    .save()
    .then(() => User.findById(request.userId))
    .then((user) => {
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then(() => {
      response.status(201).json({
        message: "Post created successfully!",
        post: post,
        creator: { _id: creator._id, name: creator.name },
      });
    })
    .catch((error) => {
      !error.statusCode && (error.statusCode = 500);
      next(error);
    });
};

exports.getPost = (request, response, next) => {
  const postId = request.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 404;
        throw error;
      }
      response.status(200).json({ message: "Post fetched.", post: post });
    })
    .catch((error) => {
      !error.statusCode && (error.statusCode = 500);
      next(error);
    });
};

exports.updatePost = (request, response, next) => {
  const postId = request.params.postId;
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  const title = request.body.title;
  const content = request.body.content;
  let imageUrl = request.body.image;
  request.file && (imageUrl = request.file.path);

  if (!imageUrl) {
    const error = new Error("No file picked.");
    error.statusCode = 422;
    throw error;
  }
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== request.userId) {
        const error = new Error("Not authorized!");
        error.statusCode = 403;
        throw error;
      }
      imageUrl !== post.imageUrl && clearImage(post.imageUrl);

      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then((result) =>
      response.status(200).json({ message: "Post updated!", post: result })
    )
    .catch((error) => {
      !error.statusCode && (error.statusCode = 500);
      next(error);
    });
};

exports.deletePost = (request, response, next) => {
  const postId = request.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== request.userId) {
        const error = new Error("Not authorized!");
        error.statusCode = 403;
        throw error;
      }
      // Check logged in user
      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(postId);
    })
    .then(() => User.findById(request.userId))
    .then((user) => {
      user.posts.pull(postId);
      return user.save();
    })
    .then(() => response.status(200).json({ message: "Deleted post." }))
    .catch((error) => {
      !error.statusCode && (error.statusCode = 500);
      next(error);
    });
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fileSystem.unlink(filePath, (error) => console.log(error));
};
