//jshint esversion:6
require("dotenv").config()
const bodyParser = require("body-parser");
const ejs = require("ejs");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { initialize } = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended : true}));
app.use(session({
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());

//DB connection & Schema
mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email : String,
    password : String,
    googleId : String,
    facebookId : String
});

// userSchema.plugin(encrypt, {secret : process.env.SECRET, encryptedFields : ["password"]});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("users", userSchema);

passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/Secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ username: profile.emails[0].value, googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Facebook OAuth
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/Secrets",
    profileFields: ['id', 'email']
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    console.log(profile.email);
    User.findOrCreate({ username: profile.emails[0].value, facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//App Route
app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile","email"] })
);

app.get("/auth/google/Secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
});

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ["email"]} ));

app.get('/auth/facebook/Secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    if(req.isAuthenticated()){
        res.render("secrets")
    } else {
        res.redirect("/login");
    }
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit")
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.post("/login", function(req, res){

    const user = new User({
        username : req.body.username,
        password : req.body.password
    });

    req.login(user, function(err){
        if(!err){
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        } else {
            console.log(err);
            res.redirect("/login")
        };
    });
    // User.findOne(
    //     {email : req.body.username},
    //      function(err, results){
    //          if(!err){
    //              if(results){

    //                 bcrypt.compare(req.body.password, results.password, function(err, results){
    //                     if(results === true){
    //                         res.render("secrets");
    //                     } else {
    //                         res.send("Wrong Password!")
    //                     }
    //                 });

    //              } else {
    //                  res.send("Invalid Username/Password!")
    //              }
    //          } else {
    //             console.log(err);
    //          }
    //      })
});

app.post("/register", function(req, res){

    User.register({username : req.body.username}, req.body.password, function(err, user){
        if(!err){
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        } else {
            console.log(err);
            res.redirect("/register");
        }
    })
    
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash){
    //     if(!err){

    //         const newUser = new User({
    //             email : req.body.username,
    //             password : hash
    //         })
        
    //         newUser.save(function(err, results){
    //             if(!err){
    //                 res.render("secrets");
    //             } else {
    //                 console.log(err);
    //                 res.send("Registration Failed!");
    //             }
    //         })
    //     }
    // })

});

app.listen(3000, function(req, res){
    console.log("Server started at port 3000");
});
