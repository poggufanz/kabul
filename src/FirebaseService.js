/**
 * Firebase Service Layer for Kabul Multiplayer Game
 * ==================================================
 * 
 * Database Structure:
 * /rooms/{roomId}/
 *   ├── gameState/
 *   │   ├── phase: 'WAITING' | 'MEMORIZE' | 'PLAYING' | 'ENDED'
 *   │   ├── currentTurn: playerId
 *   │   ├── turnPhase: 'DRAWING' | 'DISCARDING' | 'RESOLVING_ABILITY' | 'SELECTING_TARGET' | 'CONFIRMING_SWAP'
 *   │   ├── abilityState: { type, activePlayer, targetPlayer, targetCardIndex, ownCardIndex, step }
 *   │   ├── topDiscard: { rank, suit, value, display }
 *   │   ├── deckCount: number
 *   │   ├── kabulCaller: playerId | null
 *   │   ├── finalTurnsRemaining: number
 *   │   └── winner: playerId | null
 *   │
 *   ├── players/{playerId}/
 *   │   ├── name: string
 *   │   ├── hand: [{ hidden: true } | { rank, suit, value, display }]
 *   │   ├── cardCount: number
 *   │   └── hasCalledKabul: boolean
 *   │
 *   ├── discardPile: [card objects]
 *   │
 *   ├── deck: [card objects] (SERVER ONLY - security rules deny client read)
 *   │
 *   └── private/{playerId}/
 *       ├── revealedCard: { position, rank, suit, value, display, expiresAt }
 *       └── drawnCard: { rank, suit, value, display, actionType }
 * 
 * Card Abilities:
 *   7/8  -> PEEK_SELF (see own card)
 *   9/10 -> PEEK_ENEMY (see opponent card)
 *   J    -> BLIND_SWAP (swap without seeing)
 *   Q/K  -> SEE_AND_SWAP (see then swap)
 */

const { initializeApp } = require('firebase/app');
const {
    getDatabase,
    ref,
    set,
    get,
    update,
    push,
    onValue,
    off,
    runTransaction,
    serverTimestamp
} = require('firebase/database');

// Card definitions (must match KabulGame.js)
const CARD_VALUES = {
    'Joker': 0, 'A': 1,
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13,
};

const CARD_ABILITIES = {
    '7': 'PEEK_SELF', '8': 'PEEK_SELF',
    '9': 'PEEK_ENEMY', '10': 'PEEK_ENEMY',
    'J': 'BLIND_SWAP',
    'Q': 'SEE_AND_SWAP', 'K': 'SEE_AND_SWAP',
};

// Turn phases
const TURN_PHASE = {
    DRAWING: 'DRAWING',
    DISCARDING: 'DISCARDING',
    RESOLVING_ABILITY: 'RESOLVING_ABILITY',
    SELECTING_TARGET: 'SELECTING_TARGET',
    SELECTING_OWN_CARD: 'SELECTING_OWN_CARD',
    CONFIRMING_SWAP: 'CONFIRMING_SWAP',
    WAITING: 'WAITING',
};

// Action types
const ACTION = {
    DRAW_DECK: 'DRAW_DECK',
    DRAW_DISCARD: 'DRAW_DISCARD',
    SWAP_CARD: 'SWAP_CARD',
    DISCARD_DRAWN: 'DISCARD_DRAWN',
    SLAP_MATCH: 'SLAP_MATCH',
    CALL_KABUL: 'CALL_KABUL',
    // Ability actions
    SELECT_OWN_CARD: 'SELECT_OWN_CARD',
    SELECT_ENEMY_CARD: 'SELECT_ENEMY_CARD',
    SELECT_TARGET_PLAYER: 'SELECT_TARGET_PLAYER',
    CONFIRM_SWAP: 'CONFIRM_SWAP',
    SKIP_ABILITY: 'SKIP_ABILITY',
};

class FirebaseService {
    constructor(firebaseConfig) {
        this.app = initializeApp(firebaseConfig);
        this.db = getDatabase(this.app);
        this.listeners = new Map();
        this.currentPlayerId = null;
    }

