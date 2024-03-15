const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
var logger = require('morgan');

//// ------ MongoDB Stuff ------ ////
// MongoDB connection URI passed as environment variable
const mongoDB = process.env.MONGODB_URI;
mongoose.connect(mongoDB);
// Connect to DB
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDb connection error"));

// MongoDB 'User' model
const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
  })
);

//// ------ General App Stuff ------ ////
// Instantiate our app :)
const app = express();
// Seting path & type of template
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
// I think this is for cookies
app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
// This is for authentication.
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(logger('dev'));

//// ------ Passport Stuff ------ ////
// Passport.js local login 'strategy'
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username: username });
      const match = await bcrypt.compare(password, user.password);
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      };
      if (!match) {
        return done(null, false, { message: "Incorrect password" });
      };
      return done(null, user);
    } catch(err) {
      return done(err);
    }
  })
);
// The method below creates a user cookie which
// allows them to stay logged in.
passport.serializeUser((user, done) => {
  done(null, user.id);
});
// The method below checks the cookie.
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch(err) {
    done(err);
  };
});

//// ------ Routing Stuff ------ ////
// Middleware to pass 'currentUser' into all views.
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});
// Instantiate Views
app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});
app.get("/success", (req, res) => res.render("success"));
app.get("/fail", (req, res) => res.render("fail"));
app.get("/sign-up", (req, res) => res.render("sign-up-form"));
app.post("/sign-up", async (req, res, next) => {
  try {
    bcrypt.hash(req.body.password, 10, async(err, hashedPassword) => {
      const user = new User({
        username: req.body.username,
        password: hashedPassword,
      });
      const result = await user.save();
      res.redirect("/");
    })
  } catch(err) {
    return next(err);
  };
});
app.post("/log-in", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/",
}));
app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// Below is commented because /bin/www already runs a listen method.
// app.listen(3000, () => console.log("App listening on port 3000!"));

module.exports = app;

