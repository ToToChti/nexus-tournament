const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const crypto = require('crypto');
const multer = require('multer');

const uri = `mongodb+srv://${process.env.DB_ID}:${process.env.DB_PASSWORD}@cluster75409.gko0k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster75409`;

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
    data: {},
    connected: false
};
let current_treated_file = null;

initDB();

const app = express();
const port = 3000;
const publicFilesFolder = __dirname.split("\\").slice(0, __dirname.split("\\").length - 1).join("\\") + '/client';

// file storage

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, publicFilesFolder + '/uploads')
    },
    filename: function (req, file, cb) {
        let extension = file.originalname.split(".")[file.originalname.split(".").length - 1];
        current_treated_file= file.fieldname + '-' + Date.now()+"."+extension;

        cb(null, current_treated_file)

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

app.get('/NewTournament', (req, res) => {
    return res.render("admin/new_tournament")
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

// Disconnect page
app.get('/disconnect', (req, res) => {
    if(!req.session || !req.session.user)
        return res.redirect('/');

    req.session.user = null;
    
    data_to_send.connected = false;

    return res.redirect('/');
})

app.get('/admin', (req, res) => {
    return res.render('admin/admin_panel');
})

app.get('/modification', (req, res) => {
    return res.render('users/modification');
})

app.get('/Management_tournament', (req, res) => {
    return res.render('admin/Management_tournament');
})

app.get('/tournament_display', (req, res) => {
    return res.render('users/Tournament_display');
})

app.get('/profil',(req,res)=> {// pour afficher le profil, il faut avoir un profil
    if (!req.session.user) {
        res.send("Not connected")
    }
    else return res.render('users/user_profil');
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
app.post('/signup', upload.single('image'), (req, res) => {

    const body = req.body;
    const invalidInputs = !body.lastname || !body.firstname || !body.pseudo || !body.email || !body.password || !body.password_confirm || !body.country;

    // Check fields
    if(invalidInputs) {
        data_to_send.msg = "Entrée(s) invalide(s). Veuillez vérifier puis réessayer";
        data_to_send.data = {};
        data_to_send.connected = false;
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
        country: body.country,
        profile_picture : current_treated_file
    }

    data_to_send.connected = true;
    console.log(req.session.user)
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
        data_to_send.connected = false;
        return res.redirect('/login');
    }

    req.session.user = findUser;

    data_to_send.connected = true;
    
    return res.redirect("/");

})


app.post('/createTournament',(req, res) => {
    // TO DO FOR DB
    const body = req.body
    //On crée un id unique pour chaque tournoi

    if( !body.nameTournament || !body.date || !body.game) {
        console.log(body.nameTournament)
        console.log(body.date)
        console.log(body.game)
        console.log("Error occured")
            return res.redirect("/admin/new_tournament");
        }
        
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

    return res.redirect("/admin");
})

app.post('/displayTournamentAdmin', async (req, res) => {
    try {
        // Récupération de tous les tournois depuis la collection
        const allTournaments = await tournoi.find({}).toArray();

        // Envoi des données en réponse
        res.status(200).json({
            success: true,
            tournaments: allTournaments
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des tournois :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur"
        });
    }
});

app.post('/displayTournamentHome', async (req, res) => {
    try {
        // Récupération de tous les tournois depuis la collection
        const allTournaments = await tournoi.find({}).toArray();

        // Envoi des données en réponse
        res.status(200).json({
            success: true,
            tournaments: allTournaments
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des tournois :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur"
        });
    }
});

app.post('/displayOneTournament', async (req, res) => {
    try {
        const id = req.body.id;
        console.log("ID reçu :", id);

        // Vérifie si l'ID est valide avant de créer un ObjectId
        if (!id || !ObjectId.isValid(id)) {
            return res.status(400).send("ID invalide");
        }

        const full_id = new ObjectId(id);
        console.log("ObjectId créé :", full_id);

        // Recherche du tournoi dans la base de données
        const tournament = await tournoi.findOne({ _id: full_id });
        if (!tournament) {
            return res.status(404).send("Tournoi non trouvé");
        }
        console.log(tournament)
        // Données à passer à EJS
        const data_to_display = {
            nameTournament: tournament.Nom || "Non Renseigné",
            game: tournament.Jeu || "Non Renseigné",
            nbMaxPlayer: tournament.NbMaxJoueur || "Non Renseigné",
            nbMaxSpectator: tournament.NbMaxSpectateur || "Non Renseigné",
            place: tournament.Lieu || "Non Renseigné",
            date: tournament.Date || "Non Renseigné",
            priceInscription: tournament.Prix || "Non Renseigné",
            arbiter: tournament.Arbitre || "Non Renseigné",
             commentator: tournament.Commentateur || "Non Renseigné",
        };

        console.log("Données envoyées à EJS :", data_to_display);

        // // Rendu de la vue EJS
        //res.render('users/Tournament_display', data_to_display);
    } catch (error) {
        console.error("Erreur lors de la récupération des tournois :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur",
        });
    }
});

app.post('/getAccountInfo', async (req, res) => {

    if(!req.session.user) {
        return res.redirect('/login');
    }

    try {
        // Récupération de tous les tournois depuis la collection
        const user = await users.findOne({email: req.session.user.email});

        console.log(user)

        // Envoi des données en réponse
        res.status(200).json({
            success: true,
            infoUser: user
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des tournois :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur"
        });
    }
});


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