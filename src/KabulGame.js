/**
 * Multiplayer Kabul Game Logic (Revised)
 * =========================================
 * 
 * CARD VALUES (Points for final scoring):
 *   Red King (♥, ♦)    -> -1 (best)
 *   Joker              -> 0
 *   Ace                -> 1
 *   2-10               -> face value
 *   Jack               -> 11
 *   Queen              -> 12
 *   Black King (♠, ♣)  -> 13
 * 
 * CARD ABILITIES (when discarded):
 *   7, 8               -> PEEK_SELF (see one of your own cards)
 *   9, 10              -> PEEK_ENEMY (see one opponent's card)
 *   Jack               -> BLIND_SWAP (swap without seeing)
 *   Queen, King        -> SEE_AND_SWAP (swap while seeing both cards)
 *   Others             -> NONE
 */

// ==================== CARD DEFINITIONS ====================

const CARD_VALUES = {
    'Joker': 0,
    'A': 1,
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,  // Black Kings; Red Kings handled separately
};

const CARD_ABILITIES = {
    '7': 'PEEK_SELF',
    '8': 'PEEK_SELF',
    '9': 'PEEK_ENEMY',
    '10': 'PEEK_ENEMY',
    'J': 'BLIND_SWAP',
    'Q': 'SEE_AND_SWAP',
    'K': 'SEE_AND_SWAP',
};

// Pending action states
const ACTION_STATES = {
    CHOOSING_OWN_CARD_TO_PEEK: 'CHOOSING_OWN_CARD_TO_PEEK',
    CHOOSING_ENEMY_CARD_TO_PEEK: 'CHOOSING_ENEMY_CARD_TO_PEEK',
    SWAPPING_CARDS: 'SWAPPING_CARDS',
    SEE_AND_SWAPPING_CARDS: 'SEE_AND_SWAPPING_CARDS',
    PEEK_RESULT: 'PEEK_RESULT',
};

class KabulGame {
    constructor(gameId) {
        this.state = {
            gameId,
            phase: 'WAITING', // WAITING | MEMORIZE | PLAYING | ENDED
            memorizeEndsAt: null,

            players: {},
            turnOrder: [],
            currentTurnIndex: 0,

            deck: [],
            discardPile: [],
            topDiscard: null,

            drawnCard: null,      // { playerId, card }
            pendingAction: null,  // { type, playerId, targetId?, data?, expiresAt }

            kabulCaller: null,
            finalTurnsRemaining: 0,
            winner: null,
        };

        this.CONFIG = {
            MEMORIZE_DURATION: 3000,
            PEEK_DURATION: 3000,
            ACTION_TIMEOUT: 15000,
            SLAP_PENALTY: 1,
        };
    }

    // ==================== SETUP ====================

    addPlayer(playerId, name) {
        if (this.state.phase !== 'WAITING') {
            throw new Error('Game already started');
        }
        this.state.players[playerId] = {
            id: playerId,
            name,
            hand: [],
            hasCalledKabul: false,
            isConnected: true,
        };
        this.state.turnOrder.push(playerId);
    }

    startGame() {
        if (this.state.turnOrder.length < 2) {
            throw new Error('Need at least 2 players');
        }
        this._initDeck();
        this._shuffleDeck();
        this._dealCards();
        this._initDiscard();

        this.state.phase = 'MEMORIZE';
        this.state.memorizeEndsAt = Date.now() + this.CONFIG.MEMORIZE_DURATION;
    }

    endMemorizePhase() {
        if (this.state.phase === 'MEMORIZE') {
            this.state.phase = 'PLAYING';
            this.state.memorizeEndsAt = null;
        }
    }

    // ==================== DECK GENERATION ====================

