module.exports = { runPrompt };
require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runPrompt(players) {
  //  const playerstest = [
  //          { name: "Player 1", rank: 5 },
  //          { name: "Player 2", rank: 1 },
  //          { name: "Player 3", rank: 3 },
  //          { name: "Player 4", rank: 4 },
  //          { name: "Player 5", rank: 2 },
  //          { name: "Player 6", rank: 6 },
  //          { name: "Player 7", rank: 7 },
  //          { name: "Player 8", rank: 8 },
  //       ];
  const playersDescription = players
    .map(player => `${player[0]} (Score ${player[4]})`)
    .join("; ");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Remplacez par un modèle gratuit ou public si disponible
      messages: [
        {
          role: "system",
          content: "Tu es un assistant qui aide à organiser des tournois en utilisant les classements des joueurs."
        },
        {
          role: "user",
          content: `Voici les joueurs et leurs classements : ${playersDescription}.
          Crée un arbre de tournoi où les joueurs les mieux classés affrontent les joueurs les moins bien classés.Un plus gros score indique un meilleur classement. Tous les joueurs doivent avoir un match.
          Format attendu : 
          Joueur A vs Joueur B;
          Joueur C vs Joueur D; etc
          donne moi que l'arbre des matchs, sans rien d'autre.` 
        }
      ],
      temperature: 0.7,
      max_tokens: 90,
      top_p: 1,
    });

    // Extraction de la réponse
    const matchesString = response.choices[0].message.content;
    console.log("Réponse brute du modèle :", matchesString);

    // Normaliser la réponse : supprimer les espaces et caractères inutiles
    const normalizedString = matchesString.replace(/\s+/g, " ").trim();
    console.log("Réponse normalisée :", normalizedString);

    // Transformation en tableau
    const playerArray = [];
    const regex = /(.*?)\s+vs\s+(.*?);/g; // Regex pour extraire les joueurs
    let match;
    
    while ((match = regex.exec(normalizedString)) !== null) {
        if (match[1] && match[2]) { // Vérifie que les deux joueurs ont été trouvés
            playerArray.push(match[1].trim()); // Ajoute le premier joueur au tableau
            playerArray.push(match[2].trim()); // Ajoute le deuxième joueur au tableau
        }
    }

    console.log("Tableau des joueurs dans l'ordre :", playerArray);
    return playerArray;
  } catch (error) {
    console.error("Erreur lors de la requête au modèle :", error);
  }
}

// Exemple de liste de joueurs
// const players = [
//   { name: "Player 1", rank: 5 },
//   { name: "Player 2", rank: 1 },
//   { name: "Player 3", rank: 3 },
//   { name: "Player 4", rank: 4 },
//   { name: "Player 5", rank: 2 },
//   { name: "Player 6", rank: 6 },
//   { name: "Player 7", rank: 7 },
//   { name: "Player 8", rank: 8 },
// ];

