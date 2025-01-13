const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://mathisvegnaduzzi:azerty@cluster75409.gko0k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster75409`;
const DATABASE_NAME = "user_accounts_test";
const DATABASE_COLLECTION = "user_collection_test";

let database = null;
let users = null;

initDB();


const app = express();
const port = 3000;


const usersList = [
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

app.get('/', (req, res) => {
    return res.redirect('/users/home.html');
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
            return res.redirect("/user_sign_up.html");
        }
    users.insertOne({
        lastname: body.lastname,
        firstname: body.firstname,
        pseudo: body.pseudo,
        email: body.email,
        password: body.password,
        country: body.country
    });

})


app.post('/signin', async (req, res) => {

    const body = req.body;

    // Check fields
    if(!body.email || !body.password) {
        return res.redirect("/user_sign_up.html");
    }

    // Find user by username
    let findUser = await database.find(user => user.username == body.email && user.password == body.password);

    // Find user by email
    if(!findUser)
        findUser = await database.find(user => user.email == body.email && user.password == body.password);


    // User doesn't exist
    if(!findUser) 
        return res.redirect('/user_sign_in.html');

    req.session.user = findUser;

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
