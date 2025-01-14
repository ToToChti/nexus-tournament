const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const { MongoClient, ServerApiVersion } = require('mongodb');
const crypto = require('crypto');
const multer = require('multer');
const uri = `mongodb+srv://mathisvegnaduzzi:azerty@cluster75409.gko0k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster75409`;

const DATABASE_NAME = "Projet_mi_semestre_CIR3";
const DATABASE_COLLECTION = "Client";
const DATABASE_COLLECTION_TOURNOI = "Tournoi";
const DATABASE_COLLECTION_TEST = "user_collection_test";
const DATABASE_NAME_TEST = "user_accounts_test";

let database = null;
let users = null;
let tournoi = null
let data_to_send = {
    msg: "",
    data: {}
};

initDB();

const app = express();
const port = 3000;
const publicFilesFolder = __dirname.split("\\").slice(0, __dirname.split("\\").length - 1).join("\\") + '/client';

// file storage

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log(file)
        cb(null, publicFilesFolder + '/uploads')
    },
    filename: function (req, file, cb) {
        let extension = file.originalname.split(".")[file.originalname.split(".").length - 1];

        cb(null, file.fieldname + '-' + Date.now()+"."+extension)
    }
})

const upload = multer({ storage: storage })


app.use(bodyParser.json());         // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use(
    session({
        secret: "crate stacker",
        saveUninitialized: false,
        resave: false,
        cookie: {
            maxAge: 24 * 7 * 60 * 60 * 1000
        }
    })
);
app.use(express.static(publicFilesFolder));

app.set('views', publicFilesFolder);
app.set('view engine', 'ejs');


app.post('/upload', upload.single('image'), (req, res) => {
    return res.status(200).send("File uploaded")
})

// Home page
app.get('/', (req, res) => {
    console.log(data_to_send)
    return res.render('users/home', data_to_send);
})

// Login page
app.get('/login', (req, res) => {
    return res.render('users/user_sign_in', data_to_send);
})

app.get('/home', (req, res) => {
    return res.render('users/home', data_to_send);
})

// Sign up page
app.get('/signup', (req, res) => {
    return res.render("users/user_sign_up")
})

// Status page (to delete later)
app.get('/status', (req, res) => {
    if (!req.session.user) {
        res.send("Not connected")
    }
    else {
        res.send("Connected")
    }
})

// Error 404 page 
app.get('/404', (req, res) => {
    return res.render('users/404_page');
})


// If no ressource, redirect
app.get('*', (req, res) => {
    return res.redirect("/404");
});






// Treat sign up
app.post('/signup', (req, res) => {

    const body = req.body;
    const invalidInputs = !body.lastname || !body.firstname || !body.pseudo || !body.email || !body.password || !body.password_confirm || !body.country;

    // Check fields
    if(invalidInputs) {
        data_to_send.msg = "Entrée(s) invalide(s). Veuillez vérifier puis réessayer";
        data_to_send.data = {};
        return res.redirect("/signup");
    }

    // Hashing password using md5
    const clearPass = body.password;
    const hashedPass = crypto.createHash('md5').update(clearPass).digest("hex");

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
        return res.redirect("/users/user_sign_up.html");
    }

    // Hashing password using md5
    const clearPass = body.password;
    const hashedPass = crypto.createHash('md5').update(clearPass).digest("hex");

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
        data_to_send.data = {};
        return res.redirect('/login');
    }

    req.session.user = findUser;

    data_to_send.data = {
        connected: true
    };
    data_to_send.msg = "";
    
    return res.redirect("/");

})


app.post('/createTournament', (req, res) => {
    // TO DO FOR DB
    const body = req.body

    if( !body.nameTournament || !body.date || !body.game) {
        console.log(body.nameTournament)
        console.log(body.date)
        console.log(body.game)
        console.log("Error occured")
            return res.redirect("/admin/new_tournament.html");
        }
    console.log("ça marche enfin");
    tournoi.insertOne({
        Nom : body.nameTournament,
        Date : body.date,
        Lieu : body.place,
        Jeu : body.game,
        Prix : body.priceInscription,
        Sponsor : [{sponsor : body.sponsor, montant : body.sponsorValue}],
        Arbitre : body.arbiter,
        NbMaxJoueur : body.nbMaxPlayer,
        NbMaxSpectateur : body.nbMaxSpectator,
        Commentateur : body.commentator,
        ListeParticipant : []
    });

    return res.status(200).send("Hello World")
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
        database_test = await client.db(DATABASE_NAME_TEST);
        users = await database_test.collection(DATABASE_COLLECTION_TEST);
        database = await client.db(DATABASE_NAME);
        tournoi = await database.collection(DATABASE_COLLECTION_TOURNOI);

        console.log("Connected to database: " + DATABASE_COLLECTION + " (" + DATABASE_NAME + ")");
    }

    catch (e) {
        console.error("Failed to connect to database.");
    }
}