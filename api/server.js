const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const crypto = require('crypto');
const multer = require('multer');
const { error } = require('console');
const { runPrompt } = require('./LLM'); // Adaptez le chemin selon l'emplacement de LLM.js
const { toUnicode } = require('punycode');
const path = require('path');


const uri = `mongodb+srv://${process.env.DB_ID}:${process.env.DB_PASSWORD}@cluster75409.gko0k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster75409`;

const DATABASE_NAME = "Projet_mi_semestre_CIR3";
const DATABASE_COLLECTION = "Client";
const DATABASE_COLLECTION_TOURNOI = "Tournoi";
const DATABASE_COLLECTION_TEST = "user_collection_test";
const DATABASE_NAME_TEST = "user_accounts_test";

let database = null;
let clients = null;
let tournoi = null;
let users = null;
let data_to_send = {
    msg: "",
    data: null,
    user: null
};
let current_treated_file = null;

initDB();

const app = express();
const port = 3000;
const publicFilesFolder = path.join(__dirname, '../client'); // Utilise '..' pour remonter au dossier parent


// file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, publicFilesFolder + '/uploads')
    },
    filename: function (req, file, cb) {
        let extension = file.originalname.split(".")[file.originalname.split(".").length - 1];
        current_treated_file = file.fieldname + '-' + Date.now() + "." + extension;

        cb(null, current_treated_file)

    }
})


function updateDataToSend(req, msg, data) {

    data_to_send.msg = msg || data_to_send.msg || "";
    data_to_send.data = data || data_to_send.data || false;
    data_to_send.user = req.session.user || false;

}


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
    updateDataToSend(req);

    return res.render('users/home', data_to_send);
})

// Login page
app.get('/login', (req, res) => {
    if(req.session.user) 
        return res.redirect('/');

    updateDataToSend(req);

    return res.render('users/user_sign_in', data_to_send);
})

app.get('/home', (req, res) => {
    updateDataToSend(req);

    return res.redirect('/');
})

// Sign up page
app.get('/signup', (req, res) => {
    if(req.session.user) 
        return res.redirect('/');

    updateDataToSend(req);

    return res.render("users/user_sign_up", data_to_send)
})

app.get('/newTournament', (req, res) => {
    if(!req.session.user || !req.session.user.admin) 
        return res.redirect('/');

    updateDataToSend(req);

    return res.render("admin/new_tournament", data_to_send)
})

// Disconnect page
app.get('/disconnect', (req, res) => {
    updateDataToSend(req);

    if (!req.session || !req.session.user)
        return res.redirect('/');

    req.session.user = null;

    data_to_send.connected = false;

    return res.redirect('/');
})

app.get('/admin', (req, res) => {
    if(!req.session.user || !req.session.user.admin) 
        return res.redirect('/');

    updateDataToSend(req);

    return res.render('admin/admin_panel', data_to_send);
})

app.get('/modification', (req, res) => {
    if(!req.session.user) 
        return res.redirect('/');

    updateDataToSend(req);

    return res.render('users/modification', data_to_send);
})

app.get('/management_tournament', (req, res) => {
    if(!req.session.user || !req.session.user.admin) 
        return res.redirect('/');

    updateDataToSend(req);

    return res.render('admin/management_tournament', data_to_send);
})

app.get('/tournament_display', (req, res) => {
    updateDataToSend(req);

    return res.render('users/tournament_display', data_to_send);
})

app.get('/profil', (req, res) => {// pour afficher le profil, il faut avoir un profil
    updateDataToSend(req);

    if (!req.session.user)
        return res.redirect("/")
    
    return res.render('users/user_profil', data_to_send);
})

app.get('/qr_code', (req, res) => {// pour afficher le profil, il faut avoir un profil

    updateDataToSend(req);

    if (!req.session.user || !req.session.user.admin) {
        return res.redirect('/')
    }

    return res.render('admin/camera_qr_code', data_to_send);
})

