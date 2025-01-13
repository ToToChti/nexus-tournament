const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;


const users = [
    {
        "username": "mathis",
        "password": "123"
    },
    {
        "username": "tom",
        "password": "aze"
    },
]

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(express.static('public'));
app.use(
    session({
        secret: "crate stacker",
        saveUninitialized: false,
        resave: false,
        cookie: {
            maxAge: 24* 7 * 60 * 60 * 1000
        }
    })
)

app.get('/', (req, res) => {
    res.send('Hello World!');
})


app.post('/auth', (req, res) => {

    console.log(req.body)
    
    let user = users.find(user => user.username == req.body.username.trim());

    if(!user || user.password != req.body.password)
        return res.status(401).redirect('/login.html');//.send({msg: "Incorrect login"})

    
    req.session.user = user;

    return res.status(200).redirect('/status');//{msg: "Wonderful", user})
})


app.get('/status', (req, res) => {
    if(!req.session.user) {
        res.send("Not connected")
    }
    else {
        res.send("Connected")
    }
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})