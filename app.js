require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const User = require("./models/users");
const Image = require("./models/images");
const Draft = require("./models/drafts");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const crypto = require("crypto"); // core node module
const config = require("./config");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Connection to MongoDB Atlas
mongoose
  .connect(config.db.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log("Connected to MongoDB Atlas!");
  });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname);
  },
});

// You can update the limit of the file-size of the upload photo. For now it is set to 10MB.
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10,
  },
});

//@route POST for registration of a new user
app.post("/register", upload.none(), function (req, res) {
  var cipher = crypto.createCipher(config.app.algo, config.app.key);
  var encrypted =
    cipher.update(req.body.password, "utf8", "hex") + cipher.final("hex");
  //console.log(encrypted);
  //console.log(req.body);

  const data = new User({
    _id: mongoose.Types.ObjectId(),
    name: req.body.name,
    email: req.body.email,
    password: encrypted,
  });

  data
    .save()
    .then((result) => {
      //res.status(201).json(result)
      jwt.sign(
        { result },
        config.app.jwtKey,
        { expiresIn: "600s" },
        (err, token) => {
          res.status(201).json({ token });
        }
      );
    })
    .catch((err) => console.log(err));
  config.app.loggedInUserName = req.body.name;
});

// @route POST for login of an existing user
app.post("/login", upload.none(), function (req, res) {
  User.findOne({ email: req.body.email }).then((data) => {
    var decipher = crypto.createDecipher(config.app.algo, config.app.key);
    var decrypted =
      decipher.update(data.password, "hex", "utf8") + decipher.final("utf8");
    //console.log("decrypted", decrypted);
    if (decrypted == req.body.password) {
      jwt.sign(
        { data },
        config.app.jwtKey,
        { expiresIn: "600s" },
        (err, token) => {
          res.status(200).json({ token });
          //console.log(token);
        }
      );
    }
    //res.json(data);
    global.loggedInUser = data.name;
    config.app.loggedInUserName = data.name;
  });
});

// @route POST to upload a Photo. It will be saved as a Draft first.
app.post("/upload", verifyToken, upload.single("image"), function (req, res) {
  //console.log(req.file);

  var nowDate = new Date();
  var date =
    nowDate.getFullYear() +
    "/" +
    (nowDate.getMonth() + 1) +
    "/" +
    nowDate.getDate();

  const data = new Draft({
    _id: mongoose.Types.ObjectId(),
    username: req.body.username,
    caption: req.body.caption,
    image: req.file.path,
    uploadedDate: date,
  });
  data.save();
  res.send(data);
});

// @route POST to post a photo
// @desc This will move photo from Drafts to Posted Photos
app.post("/post/:id", verifyToken, function (req, res) {
  var id = req.params.id;
  var nowDate = new Date();
  var flag = true;
  var date =
    nowDate.getFullYear() +
    "/" +
    (nowDate.getMonth() + 1) +
    "/" +
    nowDate.getDate();

  if(id.length == 24){
  Draft.findById(id, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      if(result == null){
        return res.json({
          err:
            "ID did not match with the records! Please check again!!",
        });
      }
      else{
      const data = new Image({
        _id: mongoose.Types.ObjectId(),
        username: result.username,
        caption: result.caption,
        image: result.image,
        uploadedDate: date,
      });
      data.save();
      }
    }
  });

  Draft.findOneAndRemove({ _id: id }, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      res.json(result);
    }
  });
  }
  else{
    res.json({
      err:
        "Invalid ID parameter! Please check again!!",
    });
  }
});

// @route GET all posted images
app.get("/images", function (req, res) {
  Image.find().then((result) => {
    res.status(200).json(result);
  });
});

// @route GET Photos
// @desc Filter Photos by User (AND this same route can be used to get all myPhotos)
app.get("/images/:username", function (req, res) {
  Image.find({ username: req.params.username }, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      res.status(200).json(result);
    }
  });
});

// @route GET Drafts
// @desc Get all draft Photos of a user (Auth Req)
app.get("/draft/:username", verifyToken, function (req, res) {
  Draft.find({ username: req.params.username }, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      res.status(200).json(result);
    }
  });
});