app.get('/getPlayers/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const full_id = new ObjectId(id);
        const tournament = await tournoi.findOne({ _id: full_id });

        if (!tournament || !tournament.ListeParticipant) {
            return res.status(404).json({ error: "Tournoi ou liste des participants introuvable" });
        }

        res.status(200).json({ players: tournament.ListeMatchMaking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});

app.get('/getJoueurs/:id', async (req, res) => {
    try {
        const id = req.params.id; // Récupère l'ID depuis les paramètres de la requête
        const full_id = new ObjectId(id); // Convertit en ObjectId si nécessaire pour MongoDB

        // Recherche du tournoi avec l'ID donné
        const tournament = await tournoi.findOne({ _id: full_id });

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: "Tournoi non trouvé",
            });
        }

        // Extraction des joueurs de ListeParticipant
        const joueurs = [];
        if (tournament.ListeParticipant && Array.isArray(tournament.ListeParticipant)) {
            tournament.ListeParticipant.forEach(participant => {
                if (Array.isArray(participant) && participant[1] === "Joueur") {
                    joueurs.push(participant); // Ajoute le nom du joueur
                }
            });
        }

        // Retourne la liste des joueurs
        res.status(200).json({
            success: true,
            joueurs: joueurs,
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des joueurs :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur",
        });
    }
});
// Error 404 page 
app.get('/404', (req, res) => {
    updateDataToSend(req);

    return res.render('users/404_page', data_to_send);
})


// If no ressource, redirect
app.get('*', (req, res) => {
    return res.redirect("/404");
});

