// Example usage of GameLogic for Kabul card game

const GameLogic = require("./src/GameLogic");
const initialState = require("./src/kabulGameState.json");

// Create a new game instance
const game = new GameLogic(initialState);

// Run setup (shuffle, deal, discard first card)
game.setup();

console.log("=== Game Initialized ===");
console.log("Face-up card:", game.state.faceUpCard);
console.log("Player 1 hand:", game.state.players[0].hand);
console.log("Player 2 hand:", game.state.players[1].hand);

// --- Player 1 Turn ---
console.log("\n--- Player 1 Turn ---");
const drawnCard = game.drawCard("deck");
console.log("Drew from deck:", drawnCard);

// Swap with first card in hand
const replaced = game.swapCard(0);
console.log("Replaced hand[0] with drawn card. Discarded:", replaced);
console.log("Player 1 hand now:", game.getCurrentPlayer().hand);

game.nextTurn();

// --- Player 2 Turn ---
console.log("\n--- Player 2 Turn ---");
const drawn2 = game.drawCard("discard");
console.log("Drew from discard:", drawn2);

// Discard without swapping
game.discardDrawn();
console.log("Discarded drawn card.");

game.nextTurn();

// --- Player 1 calls KABUL ---
console.log("\n--- Player 1 calls KABUL! ---");
game.callKabul();
console.log("gameEnded:", game.state.gameEnded);

game.nextTurn();

// --- Player 2 final turn ---
console.log("\n--- Player 2 final turn ---");
const drawn3 = game.drawCard("deck");
console.log("Drew:", drawn3);
game.discardDrawn();

const roundOver = game.nextTurn();
console.log("Round complete:", roundOver);

// --- Scoring ---
console.log("\n=== Final Scores ===");
game.state.players.forEach((p) => {
    const score = GameLogic.computeHandValue(p.hand);
    console.log(`${p.name}: ${score} points`, p.hand);
});

const winner = game.determineWinner();
console.log(`\nWinner: ${winner.player.name} with ${winner.score} points!`);
