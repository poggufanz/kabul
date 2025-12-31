// Example usage of KabulGame (Multiplayer version)

const KabulGame = require("./src/KabulGame");

// Create game instance
const game = new KabulGame("game-001");

// Add players
game.addPlayer("alice", "Alice");
game.addPlayer("bob", "Bob");
game.addPlayer("charlie", "Charlie");

// Start game (enters MEMORIZE phase for 3 seconds)
game.startGame();
console.log("=== Game Started (MEMORIZE PHASE) ===");
console.log("Phase:", game.state.phase);

// Get client state for Alice (during MEMORIZE - can see front row)
const aliceView = game.getClientState("alice");
console.log("\n--- Alice's View (MEMORIZE) ---");
console.log("My hand:", aliceView.myHand);
console.log("Opponents:", aliceView.opponents);

// Simulate memorize phase ending
game.endMemorizePhase();
console.log("\n=== MEMORIZE ENDED - PLAYING PHASE ===");

// Alice's view now (all cards hidden)
const alicePlayView = game.getClientState("alice");
console.log("Alice's hand (all masked):", alicePlayView.myHand);

// --- Alice's Turn ---
console.log("\n--- Alice's Turn ---");
console.log("Current turn:", game.getCurrentPlayerId());

const drawn = game.drawCard("alice", "deck");
console.log("Alice drew from deck:", drawn.card);

// Alice swaps with position 0
const swap = game.swapCard("alice", 0);
console.log("Alice swapped, discarded:", swap.discarded);

// Clear any pending power card action for simplicity
if (game.state.pendingAction) {
    console.log("Power card triggered:", game.state.pendingAction.type);
    game.skipPeek("alice");
}

// --- Bob's Turn ---
console.log("\n--- Bob's Turn ---");
console.log("Current turn:", game.getCurrentPlayerId());

const bobDraw = game.drawCard("bob", "deck");
console.log("Bob drew:", bobDraw.card);

// Bob discards
game.discardDrawn("bob");
console.log("Bob discarded");

// Clear any pending power card
if (game.state.pendingAction) {
    console.log("Power card triggered:", game.state.pendingAction.type);
    game.skipPeek("bob");
}

// --- Charlie tries SLAP ---
console.log("\n--- Charlie Slaps ---");
console.log("Top discard:", game.state.topDiscard);

// Charlie tries to slap with position 0
const slapResult = game.slap("charlie", 0);
console.log("Slap result:", slapResult);
console.log("Charlie's card count:", game.state.players["charlie"].hand.length);

// --- Continue to KABUL scenario ---
console.log("\n--- Alice calls KABUL ---");

// It's Charlie's turn now, skip to Alice
console.log("Current turn before skip:", game.getCurrentPlayerId());
game.state.currentTurnIndex = 0; // Reset to Alice
game.state.pendingAction = null;

// Alice calls KABUL
const kabul = game.callKabul("alice");
console.log(kabul.message);
console.log("Final turns remaining:", game.state.finalTurnsRemaining);

// Bob's final turn
console.log("\n--- Bob's Final Turn ---");
console.log("Current turn:", game.getCurrentPlayerId());
game.drawCard("bob", "deck");
game.discardDrawn("bob");
if (game.state.pendingAction) game.skipPeek("bob");
console.log("Phase after Bob:", game.state.phase);

// Charlie's final turn (if game not ended)
if (game.state.phase !== "ENDED") {
    console.log("\n--- Charlie's Final Turn ---");
    console.log("Current turn:", game.getCurrentPlayerId());
    game.drawCard("charlie", "deck");
    game.discardDrawn("charlie");
    if (game.state.pendingAction) game.skipPeek("charlie");
}

// Game should be ENDED now
console.log("\n=== GAME ENDED ===");
console.log("Phase:", game.state.phase);
console.log("Winner:", game.state.winner);

// Final scores
console.log("\nFinal Scores:");
for (const playerId of game.state.turnOrder) {
    const p = game.state.players[playerId];
    console.log(`${p.name}: ${p.finalScore} points`, p.hand.map(c => c.value));
}
