let name;
let date;
let place ;
let game;
let price;
let sponsor;
let sponsorValue;
let arbiter;
let nbMaxPlayer;
let nbMaxSpectator;
let commentator;

function GetVariables(){
    name = document.getElementById("nomTournoi");
    date = document.getElementById("date");
    place = document.getElementById("lieu");
    game = document.getElementById("jeu");
    price = document.getElementById("prixInscription");
    sponsor = document.getElementById("sponsor");
    sponsorValue = document.getElementById("montantSponsor");
    arbiter = document.getElementById("arbitres");
    nbMaxPlayer = document.getElementById("nbParticipants");
    nbMaxSpectator = document.getElementById("nbSpectateurs");
    commentator = document.getElementById("commentateurs");
}


async function SaveTourmaments() {
    try {
      name = document.getElementById("nomTournoi");
      date = document.getElementById("date");
      place = document.getElementById("lieu");
      game = document.getElementById("jeu");
      price = document.getElementById("prixInscription");
      sponsor = document.getElementById("sponsor");
      sponsorValue = document.getElementById("montantSponsor");
      arbiter = document.getElementById("arbitres");
      nbMaxPlayer = document.getElementById("nbParticipants");
      nbMaxSpectator = document.getElementById("nbSpectateurs");
      commentator = document.getElementById("commentateurs");
      
        const doc = {
            Nom : name,
            Date : date,
            Lieu : place,
            Jeu : game,
            Prix : price,
            Sponsor : [{sponsor : sponsor, montant : sponsorValue}],
            Arbitre : arbiter,
            NbMaxJoueur : nbMaxPlayer,
            NbMaxSpectateur : nbMaxSpectator,
            Commentateur : commentator,
            ListeParticipant : []
        }

        const request = new Request("http://localhost:3000/createTournament", {
            method: "POST",
            body: JSON.stringify(doc)
          }
        );

        console.log(doc)

        const response = await fetch(request);
        if(response.status == 200) {
          console.log("Nice !")
        }


   } finally {
     // Close the MongoDB client connection
    //await client.close();
  }
}

// Run the function and handle any errors
//SaveTourmaments().catch(console.dir);