import React from 'react';
import clsx from 'clsx';

/**
 * Header Component - Top navigation bar
 * 
 * Props:
 * - user: object with name, level, avatar
 * - onOpenRules: function
 * - onLogout: function
 * - showBackButton: boolean
 * - onBack: function
 */
const Header = ({
    user = {},
    onOpenRules,
    onLogout,
    showBackButton = false,
    onBack,
}) => {
    return (
        <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e5e7eb] dark:border-[#283039] bg-surface-light dark:bg-[#111418] px-4 md:px-6 py-3 shadow-sm">
            <div className="flex items-center gap-4 text-white">
                {showBackButton ? (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-white hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                ) : (
                    <div className="size-8 flex items-center justify-center bg-primary rounded-lg">
                        <span className="material-symbols-outlined text-white text-[20px]">playing_cards</span>
                    </div>
                )}
                <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                    Kabul
                </h2>
            </div>

            <div className="flex flex-1 justify-end gap-4 md:gap-8">
                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-9">
                    <button
                        onClick={onOpenRules}
                        className="text-[#111418] dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors"
                    >
                        Rules
                    </button>
                    <a
                        className="text-[#637588] dark:text-[#9dabb9] text-sm font-medium leading-normal hover:text-primary transition-colors"
                        href="#"
                    >
                        Leaderboard
                    </a>
                </div>

                {/* User Profile & Actions */}
                <div className="flex items-center gap-3 pl-4 border-l border-[#e5e7eb] dark:border-[#3b4754]">
                    {/* User Info */}
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-xs font-bold text-[#111418] dark:text-white">
                            {user.name || 'Guest'}
                        </span>
                        <span className="text-[10px] text-primary">
                            Level {user.level || 1}
                        </span>
                    </div>

                    {/* Avatar */}
                    <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600"
                    >
                        {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span className="text-white font-bold text-lg">
                                {user.name?.[0]?.toUpperCase() || '?'}
                            </span>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={onOpenRules}
                            className="md:hidden flex items-center justify-center overflow-hidden rounded-lg size-10 bg-[#f0f2f5] dark:bg-[#283039] hover:bg-gray-200 dark:hover:bg-[#323b46] text-[#111418] dark:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">menu_book</span>
                        </button>
                        <button
                            onClick={onLogout}
                            className="flex items-center justify-center overflow-hidden rounded-lg size-10 bg-[#f0f2f5] dark:bg-[#283039] hover:bg-gray-200 dark:hover:bg-[#323b46] text-[#111418] dark:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
