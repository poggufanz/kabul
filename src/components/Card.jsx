import React from 'react';
import clsx from 'clsx';

/**
 * Card Component for Kabul Game
 * 
 * Props:
 * - rank: string (e.g., 'K', 'Q', '7', 'A', 'Joker')
 * - suit: string ('♠', '♥', '♦', '♣') or null for Joker
 * - isFaceDown: boolean - true to show card back
 * - isSelected: boolean - true for selection highlight
 * - isDisabled: boolean - true to dim the card
 * - size: 'sm' | 'md' | 'lg' - card size variant
 * - onClick: function - click handler
 */
const Card = ({
    rank,
    suit,
    isFaceDown = false,
    isSelected = false,
    isDisabled = false,
    size = 'md',
    onClick,
    className,
}) => {
    // Size classes
    const sizeClasses = {
        sm: 'w-10 h-14 md:w-12 md:h-16',
        md: 'w-20 h-28 md:w-28 md:h-40',
        lg: 'w-24 h-36 md:w-32 md:h-44',
    };

    // Red suits
    const isRed = suit === '♥' || suit === '♦';

    // Base card classes
    const baseClasses = clsx(
        'relative rounded-xl shadow-lg cursor-pointer transition-all',
        sizeClasses[size],
        {
            'hover:-translate-y-2': !isDisabled,
            'opacity-50 cursor-not-allowed': isDisabled,
        },
        className
    );

    // Face down card
    if (isFaceDown) {
        return (
            <div
                onClick={!isDisabled ? onClick : undefined}
                className={clsx(
                    baseClasses,
                    'bg-gradient-to-br from-[#1e2732] to-[#0f141a] border-2',
                    isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-[#3d4650] hover:border-primary/50',
                    'group overflow-hidden'
                )}
            >
                {/* Diamond pattern overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-white text-5xl">diamond</span>
                </div>
                {/* Texture overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            </div>
        );
    }

    // Face up card
    const colorClass = isRed ? 'text-red-600' : 'text-gray-900';
    const displayRank = rank === 'Joker' ? '🃏' : rank;
    const displaySuit = suit || '';

    return (
        <div
            onClick={!isDisabled ? onClick : undefined}
            className={clsx(
                baseClasses,
                'bg-white flex flex-col',
                size === 'sm' ? 'p-1.5' : 'p-2 md:p-3',
                isSelected
                    ? 'border-2 border-primary ring-2 ring-primary/30'
                    : 'border border-gray-200 hover:border-primary/50'
            )}
        >
            {/* Top left corner */}
            <div className="flex justify-between items-start leading-none">
                <span className={clsx(
                    'font-bold font-body',
                    colorClass,
                    size === 'sm' ? 'text-sm' : 'text-lg md:text-2xl'
                )}>
                    {displayRank}
                </span>
                <span className={clsx(
                    colorClass,
                    size === 'sm' ? 'text-[10px]' : 'text-xs md:text-sm'
                )}>
                    {displaySuit}
                </span>
            </div>

            {/* Center suit */}
            <div className="flex-grow flex items-center justify-center">
                {rank === 'Joker' ? (
                    <span className="text-purple-500 text-3xl md:text-5xl">🃏</span>
                ) : (
                    <span className={clsx(
                        colorClass,
                        size === 'sm' ? 'text-xl' : 'text-3xl md:text-5xl'
                    )}>
                        {displaySuit}
                    </span>
                )}
            </div>

            {/* Bottom right corner (rotated 180deg) */}
            <div className="flex justify-between items-end rotate-180 leading-none">
                <span className={clsx(
                    'font-bold font-body',
                    colorClass,
                    size === 'sm' ? 'text-sm' : 'text-lg md:text-2xl'
                )}>
                    {displayRank}
                </span>
                <span className={clsx(
                    colorClass,
                    size === 'sm' ? 'text-[10px]' : 'text-xs md:text-sm'
                )}>
                    {displaySuit}
                </span>
            </div>
        </div>
    );
};

/**
 * Opponent Card - smaller face-down cards for opponents
 */
export const OpponentCard = ({ onClick, isSelected, size = 'sm' }) => {
    const sizeClasses = {
        sm: 'w-10 h-14 md:w-12 md:h-16',
        md: 'w-12 h-16',
    };

    return (
        <div
            onClick={onClick}
            className={clsx(
                sizeClasses[size],
                'bg-gradient-to-br from-blue-900 to-slate-800 rounded border shadow-sm',
                'relative overflow-hidden flex items-center justify-center cursor-pointer',
                'transition-all hover:-translate-y-1',
                isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-blue-500/20 hover:border-primary/50'
            )}
        >
            <span className="material-symbols-outlined text-white/10 text-xl">diamond</span>
        </div>
    );
};

/**
 * Draw Pile - deck with stack effect
 */
export const DrawPile = ({ deckCount = 0, onClick, isDisabled }) => {
    return (
        <div
            className={clsx(
                'group relative cursor-pointer',
                isDisabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={!isDisabled ? onClick : undefined}
        >
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                Draw Card ({deckCount} left)
            </div>

            {/* Stack Effect */}
            {deckCount > 2 && (
                <div className="absolute top-1 left-1 w-24 h-36 md:w-32 md:h-44 bg-slate-800 rounded-lg border border-slate-700"></div>
            )}
            {deckCount > 1 && (
                <div className="absolute top-0.5 left-0.5 w-24 h-36 md:w-32 md:h-44 bg-slate-800 rounded-lg border border-slate-700"></div>
            )}

            {/* Top Card */}
            <div className="relative w-24 h-36 md:w-32 md:h-44 bg-gradient-to-br from-primary to-blue-700 rounded-lg shadow-xl border-2 border-white/10 flex flex-col items-center justify-center transition-transform hover:-translate-y-1 hover:shadow-2xl hover:border-white/30">
                <span className="material-symbols-outlined text-white/20 text-6xl">diamond</span>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                {/* Card count badge */}
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {deckCount}
                </div>
            </div>
        </div>
    );
};

/**
 * Discard Pile - shows top card with stack effect
 */
export const DiscardPile = ({ topCard, previousCard, onClick }) => {
    if (!topCard) {
        return (
            <div className="relative w-24 h-36 md:w-32 md:h-44 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-xs">Empty</span>
            </div>
        );
    }

    return (
        <div className="relative group" onClick={onClick}>
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                Discard Pile
            </div>

            {/* Previous card faded underneath */}
            {previousCard && (
                <div className="absolute top-1 right-1 w-24 h-36 md:w-32 md:h-44 bg-white rounded-lg border border-gray-300 rotate-3 opacity-50"></div>
            )}

            {/* Active Discard Card */}
            <Card
                rank={topCard.rank}
                suit={topCard.suit}
                size="lg"
                className="hover:scale-105"
            />
        </div>
    );
};

export default Card;
