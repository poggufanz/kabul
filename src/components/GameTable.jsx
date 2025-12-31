import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import Card, { OpponentCard, DrawPile, DiscardPile } from './Card';

/**
 * GameTable Component - Main game table with player positioning
 * 
 * Props:
 * - gameState: object from Firebase
 * - myPlayerId: string
 * - players: object with player data
 * - myHand: array of cards
 * - myPrivate: object with drawnCard, revealedCard
 * - onDrawDeck: function
 * - onDrawDiscard: function
 * - onSwapCard: function(handIndex)
 * - onDiscardDrawn: function
 * - onSlap: function(handIndex)
 * - onCallKabul: function
 * - onSelectOwnCard: function(handIndex)
 * - onSelectEnemyCard: function(targetId, handIndex)
 * - onConfirmSwap: function
 * - onSkipAbility: function
 * - onOpenRules: function
 */
const GameTable = ({
    gameState = {},
    myPlayerId,
    players = {},
    myHand = [],
    myPrivate = {},
    onDrawDeck,
    onDrawDiscard,
    onSwapCard,
    onDiscardDrawn,
    onSlap,
    onCallKabul,
    onSelectOwnCard,
    onSelectEnemyCard,
    onConfirmSwap,
    onSkipAbility,
    onOpenRules,
    onLogout,
}) => {
    const [selectedCardIndex, setSelectedCardIndex] = useState(null);

    const isMyTurn = gameState.currentTurn === myPlayerId;
    const turnPhase = gameState.turnPhase || 'WAITING';
    const abilityState = gameState.abilityState;
    const drawnCard = myPrivate?.drawnCard;
    const revealedCard = myPrivate?.revealedCard;

    // Get opponents positioned around the table
    const playerIds = Object.keys(players);
    const myIndex = playerIds.indexOf(myPlayerId);

    // Rotate players so current player is at bottom
    const getPositionedPlayers = () => {
        const others = playerIds.filter(id => id !== myPlayerId);
        const positions = { top: null, left: null, right: null };

        if (others.length === 1) {
            positions.top = others[0];
        } else if (others.length === 2) {
            positions.left = others[0];
            positions.right = others[1];
        } else if (others.length >= 3) {
            positions.left = others[0];
            positions.top = others[1];
            positions.right = others[2];
        }

        return positions;
    };

    const positioned = getPositionedPlayers();

    // Get action message
    const getActionMessage = () => {
        if (!isMyTurn) return `${players[gameState.currentTurn]?.name || 'Opponent'}'s Turn`;

        switch (turnPhase) {
            case 'DRAWING':
                return 'Draw a card to start';
            case 'DISCARDING':
                return 'Swap with hand or discard';
            case 'SELECTING_OWN_CARD':
                return 'Select your card to peek';
            case 'SELECTING_TARGET':
                if (abilityState?.type === 'PEEK_ENEMY') return 'Select opponent card to peek';
                return 'Select target player';
            case 'CONFIRMING_SWAP':
                return 'Confirm swap?';
            default:
                return 'Waiting...';
        }
    };

    // Handle card click in my hand
    const handleMyCardClick = (index) => {
        if (turnPhase === 'DISCARDING' && drawnCard) {
            // Swap drawn card with this card
            onSwapCard?.(index);
        } else if (turnPhase === 'SELECTING_OWN_CARD') {
            // Peek own card
            onSelectOwnCard?.(index);
        } else if (abilityState?.type === 'BLIND_SWAP' || abilityState?.type === 'SEE_AND_SWAP') {
            // Select own card for swap
            setSelectedCardIndex(index);
            onSelectOwnCard?.(index);
        } else if (isMyTurn) {
            // Slap attempt
            onSlap?.(index);
        }
    };

    // Handle opponent card click
    const handleOpponentCardClick = (playerId, cardIndex) => {
        if (turnPhase === 'SELECTING_TARGET' || abilityState?.step === 'SELECTING_TARGET_CARD') {
            onSelectEnemyCard?.(playerId, cardIndex);
        }
    };

    // Player card grid component
    const PlayerHand = ({ playerId, cards, position, name, score }) => {
        const isTarget = abilityState?.targetPlayer === playerId;
        const showSelection = turnPhase === 'SELECTING_TARGET' && abilityState?.activePlayer === myPlayerId;

        return (
            <div className={clsx(
                'flex flex-col items-center gap-3',
                position === 'left' && 'flex-row items-center gap-4',
                position === 'right' && 'flex-row-reverse items-center gap-4'
            )}>
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2">
                    <div className="relative group">
                        <div
                            className={clsx(
                                'size-12 md:size-14 rounded-full bg-cover bg-center border-2 shadow-lg',
                                isTarget ? 'border-primary ring-2 ring-primary/30' : 'border-[#3d4650]'
                            )}
                            style={{ backgroundColor: '#283039' }}
                        >
                            <span className="flex items-center justify-center h-full text-white font-bold text-lg">
                                {name?.[0]?.toUpperCase() || '?'}
                            </span>
                        </div>
                        {/* Score badge */}
                        {score !== undefined && (
                            <div className="absolute -bottom-1 -right-1 bg-[#283039] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#1e2732]">
                                {score}
                            </div>
                        )}
                    </div>
                    <p className="text-white/60 text-xs font-medium">{name}</p>
                </div>

                {/* Cards */}
                <div className={clsx(
                    'grid grid-cols-2 gap-2 p-2 bg-[#111418]/50 rounded-xl border border-white/5',
                    showSelection && 'ring-2 ring-primary/30'
                )}>
                    {(cards || [0, 1, 2, 3]).map((card, idx) => (
                        <OpponentCard
                            key={idx}
                            onClick={() => handleOpponentCardClick(playerId, idx)}
                            isSelected={isTarget && abilityState?.targetCardIndex === idx}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 md:p-6 w-full max-w-[1440px] mx-auto overflow-hidden">
            {/* Game Status Banner */}
            <div className="w-full max-w-[960px] flex justify-between items-center mb-6">
                <div className="bg-[#283039] px-4 py-2 rounded-full flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                    <span className="text-white text-sm font-medium">
                        {gameState.finalTurnsRemaining
                            ? `Final: ${gameState.finalTurnsRemaining}`
                            : '00:00'}
                    </span>
                </div>

                <h3 className="text-white tracking-light text-xl md:text-2xl font-bold leading-tight text-center">
                    {gameState.kabulCaller
                        ? <><span className="text-yellow-400">KABUL!</span> by {players[gameState.kabulCaller]?.name}</>
                        : <>Round • <span className={isMyTurn ? 'text-primary' : 'text-white/60'}>{isMyTurn ? 'Your Turn' : 'Waiting'}</span></>
                    }
                </h3>

                <div className="bg-[#283039] px-4 py-2 rounded-full flex items-center gap-2">
                    <span className="material-symbols-outlined text-white text-sm">layers</span>
                    <span className="text-white text-sm font-medium">Deck: {gameState.deckCount || 0}</span>
                </div>
            </div>

            {/* Table Surface */}
            <div className="relative w-full max-w-[1100px] aspect-[4/3] md:aspect-[16/9] bg-[#1e2732] rounded-3xl shadow-2xl border border-[#283039] flex flex-col p-4 md:p-8 overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2a3541] to-[#151b24]">

                {/* Grid Layout for Table */}
                <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-3 h-full w-full gap-4">

                    {/* TOP OPPONENT */}
                    <div className="col-span-1 md:col-start-2 md:row-start-1 flex flex-col items-center justify-start z-10">
                        {positioned.top && (
                            <PlayerHand
                                playerId={positioned.top}
                                cards={players[positioned.top]?.hand}
                                position="top"
                                name={players[positioned.top]?.name}
                                score={players[positioned.top]?.finalScore}
                            />
                        )}
                    </div>

                    {/* LEFT OPPONENT */}
                    <div className="hidden md:flex col-start-1 row-start-2 items-center justify-start z-10 pl-4">
                        {positioned.left && (
                            <PlayerHand
                                playerId={positioned.left}
                                cards={players[positioned.left]?.hand}
                                position="left"
                                name={players[positioned.left]?.name}
                                score={players[positioned.left]?.finalScore}
                            />
                        )}
                    </div>

                    {/* CENTER DECKS */}
                    <div className="col-span-1 md:col-start-2 md:row-start-2 flex flex-col items-center justify-center z-20">
                        <div className="flex gap-6 md:gap-8 items-center">
                            {/* Draw Pile */}
                            <DrawPile
                                deckCount={gameState.deckCount || 0}
                                onClick={onDrawDeck}
                                isDisabled={!isMyTurn || turnPhase !== 'DRAWING'}
                            />

                            {/* Discard Pile */}
                            <DiscardPile
                                topCard={gameState.topDiscard}
                                onClick={turnPhase === 'DRAWING' ? onDrawDiscard : undefined}
                            />
                        </div>

                        {/* Drawn Card Preview */}
                        {drawnCard && (
                            <div className="mt-4 flex flex-col items-center gap-2">
                                <span className="text-primary text-xs font-bold uppercase">Drawn Card</span>
                                <Card
                                    rank={drawnCard.rank}
                                    suit={drawnCard.suit}
                                    size="md"
                                    isSelected={true}
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={onDiscardDrawn}
                                        className="bg-[#283039] hover:bg-[#323b46] text-white text-xs font-bold py-2 px-4 rounded-lg"
                                    >
                                        Discard
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Revealed Card (from peek) */}
                        {revealedCard && (
                            <div className="mt-4 flex flex-col items-center gap-2 animate-pulse">
                                <span className="text-yellow-400 text-xs font-bold uppercase">Revealed!</span>
                                <Card
                                    rank={revealedCard.rank}
                                    suit={revealedCard.suit}
                                    size="md"
                                    isSelected={true}
                                />
                            </div>
                        )}
                    </div>

                    {/* RIGHT OPPONENT */}
                    <div className="hidden md:flex col-start-3 row-start-2 items-center justify-end z-10 pr-4">
                        {positioned.right && (
                            <PlayerHand
                                playerId={positioned.right}
                                cards={players[positioned.right]?.hand}
                                position="right"
                                name={players[positioned.right]?.name}
                                score={players[positioned.right]?.finalScore}
                            />
                        )}
                    </div>

                    {/* PLAYER (Bottom) */}
                    <div className="col-span-1 md:col-start-2 md:row-start-3 flex flex-col items-center justify-end pb-2 md:pb-6 z-30">
                        {/* Action Instruction */}
                        <div className={clsx(
                            'mb-4',
                            isMyTurn && 'animate-bounce'
                        )}>
                            <span className={clsx(
                                'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-md',
                                isMyTurn
                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                    : 'bg-white/10 text-white/60 border border-white/10'
                            )}>
                                {getActionMessage()}
                            </span>
                        </div>

                        <div className="flex items-center gap-6">
                            {/* Player Grid */}
                            <div className={clsx(
                                'grid grid-cols-2 gap-3 md:gap-4 p-4 bg-[#111418]/80 backdrop-blur-xl rounded-2xl border shadow-2xl relative',
                                isMyTurn
                                    ? 'border-white/10'
                                    : 'border-white/5 opacity-75'
                            )}>
                                {/* Active player indicator */}
                                {isMyTurn && (
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 rounded-2xl opacity-50 blur-sm"></div>
                                )}

                                {myHand.map((card, idx) => {
                                    const isRevealed = revealedCard?.position === idx;
                                    const cardData = isRevealed ? revealedCard : card;
                                    const isFaceDown = card.hidden && !isRevealed;

                                    return (
                                        <Card
                                            key={idx}
                                            rank={isFaceDown ? null : cardData.rank}
                                            suit={isFaceDown ? null : cardData.suit}
                                            isFaceDown={isFaceDown}
                                            isSelected={selectedCardIndex === idx}
                                            onClick={() => handleMyCardClick(idx)}
                                            size="md"
                                        />
                                    );
                                })}
                            </div>

                            {/* Action Buttons (Desktop) */}
                            <div className="hidden lg:flex flex-col gap-3">
                                <button
                                    onClick={onCallKabul}
                                    disabled={!isMyTurn || turnPhase !== 'DRAWING'}
                                    className={clsx(
                                        'flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-lg transition-all w-32',
                                        isMyTurn && turnPhase === 'DRAWING'
                                            ? 'bg-primary hover:bg-blue-600 text-white shadow-primary/20 hover:scale-105 active:scale-95'
                                            : 'bg-[#283039] text-white/50 cursor-not-allowed'
                                    )}
                                >
                                    <span className="material-symbols-outlined text-[20px]">campaign</span>
                                    Kabul
                                </button>

                                {abilityState?.activePlayer === myPlayerId && (
                                    <button
                                        onClick={onSkipAbility}
                                        className="flex items-center justify-center gap-2 bg-[#283039] hover:bg-[#323b46] text-white font-medium py-2 px-6 rounded-xl border border-white/5 transition-colors w-32"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                        Skip
                                    </button>
                                )}

                                {turnPhase === 'CONFIRMING_SWAP' && (
                                    <button
                                        onClick={onConfirmSwap}
                                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-colors w-32"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">check</span>
                                        Confirm
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Action Bar */}
                <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-40">
                    <button
                        onClick={onCallKabul}
                        disabled={!isMyTurn || turnPhase !== 'DRAWING'}
                        className={clsx(
                            'flex items-center justify-center gap-2 font-bold h-12 px-6 rounded-full shadow-lg',
                            isMyTurn && turnPhase === 'DRAWING'
                                ? 'bg-primary hover:bg-blue-600 text-white shadow-primary/20'
                                : 'bg-[#283039] text-white/50'
                        )}
                    >
                        Kabul
                    </button>

                    {abilityState?.activePlayer === myPlayerId && (
                        <button
                            onClick={onSkipAbility}
                            className="flex items-center justify-center size-12 bg-[#283039] text-white rounded-full shadow-lg border border-white/10"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                {/* Table Texture Overlay */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
            </div>
        </div>
    );
};

export default GameTable;
