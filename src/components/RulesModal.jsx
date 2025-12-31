import React from 'react';
import clsx from 'clsx';

/**
 * RulesModal Component - Game rules and card effects popup
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 */
const RulesModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display max-w-[960px] w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-[#283039]">
                {/* Header */}
                <header className="sticky top-0 flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-[#283039] px-6 py-4 bg-white dark:bg-[#111418] z-10 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-2xl">menu_book</span>
                        <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                            Rules & Card Effects
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-colors"
                    >
                        <span className="truncate">Close</span>
                    </button>
                </header>

                {/* Main Content */}
                <div className="px-4 md:px-10 py-6">
                    {/* Page Heading */}
                    <div className="flex flex-wrap justify-between gap-3 mb-6">
                        <div className="flex min-w-72 flex-col gap-3">
                            <h1 className="text-[#111418] dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">
                                Rules & Card Effects
                            </h1>
                            <p className="text-[#637588] dark:text-[#9dabb9] text-base font-normal leading-normal">
                                Quick reference guide for card scoring and special abilities.
                            </p>
                        </div>
                    </div>

                    {/* Section: Card Point Values */}
                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5 border-b border-slate-200 dark:border-[#283039] mb-4">
                        Card Point Values
                    </h2>

                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 py-3 mb-8">
                        {/* Joker */}
                        <CardValueCard
                            title="Joker"
                            value={0}
                            icon="sentiment_very_satisfied"
                            iconColor="text-purple-500"
                            description="Best card to minimize score"
                        />

                        {/* Red Kings */}
                        <CardValueCard
                            title="Red Kings ♥♦"
                            value={-1}
                            icon="favorite"
                            iconColor="text-red-500"
                            description="Extremely valuable"
                        />

                        {/* Ace */}
                        <CardValueCard
                            title="Ace"
                            value={1}
                            icon="filter_1"
                            iconColor="text-blue-400"
                            description="Low value, safe to keep"
                        />

                        {/* Number Cards */}
                        <CardValueCard
                            title="2-10"
                            value="2-10"
                            icon="123"
                            iconColor="text-gray-400"
                            description="Face value (2=2, 5=5, etc.)"
                        />

                        {/* Jack */}
                        <CardValueCard
                            title="Jack"
                            value={11}
                            icon="person"
                            iconColor="text-orange-400"
                            description="High value, has swap ability"
                        />

                        {/* Queen */}
                        <CardValueCard
                            title="Queen"
                            value={12}
                            icon="face"
                            iconColor="text-pink-400"
                            description="High value, has see & swap"
                        />

                        {/* Black Kings */}
                        <CardValueCard
                            title="Black Kings ♠♣"
                            value={13}
                            icon="skull"
                            iconColor="text-gray-400"
                            description="Worst card! Get rid of it"
                        />
                    </div>

                    {/* Section: Special Card Effects */}
                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5 border-b border-slate-200 dark:border-[#283039] mb-4">
                        Special Card Effects
                    </h2>

                    <div className="flex flex-col gap-4 pb-8">
                        {/* Queen & King */}
                        <EffectCard
                            cards={['Q', 'K']}
                            title="See & Swap"
                            description="Switch any two cards on the table, and look at both cards involved in the swap."
                            icon="visibility"
                            highlight="see both cards"
                        />

                        {/* Jack */}
                        <EffectCard
                            cards={['J']}
                            title="Blind Swap"
                            description="Switch any two cards on the table. You cannot look at the cards."
                            icon="swap_horiz"
                            highlight="cannot look"
                            highlightColor="text-red-400"
                        />

                        {/* 9 & 10 */}
                        <EffectCard
                            cards={['9', '10']}
                            title="Peek Enemy"
                            description="Look at one of another player's cards."
                            icon="group_search"
                            highlight="another player's cards"
                        />

                        {/* 7 & 8 */}
                        <EffectCard
                            cards={['7', '8']}
                            title="Peek Self"
                            description="Look at one of your own cards."
                            icon="person_search"
                            highlight="your own cards"
                        />
                    </div>

                    {/* Section: Slap Match */}
                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5 border-b border-slate-200 dark:border-[#283039] mb-4">
                        Slap Match
                    </h2>

                    <div className="p-5 rounded-xl bg-white dark:bg-[#1c2127] border border-slate-200 dark:border-[#3b4754] mb-8">
                        <div className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-yellow-500 text-3xl">touch_app</span>
                            <div>
                                <h3 className="text-[#111418] dark:text-white text-lg font-bold mb-2">Match the Discard</h3>
                                <p className="text-[#637588] dark:text-[#9dabb9] text-sm leading-relaxed">
                                    If you have a card with the <span className="text-primary font-bold">same rank</span> as the top discard,
                                    you can slap it at any time to remove it from your hand! But be careful - if you're wrong,
                                    you get <span className="text-red-400 font-bold">+1 penalty card</span>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section: KABUL! */}
                    <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5 border-b border-slate-200 dark:border-[#283039] mb-4">
                        Calling KABUL!
                    </h2>

                    <div className="p-5 rounded-xl bg-gradient-to-br from-primary/20 to-blue-600/20 border border-primary/30 mb-4">
                        <div className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-primary text-3xl">campaign</span>
                            <div>
                                <h3 className="text-[#111418] dark:text-white text-lg font-bold mb-2">End the Round</h3>
                                <p className="text-[#637588] dark:text-[#9dabb9] text-sm leading-relaxed mb-3">
                                    When you think you have the <span className="text-primary font-bold">lowest score</span>,
                                    call "KABUL!" at the start of your turn. All other players get one final turn, then scores are revealed.
                                </p>
                                <p className="text-yellow-400 text-sm font-bold">
                                    ⚠️ Lowest score wins! Red Kings = -1, Joker = 0
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Card Value Card - displays card point value
 */
const CardValueCard = ({ title, value, icon, iconColor, description }) => (
    <div className="flex flex-1 flex-col gap-4 rounded-lg border border-solid border-slate-200 dark:border-[#3b4754] bg-white dark:bg-[#1c2127] p-5 shadow-sm">
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <h3 className="text-[#111418] dark:text-white text-base font-bold leading-tight">{title}</h3>
                <span className={clsx('material-symbols-outlined', iconColor)}>{icon}</span>
            </div>
            <p className="flex items-baseline gap-1 text-[#111418] dark:text-white mt-2">
                <span className="text-primary text-3xl font-black leading-tight tracking-[-0.033em]">{value}</span>
                <span className="text-sm font-bold leading-tight opacity-70">Point{value !== 1 && 's'}</span>
            </p>
        </div>
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-[#2a343e]">
            <div className="text-[13px] font-normal leading-normal flex gap-2 text-[#637588] dark:text-[#9dabb9] items-center">
                <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                {description}
            </div>
        </div>
    </div>
);

/**
 * Effect Card - displays card special effect
 */
const EffectCard = ({ cards, title, description, icon, highlight, highlightColor = 'text-primary' }) => (
    <div className="flex flex-col md:flex-row gap-6 p-5 rounded-xl bg-white dark:bg-[#1c2127] border border-slate-200 dark:border-[#3b4754] hover:border-primary dark:hover:border-primary transition-colors group">
        <div className="flex items-center justify-center min-w-[80px] h-[80px] bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <div className="flex flex-col items-center gap-1">
                <div className="flex gap-2 text-[#111418] dark:text-white font-bold text-xl">
                    {cards.map((card, idx) => (
                        <span key={idx}>{card}</span>
                    ))}
                </div>
                <div className="flex gap-1 text-[#111418] dark:text-gray-400 text-xs uppercase font-medium">Any Suit</div>
            </div>
        </div>
        <div className="flex flex-col justify-center flex-1 gap-1">
            <h3 className="text-[#111418] dark:text-white text-lg font-bold">{title}</h3>
            <p className="text-[#637588] dark:text-[#9dabb9] text-sm leading-relaxed">
                {description.split(highlight).map((part, idx, arr) => (
                    <React.Fragment key={idx}>
                        {part}
                        {idx < arr.length - 1 && <span className={clsx(highlightColor, 'font-bold')}>{highlight}</span>}
                    </React.Fragment>
                ))}
            </p>
        </div>
        <div className="flex items-center justify-center md:justify-end">
            <span className="material-symbols-outlined text-[#637588] dark:text-[#505c6a] text-3xl">{icon}</span>
        </div>
    </div>
);

export default RulesModal;
