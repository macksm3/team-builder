const express = require("express");
const router = express.Router();
const passport = require("passport");
const dotenv = require("dotenv");
const util = require("util");
const url = require("url");
const querystring = require("querystring");
const createUser = require("../lib/createUser");

dotenv.config();

// Perform the login, after login Auth0 will redirect to callback
router.get("/login", passport.authenticate("auth0", {
  scope: "openid email profile"
}), function (req, res) {
  res.redirect("/");
});

// Perform the final stage of authentication and redirect to previously requested URL or '/dashboard'
router.get("/callback", function (req, res, next) {
  passport.authenticate("auth0", function (err, user, info) {

    if (err) { return next(err); }
    if (!user) { return res.redirect("/login"); }
    req.logIn(user, async function (err) {
      if (err) { return next(err); }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;

      const { _raw, _json, ...userProfile } = user;

      // creates a user in the team_member table if not there
      const newUser = await createUser(userProfile);

      // send user to previous page or user profile
      res.redirect(returnTo || "/dashboard");
    });
  })(req, res, next);
});

// Perform session logout and redirect to homepage
router.get("/logout", (req, res) => {
  req.logout();

  let returnTo = req.protocol + "://" + req.hostname;
  let port = req.connection.localPort;

  // if running locally, add the port to the logout url
  if (port === 3000) {
    returnTo += ":" + port;
  }
  let logoutURL = new url.URL(
    util.format("https://%s/v2/logout", process.env.AUTH0_DOMAIN)
  );
  let searchString = querystring.stringify({
    client_id: process.env.AUTH0_CLIENT_ID,
    returnTo: returnTo
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL);
});

module.exports = router;