    // ==================== REFERENCES ====================

    _roomRef(roomId) {
        return ref(this.db, `rooms/${roomId}`);
    }

    _gameStateRef(roomId) {
        return ref(this.db, `rooms/${roomId}/gameState`);
    }

    _playerRef(roomId, playerId) {
        return ref(this.db, `rooms/${roomId}/players/${playerId}`);
    }

    _privateRef(roomId, playerId) {
        return ref(this.db, `rooms/${roomId}/private/${playerId}`);
    }

    _deckRef(roomId) {
        return ref(this.db, `rooms/${roomId}/deck`);
    }

    _discardRef(roomId) {
        return ref(this.db, `rooms/${roomId}/discardPile`);
    }

    // ==================== LISTENERS ====================

    /**
     * Subscribe to room changes
     * @param {string} roomId 
     * @param {Function} callback - Called with { gameState, players, myHand, myPrivate }
     */
    listenToRoom(roomId, playerId, callback) {
        this.currentPlayerId = playerId;

        // Listen to public game state
        const gameStateRef = this._gameStateRef(roomId);
        const gameStateListener = onValue(gameStateRef, async (snapshot) => {
            const gameState = snapshot.val();

            // Get all players public info
            const playersSnapshot = await get(ref(this.db, `rooms/${roomId}/players`));
            const players = playersSnapshot.val() || {};

            // Get my private data
            const privateSnapshot = await get(this._privateRef(roomId, playerId));
            const myPrivate = privateSnapshot.val() || {};

            // Get my hand (only I can see my own cards)
            const myHand = players[playerId]?.hand || [];

            callback({
                gameState,
                players: this._maskPlayers(players, playerId),
                myHand,
                myPrivate,
            });
        });

        // Listen to my private data
        const privateRef = this._privateRef(roomId, playerId);
        const privateListener = onValue(privateRef, (snapshot) => {
            // Private data updated - will be included in next gameState callback
        });

        this.listeners.set(roomId, { gameStateListener, privateListener, gameStateRef, privateRef });
    }

    /**
     * Stop listening to room
     */
    stopListening(roomId) {
        const listener = this.listeners.get(roomId);
        if (listener) {
            off(listener.gameStateRef);
            off(listener.privateRef);
            this.listeners.delete(roomId);
        }
    }

    /**
     * Mask other players' hands
     */
    _maskPlayers(players, myPlayerId) {
        const masked = {};
        for (const [pid, player] of Object.entries(players)) {
            masked[pid] = {
                ...player,
                hand: pid === myPlayerId
                    ? player.hand
                    : player.hand.map(() => ({ hidden: true })),
            };
        }
        return masked;
    }

    // ==================== MAIN ACTION DISPATCHER ====================

    /**
     * Single entry point for all game actions
     * @param {string} roomId 
     * @param {string} playerId 
     * @param {string} actionType - One of ACTION constants
     * @param {Object} payload - Action-specific data
     */
    async performAction(roomId, playerId, actionType, payload = {}) {
        switch (actionType) {
            case ACTION.DRAW_DECK:
                return this._drawCard(roomId, playerId, 'deck');
            case ACTION.DRAW_DISCARD:
                return this._drawCard(roomId, playerId, 'discard');
            case ACTION.SWAP_CARD:
                return this._swapCard(roomId, playerId, payload.handIndex);
            case ACTION.DISCARD_DRAWN:
                return this._discardDrawn(roomId, playerId);
            case ACTION.SLAP_MATCH:
                return this._slapMatch(roomId, playerId, payload.handIndex);
            case ACTION.CALL_KABUL:
                return this._callKabul(roomId, playerId);

            // Ability actions
            case ACTION.SELECT_OWN_CARD:
                return this._selectOwnCard(roomId, playerId, payload.handIndex);
            case ACTION.SELECT_ENEMY_CARD:
                return this._selectEnemyCard(roomId, playerId, payload.targetPlayerId, payload.handIndex);
            case ACTION.SELECT_TARGET_PLAYER:
                return this._selectTargetPlayer(roomId, playerId, payload.targetPlayerId);
            case ACTION.CONFIRM_SWAP:
                return this._confirmSwap(roomId, playerId, payload.ownIndex, payload.targetIndex);
            case ACTION.SKIP_ABILITY:
                return this._skipAbility(roomId, playerId);

            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }
    }

