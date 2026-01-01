import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import Card, { OpponentCard, DrawPile, DiscardPile } from './Card';

/**
 * GameTable - Simplified, Working Game Table
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
}) => {
    const [selectedCardIndex, setSelectedCardIndex] = useState(null);
    const longPressTimer = useRef(null);
    const LONG_PRESS_DURATION = 500; // 500ms for long press

    // Extract state
    const { currentTurn, turnPhase, abilityState, kabulCaller } = gameState;
    const isMyTurn = currentTurn === myPlayerId;
    const drawnCard = myPrivate?.drawnCard;
    const revealedCard = myPrivate?.revealedCard;
    const swapPreview = myPrivate?.swapPreview;

    // Get other players (opponents)
    const opponents = Object.entries(players).filter(([id]) => id !== myPlayerId);
    const myPlayer = players[myPlayerId];

    // Get action message
    const getActionMessage = () => {
        if (!isMyTurn) {
            const currentPlayerName = players[currentTurn]?.name || 'Opponent';
            return `${currentPlayerName.toUpperCase()}'S TURN`;
        }
        if (drawnCard) return 'DISCARD OR SWAP';
        if (turnPhase === 'DRAWING') return 'DRAW A CARD TO START';
        if (turnPhase === 'SELECTING_TARGET') return 'SELECT A CARD';
        if (turnPhase === 'CONFIRMING_SWAP') return 'CONFIRM SWAP?';
        return 'YOUR TURN';
    };

    // Handle my card click
    const handleMyCardClick = (index) => {
        if (!isMyTurn) return;

        // If we have a drawn card, swap it with this position
        if (drawnCard) {
            onSwapCard?.(index);
            return;
        }

        // If in ability selection phase
        if (turnPhase === 'SELECTING_TARGET' && abilityState) {
            const abilityType = abilityState.type;
            if (abilityType === 'PEEK_SELF') {
                onSelectOwnCard?.(index);
            } else if (['BLIND_SWAP', 'SEE_AND_SWAP'].includes(abilityType)) {
                setSelectedCardIndex(index);
                onSelectOwnCard?.(index);
            }
            return;
        }

        // Toggle selection
        setSelectedCardIndex(selectedCardIndex === index ? null : index);
    };

    // Handle opponent card click
    const handleOpponentCardClick = (playerId, cardIndex) => {
        if (!isMyTurn) return;

        if (turnPhase === 'SELECTING_TARGET' && abilityState) {
            onSelectEnemyCard?.(playerId, cardIndex);
        }
    };

    // Long-press handlers for SLAP
    const handleCardPressStart = (index) => {
        longPressTimer.current = setTimeout(() => {
            // SLAP! - can be done anytime if card matches discard
            onSlap?.(index);
        }, LONG_PRESS_DURATION);
    };

    const handleCardPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#0f141a] min-h-screen">
            {/* Header Status */}
            <div className="w-full max-w-2xl mb-4">
                <div className="flex justify-between items-center bg-[#1e2732] rounded-xl p-3">
                    <span className="text-white text-sm">
                        Deck: <span className="font-bold text-primary">{gameState.deckCount || 0}</span>
                    </span>
                    <span className={clsx(
                        'font-bold text-sm px-4 py-1 rounded-full',
                        isMyTurn ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300'
                    )}>
                        {getActionMessage()}
                    </span>
                    {kabulCaller && (
                        <span className="text-yellow-400 font-bold text-sm">
                            KABUL by {players[kabulCaller]?.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Opponents Section */}
            <div className="w-full max-w-2xl flex justify-center gap-8 mb-6 flex-wrap">
                {opponents.map(([opponentId, opponent]) => (
                    <div key={opponentId} className="flex flex-col items-center gap-2">
                        {/* Opponent Avatar */}
                        <div className={clsx(
                            'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg',
                            currentTurn === opponentId ? 'bg-primary ring-2 ring-primary/50' : 'bg-[#283039]'
                        )}>
                            {opponent.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-white/60 text-xs">{opponent.name}</span>

                        {/* Opponent Cards */}
                        <div className="grid grid-cols-2 gap-1 p-2 bg-[#1e2732] rounded-lg">
                            {(opponent.hand || [0, 1, 2, 3]).map((_, idx) => (
                                <OpponentCard
                                    key={idx}
                                    onClick={() => handleOpponentCardClick(opponentId, idx)}
                                    isSelected={abilityState?.targetPlayer === opponentId && abilityState?.targetCardIndex === idx}
                                    size="sm"
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Center - Deck & Discard */}
            <div className="flex items-center gap-6 mb-6">
                {/* Draw Pile */}
                <div
                    onClick={isMyTurn && turnPhase === 'DRAWING' ? onDrawDeck : undefined}
                    className={clsx(
                        'relative w-20 h-28 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center cursor-pointer',
                        isMyTurn && turnPhase === 'DRAWING' ? 'hover:scale-105 ring-2 ring-primary/50' : 'opacity-60'
                    )}
                >
                    <span className="text-white/30 text-3xl">♠</span>
                    <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                        {gameState.deckCount || 0}
                    </div>
                </div>

                {/* Discard Pile */}
                <div
                    onClick={isMyTurn && turnPhase === 'DRAWING' ? onDrawDiscard : undefined}
                    className="relative"
                >
                    {gameState.topDiscard ? (
                        <Card
                            rank={gameState.topDiscard.rank}
                            suit={gameState.topDiscard.suit}
                            size="md"
                            className={clsx(
                                isMyTurn && turnPhase === 'DRAWING' && 'cursor-pointer hover:scale-105'
                            )}
                        />
                    ) : (
                        <div className="w-20 h-28 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                            <span className="text-gray-500 text-xs">Empty</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Drawn Card Preview */}
            {drawnCard && (
                <div className="mb-4 flex flex-col items-center gap-2 p-4 bg-[#1e2732] rounded-xl border border-primary/30">
                    <span className="text-primary text-xs font-bold uppercase">Drawn Card</span>
                    <Card rank={drawnCard.rank} suit={drawnCard.suit} size="md" isSelected />
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={onDiscardDrawn}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-lg"
                        >
                            Discard
                        </button>
                        <span className="text-white/60 text-xs self-center">or click your card to swap</span>
                    </div>
                </div>
            )}

            {/* Revealed Card (Peek) */}
            {revealedCard && !swapPreview && (
                <div className="mb-4 flex flex-col items-center gap-2 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30 animate-pulse">
                    <span className="text-yellow-400 text-xs font-bold uppercase">Revealed!</span>
                    <Card rank={revealedCard.rank} suit={revealedCard.suit} size="md" />
                </div>
            )}

            {/* Swap Preview (Q/K) */}
            {swapPreview && turnPhase === 'CONFIRMING_SWAP' && (
                <div className="mb-4 flex flex-col items-center gap-3 p-4 bg-[#1e2732] rounded-xl border border-yellow-500/30">
                    <span className="text-yellow-400 text-xs font-bold uppercase">Confirm Swap?</span>
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <span className="text-white/60 text-[10px] block mb-1">YOUR CARD</span>
                            <Card rank={swapPreview.ownCard?.rank} suit={swapPreview.ownCard?.suit} size="sm" />
                            <span className="text-white text-xs">{swapPreview.ownCard?.value} pts</span>
                        </div>
                        <span className="text-primary text-2xl">⇄</span>
                        <div className="text-center">
                            <span className="text-white/60 text-[10px] block mb-1">THEIR CARD</span>
                            <Card rank={swapPreview.targetCard?.rank} suit={swapPreview.targetCard?.suit} size="sm" />
                            <span className="text-white text-xs">{swapPreview.targetCard?.value} pts</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onConfirmSwap}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-6 rounded-lg"
                        >
                            ✓ Swap
                        </button>
                        <button
                            onClick={onSkipAbility}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-6 rounded-lg"
                        >
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* My Hand */}
            <div className={clsx(
                'grid grid-cols-2 gap-3 p-4 rounded-xl border w-fit',
                isMyTurn ? 'bg-[#1e2732] border-primary/30' : 'bg-[#151b24] border-gray-700'
            )}>
                {myHand.map((card, idx) => {
                    // Determine if card should be visible
                    const isMemorizePhase = gameState.phase === 'MEMORIZE';
                    const canSeeInMemorize = isMemorizePhase && idx < 2; // Only first 2 cards in memorize
                    const isRevealedByPowerCard = revealedCard?.position === idx;

                    // Card is face-down unless:
                    // 1. We're in MEMORIZE phase and it's one of first 2 cards
                    // 2. It's been revealed by a power card (peek)
                    const shouldShowFace = canSeeInMemorize || isRevealedByPowerCard;
                    const displayCard = isRevealedByPowerCard ? revealedCard : card;

                    return (
                        <div
                            key={idx}
                            onMouseDown={() => handleCardPressStart(idx)}
                            onMouseUp={handleCardPressEnd}
                            onMouseLeave={handleCardPressEnd}
                            onTouchStart={() => handleCardPressStart(idx)}
                            onTouchEnd={handleCardPressEnd}
                        >
                            <Card
                                rank={shouldShowFace ? displayCard?.rank : null}
                                suit={shouldShowFace ? displayCard?.suit : null}
                                isFaceDown={!shouldShowFace}
                                isSelected={selectedCardIndex === idx}
                                onClick={() => handleMyCardClick(idx)}
                                size="md"
                                isDisabled={!isMyTurn && turnPhase !== 'DRAWING'}
                            />
                        </div>
                    );
                })}
            </div>
            <p className="text-white/40 text-xs mt-2">Long-press a card to SLAP if it matches discard</p>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
                <button
                    onClick={onCallKabul}
                    disabled={!isMyTurn || turnPhase !== 'DRAWING'}
                    className={clsx(
                        'flex items-center gap-2 font-bold py-3 px-6 rounded-xl transition-all',
                        isMyTurn && turnPhase === 'DRAWING'
                            ? 'bg-primary hover:bg-blue-600 text-white'
                            : 'bg-[#283039] text-gray-500 cursor-not-allowed'
                    )}
                >
                    📣 Kabul
                </button>

                {abilityState?.activePlayer === myPlayerId && (
                    <button
                        onClick={onSkipAbility}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl"
                    >
                        Skip Ability
                    </button>
                )}
            </div>

            {/* Debug Info (remove in production) */}
            <div className="mt-4 text-[10px] text-gray-600">
                Phase: {turnPhase} | Turn: {players[currentTurn]?.name || currentTurn} | My Cards: {myHand.length}
            </div>
        </div>
    );
};

export default GameTable;
