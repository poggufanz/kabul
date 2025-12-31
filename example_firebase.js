/**
 * Example usage of FirebaseService for Kabul game
 * This demonstrates the ability flow for Q/K (See & Swap)
 */

// NOTE: This is a conceptual example. In practice, you would:
// 1. Have Firebase Admin SDK on server for deck operations
// 2. Client-side Firebase SDK for listeners

const { FirebaseService, ACTION, TURN_PHASE } = require('./src/FirebaseService');

// Firebase config (replace with your own)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project.firebaseio.com",
    projectId: "your-project",
};

async function demonstrateGameFlow() {
    console.log("=== Kabul Firebase Service Demo ===\n");

    // Initialize service
    const service = new FirebaseService(firebaseConfig);
    const roomId = "test-room-001";

    // --- Player 1 connects ---
    console.log("--- Player 1 joins and listens ---");
    service.listenToRoom(roomId, "player1", (state) => {
        console.log("[P1 Update]", {
            phase: state.gameState?.phase,
            turn: state.gameState?.currentTurn,
            turnPhase: state.gameState?.turnPhase,
            abilityState: state.gameState?.abilityState?.type,
            myPrivate: state.myPrivate,
        });
    });

    // --- Simulate game already in progress ---
    // Player 1's turn, draws a Queen

    console.log("\n--- Player 1 draws from deck ---");
    // await service.performAction(roomId, "player1", ACTION.DRAW_DECK);

    console.log("\n--- Player 1 discards Queen (triggers SEE_AND_SWAP) ---");
    // await service.performAction(roomId, "player1", ACTION.DISCARD_DRAWN);
    // This sets:
    //   turnPhase: 'SELECTING_TARGET'
    //   abilityState: { type: 'SEE_AND_SWAP', activePlayer: 'player1', step: 'SELECTING_OWN' }

    console.log("\n--- Player 1 selects own card index 0 ---");
    // await service.performAction(roomId, "player1", ACTION.SELECT_OWN_CARD, { handIndex: 0 });
    // step becomes 'SELECTING_TARGET_PLAYER'

    console.log("\n--- Player 1 selects target player2 ---");
    // await service.performAction(roomId, "player1", ACTION.SELECT_TARGET_PLAYER, { targetPlayerId: "player2" });
    // step becomes 'SELECTING_TARGET_CARD'

    console.log("\n--- Player 1 selects target card index 2 ---");
    // This reveals both cards to player1 via private node
    // await service.performAction(roomId, "player1", ACTION.SELECT_ENEMY_CARD, { targetPlayerId: "player2", handIndex: 2 });
    // Returns: { ownCard: {...}, targetCard: {...} }
    // step becomes 'CONFIRMING'

    console.log("\n--- Player 1 confirms swap ---");
    // await service.performAction(roomId, "player1", ACTION.CONFIRM_SWAP, { ownIndex: 0, targetIndex: 2 });
    // Swap executed, turn advances to player2

    // --- Slapping example (race condition handled) ---
    console.log("\n--- Player 2 attempts slap match ---");
    // await service.performAction(roomId, "player2", ACTION.SLAP_MATCH, { handIndex: 1 });
    // Uses runTransaction to prevent race conditions

    // Cleanup
    service.stopListening(roomId);
    console.log("\n=== Demo Complete ===");
}

// Database structure reference
console.log(`
=== Firebase Database Structure ===

/rooms/{roomId}/
├── gameState/
│   ├── phase: 'WAITING' | 'MEMORIZE' | 'PLAYING' | 'ENDED'
│   ├── currentTurn: playerId
│   ├── turnPhase: 'DRAWING' | 'DISCARDING' | 'SELECTING_TARGET' | ...
│   ├── abilityState: {
│   │     type: 'SEE_AND_SWAP',
│   │     activePlayer: playerId,
│   │     targetPlayer: playerId,
│   │     ownCardIndex: number,
│   │     targetCardIndex: number,
│   │     step: 'SELECTING_OWN' | 'SELECTING_TARGET_PLAYER' | 'CONFIRMING'
│   │   }
│   ├── topDiscard: { rank, suit, value, display }
│   ├── deckCount: number
│   └── kabulCaller: playerId | null
│
├── players/{playerId}/
│   ├── name: string
│   ├── hand: [{ rank, suit, value, display } | { hidden: true }]
│   └── hasCalledKabul: boolean
│
├── deck: [cards...] (SERVER ONLY - security rules deny client)
│
├── discardPile: [cards...]
│
└── private/{playerId}/
    ├── drawnCard: { rank, suit, value, display, actionType }
    └── revealedCard: { position, rank, suit, value, display, expiresAt }

=== Action Types ===
DRAW_DECK       - Draw from deck
DRAW_DISCARD    - Draw from discard pile
SWAP_CARD       - Swap drawn card with hand card
DISCARD_DRAWN   - Discard drawn card (may trigger ability)
SLAP_MATCH      - Attempt to slap match (any time)
CALL_KABUL      - Declare Kabul
SELECT_OWN_CARD   - For PEEK_SELF / ability selection
SELECT_ENEMY_CARD - For PEEK_ENEMY / swap target
CONFIRM_SWAP      - Execute swap after reveal (Q/K)
SKIP_ABILITY      - Skip power card ability

=== Power Card Flow ===

7/8 (PEEK_SELF):
  1. Discard 7/8 → turnPhase: SELECTING_OWN_CARD
  2. Select own card → Card revealed in private/{playerId}/revealedCard
  3. After 3s → Turn advances

9/10 (PEEK_ENEMY):
  1. Discard 9/10 → turnPhase: SELECTING_TARGET
  2. Select enemy card → Card revealed in private node
  3. After 3s → Turn advances

J (BLIND_SWAP):
  1. Discard J → Select own card
  2. Select target player
  3. Select target card → Swap executed (no reveal)

Q/K (SEE_AND_SWAP):
  1. Discard Q/K → Select own card
  2. Select target player
  3. Select target card → BOTH cards revealed to active player
  4. Confirm → Swap executed
`);

// demonstrateGameFlow();