    // ==================== DRAW ACTIONS (with Transaction) ====================

    async _drawCard(roomId, playerId, source) {
        const deckRef = this._deckRef(roomId);
        const gameStateRef = this._gameStateRef(roomId);
        const privateRef = this._privateRef(roomId, playerId);

        // Use transaction to prevent race conditions
        const result = await runTransaction(deckRef, (deck) => {
            if (!deck || deck.length === 0) {
                return; // Abort - deck empty
            }
            // Remove top card
            return deck;
        });

        if (!result.committed) {
            throw new Error('Deck is empty');
        }

        // Get fresh state
        const gameStateSnapshot = await get(gameStateRef);
        const gameState = gameStateSnapshot.val();

        // Validate turn
        if (gameState.currentTurn !== playerId) {
            throw new Error('Not your turn');
        }
        if (gameState.turnPhase !== TURN_PHASE.DRAWING) {
            throw new Error('Invalid turn phase');
        }

        let drawnCard;
        if (source === 'deck') {
            // Transaction: pop from deck
            const deckTxResult = await runTransaction(deckRef, (deck) => {
                if (!deck || deck.length === 0) return;
                drawnCard = deck.shift();
                return deck;
            });

            if (!deckTxResult.committed) {
                throw new Error('Failed to draw from deck');
            }

            // Update deck count
            await update(gameStateRef, {
                deckCount: deckTxResult.snapshot.val()?.length || 0,
                turnPhase: TURN_PHASE.DISCARDING,
            });
        } else {
            // Draw from discard
            const discardRef = this._discardRef(roomId);
            const discardTxResult = await runTransaction(discardRef, (pile) => {
                if (!pile || pile.length === 0) return;
                drawnCard = pile.pop();
                return pile;
            });

            if (!discardTxResult.committed) {
                throw new Error('Discard pile is empty');
            }

            // Update top discard
            const newPile = discardTxResult.snapshot.val() || [];
            await update(gameStateRef, {
                topDiscard: newPile[newPile.length - 1] || null,
                turnPhase: TURN_PHASE.DISCARDING,
            });
        }

        // Store drawn card in player's private node
        await set(privateRef, {
            drawnCard: {
                rank: drawnCard.rank,
                suit: drawnCard.suit,
                value: drawnCard.value,
                display: drawnCard.display,
                actionType: CARD_ABILITIES[drawnCard.rank] || 'NONE',
            },
        });

        return { success: true, card: drawnCard };
    }

    // ==================== SWAP / DISCARD ====================

    async _swapCard(roomId, playerId, handIndex) {
        const gameStateRef = this._gameStateRef(roomId);
        const playerRef = this._playerRef(roomId, playerId);
        const privateRef = this._privateRef(roomId, playerId);
        const discardRef = this._discardRef(roomId);

        // Get current state
        const [gameStateSnap, playerSnap, privateSnap] = await Promise.all([
            get(gameStateRef),
            get(playerRef),
            get(privateRef),
        ]);

        const gameState = gameStateSnap.val();
        const player = playerSnap.val();
        const privateData = privateSnap.val();

        // Validate
        if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
        if (gameState.turnPhase !== TURN_PHASE.DISCARDING) throw new Error('Must draw first');
        if (!privateData?.drawnCard) throw new Error('No card drawn');
        if (handIndex < 0 || handIndex >= player.hand.length) throw new Error('Invalid hand index');

        const drawnCard = privateData.drawnCard;
        const replacedCard = player.hand[handIndex];

        // Update hand
        const newHand = [...player.hand];
        newHand[handIndex] = {
            rank: drawnCard.rank,
            suit: drawnCard.suit,
            value: drawnCard.value,
            display: drawnCard.display,
        };

        // Add replaced card to discard
        await runTransaction(discardRef, (pile) => {
            pile = pile || [];
            pile.push(replacedCard);
            return pile;
        });

        // Update player hand
        await update(playerRef, { hand: newHand });

        // Update game state
        await update(gameStateRef, { topDiscard: replacedCard });

        // Clear private drawn card
        await set(privateRef, { drawnCard: null });

        // Check if replaced card has ability
        const ability = CARD_ABILITIES[replacedCard.rank];
        if (ability) {
            return this._initiateAbility(roomId, playerId, ability, replacedCard);
        }

        // No ability - advance turn
        return this._advanceTurn(roomId, playerId);
    }

