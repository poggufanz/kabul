import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage';
import GameRoomPage from './pages/GameRoomPage';
import { Header } from './components';

// ==================== PLAYER CONTEXT ====================

const PlayerContext = createContext(null);

export const usePlayer = () => useContext(PlayerContext);

/**
 * Generate unique player ID if not exists in localStorage
 */
const getOrCreatePlayerId = () => {
    let playerId = localStorage.getItem('kabul_player_id');
    if (!playerId) {
        playerId = 'player_' + crypto.randomUUID().slice(0, 8);
        localStorage.setItem('kabul_player_id', playerId);
    }
    return playerId;
};

/**
 * Get or create player name
 */
const getOrCreatePlayerName = () => {
    let playerName = localStorage.getItem('kabul_player_name');
    if (!playerName) {
        playerName = 'Guest_' + Math.floor(Math.random() * 1000);
        localStorage.setItem('kabul_player_name', playerName);
    }
    return playerName;
};

const PlayerProvider = ({ children }) => {
    const [player, setPlayer] = useState(() => ({
        id: getOrCreatePlayerId(),
        name: getOrCreatePlayerName(),
        level: parseInt(localStorage.getItem('kabul_player_level') || '1', 10),
    }));

    const updatePlayerName = (name) => {
        localStorage.setItem('kabul_player_name', name);
        setPlayer(prev => ({ ...prev, name }));
    };

    return (
        <PlayerContext.Provider value={{ player, updatePlayerName }}>
            {children}
        </PlayerContext.Provider>
    );
};

// ==================== APP LAYOUT ====================

const AppLayout = ({ children }) => {
    const { player } = usePlayer();
    const [showRules, setShowRules] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('kabul_player_id');
        localStorage.removeItem('kabul_player_name');
        window.location.reload();
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display selection:bg-primary/30">
            <Header
                user={player}
                onOpenRules={() => setShowRules(true)}
                onLogout={handleLogout}
            />
            {children}
        </div>
    );
};

// ==================== MAIN APP ====================

const App = () => {
    return (
        <PlayerProvider>
            <BrowserRouter>
                <AppLayout>
                    <Routes>
                        <Route path="/" element={<LobbyPage />} />
                        <Route path="/room/:roomId" element={<GameRoomPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AppLayout>
            </BrowserRouter>
        </PlayerProvider>
    );
};

export default App;