app.post('/getListeMatchMaking', async (req, res) => {
    try {
        const id = req.body.id;
        const full_id = new ObjectId(id);

        // Récupérer le tournoi
        const tournament = await tournoi.findOne({ _id: full_id });
        if (!tournament) {
            return res.status(404).json({ success: false, message: "Tournoi non trouvé" });
        }

        // Vérifier si ListeMatchMaking existe
        if (!tournament.ListeMatchMaking || tournament.ListeMatchMaking.length === 0) {
            return res.status(404).json({ success: false, message: "Liste de matchmaking vide ou inexistante" });
        }

        res.status(200).json({
            success: true,
            listeMatchMaking: tournament.ListeMatchMaking,
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de la liste :", error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});

app.post('/getTableauMatchMaking', async (req, res) => {
    try {
        const { id } = req.body;
        const full_id = new ObjectId(id);

        const tournament = await tournoi.findOne({ _id: full_id });
        if (!tournament) {
            return res.status(404).json({ success: false, message: "Tournoi non trouvé" });
        }

        const tableauMatchMaking = tournament.TableauMatchMaking || [];
        res.status(200).json({ success: true, tableauMatchMaking });
    } catch (error) {
        console.error("Erreur lors de la récupération du tableau de matchmaking :", error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});


app.post('/matchMaking', async (req, res) => {
    try {
        const id = req.body.id; // ID du tournoi envoyé dans la requête
        const full_id = new ObjectId(id);

        // Recherche du tournoi dans la base de données
        const tournament = await tournoi.findOne({ _id: full_id });
        if (!tournament) {
            return res.status(404).send("Tournoi non trouvé");
        }

        // Extraction des joueurs depuis ListeParticipant
        const joueurs = [];
        if (tournament.ListeParticipant && Array.isArray(tournament.ListeParticipant)) {
            tournament.ListeParticipant.forEach(participant => {
                if (Array.isArray(participant) && participant[1] === "Joueur") {
                    joueurs.push(participant); // Ajoute le nom du joueur
                }
            });
        }
        
        if (joueurs.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Aucun joueur trouvé pour le matchmaking",
            });
        }

        // Simulation ou appel de la logique de matchmaking avec la liste des joueurs
        const playerArray = await runPrompt(joueurs);
        

        // Mise à jour du tournoi avec la liste de matchmaking
        const updateResult = await tournoi.updateOne(
            { _id: full_id }, // Filtre
            { $set: { ListeMatchMaking: playerArray },
                $push : {TableauMatchMaking :  playerArray}} // Mise à jour
        );

        if (updateResult.modifiedCount === 0) {
            console.warn("Aucune modification apportée au tournoi.");
        } else {
            console.log("PlayerArray ajouté au tournoi avec succès !");
        }

        // Réponse JSON avec les données de matchmaking
        res.status(200).json({
            success: true,
            message: "PlayerArray ajouté avec succès",
            playerArray: playerArray,
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des joueurs :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur",
        });
    }
});

app.post('/UpdateTabMatchMaking', async (req,res)=>{
    try{
        const full_id = new ObjectId(req.body.id);
        const newRound = req.body.newRound

        
        
        const updateResult = await tournoi.updateOne(
            { _id: full_id }, // Filtre
            { $push : {TableauMatchMaking :  newRound}} // Mise à jour
        );

        if (updateResult.modifiedCount === 0) {
            console.warn("Aucune modification apportée au tournoi.");
        } else {
            console.log("PlayerArray ajouté au tournoi avec succès !");
        }

    }
    catch (error) {
        console.error("Erreur lors de la mise à jour du tableau :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur",
        });
    } 
});


app.post('/UpdateLeaderBoardAndScore', async (req, res)=>{
    try{
        const full_id = new ObjectId(req.body.id);
        
        var tournament = await tournoi.findOne({_id:full_id})
        rounds = tournament.TableauMatchMaking
        if(rounds.length >= parseInt(tournament.NbMaxJoueur)){rounds.splice(1,1)}
        rounds.reverse()
        
        classement = computeRanking(rounds)
        const listeParticipant = tournament.ListeParticipant
       
        //On update les classements et les scores des joueurs pour le tournoi
        listeParticipant.forEach(async participant=>{
            if(participant[1]=="Joueur"){
                //On met a jour le tournoi avec le score post tournoi et le classement
                var updateResult = await tournoi.updateOne(
                    { _id: full_id, ListeParticipant : {$elemMatch : {0 : participant[0]}}}, // Filtre
                    { $set : {"ListeParticipant.$[elem].2" :  classement[participant[3].trim()]}, 
                    $inc : {"ListeParticipant.$[elem].4" : (parseInt(tournament.NbMaxJoueur) - classement[participant[3].trim()]+1)/parseInt(tournament.NbMaxJoueur)}
                    },{
                        arrayFilters: [{ "elem.0": participant[0] }] // Appliquer la modification uniquement au participant qui correspond à l'email
                    } // Mise à jour
                );
                
                if (updateResult.modifiedCount === 0) {
                    console.warn("Aucune modification apportée au tournoi.");
                } else {
                    console.log("Classement et Score mis a jour avec succès !");
                }
                var updateScoreResult = await clients.updateOne({
                    email : participant[0]}, 
                    {$inc : {score : (parseInt(tournament.NbMaxJoueur) - classement[participant[3].trim()]+1)/parseInt(tournament.NbMaxJoueur)}}
                )
                if (updateScoreResult.modifiedCount === 0) {
                    console.warn("Aucune modification apportée à l'utilisateur.");
                } else {
                    console.log("Score mis a jour avec succès !");
                }

            }
        });
        

    }catch (error) {
        console.error("Erreur lors de la mise à jour du classements :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur",
        });
    } 
})


// Treat sign up
app.post('/signup', upload.single('image'), async (req, res) => {

    const body = req.body;
    const invalidInputs = !body.lastname || !body.firstname || !body.pseudo || !body.email || !body.password || !body.password_confirm || !body.country;

    // Check fields
    if (invalidInputs) {
        data_to_send.msg = "Entrée(s) invalide(s). Veuillez vérifier puis réessayer";
        data_to_send.data = {};
        data_to_send.connected = false;
        return res.redirect("/signup");
    }


    let findUser = await clients.findOne({username: body.pseudo.trim()});

    if(findUser) {
        updateDataToSend(req, "Ce pseudo ou cet email est déjà utilisé, veuillez en choisir une autre");
        return res.redirect("/signup");
    }

    findUser = await clients.findOne({email: body.email.trim()});

    if(findUser) {
        updateDataToSend(req, "Ce pseudo ou cet email est déjà utilisé, veuillez en choisir une autre");
        return res.redirect("/signup");
    }


    // Hashing password using md5
    const clearPass = body.password;
    const hashedPass = crypto.createHash('md5').update(clearPass).digest("hex");



    req.session.user = {
        lastname: body.lastname.trim(),
        firstname: body.firstname.trim(),
        username: body.pseudo.trim(),
        email: body.email.trim(),
        password: hashedPass.trim(),
        country: body.country.trim(),
        profile_picture: current_treated_file,
        score : 0.0,
        admin: false
    }

    data_to_send.connected = true;

    clients.insertOne(req.session.user);

    updateDataToSend(req, "");

    return res.redirect("/");

})

app.post('/signin', async (req, res) => {

    const body = req.body;

    // Check fields
    if (!body.email || !body.password) {
        return res.redirect("/users/user_sign_up");
    }

    // Hashing password using md5
    const clearPass = body.password;
    const hashedPass = crypto.createHash('md5').update(clearPass).digest("hex");

    // Find user by username
    let query = { username: body.email, password: hashedPass };
    let findUser = await clients.findOne(query);

    // Find user by email
    query = { email: body.email, password: hashedPass };
    if (!findUser)
        findUser = await clients.findOne(query);


    // User doesn't exist
    if (!findUser) {
        updateDataToSend(req, "Les identifiants sont incorrects");
        return res.redirect('/login');
    }

    req.session.user = findUser;

    data_to_send.connected = true;

    updateDataToSend(req, "");

    return res.redirect("/");

})



app.post('/getTournamentInfo', async (req, res) => {

    try {

        if (!req.session.user || !req.session.user.admin) {
            return res.json({
                success: false
            });
        }
        
        const id = req.body.id;

        // Vérifie si l'ID est valide avant de créer un ObjectId
        if (!id || !ObjectId.isValid(id)) {
            return res.status(400).send("ID invalide");
        }

        const full_id = new ObjectId(id);

        // Recherche du tournoi dans la base de données
        const result = await tournoi.findOne({ _id: full_id });
        
        res.status(200).json({
            success: true,
            tournament: result
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des tournois :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur",
        });
    }
})


app.post('/getProfilePictureURL', async (req, res) => {

    if (!req.session.user) {
        return res.json({
            success: false
        })
    }

    let findUser = await clients.findOne({ email: req.session.user.email })

    if (!req.session.user) {
        return res.json({
            success: false
        })
    }

    let pictureURL = findUser.profile_picture || null;

    return res.json({
        success: true,
        profilePicture: pictureURL
    })
})


app.post('/createTournament', (req, res) => {
    // TO DO FOR DB
    const body = req.body
    //On crée un id unique pour chaque tournoi

    if (!body.nameTournament || !body.date || !body.game || !body.nbMaxPlayer || !body.nbMaxSpectator || !body.priceInscription) {    
        return res.redirect("/newTournament");
    }
    if(body.nbMaxPlayer <1 || Math.log2(body.nbMaxPlayer) % 1 !== 0){
        return res.redirect("/newTournament");
    }

    tournoi.insertOne({
        Nom: body.nameTournament,
        Date: body.date,
        Lieu: body.place,
        Jeu: body.game,
        Prix: body.priceInscription,
        Sponsor: [{ sponsor: body.sponsor, montant: body.sponsorValue }],
        Arbitre: body.arbiter,
        NbMaxJoueur: body.nbMaxPlayer,
        NbMaxSpectateur: body.nbMaxSpectator,
        Commentateur: body.commentator,
        ListeParticipant: []
    });

    return res.redirect("/admin");
})
app.post('/displayClients', async (req, res) => {
    try {
        // Récupération de tous les clients depuis la collection Client
        const allClients = await clients.find({}).toArray(); // `users` est lié à la collection "Client"

        // Envoi des données en réponse
        res.status(200).json({
            success: true,
            clients: allClients
        });
        
    } catch (error) {
        console.error("Erreur lors de la récupération des clients :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur"
        });
    }
});

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
        // Récupération de la date actuelle
        const today = new Date().toISOString().split('T')[0];

        // Récupération des tournois à venir depuis la collection
        const upcomingTournaments = await tournoi.find({ Date: { $gte: today } }).toArray();

        // Envoi des données filtrées en réponse
        res.status(200).json({
            success: true,
            tournaments: upcomingTournaments
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

        // Vérifie si l'ID est valide avant de créer un ObjectId
        if (!id || !ObjectId.isValid(id)) {
            return res.status(400).send("ID invalide");
        }

        const full_id = new ObjectId(id);

        // Recherche du tournoi dans la base de données
        const result = await tournoi.findOne({ _id: full_id });

        //On verifie s'il reste encore des places de disponibles comme joueur ou spectateur 
        if(req.session.user){
            var nb_player = 0
            var nb_spectator = 0
            result.ListeParticipant.forEach(participant => {
                if(participant[1]=="Joueur")nb_player++;
                else nb_spectator++;
            });
            res.status(200).json({
                success: true,
                tournament: result,
                //On verifie si l'utilisateur est déjà inscrit au tournoi
                alreadyRegister : result.ListeParticipant.some(ligne => ligne[0] === req.session.user.email),
                ticketLeftPlayer : (nb_player == result.NbMaxJoueur),
                ticketLeftSpectator : (nb_spectator == result.NbMaxSpectateur)
            });
        }
        else {
            res.status(200).json({
                success: true,
                tournament: result,
            })
        }
        
    
    } catch (error) {
        console.error("Erreur lors de la récupération des tournois :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur",
        });
    }
});