    async _discardDrawn(roomId, playerId) {
        const gameStateRef = this._gameStateRef(roomId);
        const privateRef = this._privateRef(roomId, playerId);
        const discardRef = this._discardRef(roomId);

        const [gameStateSnap, privateSnap] = await Promise.all([
            get(gameStateRef),
            get(privateRef),
        ]);

        const gameState = gameStateSnap.val();
        const privateData = privateSnap.val();

        if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
        if (gameState.turnPhase !== TURN_PHASE.DISCARDING) throw new Error('Must draw first');
        if (!privateData?.drawnCard) throw new Error('No card drawn');

        const discardedCard = privateData.drawnCard;

        // Add to discard pile
        await runTransaction(discardRef, (pile) => {
            pile = pile || [];
            pile.push(discardedCard);
            return pile;
        });

        // Update top discard
        await update(gameStateRef, { topDiscard: discardedCard });

        // Clear private
        await set(privateRef, { drawnCard: null });

        // Check ability
        const ability = CARD_ABILITIES[discardedCard.rank];
        if (ability) {
            return this._initiateAbility(roomId, playerId, ability, discardedCard);
        }

        return this._advanceTurn(roomId, playerId);
    }

    // ==================== ABILITY HANDLING ====================

    async _initiateAbility(roomId, playerId, ability, card) {
        const gameStateRef = this._gameStateRef(roomId);

        let turnPhase, abilityState;

        switch (ability) {
            case 'PEEK_SELF':
                // 7/8: Select own card to peek
                turnPhase = TURN_PHASE.SELECTING_OWN_CARD;
                abilityState = {
                    type: 'PEEK_SELF',
                    activePlayer: playerId,
                    step: 'SELECTING',
                };
                break;

            case 'PEEK_ENEMY':
                // 9/10: Select target player first, then card
                turnPhase = TURN_PHASE.SELECTING_TARGET;
                abilityState = {
                    type: 'PEEK_ENEMY',
                    activePlayer: playerId,
                    targetPlayer: null,
                    targetCardIndex: null,
                    step: 'SELECTING_PLAYER',
                };
                break;

            case 'BLIND_SWAP':
                // J: Select own card and target card (without seeing)
                turnPhase = TURN_PHASE.SELECTING_TARGET;
                abilityState = {
                    type: 'BLIND_SWAP',
                    activePlayer: playerId,
                    ownCardIndex: null,
                    targetPlayer: null,
                    targetCardIndex: null,
                    step: 'SELECTING_OWN',
                };
                break;

            case 'SEE_AND_SWAP':
                // Q/K: Multi-step - select target, reveal, then swap
                turnPhase = TURN_PHASE.SELECTING_TARGET;
                abilityState = {
                    type: 'SEE_AND_SWAP',
                    activePlayer: playerId,
                    ownCardIndex: null,
                    targetPlayer: null,
                    targetCardIndex: null,
                    revealedCardValue: null,
                    step: 'SELECTING_OWN',
                };
                break;
        }

        await update(gameStateRef, {
            turnPhase,
            abilityState,
        });

        return { success: true, abilityInitiated: ability };
    }

