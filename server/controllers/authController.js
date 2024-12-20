// here we do all our dodgy stuff
const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken"); // For generating JSON Web Tokens
const dotenv = require("dotenv"); // For accessing environment variables
const crypto = require("crypto");
const User = require("../schemas/User");
const Code = require("../schemas/Code");
const mailer = require("../utils/mailingTool"); // Transporter for sending emails

dotenv.config();

exports.register = async (req, res) => {
  try {
    const {
      email,
      account,
      code,
      phone,
      password,
      firstName,
      lastName,
      FCMtoken,
    } = req.body;
    let role;

    console.log("Register endpoint reached");

    //Check if this FCM token is already in use, if so, remove it from the user who has it
    const existingFCMUser = await User.findOne({ FCMtoken });

    if (existingFCMUser) {
      existingFCMUser.FCMtoken = null;
      await existingFCMUser.save();
    }

    if (account == 0) {
      role = "admin";
      //Check if the user has a valid code
      const codeCheck = await Code.findOne({ userCode: code });
      if (!codeCheck) {
        return res.status(400).json({
          error:
            "Invalid code. Please contact management for further assistance",
        });
      }
      // check that code Check was not made more than 24 hours ago

      if (Date.now() - codeCheck.createdAt > 86400000) {
        return res.status(400).json({ error: "Registration code has expired" });
      }
    } else if (account == 1) {
      role = "student";
    } else if (account == 2) {
      role = "staff";
    }

    // check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ error: "A user with this email address already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      role,
      FCMtoken,
      password: hashedPassword,
      isVerified: false,
    });

    //Delete the code because it has been used
    await Code.deleteOne({ userCode: code });

    //send verification email
    // Generate a unique verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    newUser.verificationToken = verificationToken;
    // newUser.verificationTokenExpires = Date.now() + 2 * 60 * 1000; // 2 minutes expiry
    newUser.verificationTokenExpires = Date.now() + 3600000; // 1 hour expiry

    // Save the new user to the database
    await newUser.save();

    // send verification email
    var url = req.protocol + "://" + req.get("host");
    await mailer.sendVerificationEmail(email, url, verificationToken);

    res.status(201).json({ message: "Registration successful!" });
  } catch (error) {
    console.log("Error registering user:", error);
    res.status(500).json({ error: "Error registering user" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe, FCMtoken } = req.body;

    //Check if this FCM token is already in use, if so, remove it from the user who has it
    //This works because if a user logs in on same device to another account, that user will have "control" over that token in
    //the context of that service worker registration. So e.g the admin account of the user now has a null token, so if
    //notifications are sent out to the admin account, since the user isnt logged in with the admin account there will be no
    // need for the admin account to receive the notification, hence the token is null. if the token wasnt null, as in initially, the admin account
    // will be notified and the user account will also receive the notification, since they share the same token
    const existingFCMUser = await User.findOne({ FCMtoken });

    if (existingFCMUser) {
      existingFCMUser.FCMtoken = null;
      await existingFCMUser.save();
    }

    // find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ error: "A user with this email address does not exist." });
    }

    //Check if a user password actuallye exists since the person could have registered with Google, and if so, they should be redirected to the Google login endpoint
    if (!user.password) {
      return res.status(401).json({ error: "User registered with Google" });
    }

    // check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Use rememberMe to set different token expiration times
    const tokenExpiration = rememberMe ? "28d" : "7d"; // 28 days or 7 days

    // check if user is verified
    if (!user.isVerified) {
      return res
        .status(401)
        .json({ error: "Your email is not verified", email: email });
    }

    // sign JWT with email and role
    const token = jwt.sign(
      { userEmail: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiration } // Adjust expiration based on rememberMe
    );

    // Set token as an HttpOnly cookie
    const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 days or 24 hours

    // Update the user's FCM token
    user.FCMtoken = FCMtoken;
    await user.save();

    res.cookie("token", token, {
      httpOnly: true,
      maxAge,
      secure: true,
      sameSite: "Strict",
    });

    //Save the user's role, email address, name and surname, phone and join date to the client as a cookie
    //profile picture not being stored - too large?
    res.cookie("role", user.role, { maxAge });
    res.cookie("email", user.email, { maxAge });
    res.cookie("firstname", user.firstName, { maxAge });
    res.cookie("lastname", user.lastName, { maxAge });
    res.cookie("phone", user.phone, { maxAge });
    res.cookie("joined", user.createdAt, { maxAge });
    res.cookie("googleLogin", false, { maxAge });

    // Return success
    res.json({
      success: true,
      redirect: user.role,
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.log("Error logging in user:", error);
    res.status(500).json({ error: "Error logging in user" });
  }
};

async function urlToBase64(photoURL) {
  const response = await fetch(photoURL);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${response.headers.get("content-type")};base64,${base64}`;
}

exports.googleRegister = async (req, res) => {
  const { name, surname, email, phone, account, code, photoURL } = req.body;

  try {
    let role;

    console.log("Register with Google endpoint reached");

    if (account == 0) {
      role = "admin";
      //Check if the user has a valid code
      const codeCheck = await Code.findOne({ userCode: code });
      if (!codeCheck) {
        return res.status(400).json({
          error:
            "Invalid code. Please contact management for further assistance",
        });
      }
      // check that code Check was not made more than 24 hours ago

      if (Date.now() - codeCheck.createdAt > 86400000) {
        return res.status(400).json({ error: "Registration code has expired" });
      }
    } else if (account == 1) {
      role = "student";
    } else if (account == 2) {
      role = "staff";
    }

    // check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ error: "A user with this email address already exists." });
    }

    console.log("Photo URL: ", photoURL);

    //convert the photo url to base 64 string
    let base64 = await urlToBase64(photoURL);

    console.log("Photo base 64: ", photoURL);

    // Create a new user
    const newUser = new User({
      firstName: name,
      lastName: surname,
      email,
      phone,
      profilePicture: base64,
      role,
      // FCMtoken,
      isVerified: true,
    });

    //Delete the code because it has been used
    await Code.deleteOne({ userCode: code });

    // Save the new user to the database
    await newUser.save();

    res.status(201).json({ message: "Registration successful!" });
  } catch (error) {
    console.log("Error registering user with Google :", error);
    res.status(500).json({ error: "Error registering user with Google" });
  }
};

exports.googleLogin = async (req, res) => {
  const { email, FCMtoken } = req.body;

  try {
    // find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ error: "A user with this email address does not exist." });
    }

    const existingFCMUser = await User.findOne({ FCMtoken });

    if (existingFCMUser) {
      existingFCMUser.FCMtoken = null;
      await existingFCMUser.save();
    }

    // Update the user's FCM token
    user.FCMtoken = FCMtoken;
    await user.save();

    // Use rememberMe to set different token expiration times
    let rememberMe = false;
    const tokenExpiration = rememberMe ? "7d" : "24h"; // 7 days or 24 hours

    // sign JWT with email and role
    const token = jwt.sign(
      { userEmail: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiration } // Adjust expiration based on rememberMe
    );

    // Set token as an HttpOnly cookie
    const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 days or 24 hours
    res.cookie("token", token, {
      httpOnly: true,
      maxAge,
      secure: true,
      sameSite: "Strict",
    });

    //Send the user's role, email address, name and surname to the client as a cookie
    res.cookie("role", user.role, { maxAge });
    res.cookie("email", user.email, { maxAge });
    res.cookie("firstname", user.firstName, { maxAge });
    res.cookie("lastname", user.lastName, { maxAge });
    //If user phone is not null, send it to the client as a cookie, else send "No phone number"
    if (user.phone) {
      res.cookie("phone", user.phone, { maxAge });
    } else {
      res.cookie("phone", "No phone number", { maxAge });
    }
    res.cookie("joined", user.createdAt, { maxAge });
    res.cookie("googleLogin", true, { maxAge });

    // Return success
    res.json({
      success: true,
      redirect: user.role,
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.log("Error logging in using Google", error);
    res.status(500).json({ error: "Error logging in using Google" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, password } = req.body;
    // Check if token is provided
    if (!resetToken) {
      return res.status(400).json({ error: "Token must be provided" });
    }

    // console.log("Reset token : " + resetToken);

    // Verify the reset token
    const decoded = jwt.verify(resetToken, process.env.RESET_JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ error: "Invalid reset token" });
    }

    // Find the user by email
    const user = await User.findOne({ email: decoded.userEmail });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the user's password
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    // Send the password reset email
    await mailer.sendSuccess(user.email);

    console.log(`Email confirming password reset sent to ${user.email}`);

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.log("Error resetting password:", error);
    res.status(500).json({ error: "Error resetting password" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a token for password reset
    const resetToken = jwt.sign(
      { userEmail: user.email, role: user.role },
      process.env.RESET_JWT_SECRET,
      { expiresIn: "1h" }
    );

    var url = req.protocol + "://" + req.get("host");
    // console.log(url);

    // Send the reset token via email
    await mailer.sendRequest(user.email, url, resetToken);

    res.status(200).json({
      message: "Password reset instructions have been sent to your email.",
    });

    console.log(`Email to reset password sent to ${user.email}`);
  } catch (error) {
    console.log("Error initiating password reset:", error);
    res.status(500).json({ error: "Error initiating password reset" });
  }
};

exports.isVerified = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.userEmail;

    // find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ error: "A user with this email address does not exist." });
    }

    // Send the verification status
    res.json({ isVerified: user.isVerified });
  } catch (error) {
    console.log("Error checking user verification status:", error);
    res.status(500).json({ error: "Error checking verification status" });
  }
};

// send verification email
exports.sendVerification = async (req, res) => {
  const email = req.body.email;

  try {
    // find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ error: "A user with this email address does not exist." });
    }

    // Generate a unique verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    // newUser.verificationTokenExpires = Date.now() + 2 * 60 * 1000; // 2 minutes expiry
    user.verificationTokenExpires = Date.now() + 3600000; // 1 hour expiry

    user.save(); // save new tokens to user

    // send verification email
    var url = req.protocol + "://" + req.get("host");
    await mailer.sendVerificationEmail(email, url, verificationToken);

    console.log("Verification Email Successfully Sent!");
    res.status(200).json({ success: "Verification Email Successfully Sent!" });
  } catch (error) {
    console.log("Error sending verification email :", error);
    res.status(500).json({ error: "Error sending verification email" });
  }
};

// change this to accomodate new logic
exports.verifyEmail = async (req, res) => {
  const { token } = req.body;

  try {
    // Find user with the corresponding verification token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }, // Check token expiration
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Mark email as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();
    console.log("Email verified successfully");

    res.status(200).json({
      message: "Email verified successfully!",
      redirect: user.role, // Include the user's role for redirection
    });
  } catch (error) {
    res.status(500).json({ error: "Error verifying email" });
  }
};

// Resend verification email (if token expires or email was missed)
exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    console.log("Resend email endpoint reached");

    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
      return res
        .status(400)
        .json({ error: "User doesn't exist or is already verified" });
    }

    // Generate a new verification token
    const newVerificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = newVerificationToken;
    user.verificationTokenExpires = Date.now() + 3600000; // 1 hour from now

    await user.save();

    // Send new verification email
    var url = req.protocol + "://" + req.get("host");
    //   const verifyUrl = `${url}/verifyEmail?token=${newVerificationToken}`;

    // Send the new token via email
    await mailer.resendVerificationEmail(user.email, url, newVerificationToken);

    res
      .status(200)
      .json({ message: "Verification email resent successfully!" });

    console.log(`Verification email sent successfully to ${email}`);
  } catch (error) {
    res.status(500).json({ error: "Error resending verification email" });
  }
};

exports.logout = async (req, res) => {
  try {
    // const token = req.cookies.token;
    // if (token) {
    //   try {
    //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //     const email = decoded.userEmail;
    //     const user = await User.findOne({ email });

    //     if (user) {
    //       user.FCMtoken = null;
    //       await user.save();
    //       console.log(
    //         `${email} that just logged out had their FCM token set to null: `,
    //         user.FCMtoken
    //       );
    //     }
    //   } catch (jwtError) {
    //     console.log("JWT decoding failed during logout:", jwtError);
    //   }
    // }

    // Clear cookies regardless of errors
    res.clearCookie("token");
    res.clearCookie("role");
    res.clearCookie("email");
    res.clearCookie("firstname");
    res.clearCookie("lastname");
    res.clearCookie("phone");
    res.clearCookie("joined");
    res.clearCookie("googleLogin");

    res.status(200).redirect("/login");
  } catch (error) {
    console.log("Unexpected error during logout:", error);
    res.status(200).redirect("/login"); // Still redirect to ensure logout is "successful"
  }
};

exports.checkEmailVerification = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.userEmail;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ isVerified: user.isVerified });
  } catch (error) {
    console.log("Error checking email verification status:", error);
    res.status(500).json({ error: "Error checking email verification status" });
  }
};

exports.generateCode = async (req, res) => {
  try {
    console.log("Generate code endpoint reached");
    //Generate a random 5 digit code and prefix it with the role
    let code;
    let existingCode;

    do {
      code = Math.floor(10000 + Math.random() * 90000);
      existingCode = await Code.findOne({ userCode: code });
    } while (existingCode);

    console.log("Generated code: ", code);

    //Store code along with role in the database

    const newCode = new Code({
      userCode: code,
    });

    await newCode.save();

    res.json({ message: code });
  } catch (error) {
    console.log("Error generating code:", error);
    res.status(500).json({ error: "Error generating code" });
  }
};
