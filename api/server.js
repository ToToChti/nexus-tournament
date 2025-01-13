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
            maxAge: 24 * 7 * 60 * 60 * 1000
        }
    })
)

app.get('/', (req, res) => {
    res.send('Hello World!');
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



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://tomloridant:azerty@cluster75409.gko0k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster75409";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        const database = await client.db("user_accounts_test")//.command({ ping: 1 });
        const users = await database.collection("user_collection_test");

        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // Create a document to insert
        const doc = {
            title: "Record of a Shriveled Datum",
            content: "No bytes, no problem. Just insert a document, in MongoDB",
        }
        // Insert the defined document into the "haiku" collection
        const result = await users.insertOne(doc);
        // Print the ID of the inserted document
        console.log(`A document was inserted with the _id: ${result.insertedId}`);

    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);