    // ==================== PEEK SELF (7/8) ====================

    async _selectOwnCard(roomId, playerId, handIndex) {
        const gameStateRef = this._gameStateRef(roomId);
        const playerRef = this._playerRef(roomId, playerId);
        const privateRef = this._privateRef(roomId, playerId);

        const [gameStateSnap, playerSnap] = await Promise.all([
            get(gameStateRef),
            get(playerRef),
        ]);

        const gameState = gameStateSnap.val();
        const player = playerSnap.val();

        // Validate
        if (gameState.abilityState?.activePlayer !== playerId) {
            throw new Error('Not your ability turn');
        }
        if (gameState.abilityState?.type !== 'PEEK_SELF') {
            throw new Error('Wrong ability type');
        }

        const card = player.hand[handIndex];

        // Reveal card ONLY to this player via private node
        await set(privateRef, {
            revealedCard: {
                position: handIndex,
                rank: card.rank,
                suit: card.suit,
                value: card.value,
                display: card.display,
                expiresAt: Date.now() + 3000, // 3 second reveal
            },
        });

        // Complete ability and advance turn
        await update(gameStateRef, {
            turnPhase: TURN_PHASE.WAITING,
            abilityState: null,
        });

        // Schedule cleanup and turn advance
        setTimeout(async () => {
            await set(privateRef, { revealedCard: null });
            await this._advanceTurn(roomId, playerId);
        }, 3000);

        return { success: true, revealed: card };
    }

    // ==================== PEEK ENEMY (9/10) ====================

    async _selectEnemyCard(roomId, playerId, targetPlayerId, handIndex) {
        const gameStateRef = this._gameStateRef(roomId);
        const targetPlayerRef = this._playerRef(roomId, targetPlayerId);
        const privateRef = this._privateRef(roomId, playerId);

        const [gameStateSnap, targetSnap] = await Promise.all([
            get(gameStateRef),
            get(targetPlayerRef),
        ]);

        const gameState = gameStateSnap.val();
        const target = targetSnap.val();

        if (gameState.abilityState?.activePlayer !== playerId) {
            throw new Error('Not your ability turn');
        }
        if (gameState.abilityState?.type !== 'PEEK_ENEMY') {
            throw new Error('Wrong ability type');
        }
        if (targetPlayerId === playerId) {
            throw new Error('Cannot peek your own card with 9/10');
        }

        const card = target.hand[handIndex];

        // Reveal to active player ONLY
        await set(privateRef, {
            revealedCard: {
                position: handIndex,
                targetPlayerId,
                rank: card.rank,
                suit: card.suit,
                value: card.value,
                display: card.display,
                expiresAt: Date.now() + 3000,
            },
        });

        await update(gameStateRef, {
            turnPhase: TURN_PHASE.WAITING,
            abilityState: null,
        });

        setTimeout(async () => {
            await set(privateRef, { revealedCard: null });
            await this._advanceTurn(roomId, playerId);
        }, 3000);

        return { success: true, revealed: card };
    }

    // ==================== BLIND SWAP (J) ====================

    async _handleBlindSwapStep(roomId, playerId, payload) {
        const gameStateRef = this._gameStateRef(roomId);
        const gameStateSnap = await get(gameStateRef);
        const gameState = gameStateSnap.val();
        const ability = gameState.abilityState;

        if (ability?.activePlayer !== playerId || ability?.type !== 'BLIND_SWAP') {
            throw new Error('Invalid ability state');
        }

        switch (ability.step) {
            case 'SELECTING_OWN':
                // Step 1: Player selects their own card
                await update(gameStateRef, {
                    'abilityState/ownCardIndex': payload.ownIndex,
                    'abilityState/step': 'SELECTING_TARGET',
                });
                return { success: true, step: 'SELECTING_TARGET' };

            case 'SELECTING_TARGET':
                // Step 2: Player selects target player
                await update(gameStateRef, {
                    'abilityState/targetPlayer': payload.targetPlayerId,
                    'abilityState/step': 'SELECTING_TARGET_CARD',
                });
                return { success: true, step: 'SELECTING_TARGET_CARD' };

            case 'SELECTING_TARGET_CARD':
                // Step 3: Player selects target card - execute swap
                return this._executeBlindSwap(roomId, playerId, ability.ownCardIndex, ability.targetPlayer, payload.targetIndex);
        }
    }

