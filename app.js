//jshint esversion:6
require("dotenv").config()
const bodyParser = require("body-parser");
const ejs = require("ejs");
const express = require("express");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(bodyParser.urlencoded({extended : true}));

app.set("view engine", "ejs");
app.use(express.static("public"));


//DB connection & Schema
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser : true});

const userSchema = new mongoose.Schema({
    email : String,
    password : String
});

// userSchema.plugin(encrypt, {secret : process.env.SECRET, encryptedFields : ["password"]});

const User = new mongoose.model("users", userSchema);

//App Route
app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.post("/login", function(req, res){

    User.findOne(
        {email : req.body.username},
         function(err, results){
             if(!err){
                 if(results){

                    bcrypt.compare(req.body.password, results.password, function(err, results){
                        if(results === true){
                            res.render("secrets");
                        } else {
                            res.send("Wrong Password!")
                        }
                    });

                    // if(results.password === req.body.password){
                    //     res.render("secrets");
                    // } else {
                    //     res.send("Wrong Password!")
                    // }

                 } else {
                     res.send("Invalid Username/Password!")
                 }
             } else {
                console.log(err);
             }
         })
});

app.get("/register", function(req, res){
    res.render("register");
});

app.post("/register", function(req, res){
    
    bcrypt.hash(req.body.password, saltRounds, function(err, hash){
        if(!err){

            const newUser = new User({
                email : req.body.username,
                password : hash
            })
        
            newUser.save(function(err, results){
                if(!err){
                    res.render("secrets");
                } else {
                    console.log(err);
                    res.send("Registration Failed!");
                }
            })
        }
    })

});



app.listen(3000, function(req, res){
    console.log("Server started at port 3000");
})
