/**
 * GameLogic implements the core rules of the Kabul card game.
 * See Kabul.md for the full rulebook.
 */
class GameLogic {
    /**
     * @param {Object} initialState - A game state object following kabulGameState.json schema.
     */
    constructor(initialState) {
        // Deep copy to avoid mutating the original
        this.state = JSON.parse(JSON.stringify(initialState));
        this._tempDrawn = null;
    }

    /* ---------- Setup helpers ---------- */

    /** Shuffle deck in-place using Fisher-Yates algorithm. */
    shuffleDeck() {
        const arr = this.state.deck;
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    /** Deal 4 cards to each player from the deck. */
    dealInitialHands() {
        const { players, deck } = this.state;
        players.forEach((p) => {
            p.hand = deck.splice(0, 4);
        });
    }

    /** Place one card face-up to start the discard pile. */
    initializeDiscard() {
        const card = this.state.deck.shift();
        this.state.faceUpCard = card;
        this.state.discardPile.push(card);
    }

    /** Convenience: run full setup sequence. */
    setup() {
        this.shuffleDeck();
        this.dealInitialHands();
        this.initializeDiscard();
    }

    /* ---------- Accessors ---------- */

    getCurrentPlayer() {
        return this.state.players[this.state.currentPlayerIndex];
    }

    getState() {
        return this.state;
    }

    /* ---------- Turn actions ---------- */

    /**
     * Draw a card from deck or discard pile.
     * @param {"deck"|"discard"} source
     * @returns {string} The drawn card.
     */
    drawCard(source = "deck") {
        if (this._tempDrawn !== null) {
            throw new Error("Card already drawn this turn. Swap or discard first.");
        }
        const { deck, discardPile } = this.state;
        let drawn;
        if (source === "deck") {
            if (deck.length === 0) throw new Error("Deck is empty");
            drawn = deck.shift();
        } else if (source === "discard") {
            if (discardPile.length === 0) throw new Error("Discard pile is empty");
            drawn = discardPile.pop();
            // Update face-up card to previous top
            this.state.faceUpCard = discardPile[discardPile.length - 1] || null;
        } else {
            throw new Error("Invalid source. Use 'deck' or 'discard'.");
        }
        this._tempDrawn = drawn;
        return drawn;
    }

    /**
     * Swap the drawn card with one of the current player's hand cards.
     * @param {number} handIndex - Index 0-3 of the card to replace.
     * @returns {string} The card that was replaced (now in discard).
     */
    swapCard(handIndex) {
        if (this._tempDrawn === null) {
            throw new Error("No card drawn this turn.");
        }
        const player = this.getCurrentPlayer();
        if (handIndex < 0 || handIndex > 3) {
            throw new Error("handIndex must be 0-3.");
        }
        const replaced = player.hand[handIndex];
        player.hand[handIndex] = this._tempDrawn;
        this.state.discardPile.push(replaced);
        this.state.faceUpCard = replaced;
        this._tempDrawn = null;
        return replaced;
    }

    /**
     * Discard the drawn card (no swap). Used for cards A-5 if no swap desired,
     * or after using a card effect (6-K).
     */
    discardDrawn() {
        if (this._tempDrawn === null) {
            throw new Error("No card drawn this turn.");
        }
        this.state.discardPile.push(this._tempDrawn);
        this.state.faceUpCard = this._tempDrawn;
        this._tempDrawn = null;
    }

    /**
     * Declare "KABUL!" to end the game.
     * The current player's hand is locked; other players get one more turn each.
     */
    callKabul() {
        const player = this.getCurrentPlayer();
        player.hasCalledKabul = true;
        this.state.gameEnded = true;
        this._kabulCallerIndex = this.state.currentPlayerIndex;
    }

    /**
     * Advance to the next player.
     * @returns {boolean} True if the round is truly complete (returned to caller).
     */
    nextTurn() {
        const { players, currentPlayerIndex } = this.state;
        this.state.currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        // If we've looped back to the player who called Kabul, round is over.
        if (
            this.state.gameEnded &&
            this.state.currentPlayerIndex === this._kabulCallerIndex
        ) {
            this.state.gameEnded = "complete";
            return true;
        }
        return false;
    }

    /* ---------- Costume Presets ---------- */

    static COSTUMES = {
        COSTUME_1: {
            name: 'Classic',
            description: 'Joker: -1, Red Kings: 0',
            jokerValue: -1,
            redKingValue: 0,
        },
        COSTUME_2: {
            name: 'Reversed',
            description: 'Joker: 0, Red Kings: -1',
            jokerValue: 0,
            redKingValue: -1,
        },
    };

    /* ---------- Scoring ---------- */

    /**
     * Compute the total point value of a hand based on Kabul rules.
     * @param {string[]} hand - Array of 4 card strings.
     * @param {string} [costumeKey='COSTUME_1'] - Which costume preset to use.
     * @returns {number}
     */
    static computeHandValue(hand, costumeKey = 'COSTUME_1') {
        return hand.reduce((sum, card) => sum + GameLogic.cardValue(card, costumeKey), 0);
    }

    /**
     * Get the numeric value of a single card.
     * @param {string} card
     * @param {string} [costumeKey='COSTUME_1'] - Which costume preset to use.
     * @returns {number}
     */
    static cardValue(card, costumeKey = 'COSTUME_1') {
        const costume = GameLogic.COSTUMES[costumeKey] || GameLogic.COSTUMES.COSTUME_1;

        if (card === "Joker") return costume.jokerValue;
        if (card === "Red King") return costume.redKingValue;
        // Aces
        if (card.startsWith("A")) return 1;
        // K, Q, J have face value 10 (but K♠/K♣ are not Red Kings, treat as 13)
        if (card.startsWith("K")) return 13;
        if (card.startsWith("Q")) return 12;
        if (card.startsWith("J")) return 11;
        // Numeric cards: parse leading digits
        const num = parseInt(card, 10);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Determine the winner (lowest score). Call after gameEnded === "complete".
     * @returns {{player: Object, score: number}}
     */
    determineWinner() {
        let best = null;
        let bestScore = Infinity;
        for (const p of this.state.players) {
            const score = GameLogic.computeHandValue(p.hand);
            if (score < bestScore) {
                bestScore = score;
                best = p;
            }
        }
        this.state.winner = best ? best.id : null;
        return { player: best, score: bestScore };
    }
}

module.exports = GameLogic;