    async _executeBlindSwap(roomId, playerId, ownIndex, targetPlayerId, targetIndex) {
        const playerRef = this._playerRef(roomId, playerId);
        const targetRef = this._playerRef(roomId, targetPlayerId);
        const gameStateRef = this._gameStateRef(roomId);

        const [playerSnap, targetSnap] = await Promise.all([
            get(playerRef),
            get(targetRef),
        ]);

        const player = playerSnap.val();
        const target = targetSnap.val();

        // Swap cards (blind - no reveal)
        const ownCard = player.hand[ownIndex];
        const targetCard = target.hand[targetIndex];

        const newPlayerHand = [...player.hand];
        const newTargetHand = [...target.hand];

        newPlayerHand[ownIndex] = targetCard;
        newTargetHand[targetIndex] = ownCard;

        await Promise.all([
            update(playerRef, { hand: newPlayerHand }),
            update(targetRef, { hand: newTargetHand }),
        ]);

        await update(gameStateRef, {
            turnPhase: TURN_PHASE.WAITING,
            abilityState: null,
        });

        return this._advanceTurn(roomId, playerId);
    }

    // ==================== SEE AND SWAP (Q/K) ====================

    /**
     * Step A: Player selects their own card to swap
     */
    async _seeSwapSelectOwn(roomId, playerId, ownIndex) {
        const gameStateRef = this._gameStateRef(roomId);

        await update(gameStateRef, {
            'abilityState/ownCardIndex': ownIndex,
            'abilityState/step': 'SELECTING_TARGET_PLAYER',
        });

        return { success: true, step: 'SELECTING_TARGET_PLAYER' };
    }

    /**
     * Step B: Player selects target player
     */
    async _seeSwapSelectTarget(roomId, playerId, targetPlayerId) {
        const gameStateRef = this._gameStateRef(roomId);

        await update(gameStateRef, {
            'abilityState/targetPlayer': targetPlayerId,
            'abilityState/step': 'SELECTING_TARGET_CARD',
        });

        return { success: true, step: 'SELECTING_TARGET_CARD' };
    }

    /**
     * Step C: Player selects target card - REVEAL to player only, then wait for confirmation
     */
    async _seeSwapReveal(roomId, playerId, targetIndex) {
        const gameStateRef = this._gameStateRef(roomId);
        const gameStateSnap = await get(gameStateRef);
        const ability = gameStateSnap.val().abilityState;

        const targetRef = this._playerRef(roomId, ability.targetPlayer);
        const targetSnap = await get(targetRef);
        const targetCard = targetSnap.val().hand[targetIndex];

        const privateRef = this._privateRef(roomId, playerId);

        // Reveal target card to active player ONLY via private node
        await set(privateRef, {
            revealedCard: {
                position: targetIndex,
                targetPlayerId: ability.targetPlayer,
                rank: targetCard.rank,
                suit: targetCard.suit,
                value: targetCard.value,
                display: targetCard.display,
            },
        });

        // Also get own card for display
        const playerRef = this._playerRef(roomId, playerId);
        const playerSnap = await get(playerRef);
        const ownCard = playerSnap.val().hand[ability.ownCardIndex];

        await update(gameStateRef, {
            'abilityState/targetCardIndex': targetIndex,
            'abilityState/step': 'CONFIRMING',
            turnPhase: TURN_PHASE.CONFIRMING_SWAP,
        });

        return {
            success: true,
            step: 'CONFIRMING',
            ownCard: { display: ownCard.display, value: ownCard.value },
            targetCard: { display: targetCard.display, value: targetCard.value },
        };
    }

