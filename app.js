/////// app.js

const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// MongoDB connection URI passed as environment variable
const mongoDB = process.env.MONGODB_URI;
mongoose.connect(mongoDB);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDb connection error"));

// MongoDB model
const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
  })
);

const app = express();
// Seting path & type of template
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// I think this is for cookies
app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
// This is for authentication.
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

// Routing & routing logic
app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});
app.get("/success", (req, res) => res.render("success"));
app.get("/fail", (req, res) => res.render("fail"));
app.get("/sign-up", (req, res) => res.render("sign-up-form"));
app.post("/sign-up", async (req, res, next) => {
  try {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    const result = await user.save();
    res.redirect("/");
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

// Passport.js local login 'strategy'
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username: username });
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      };
      if (user.password != password) {
        return done(null, false, { message: "Incorrect password" });
      };
      return done(null, user);
    } catch(err) {
      return done(err);
    }
  })
);
// Passport.js cookie stuff
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch(err) {
    done(err);
  };
});

//app.listen(3000, () => console.log("App listening on port 3000!"));

module.exports = app;
