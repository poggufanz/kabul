import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

/**
 * GameLobby Component - Room list and room selection
 * 
 * Props:
 * - rooms: array of room objects from Firebase
 * - currentUser: object with id, name, level
 * - selectedRoomId: string
 * - onSelectRoom: function(roomId)
 * - onJoinRoom: function(roomId)
 * - onCreateRoom: function
 * - onOpenRules: function
 * - onLogout: function
 */
const GameLobby = ({
    rooms = [],
    currentUser = {},
    selectedRoomId,
    onSelectRoom,
    onJoinRoom,
    onCreateRoom,
    onOpenRules,
    onLogout,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const selectedRoom = rooms.find(r => r.id === selectedRoomId);

    // Filter rooms
    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' ||
            (filter === 'waiting' && room.playerCount < room.maxPlayers) ||
            (filter === 'private' && room.isPrivate);
        return matchesSearch && matchesFilter;
    });

    const getStatusBadge = (room) => {
        if (room.playerCount >= room.maxPlayers) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                    Full
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Waiting
            </span>
        );
    };

    const getProgressWidth = (count, max) => {
        const percent = (count / max) * 100;
        return `${percent}%`;
    };

    return (
        <div className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6">
            {/* Left Column: Game List */}
            <div className="flex-1 flex flex-col gap-6">
                {/* Page Heading & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] text-[#111418] dark:text-white">
                            Game Lobby
                        </h1>
                        <p className="text-[#637588] dark:text-[#9dabb9] text-base mt-1">
                            Find a table and test your skills.
                        </p>
                    </div>
                    <button
                        onClick={onCreateRoom}
                        className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg shadow-blue-500/20 w-full md:w-auto group"
                    >
                        <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform">add</span>
                        <span>Create Game</span>
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-[#e5e7eb] dark:border-[#283039] flex flex-col md:flex-row gap-4 items-center">
                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-[#637588] dark:text-[#9dabb9]" style={{ fontSize: '20px' }}>search</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Search tables..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border-none rounded-lg leading-5 bg-[#f0f2f5] dark:bg-[#111418] text-[#111418] dark:text-white placeholder-[#637588] dark:placeholder-[#637588] focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm"
                        />
                    </div>

                    {/* Chips */}
                    <div className="flex gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide pb-1 md:pb-0">
                        {[
                            { key: 'all', label: 'All Games' },
                            { key: 'waiting', label: 'Waiting' },
                            { key: 'private', label: 'Private' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={clsx(
                                    'whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                                    filter === key
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : 'bg-[#f0f2f5] dark:bg-[#283039] text-[#637588] dark:text-[#9dabb9] hover:bg-gray-200 dark:hover:bg-[#3b4754]'
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-[#e5e7eb] dark:border-[#283039] overflow-hidden flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f9fafb] dark:bg-[#111418] border-b border-[#e5e7eb] dark:border-[#283039]">
                                    <th className="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9dabb9] uppercase tracking-wider">Room Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9dabb9] uppercase tracking-wider hidden sm:table-cell">Host</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9dabb9] uppercase tracking-wider">Players</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9dabb9] uppercase tracking-wider hidden md:table-cell">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9dabb9] uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#283039]">
                                {filteredRooms.map((room) => {
                                    const isFull = room.playerCount >= room.maxPlayers;
                                    const isSelected = room.id === selectedRoomId;

                                    return (
                                        <tr
                                            key={room.id}
                                            onClick={() => onSelectRoom?.(room.id)}
                                            className={clsx(
                                                'group hover:bg-[#f0f2f5] dark:hover:bg-[#283039] transition-colors cursor-pointer',
                                                isSelected && 'bg-primary/5 dark:bg-primary/10',
                                                isFull && 'opacity-70'
                                            )}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx(
                                                        'p-2 rounded',
                                                        isSelected ? 'bg-primary/20 text-primary' : 'bg-[#f0f2f5] dark:bg-[#283039] text-[#637588] dark:text-[#9dabb9]'
                                                    )}>
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            {room.isPrivate ? 'lock' : 'playing_cards'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-[#111418] dark:text-white">{room.name}</div>
                                                        <div className="text-xs text-[#637588] dark:text-[#9dabb9] sm:hidden">@{room.hostName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-[#637588] dark:text-[#9dabb9] hidden sm:table-cell">
                                                @{room.hostName}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-[#e5e7eb] dark:bg-[#3b4754] rounded-full overflow-hidden">
                                                        <div
                                                            className={clsx(
                                                                'h-full',
                                                                isFull ? 'bg-red-500' : 'bg-primary'
                                                            )}
                                                            style={{ width: getProgressWidth(room.playerCount, room.maxPlayers) }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-medium text-[#111418] dark:text-white">
                                                        {room.playerCount}/{room.maxPlayers}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                {getStatusBadge(room)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isFull ? (
                                                    <button
                                                        disabled
                                                        className="bg-transparent text-[#637588] dark:text-[#9dabb9] text-xs font-bold py-2 px-4 rounded-lg cursor-not-allowed"
                                                    >
                                                        Spectate
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onJoinRoom?.(room.id);
                                                        }}
                                                        className="bg-primary hover:bg-blue-600 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                                                    >
                                                        Join
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredRooms.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-[#637588] dark:text-[#9dabb9]">
                                            No rooms found. Create one!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right Column: Selected Lobby Panel */}
            <aside className="w-full lg:w-[360px] flex-shrink-0 flex flex-col gap-6">
                {selectedRoom ? (
                    <SelectedRoomPanel
                        room={selectedRoom}
                        onJoin={() => onJoinRoom?.(selectedRoom.id)}
                    />
                ) : (
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-[#e5e7eb] dark:border-[#283039] text-center">
                        <span className="material-symbols-outlined text-[#637588] dark:text-[#9dabb9] text-5xl mb-4">touch_app</span>
                        <p className="text-[#637588] dark:text-[#9dabb9]">Select a room to see details</p>
                    </div>
                )}
            </aside>
        </div>
    );
};

/**
 * Selected Room Panel - shows room details
 */
const SelectedRoomPanel = ({ room, onJoin }) => {
    const isFull = room.playerCount >= room.maxPlayers;

    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-[#e5e7eb] dark:border-[#283039] sticky top-24">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#111418] dark:text-white">Selected Lobby</h3>
                <div className={clsx(
                    'size-2 rounded-full shadow-[0_0_8px]',
                    isFull ? 'bg-red-500 shadow-red-500/60' : 'bg-green-500 shadow-green-500/60'
                )}></div>
            </div>

            {/* Room Header */}
            <div className="flex flex-col gap-2 mb-6">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                        <span className="material-symbols-outlined text-[28px]">playing_cards</span>
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-[#111418] dark:text-white leading-tight">{room.name}</h4>
                        <p className="text-sm text-[#637588] dark:text-[#9dabb9]">
                            Host: <span className="text-primary font-medium">@{room.hostName}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Players Grid */}
            <div className="mb-6">
                <div className="flex justify-between items-end mb-3">
                    <h5 className="text-sm font-bold text-[#111418] dark:text-white">
                        Players ({room.playerCount}/{room.maxPlayers})
                    </h5>
                    {!isFull && (
                        <span className="text-xs text-[#637588] dark:text-[#9dabb9]">
                            Waiting for {room.maxPlayers - room.playerCount} more...
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {(room.players || []).map((player, idx) => (
                        <div
                            key={player.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-[#f0f2f5] dark:bg-[#111418] border border-[#e5e7eb] dark:border-[#283039]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div
                                        className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold"
                                    >
                                        {player.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    {player.isHost && (
                                        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-0.5" title="Host">
                                            <span className="material-symbols-outlined text-[12px]">star</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[#111418] dark:text-white">{player.name}</p>
                                    <p className="text-[10px] text-[#637588] dark:text-[#9dabb9]">
                                        Lvl {player.level || 1}
                                    </p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                        </div>
                    ))}

                    {/* Empty slots */}
                    {Array.from({ length: room.maxPlayers - room.playerCount }).map((_, idx) => (
                        <div
                            key={`empty-${idx}`}
                            className="flex items-center justify-center p-3 h-[66px] rounded-lg border border-dashed border-[#637588] dark:border-[#3b4754] bg-transparent opacity-50"
                        >
                            <span className="text-xs font-medium text-[#637588] dark:text-[#9dabb9]">Empty Slot</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Action */}
            <button
                onClick={onJoin}
                disabled={isFull}
                className={clsx(
                    'w-full font-bold py-3 px-4 rounded-lg shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2',
                    isFull
                        ? 'bg-[#283039] text-white/50 cursor-not-allowed'
                        : 'bg-primary hover:bg-blue-600 text-white shadow-blue-500/25'
                )}
            >
                <span>{isFull ? 'Room Full' : 'Join Game Now'}</span>
                {!isFull && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
            </button>
        </div>
    );
};

export default GameLobby;