app.post('/spectatorRegister', async(req, res)=>{
    try{
        const id = req.body;
        const full_id = new ObjectId(id);
        const data_participant = [req.session.user.email,"Spectator"]
        // Mise à jour de la liste des participants
        const result = await tournoi.updateOne(
            { _id: full_id }, // Critère de recherche
            { $push: { ListeParticipant: data_participant } } // Opération de mise à jour
        );

        console.log('Inscrption en tant que spectateur de : ' + req.session.user.email)

        return res.json({
            success: true,
            message: "Inscription avec succès"
        })
    } catch (error) {
        console.error("Erreur lors de l'ajout d'un participant :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur interne du serveur"
        });
    }
});

app.post('/checkValueQR', async (req, res) => {

    if(!req.session.user.admin) {
        return res.json({success: false});
    }

    const userID = new ObjectId(req.body.userID);
    const tournamentID = new ObjectId(req.body.tournamentID);

    const findUser = await clients.findOne({_id: userID});

    if(!findUser) {
        return res.json({success: false});
    }

    const findTournament = await tournoi.findOne({_id: tournamentID})

    if(!findTournament || !findTournament.ListeParticipant) {
        return res.json({success: false});
    }

    let signupUser = findTournament.ListeParticipant.find(user => user[0] == findUser.email);
    
    if(!signupUser) {
        return res.json({success: false});
    }

    return res.json({
        success: true,
        userType: signupUser[1],
        user: findUser
    })
})

