const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const multer  = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const upload = multer();
const User = require('./models/users');
const Upload = require('./models/uploads');

const bodyParser = require('body-parser');

const crypto = require('crypto');
const key = crypto.randomBytes(32); 
const algo = 'aes256';
const iv = crypto.randomBytes(16);
const jwt = require('jsonwebtoken');
const jwtKey = "jwt";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const jsonParser = bodyParser.json();

// query stream in order to make a delete req
app.use(methodOverride('_method'));

// Mongo URI
const mongoURI = 'mongodb+srv://rushi:431714@cluster0.jcpwl.mongodb.net/hmletbackend?retryWrites=true&w=majority';
// Initialize gfs
let gfs;

var conn = mongoose.createConnection('mongodb+srv://rushi:431714@cluster0.jcpwl.mongodb.net/hmletbackend?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

conn.once('open', () => {
    // Initializing stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

// create storage engine

const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
});
const uploads = multer({ storage });

// @route POST /upload
// @desc Upload img to DB
app.post('/upload', uploads.single('file'), (req, res) => {

    // const data = new Upload({
    //     _id:mongoose.Types.ObjectId(),
    //     name: req.body.name,
    //     caption: req.body.caption
    // });

    // data.save();

    res.json({file: req.file});
})

app.post('/register', upload.none(), function(req, res){
    
    var cipher = crypto.createCipher(algo, key);
    var encrypted = cipher.update(req.body.password, 'utf8', 'hex')+cipher.final('hex');
    console.log(encrypted);
    console.log(req.body);

    const data = new User({
        _id:mongoose.Types.ObjectId(),
        name:req.body.name,
        email:req.body.email,
        password:encrypted
    });

    data.save().then((result) => {
        //res.status(201).json(result)
        jwt.sign({result}, jwtKey, {expiresIn: '600s'}, (err, token) => {
            res.status(201).json({token});
        })
    })
    .catch((err) => console.log(err));

});

app.post('/login', upload.none(), function(req, res){
    User.findOne({email:req.body.email}).then((data) => {
        var decipher = crypto.createDecipher(algo, key);
        var decrypted = decipher.update(data.password, 'hex', 'utf8')+decipher.final('utf8');
        console.log("decrypted", decrypted);
        if(decrypted==req.body.password){
            jwt.sign({data}, jwtKey, {expiresIn: '600s'}, (err, token) => {
                res.status(200).json({token});
                console.log(token);
            })
        }
        //res.json(data);
    })
})

app.get('/users', verifyToken, function(req, res){
    User.find().then((result) => {
        res.status(200).json(result);
    });
});

//middleware for token verification
function verifyToken(req, res, next){
    const bearerHeader = req.headers['authorization'];
    
    
    if(typeof bearerHeader !== 'undefined'){

        const bearer = bearerHeader.split(' ');
        console.log(bearer[1]);
        req.token = bearer[1];

        jwt.verify(req.token, jwtKey, (err, authData) => {
            if(err){
                res.json({result:err})
            }
            else{
                next();
            }
        })
    }
    else{
        res.send({"result": "Token not provided"});
    }
}

app.listen(5000);