// @route PATCH Photo
// @desc Edit Photo Caption of a posted Photo (Users can edit only their own photos)
app.patch("/images/:id", verifyToken, function (req, res) {
  var id = req.params.id;
  var name = "";

  if(id.length == 24){
  Image.findOne({ _id: id }, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      if(result == null){
        return res.json({
          err:
            "ID did not match with the records! Please check again!!",
        });
      }
      else
        name = result.username;
    }
  }).then(() => {
    if (config.app.loggedInUserName == name) {
      Image.findByIdAndUpdate(
        id,
        { $set: { caption: req.body.caption } },
        { new: true },
        (err, result) => {
          if (err) {
            res.json(err);
          } else {
            res.status(200).json(result);
          }
        }
      );
    } else {
      res.status(401).json({
        err:
          "You are not Authorized to perform this action. You can edit only those photos you uploaded!",
      });
    }
  });
  }
  else{
    res.json({
      err:
        "Invalid ID parameter! Please check again!!",
    });
  }
});

// @route DELETE Photo
// @desc Delete a selected Photo from Posted Photos
app.delete("/images/:id", verifyToken, function (req, res) {
  var id = req.params.id;
  var name = "";

  if(id.length == 24){
  Image.findOne({ _id: id }, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      if(result == null){
        return res.json({
          err:
            "ID did not match with the records! Please check again!!",
        });
      }
      else
        name = result.username;
    }
  }).then(() => {
    if (config.app.loggedInUserName == name) {
      Image.findOneAndRemove({ _id: id }, (err, result) => {
        if (err) {
          res.json(err);
        } else {
          res.json(result);
        }
      });
    } else {
      res.status(401).json({
        err:
          "You are not Authorized to perform this action. You can delete only those photos you uploaded!",
      });
    }
  });
  }
  else{
    res.json({
      err:
        "Invalid ID parameter! Please check again!!",
    });
  }
});

// @route DELETE Photo
// @desc Delete a selected Photo from Drafts Photos
app.delete("/draft/:id", verifyToken, function (req, res) {
  var id = req.params.id;
  var name = "";

  if(id.length == 24){
  Draft.findOne({ _id: id }, (err, result) => {
    if (err) {
      res.json(err);
    } else {
     if(result == null){
        return res.json({
          err:
            "ID did not match with the records! Please check again!!",
        });
      }
      else
        name = result.username;
    }
  }).then(() => {
    if (config.app.loggedInUserName == name) {
      Draft.findOneAndRemove({ _id: id }, (err, result) => {
        if (err) {
          res.json(err);
        } else {
          res.json(result);
        }
      });
    } else {
      res.status(401).json({
        err:
          "You are not Authorized to perform this action. You can delete only those photos you uploaded!",
      });
    }
  });
  }
  else{
    res.json({
      err:
        "Invalid ID parameter! Please check again!!",
    });
  }
});

// @route DELETE Photos
// @desc Logged-in Users can DELETE all their Posted Photos
app.delete("/images/batchremove/:username", verifyToken, function (req, res) {
  var name = req.params.username;
  if (config.app.loggedInUserName == name) {
    Image.deleteMany({ username: name }, (err, result) => {
      if (err) {
        res.json(err);
      } else {
        res.json(result);
      }
    });
  } else {
    res.status(401).json({
      err:
        "You are not Authorized to perform this action. You can delete only those photos you uploaded!",
    });
  }
});

// @route GET Photos
// @desc get Photos by ASC/DESC(case sensitive) order of uploaded Date.
app.get("/images/sort/:order", function (req, res) {
  var order = req.params.order;

  if (order == "ASC") {
    Image.find({})
      .sort({ uploadedDate: 1 })
      .exec((err, result) => {
        if (err) {
          res.json(err);
        } else {
          res.json(result);
        }
      });
  } else if (order == "DESC") {
    Image.find({})
      .sort({ uploadedDate: -1 })
      .exec((err, result) => {
        if (err) {
          res.json(err);
        } else {
          res.json(result);
        }
      });
  } else {
    res.status(404).json({
      err: "Invalid Request / Please check for any typos",
    });
  }
});

// @route GET all users
// @desc route for testing purpose (not mentioned as a requirement)
app.get("/users", verifyToken, function (req, res) {
  User.find().then((result) => {
    res.status(200).json(result);
  });
});

//middleware for token verification
function verifyToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];

  if (typeof bearerHeader !== "undefined") {
    const bearer = bearerHeader.split(" ");
    //console.log(bearer[1]);
    req.token = bearer[1];

    jwt.verify(req.token, config.app.jwtKey, (err, authData) => {
      if (err) {
        res.json({ result: err });
      } else {
        next();
      }
    });
  } else {
    res.send({ result: "Token not provided" });
  }
}

// localhost
app.listen(process.env.PORT || config.app.port, function () {
  console.log("Server Started!");
});