app.post('/playerRegister', async(req, res)=>{
    try{
        //On recupère les informations du user afin d'ajouter son score a sa participation
        const info_user = await clients.findOne({email : req.session.user.email})

        const id = req.body;
        const full_id = new ObjectId(id);
        //L'email du participant, s'il est joueur ou spectateur, son classement qui sera update, son pseudo, son score générale permettant le matchmaking
        const data_participant = [req.session.user.email,"Joueur", 0,info_user.username,info_user.score]
        
        // Mise à jour de la liste des participants
        const result = await tournoi.updateOne(
            { _id: full_id }, // Critère de recherche
            { $push: { ListeParticipant: data_participant } } // Opération de mise à jour
        );

        console.log('Inscrption en tant que joueur de : ' + req.session.user.email)

        return res.json({
            success: true,
            message: "Inscription avec succès"
        })
        
    } catch (error) {
        console.error("Erreur lors de l'ajout d'un participant :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur interne du serveur"
        });
    }
});


app.post('/displayProfilTournament', async (req, res) => {

    const emailCherche = req.session.user.email;
    
    try {
        const result = await tournoi.find({
            ListeParticipant: {
                $elemMatch: { 0: emailCherche }
            }
        }).toArray();
        
        res.status(200).json({
            success: true,
            tournaments: result,
            userEmail: req.session.user.email
        });
    } catch (error) {
        console.error("Erreur lors de la recherche :", error);
    }
})
app.post('/getAccountInfo', async (req, res) => {

    if (!req.session.user) {
        return res.json({
            success: false
        });
    }

    try {
        // Récupération de tous les tournois depuis la collection
        const user = await clients.findOne({ email: req.session.user.email });

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

app.post('/updateTournament', async (req, res) => {
    try {
        
        
        const id = req.body.tournament_id;
        const name=req.body.name;
        const game=req.body.game;
        const nbPlayer=req.body.number_player;
        const nbViewer=req.body.number_viewer;
        const place=req.body.place;
        const date=req.body.date;
        const price=req.body.price;
        const referee=req.body.referee;
        const sponsors=[{ sponsor: req.body.sponsor, montant: req.body.sponsorPrice }];
        const commentator=req.body.commentator;
       

        const full_id = new ObjectId(id);
        

        // Recherche du tournoi dans la base de données
        const tournament = await tournoi.findOne({ _id: full_id });
        if (!tournament) {
            return res.status(404).send("Tournoi non trouvé");
        }
        
        // Données à passer à EJS
        
        const updateResult = await tournoi.updateOne(
            { _id: full_id }, // Filtre
            { $set: { Nom:name,
                      Date:date,
                      Lieu:place,
                      Jeu:game,
                      Prix:price,
                      Sponsor:sponsors,
                      Arbitre:referee,
                      Commentateur:commentator    
             } } // Mise à jour
        );

        if (updateResult.modifiedCount === 0) {
            console.warn("Aucune modification apportée au tournoi.");
        } else {
            console.log("Modification ajouté");
        }

        // Rendu de la vue EJS ou réponse JSON
        return res.redirect("/admin");
        // // Rendu de la vue EJS
        
    } catch (error) {
        console.error("Erreur lors de la récupération des tournois :", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur",
        });
    }
});


app.post('/modification', upload.single('image'), async (req, res) => {

    const body = req.body;


    // Hashing password using md5
    const clearPass = body.password;
    const hashedPass = crypto.createHash('md5').update(clearPass).digest("hex");

    const oldEmail = req.session.user.email

    let updatedUser = {
        lastname: body.lastname,
        firstname: body.firstname,
        username: body.pseudo,
        email: oldEmail,
        password: hashedPass,
        country: body.country,
        profile_picture: current_treated_file
    }

    data_to_send.connected = true;
    
    await clients.updateOne({ email: oldEmail }, { $set: updatedUser });

    let findUser = await clients.findOne({email: oldEmail});

    req.session.user = findUser;

    return res.redirect("/");

})


app.listen(port, () => {
    console.log(`\n\n> NEXUS Tournament (listening on port ${port})`);
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
        tournoi = await database.collection(DATABASE_COLLECTION_TOURNOI);
        clients = await database.collection(DATABASE_COLLECTION);

        database_test = await client.db(DATABASE_NAME_TEST);
        users = await database_test.collection(DATABASE_COLLECTION_TEST);

        console.log("Connected to database: " + DATABASE_COLLECTION + " (" + DATABASE_NAME + ")");
    }

    catch (e) {
        console.error("Failed to connect to database.");
    }
}


//Détermination du classement des joueurs pour une competition 
function computeRanking(rounds) {
    const ranking = {}; // Pour stocker le classement final
    const defeatedBy = {}; // Pour suivre qui a été éliminé par qui

    // Parcourir les rounds en partant de la fin (du dernier au premier)
    for (let i = rounds.length - 1; i > 0; i--) {
        const currentRound = rounds[i];
        const previousRound = rounds[i - 1];

        // Identifier les éliminés à ce round
        for (const player of currentRound) {
            if (!previousRound.includes(player)) {
                // Trouver contre qui le joueur a perdu
                const opponent = previousRound.find(p => currentRound.includes(p));
                defeatedBy[player] = opponent;
            }
        }
    }

    // Ajouter le vainqueur en premier (le seul joueur du premier round)
    ranking[rounds[0][0]] = 1;

    // Classement des autres joueurs
    let rank = 2;
    for (let i = 1; i < rounds.length; i++) {
        const currentRound = rounds[i];
        const previousRound = rounds[i - 1];

        for (const player of currentRound) {
            if (!ranking[player]) {
                ranking[player] = rank++;
            }
        }
    }

    // Ajuster les classements pour ceux qui ont perdu contre un joueur mieux classé
    const rankedPlayers = Object.keys(ranking).sort((a, b) => {
        if (ranking[a] === ranking[b]) {
            return ranking[defeatedBy[a]] - ranking[defeatedBy[b]];
        }
        return ranking[a] - ranking[b];
    });

    // Retourner le classement sous forme d'objet
    return rankedPlayers.reduce((result, player, index) => {
        result[player] = index + 1;
        return result;
    }, {});
}