    /**
     * Step D: Player confirms swap - execute
     */
    async _confirmSwap(roomId, playerId, ownIndex, targetIndex) {
        const gameStateRef = this._gameStateRef(roomId);
        const gameStateSnap = await get(gameStateRef);
        const ability = gameStateSnap.val().abilityState;

        if (ability?.activePlayer !== playerId) {
            throw new Error('Not your ability');
        }

        const playerRef = this._playerRef(roomId, playerId);
        const targetRef = this._playerRef(roomId, ability.targetPlayer);
        const privateRef = this._privateRef(roomId, playerId);

        const [playerSnap, targetSnap] = await Promise.all([
            get(playerRef),
            get(targetRef),
        ]);

        const player = playerSnap.val();
        const target = targetSnap.val();

        // Execute swap
        const ownCard = player.hand[ability.ownCardIndex];
        const targetCard = target.hand[ability.targetCardIndex];

        const newPlayerHand = [...player.hand];
        const newTargetHand = [...target.hand];

        newPlayerHand[ability.ownCardIndex] = targetCard;
        newTargetHand[ability.targetCardIndex] = ownCard;

        await Promise.all([
            update(playerRef, { hand: newPlayerHand }),
            update(targetRef, { hand: newTargetHand }),
            set(privateRef, { revealedCard: null }),
            update(gameStateRef, {
                turnPhase: TURN_PHASE.WAITING,
                abilityState: null,
            }),
        ]);

        return this._advanceTurn(roomId, playerId);
    }

    // ==================== SLAP MATCH (Transaction for Race Condition) ====================

    async _slapMatch(roomId, playerId, handIndex) {
        const gameStateRef = this._gameStateRef(roomId);
        const playerRef = this._playerRef(roomId, playerId);
        const discardRef = this._discardRef(roomId);
        const deckRef = this._deckRef(roomId);

        // Use transaction to handle race condition
        const result = await runTransaction(discardRef, async (pile) => {
            if (!pile || pile.length === 0) return pile;

            // Get player's card
            const playerSnap = await get(playerRef);
            const player = playerSnap.val();
            const card = player.hand[handIndex];

            const topCard = pile[pile.length - 1];

            if (card.rank === topCard.rank) {
                // Match! Add card to pile
                pile.push(card);
                return pile;
            }

            // No match - don't modify pile
            return undefined; // Abort transaction
        });

        if (result.committed) {
            // Success - remove card from hand
            const playerSnap = await get(playerRef);
            const player = playerSnap.val();
            const newHand = [...player.hand];
            const removedCard = newHand.splice(handIndex, 1)[0];

            await update(playerRef, { hand: newHand, cardCount: newHand.length });
            await update(gameStateRef, { topDiscard: removedCard });

            return { success: true, message: 'Match! Card removed.' };
        } else {
            // Failed match - add penalty card
            const penaltyResult = await runTransaction(deckRef, (deck) => {
                if (!deck || deck.length === 0) return deck;
                return deck; // We'll pop after
            });

            if (penaltyResult.committed && penaltyResult.snapshot.val()?.length > 0) {
                const deckTx = await runTransaction(deckRef, (deck) => {
                    if (!deck || deck.length === 0) return deck;
                    deck.shift(); // Remove penalty card
                    return deck;
                });

                // Add penalty to player hand
                const deckSnap = await get(deckRef);
                const deck = deckSnap.val() || [];
                const penalty = penaltyResult.snapshot.val()[0]; // Get the removed card

                const playerSnap = await get(playerRef);
                const player = playerSnap.val();
                const newHand = [...player.hand, penalty];

                await update(playerRef, { hand: newHand, cardCount: newHand.length });
                await update(gameStateRef, { deckCount: deck.length });
            }

            return { success: false, message: 'Wrong! +1 card penalty.' };
        }
    }

    // ==================== KABUL ====================

