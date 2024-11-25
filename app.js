// 加載環境變數
require('dotenv').config();

// 引入所需的模組
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const mongoose = require("mongoose");
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require('passport-github').Strategy;



// 建立 Express 應用
const app = express();

// 設置靜態文件夾
app.use(express.static("public"));

// 設置模板引擎為 EJS
app.set("view engine", "ejs");

// 使用 Body-Parser 解析 URL 編碼的數據
app.use(bodyParser.urlencoded({ extended: true }));

// 設置會話管理
app.use(session({
  secret: process.env.PASSPORT_LONG_SECRET,
  resave: false,
  saveUninitialized: false
}));

// 初始化 Passport 並使用會話
app.use(passport.initialize());
app.use(passport.session());

// 設置 Mongoose 查詢嚴格模式
mongoose.set("strictQuery", true);
main().catch(err => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/testDB");
}

// 定義用戶模式和模型
const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  googleId: String,
  githubId: String
});

userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

// 設置 Passport Google 策略
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate(
      { googleId: profile.id },
      function (err, user) {
        return cb(err, user);
      }
    );
  }
));

// -------GITHUB STRATEGY--------
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ githubId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user.id);
    });
});

passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
});

// 設置根路由
app.get("/", function (req, res) {
  res.render("home");
});

// 設置其他路由
app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res){
    if (req.isAuthenticated()){
      res.render("secrets");
    } else {
      res.render("/login");
    }
  });
  
  app.get("/logout", function(req, res){
    req.logout(function(err) {
        if (err) { 
            return next(err); 
        }
        res.redirect("/");
    });
});

// 設置 Google 認證路由
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log(`Server started on port ${port}.`);
});

app.get("/auth/google/secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/secrets");
  });

  // -----GITHUB AUTHENTICATION-----
  app.get('/auth/github', passport.authenticate('github', { scope: [ 'user:email' ] }));

  app.get('/auth/github/secrets', 
      passport.authenticate('github', { failureRedirect: '/login' }), function(req, res) {
          // Successful authentication, redirect secrets.
          res.redirect('/secrets');
      }
  ); 