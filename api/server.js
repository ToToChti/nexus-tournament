const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const { MongoClient, ServerApiVersion } = require('mongodb');
const crypto = require('crypto');

const uri = `mongodb+srv://tomloridant:azerty@cluster75409.gko0k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster75409`;
const DATABASE_NAME = "user_accounts_test";
const DATABASE_COLLECTION = "user_collection_test";

let database = null;
let users = null;
let data_to_send = {
    msg: "",
    data: ""
};

initDB();


const app = express();
const port = 3000;


app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use(express.static('../client/'));
app.use(
    session({
        secret: "crate stacker",
        saveUninitialized: false,
        resave: false,
        cookie: {
            maxAge: 24 * 7 * 60 * 60 * 1000
        }
    })
)

const publicFilesFolder = __dirname.split("\\").slice(0, __dirname.split("\\").length - 1).join("\\") + '/client';

app.set('views', publicFilesFolder);
app.use(express.static(publicFilesFolder));
app.set('view engine', 'ejs');



// Home page
app.get('/', (req, res) => {
    console.log(data_to_send)
    return res.render('users/home', data_to_send);
})


app.get('/login', (req, res) => {
    return res.render('users/user_sign_in', data_to_send);
})


app.get('/signup', (req, res) => {
    return res.render("users/user_sign_up")
})

app.post('/signup', (req, res) => {

    const body = req.body;

    // Check fields
    if( !body.lastname ||
        !body.firstname ||
        !body.pseudo || 
        !body.email || 
        !body.password || 
        !body.password_confirm || 
        !body.country) {
            return res.redirect("/signup");
        }

    const STRING_TO_BE_HASHED = body.password;

    const hashedPass = crypto.createHash('md5').update(STRING_TO_BE_HASHED).digest("hex");

    req.session.user = {
        lastname: body.lastname,
        firstname: body.firstname,
        username: body.pseudo,
        email: body.email,
        password: hashedPass,
        country: body.country
    }

    users.insertOne(req.session.user);

    return res.redirect("/");

})


app.post('/signin', async (req, res) => {

    const body = req.body;

    // Check fields
    if(!body.email || !body.password) {
        data_to_send.msg = "Une erreur est survenue, vérifiez bien les informations rentrées."
        return res.redirect("/login");
    }

    const STRING_TO_BE_HASHED = body.password;

    const hashedPass = crypto.createHash('md5').update(STRING_TO_BE_HASHED).digest("hex");

    // Find user by username
    let query = {username: body.email, password: hashedPass };
    let findUser = await users.findOne(query);

    // Find user by email
    query = {email: body.email, password: hashedPass };
    if(!findUser)
        findUser = await users.findOne(query);


    // User doesn't exist
    if(!findUser) {
        data_to_send.msg = "Les identifiants sont incorrects";
        return res.redirect('/login');
    }

    req.session.user = findUser;

    data_to_send.data = {
        connected: true
    };
    data_to_send.msg = "";
    
    return res.redirect("/");

})


app.post('/auth', (req, res) => {

    let user = users.find(user => user.username == req.body.username.trim());

    if (!user || user.password != req.body.password)
        return res.status(401).redirect('/login.html');


    req.session.user = user;

    return res.status(200).redirect('/status');
})


app.get('/status', (req, res) => {
    if (!req.session.user) {
        res.send("Not connected")
    }
    else {
        res.send("Connected")
    }
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})




async function initDB() {
    try {

        // Create a MongoClient with a MongoClientOptions object to set the Stable API version
        const client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });

        // Connection to remote client
        await client.connect();

        // Getting targetted database
        database = await client.db(DATABASE_NAME);
        users = await database.collection(DATABASE_COLLECTION);

        console.log("Connected to database: " + DATABASE_COLLECTION + " (" + DATABASE_NAME + ")");
    }

    catch (e) {
        console.error("Failed to connect to database.");
    }
}




app.get('/404', (req, res) => {
    return res.render('users/404_page');
})


// 404 page
app.get('*', (req, res) => {
    return res.redirect("/404");
});