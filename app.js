
const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/users');

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const crypto = require('crypto');
const key = crypto.randomBytes(32); 
const algo = 'aes256';
const iv = crypto.randomBytes(16);
const jwt = require('jsonwebtoken');
const jwtKey = "jwt";

const app = express();

mongoose.connect('mongodb+srv://rushi:431714@cluster0.jcpwl.mongodb.net/hmletbackend?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("connected");
});

app.get("/", function(req, res){
    res.end("hello");
});

app.post('/register', jsonParser, function(req, res){
    
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
            res.status(201).json({token})
        })
    })
    .catch((err) => console.log(err));

});

app.post('/login', jsonParser, function(req, res){
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