    async _callKabul(roomId, playerId) {
        const gameStateRef = this._gameStateRef(roomId);
        const playerRef = this._playerRef(roomId, playerId);

        const gameStateSnap = await get(gameStateRef);
        const gameState = gameStateSnap.val();

        if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
        if (gameState.turnPhase !== TURN_PHASE.DRAWING) throw new Error('Can only call Kabul at start of turn');

        const playersSnap = await get(ref(this.db, `rooms/${roomId}/players`));
        const players = playersSnap.val();
        const playerCount = Object.keys(players).length;

        await update(playerRef, { hasCalledKabul: true });

        await update(gameStateRef, {
            kabulCaller: playerId,
            finalTurnsRemaining: playerCount - 1,
        });

        // Advance to next player (without decrementing)
        return this._advanceTurnAfterKabul(roomId, playerId, playerCount);
    }

    // ==================== SKIP ABILITY ====================

    async _skipAbility(roomId, playerId) {
        const gameStateRef = this._gameStateRef(roomId);
        const privateRef = this._privateRef(roomId, playerId);

        await Promise.all([
            update(gameStateRef, {
                turnPhase: TURN_PHASE.WAITING,
                abilityState: null,
            }),
            set(privateRef, { revealedCard: null }),
        ]);

        return this._advanceTurn(roomId, playerId);
    }

    // ==================== TURN MANAGEMENT ====================

    async _advanceTurn(roomId, currentPlayerId) {
        const gameStateRef = this._gameStateRef(roomId);
        const playersRef = ref(this.db, `rooms/${roomId}/players`);

        const [gameStateSnap, playersSnap] = await Promise.all([
            get(gameStateRef),
            get(playersRef),
        ]);

        const gameState = gameStateSnap.val();
        const players = Object.keys(playersSnap.val());
        const currentIndex = players.indexOf(currentPlayerId);

        let nextIndex = (currentIndex + 1) % players.length;
        let nextPlayer = players[nextIndex];

        // Skip Kabul caller
        if (nextPlayer === gameState.kabulCaller) {
            nextIndex = (nextIndex + 1) % players.length;
            nextPlayer = players[nextIndex];
        }

        // Handle Kabul end game
        if (gameState.kabulCaller) {
            const remaining = gameState.finalTurnsRemaining - 1;
            if (remaining <= 0) {
                return this._endGame(roomId);
            }
            await update(gameStateRef, { finalTurnsRemaining: remaining });
        }

        await update(gameStateRef, {
            currentTurn: nextPlayer,
            turnPhase: TURN_PHASE.DRAWING,
        });

        return { success: true, nextTurn: nextPlayer };
    }

    async _advanceTurnAfterKabul(roomId, kabulCallerId, playerCount) {
        const gameStateRef = this._gameStateRef(roomId);
        const playersRef = ref(this.db, `rooms/${roomId}/players`);

        const playersSnap = await get(playersRef);
        const players = Object.keys(playersSnap.val());
        const currentIndex = players.indexOf(kabulCallerId);
        const nextIndex = (currentIndex + 1) % players.length;

        await update(gameStateRef, {
            currentTurn: players[nextIndex],
            turnPhase: TURN_PHASE.DRAWING,
        });

        return { success: true, message: 'KABUL! Others get 1 final turn.' };
    }

    async _endGame(roomId) {
        const gameStateRef = this._gameStateRef(roomId);
        const playersRef = ref(this.db, `rooms/${roomId}/players`);

        const playersSnap = await get(playersRef);
        const players = playersSnap.val();

        let winner = null;
        let lowestScore = Infinity;

        for (const [pid, player] of Object.entries(players)) {
            const score = player.hand.reduce((sum, card) => sum + card.value, 0);

            // Update player with final score
            await update(this._playerRef(roomId, pid), { finalScore: score });

            if (score < lowestScore) {
                lowestScore = score;
                winner = pid;
            }
        }

        await update(gameStateRef, {
            phase: 'ENDED',
            winner,
            turnPhase: TURN_PHASE.WAITING,
            abilityState: null,
        });

        return { success: true, winner, score: lowestScore };
    }
}

module.exports = { FirebaseService, ACTION, TURN_PHASE };