    _initDeck() {
        const suits = ['♥', '♦', '♠', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.state.deck = [];

        // Generate 52 standard cards
        for (const suit of suits) {
            for (const rank of ranks) {
                this.state.deck.push(this._createCard(rank, suit));
            }
        }

        // Add 2 Jokers
        this.state.deck.push(this._createCard('Joker', null));
        this.state.deck.push(this._createCard('Joker', null));
    }

    _createCard(rank, suit) {
        let value;
        let actionType = CARD_ABILITIES[rank] || 'NONE';

        if (rank === 'Joker') {
            value = 0;
            actionType = 'NONE';
        } else if (rank === 'K') {
            // Red Kings (♥, ♦) = -1, Black Kings (♠, ♣) = 13
            value = (suit === '♥' || suit === '♦') ? -1 : 13;
        } else {
            value = CARD_VALUES[rank];
        }

        const display = suit ? `${rank}${suit}` : rank;

        return {
            id: `${rank}${suit || ''}`,
            rank,
            suit,
            value,
            actionType,
            display,
        };
    }

    _shuffleDeck() {
        const arr = this.state.deck;
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    _dealCards() {
        for (const playerId of this.state.turnOrder) {
            const player = this.state.players[playerId];
            player.hand = [];
            for (let i = 0; i < 4; i++) {
                const card = this.state.deck.shift();
                player.hand.push({ ...card, position: i });
            }
        }
    }

    _initDiscard() {
        const card = this.state.deck.shift();
        this.state.discardPile.push(card);
        this.state.topDiscard = card;
    }

    // ==================== ACCESSORS ====================

    getCurrentPlayerId() {
        return this.state.turnOrder[this.state.currentTurnIndex];
    }

    getPlayer(playerId) {
        return this.state.players[playerId];
    }

    // ==================== CLIENT STATE (MASKED) ====================

    getClientState(playerId) {
        const isMemorize = this.state.phase === 'MEMORIZE';
        const player = this.state.players[playerId];

        return {
            gameId: this.state.gameId,
            phase: this.state.phase,
            memorizeEndsAt: this.state.memorizeEndsAt,

            myHand: this._maskHand(player, playerId, isMemorize),
            peekedCard: this._getPeekedCard(playerId),

            opponents: this._getOpponentsView(playerId),

            topDiscard: this.state.topDiscard ? {
                display: this.state.topDiscard.display,
                value: this.state.topDiscard.value,
                rank: this.state.topDiscard.rank,
            } : null,
            deckCount: this.state.deck.length,

            currentTurn: this.getCurrentPlayerId(),
            isMyTurn: this.getCurrentPlayerId() === playerId,

            drawnCard: this.state.drawnCard?.playerId === playerId
                ? {
                    display: this.state.drawnCard.card.display,
                    value: this.state.drawnCard.card.value,
                    actionType: this.state.drawnCard.card.actionType,
                }
                : null,

            pendingAction: this._getPendingActionView(playerId),
            kabulCaller: this.state.kabulCaller,
            canSlap: this.state.phase === 'PLAYING',
        };
    }

    _maskHand(player, playerId, isMemorize) {
        return player.hand.map((card, idx) => {
            // During MEMORIZE: show front row (position 0, 1) only
            if (isMemorize && idx <= 1) {
                return {
                    position: idx,
                    display: card.display,
                    value: card.value,
                    visible: true,
                };
            }
            // All other times: hidden
            return { position: idx, visible: false };
        });
    }

    _getPeekedCard(playerId) {
        const pending = this.state.pendingAction;
        if (pending && pending.type === ACTION_STATES.PEEK_RESULT && pending.playerId === playerId) {
            return {
                position: pending.handIndex,
                display: pending.card.display,
                value: pending.card.value,
                targetPlayerId: pending.targetId,
                expiresAt: pending.expiresAt,
            };
        }
        return null;
    }

    _getOpponentsView(myPlayerId) {
        return this.state.turnOrder
            .filter(id => id !== myPlayerId)
            .map(id => {
                const p = this.state.players[id];
                return {
                    id: p.id,
                    name: p.name,
                    cardCount: p.hand.length,
                    hasCalledKabul: p.hasCalledKabul,
                };
            });
    }

    _getPendingActionView(playerId) {
        const pending = this.state.pendingAction;
        if (!pending) return null;
        if (pending.playerId !== playerId) return null;

        return {
            type: pending.type,
            expiresAt: pending.expiresAt,
            // Include revealed card for SEE_AND_SWAP
            revealedCard: pending.revealedCard || null,
        };
    }

    // ==================== TURN ACTIONS ====================

    drawCard(playerId, source = 'deck') {
        this._validateTurn(playerId);
        this._validateNoDrawnCard();

        let card;
        if (source === 'deck') {
            if (this.state.deck.length === 0) throw new Error('Deck is empty');
            card = this.state.deck.shift();
        } else if (source === 'discard') {
            if (this.state.discardPile.length === 0) throw new Error('Discard pile is empty');
            card = this.state.discardPile.pop();
            this.state.topDiscard = this.state.discardPile[this.state.discardPile.length - 1] || null;
        } else {
            throw new Error('Invalid source');
        }

        this.state.drawnCard = { playerId, card };
        return { success: true, card: { display: card.display, value: card.value, actionType: card.actionType } };
    }

    swapCard(playerId, handIndex) {
        this._validateTurn(playerId);
        this._validateDrawnCard(playerId);

        const player = this.state.players[playerId];
        if (handIndex < 0 || handIndex >= player.hand.length) {
            throw new Error('Invalid hand index');
        }

        const replaced = player.hand[handIndex];
        player.hand[handIndex] = { ...this.state.drawnCard.card, position: handIndex };

        this._addToDiscard(replaced);
        this._clearDrawnCard();

        // Resolve the ability of the DISCARDED card (the one going to discard pile)
        this._resolveAction(replaced, playerId);

        if (!this.state.pendingAction) {
            this._nextTurn();
        }

        return { success: true, discarded: { display: replaced.display, value: replaced.value } };
    }

    discardDrawn(playerId) {
        this._validateTurn(playerId);
        this._validateDrawnCard(playerId);

        const card = this.state.drawnCard.card;
        this._addToDiscard(card);
        this._clearDrawnCard();

        // Resolve the ability of the discarded card
        this._resolveAction(card, playerId);

        if (!this.state.pendingAction) {
            this._nextTurn();
        }

        return { success: true, discarded: { display: card.display, value: card.value, actionType: card.actionType } };
    }

    // ==================== RESOLVE ACTION (POWER CARDS) ====================

    _resolveAction(card, playerId) {
        const rank = card.rank;

        if (rank === '7' || rank === '8') {
            // PEEK_SELF: Choose one of your own cards to peek
            this.state.pendingAction = {
                type: ACTION_STATES.CHOOSING_OWN_CARD_TO_PEEK,
                playerId,
                expiresAt: Date.now() + this.CONFIG.ACTION_TIMEOUT,
            };
        } else if (rank === '9' || rank === '10') {
            // PEEK_ENEMY: Choose one opponent's card to peek
            this.state.pendingAction = {
                type: ACTION_STATES.CHOOSING_ENEMY_CARD_TO_PEEK,
                playerId,
                expiresAt: Date.now() + this.CONFIG.ACTION_TIMEOUT,
            };
        } else if (rank === 'J') {
            // BLIND_SWAP: Swap without seeing
            this.state.pendingAction = {
                type: ACTION_STATES.SWAPPING_CARDS,
                playerId,
                expiresAt: Date.now() + this.CONFIG.ACTION_TIMEOUT,
            };
        } else if (rank === 'Q' || rank === 'K') {
            // SEE_AND_SWAP: See opponent card then swap
            this.state.pendingAction = {
                type: ACTION_STATES.SEE_AND_SWAPPING_CARDS,
                playerId,
                expiresAt: Date.now() + this.CONFIG.ACTION_TIMEOUT,
            };
        }
        // else: no action (A, 2-6, Joker)
    }

    // ==================== PEEK ACTIONS ====================

    peekOwnCard(playerId, handIndex) {
        this._validatePendingAction(playerId, ACTION_STATES.CHOOSING_OWN_CARD_TO_PEEK);

        const player = this.state.players[playerId];
        if (handIndex < 0 || handIndex >= player.hand.length) {
            throw new Error('Invalid hand index');
        }

        const card = player.hand[handIndex];
        this.state.pendingAction = {
            type: ACTION_STATES.PEEK_RESULT,
            playerId,
            targetId: playerId,
            handIndex,
            card,
            expiresAt: Date.now() + this.CONFIG.PEEK_DURATION,
        };

        setTimeout(() => this._clearPeekAndNextTurn(playerId), this.CONFIG.PEEK_DURATION);

        return { success: true, position: handIndex, card: { display: card.display, value: card.value } };
    }

    peekEnemyCard(playerId, targetId, handIndex) {
        this._validatePendingAction(playerId, ACTION_STATES.CHOOSING_ENEMY_CARD_TO_PEEK);

        if (targetId === playerId) {
            throw new Error('Cannot peek your own card with 9/10');
        }

        const target = this.state.players[targetId];
        if (!target) throw new Error('Invalid target player');
        if (handIndex < 0 || handIndex >= target.hand.length) {
            throw new Error('Invalid hand index');
        }

        const card = target.hand[handIndex];
        this.state.pendingAction = {
            type: ACTION_STATES.PEEK_RESULT,
            playerId,
            targetId,
            handIndex,
            card,
            expiresAt: Date.now() + this.CONFIG.PEEK_DURATION,
        };

        setTimeout(() => this._clearPeekAndNextTurn(playerId), this.CONFIG.PEEK_DURATION);

        return { success: true, targetId, position: handIndex, card: { display: card.display, value: card.value } };
    }

    // ==================== SWAP ACTIONS ====================

    blindSwap(playerId, ownIndex, targetId, targetIndex) {
        this._validatePendingAction(playerId, ACTION_STATES.SWAPPING_CARDS);

        if (targetId === playerId) {
            throw new Error('Cannot swap with yourself');
        }

        const player = this.state.players[playerId];
        const target = this.state.players[targetId];

        if (!target) throw new Error('Invalid target player');
        if (ownIndex < 0 || ownIndex >= player.hand.length) throw new Error('Invalid own index');
        if (targetIndex < 0 || targetIndex >= target.hand.length) throw new Error('Invalid target index');

        // Swap cards (blind - no reveal)
        const ownCard = player.hand[ownIndex];
        const targetCard = target.hand[targetIndex];

        player.hand[ownIndex] = { ...targetCard, position: ownIndex };
        target.hand[targetIndex] = { ...ownCard, position: targetIndex };

        this.state.pendingAction = null;
        this._nextTurn();

        return { success: true, message: 'Cards swapped blindly' };
    }

    seeAndSwap(playerId, ownIndex, targetId, targetIndex) {
        this._validatePendingAction(playerId, ACTION_STATES.SEE_AND_SWAPPING_CARDS);

        if (targetId === playerId) {
            throw new Error('Cannot swap with yourself');
        }

        const player = this.state.players[playerId];
        const target = this.state.players[targetId];

        if (!target) throw new Error('Invalid target player');
        if (ownIndex < 0 || ownIndex >= player.hand.length) throw new Error('Invalid own index');
        if (targetIndex < 0 || targetIndex >= target.hand.length) throw new Error('Invalid target index');

        // Reveal both cards before swapping
        const ownCard = player.hand[ownIndex];
        const targetCard = target.hand[targetIndex];

        // Swap cards
        player.hand[ownIndex] = { ...targetCard, position: ownIndex };
        target.hand[targetIndex] = { ...ownCard, position: targetIndex };

        this.state.pendingAction = null;
        this._nextTurn();

        return {
            success: true,
            message: 'Cards swapped with reveal',
            ownCard: { display: ownCard.display, value: ownCard.value },
            targetCard: { display: targetCard.display, value: targetCard.value },
        };
    }

    skipAction(playerId) {
        if (this.state.pendingAction?.playerId === playerId) {
            this.state.pendingAction = null;
            this._nextTurn();
        }
    }

    _clearPeekAndNextTurn(playerId) {
        if (this.state.pendingAction?.type === ACTION_STATES.PEEK_RESULT &&
            this.state.pendingAction.playerId === playerId) {
            this.state.pendingAction = null;
            this._nextTurn();
        }
    }

    // ==================== SLAPPING (MATCH-DISCARD) ====================

    slap(playerId, handIndex) {
        if (this.state.phase !== 'PLAYING') {
            throw new Error('Cannot slap outside of playing phase');
        }

        const player = this.state.players[playerId];
        if (handIndex < 0 || handIndex >= player.hand.length) {
            throw new Error('Invalid hand index');
        }

        const card = player.hand[handIndex];
        const topRank = this.state.topDiscard?.rank;
        const cardRank = card.rank;

        if (cardRank === topRank) {
            // SUCCESS: Remove card from hand
            player.hand.splice(handIndex, 1);
            player.hand.forEach((c, i) => c.position = i);
            this._addToDiscard(card);

            return { success: true, message: 'Match! Card removed.' };
        } else {
            // PENALTY: Add 1 card from deck
            if (this.state.deck.length > 0) {
                const penalty = this.state.deck.shift();
                player.hand.push({ ...penalty, position: player.hand.length });
            }

            return {
                success: false,
                message: 'Wrong! +1 card penalty.',
                newCardCount: player.hand.length,
            };
        }
    }

    // ==================== KABUL ====================

    callKabul(playerId) {
        this._validateTurn(playerId);

        if (this.state.drawnCard) {
            throw new Error('Must discard or swap before calling Kabul');
        }

        const player = this.state.players[playerId];
        player.hasCalledKabul = true;
        this.state.kabulCaller = playerId;
        this.state.finalTurnsRemaining = this.state.turnOrder.length - 1;

        // Advance to next player WITHOUT decrementing finalTurnsRemaining
        // (the decrement happens when each player completes their final turn)
        this.state.currentTurnIndex =
            (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;

        return { success: true, message: 'KABUL! Other players get 1 final turn.' };
    }

    // ==================== TURN MANAGEMENT ====================

    _nextTurn() {
        // Advance to next player
        this.state.currentTurnIndex =
            (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;

        // Skip the player who called Kabul
        if (this.getCurrentPlayerId() === this.state.kabulCaller) {
            this.state.currentTurnIndex =
                (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;
        }

        // If Kabul was called, track final turns
        if (this.state.kabulCaller) {
            this.state.finalTurnsRemaining--;
            if (this.state.finalTurnsRemaining <= 0) {
                this._endGame();
                return;
            }
        }
    }

    _endGame() {
        this.state.phase = 'ENDED';

        let bestPlayer = null;
        let bestScore = Infinity;

        for (const playerId of this.state.turnOrder) {
            const player = this.state.players[playerId];
            const score = this._computeHandValue(player.hand);
            player.finalScore = score;

            if (score < bestScore) {
                bestScore = score;
                bestPlayer = player;
            }
        }

        this.state.winner = bestPlayer?.id || null;
    }

    // ==================== SCORING ====================

    _computeHandValue(hand) {
        return hand.reduce((sum, card) => sum + card.value, 0);
    }

    // ==================== HELPERS ====================

    _addToDiscard(card) {
        this.state.discardPile.push(card);
        this.state.topDiscard = card;
    }

    _clearDrawnCard() {
        this.state.drawnCard = null;
    }

    _validateTurn(playerId) {
        if (this.state.phase !== 'PLAYING') {
            throw new Error('Game is not in playing phase');
        }
        if (this.getCurrentPlayerId() !== playerId) {
            throw new Error('Not your turn');
        }
    }

    _validateNoDrawnCard() {
        if (this.state.drawnCard) {
            throw new Error('Already drew a card this turn');
        }
    }

    _validateDrawnCard(playerId) {
        if (!this.state.drawnCard || this.state.drawnCard.playerId !== playerId) {
            throw new Error('No card drawn this turn');
        }
    }

    _validatePendingAction(playerId, type) {
        const pending = this.state.pendingAction;
        if (!pending || pending.playerId !== playerId || pending.type !== type) {
            throw new Error(`No pending ${type} action`);
        }
        if (Date.now() > pending.expiresAt) {
            this.state.pendingAction = null;
            throw new Error('Action expired');
        }
    }

    // ==================== SERIALIZATION ====================

    getServerState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    loadServerState(state) {
        this.state = JSON.parse(JSON.stringify(state));
    }
}

module.exports = { KabulGame, CARD_VALUES, CARD_ABILITIES, ACTION_STATES };
