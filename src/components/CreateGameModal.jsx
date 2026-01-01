import React, { useState } from 'react';
import clsx from 'clsx';
import { COSTUMES } from '../KabulGame';

/**
 * CreateGameModal Component - Modal for creating a new game room
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - onCreate: function({ roomName, costume }) - called when user submits
 * - playerName: string - for default room name
 */
const CreateGameModal = ({ isOpen, onClose, onCreate, playerName = 'Player' }) => {
    const [roomName, setRoomName] = useState(`${playerName}'s Game`);
    const [selectedCostume, setSelectedCostume] = useState('COSTUME_1');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setRoomName(`${playerName}'s Game`);
            setSelectedCostume('COSTUME_1');
            setIsSubmitting(false);
        }
    }, [isOpen, playerName]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!roomName.trim()) return;

        setIsSubmitting(true);
        try {
            await onCreate({ roomName: roomName.trim(), costume: selectedCostume });
        } catch (err) {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display max-w-[480px] w-full rounded-2xl shadow-2xl border border-[#283039] overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#283039] bg-white dark:bg-[#111418]">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
                        <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                            Create New Game
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#283039] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[#637588] dark:text-[#9dabb9]">close</span>
                    </button>
                </header>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Room Name Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-[#111418] dark:text-white">
                            Room Name
                        </label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Enter room name..."
                            maxLength={30}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#3b4754] bg-white dark:bg-[#1c2127] text-[#111418] dark:text-white placeholder-[#637588] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Costume Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-[#111418] dark:text-white">
                            Card Value Rules
                        </label>
                        <div className="grid gap-3">
                            {Object.entries(COSTUMES).map(([key, costume]) => (
                                <CostumeCard
                                    key={key}
                                    costumeKey={key}
                                    costume={costume}
                                    isSelected={selectedCostume === key}
                                    onSelect={() => setSelectedCostume(key)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-[#637588] dark:text-[#9dabb9] bg-slate-100 dark:bg-[#283039] hover:bg-slate-200 dark:hover:bg-[#3b4754] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!roomName.trim() || isSubmitting}
                            className={clsx(
                                'flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2',
                                !roomName.trim() || isSubmitting
                                    ? 'bg-primary/50 text-white/50 cursor-not-allowed'
                                    : 'bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                                    Create Game
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * CostumeCard - Individual costume option card
 */
const CostumeCard = ({ costumeKey, costume, isSelected, onSelect }) => {
    const isClassic = costumeKey === 'COSTUME_1';

    return (
        <button
            type="button"
            onClick={onSelect}
            className={clsx(
                'w-full p-4 rounded-xl border-2 transition-all text-left',
                isSelected
                    ? 'border-primary bg-primary/10 dark:bg-primary/20'
                    : 'border-slate-200 dark:border-[#3b4754] bg-white dark:bg-[#1c2127] hover:border-primary/50'
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={clsx(
                            'material-symbols-outlined text-xl',
                            isClassic ? 'text-yellow-500' : 'text-purple-500'
                        )}>
                            {isClassic ? 'star' : 'swap_vert'}
                        </span>
                        <span className="font-bold text-[#111418] dark:text-white">
                            {costume.name}
                        </span>
                        {isClassic && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                                Default
                            </span>
                        )}
                    </div>
                    
                    {/* Card Values Preview */}
                    <div className="flex gap-4 mt-3">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🃏</span>
                            <div className="text-xs">
                                <div className="text-[#637588] dark:text-[#9dabb9]">Joker</div>
                                <div className={clsx(
                                    'font-bold text-base',
                                    costume.jokerValue < 0 ? 'text-green-500' : 'text-blue-500'
                                )}>
                                    {costume.jokerValue}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl text-red-500">K♥</span>
                            <div className="text-xs">
                                <div className="text-[#637588] dark:text-[#9dabb9]">Red King</div>
                                <div className={clsx(
                                    'font-bold text-base',
                                    costume.redKingValue < 0 ? 'text-green-500' : 'text-blue-500'
                                )}>
                                    {costume.redKingValue}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selection Indicator */}
                <div className={clsx(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1',
                    isSelected
                        ? 'border-primary bg-primary'
                        : 'border-slate-300 dark:border-[#505c6a]'
                )}>
                    {isSelected && (
                        <span className="material-symbols-outlined text-white text-sm">check</span>
                    )}
                </div>
            </div>
        </button>
    );
};

export default CreateGameModal;
