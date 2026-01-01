import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameTable, RulesModal } from '../components';
import { usePlayer } from '../App';
import { getFirebaseService } from './LobbyPage';

// Action types from FirebaseService
const ACTION = {
    DRAW_DECK: 'DRAW_DECK',
    DRAW_DISCARD: 'DRAW_DISCARD',
    SWAP_CARD: 'SWAP_CARD',
    DISCARD_DRAWN: 'DISCARD_DRAWN',
    SLAP_MATCH: 'SLAP_MATCH',
    CALL_KABUL: 'CALL_KABUL',
    SELECT_OWN_CARD: 'SELECT_OWN_CARD',
    SELECT_ENEMY_CARD: 'SELECT_ENEMY_CARD',
    SELECT_TARGET_PLAYER: 'SELECT_TARGET_PLAYER',
    CONFIRM_SWAP: 'CONFIRM_SWAP',
    SKIP_ABILITY: 'SKIP_ABILITY',
};

const GameRoomPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { player } = usePlayer();

    // Game state from Firebase
    const [gameState, setGameState] = useState(null);
    const [players, setPlayers] = useState({});
    const [myHand, setMyHand] = useState([]);
    const [myPrivate, setMyPrivate] = useState({});

    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRules, setShowRules] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);

    // Refs
    const firebase = useRef(getFirebaseService()).current;
    const recognitionRef = useRef(null);

    // ==================== FIREBASE LISTENER ====================

    useEffect(() => {
        if (!roomId || !player.id) return;

        setLoading(true);

        try {
            firebase.listenToRoom(roomId, player.id, (data) => {
                setGameState(data.gameState);
                setPlayers(data.players);
                setMyHand(data.myHand);
                setMyPrivate(data.myPrivate);
                setLoading(false);
                setError(null);
            });
        } catch (err) {
            console.error('Failed to connect to room:', err);
            setError('Failed to connect to room');
            setLoading(false);
        }

        // Cleanup listener on unmount
        return () => {
            firebase.stopListening(roomId);
        };
    }, [roomId, player.id]);

    // ==================== SEAT ROTATION ====================

    /**
     * Rotate players so current player is always at bottom.
     * Returns positioned players for UI slots: { top, left, right }
     */
    const getRotatedPlayers = useCallback(() => {
        const playerIds = Object.keys(players);
        const others = playerIds.filter(id => id !== player.id);

        const positions = { top: null, left: null, right: null };

        if (others.length === 1) {
            // 2 players: opponent at top
            positions.top = others[0];
        } else if (others.length === 2) {
            // 3 players: left and right
            positions.left = others[0];
            positions.right = others[1];
        } else if (others.length >= 3) {
            // 4 players: left, top, right
            positions.left = others[0];
            positions.top = others[1];
            positions.right = others[2];
        }

        return positions;
    }, [players, player.id]);

    // ==================== ACTION HANDLER ====================

    const handleAction = useCallback(async (actionType, payload = {}) => {
        try {
            console.log(`[Action] ${actionType}`, payload);
            await firebase.performAction(roomId, player.id, actionType, payload);
        } catch (err) {
            console.error(`Action ${actionType} failed:`, err);
            // Show error feedback
            alert(`Action failed: ${err.message}`);
        }
    }, [roomId, player.id, firebase]);

    // ==================== UI EVENT HANDLERS ====================

    const handleDrawDeck = () => handleAction(ACTION.DRAW_DECK);
    const handleDrawDiscard = () => handleAction(ACTION.DRAW_DISCARD);
    const handleDiscardDrawn = () => handleAction(ACTION.DISCARD_DRAWN);
    const handleCallKabul = () => handleAction(ACTION.CALL_KABUL);
    const handleSkipAbility = () => handleAction(ACTION.SKIP_ABILITY);

    const handleSwapCard = (handIndex) => {
        handleAction(ACTION.SWAP_CARD, { handIndex });
    };

    const handleSlap = (handIndex) => {
        handleAction(ACTION.SLAP_MATCH, { handIndex });
    };

    const handleSelectOwnCard = (handIndex) => {
        const abilityType = gameState?.abilityState?.type;

        if (abilityType === 'BLIND_SWAP' || abilityType === 'SEE_AND_SWAP') {
            // Multi-step: Own card selection for swap
            handleAction(ACTION.SELECT_OWN_CARD, { handIndex });
        } else {
            // PEEK_SELF
            handleAction(ACTION.SELECT_OWN_CARD, { handIndex });
        }
    };

    const handleSelectEnemyCard = (targetPlayerId, handIndex) => {
        const abilityType = gameState?.abilityState?.type;

        if (abilityType === 'PEEK_ENEMY') {
            handleAction(ACTION.SELECT_ENEMY_CARD, { targetPlayerId, handIndex });
        } else {
            // BLIND_SWAP or SEE_AND_SWAP - selecting target
            handleAction(ACTION.SELECT_ENEMY_CARD, { targetPlayerId, handIndex });
        }
    };

    const handleConfirmSwap = () => {
        const ability = gameState?.abilityState;
        if (ability) {
            handleAction(ACTION.CONFIRM_SWAP, {
                ownIndex: ability.ownCardIndex,
                targetIndex: ability.targetCardIndex,
            });
        }
    };

    // ==================== VOICE RECOGNITION ====================

    useEffect(() => {
        // Check if Web Speech API is available
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.log('[Voice] Speech Recognition not supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log('[Voice] Recognition started');
            setVoiceActive(true);
        };

        recognition.onend = () => {
            console.log('[Voice] Recognition ended');
            setVoiceActive(false);
            // Restart if still in game
            if (gameState?.phase === 'PLAYING') {
                try { recognition.start(); } catch (e) { }
            }
        };

        recognition.onresult = (event) => {
            const last = event.results[event.results.length - 1];
            if (last.isFinal) {
                const transcript = last[0].transcript.toLowerCase().trim();
                const confidence = last[0].confidence;

                console.log(`[Voice] Heard: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

                // Check for KABUL/CABO keywords
                if (confidence > 0.7 && (transcript.includes('kabul') || transcript.includes('cabo'))) {
                    const isMyTurn = gameState?.currentTurn === player.id;
                    const canCallKabul = gameState?.turnPhase === 'DRAWING';

                    if (isMyTurn && canCallKabul) {
                        console.log('[Voice] KABUL detected! Triggering action...');
                        handleAction(ACTION.CALL_KABUL);
                    } else {
                        console.log('[Voice] KABUL detected but cannot call (not your turn or wrong phase)');
                    }
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('[Voice] Recognition error:', event.error);
            setVoiceActive(false);
        };

        recognitionRef.current = recognition;

        // Start recognition when game is in PLAYING phase
        if (gameState?.phase === 'PLAYING') {
            try { recognition.start(); } catch (e) { }
        }

        return () => {
            try { recognition.stop(); } catch (e) { }
        };
    }, [gameState?.phase, gameState?.currentTurn, gameState?.turnPhase, player.id, handleAction]);

    // ==================== RENDER ====================

    // Loading state
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-white/60 text-sm">Connecting to room...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                    <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        Back to Lobby
                    </button>
                </div>
            </div>
        );
    }

    // Waiting for game to start
    if (gameState?.phase === 'WAITING') {
        const playerList = Object.values(players);
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-surface-light dark:bg-[#1c2630] rounded-2xl p-8 max-w-md w-full text-center border border-[#283039]">
                    <span className="material-symbols-outlined text-primary text-5xl mb-4">group</span>
                    <h2 className="text-2xl font-bold text-white mb-2">Waiting for Players</h2>
                    <p className="text-white/60 mb-6">{playerList.length}/4 players joined</p>

                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                        {playerList.map((p) => (
                            <div
                                key={p.id || p.name}
                                className="bg-[#283039] px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2"
                            >
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {p.name}
                            </div>
                        ))}
                    </div>

                    {playerList.length >= 2 && (
                        <button
                            onClick={() => firebase.startGame(roomId)}
                            className="bg-primary hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg"
                        >
                            Start Game
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Game ended
    if (gameState?.phase === 'ENDED') {
        const winner = players[gameState.winner];
        const sortedPlayers = Object.entries(players)
            .map(([id, p]) => ({ id, ...p }))
            .sort((a, b) => (a.finalScore || 0) - (b.finalScore || 0));

        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-surface-light dark:bg-[#1c2630] rounded-2xl p-8 max-w-md w-full text-center border border-[#283039]">
                    <span className="material-symbols-outlined text-yellow-400 text-5xl mb-4">emoji_events</span>
                    <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
                    <p className="text-primary text-xl font-bold mb-6">{winner?.name || 'Unknown'} Wins!</p>

                    <div className="space-y-2 mb-6">
                        {sortedPlayers.map((p, idx) => (
                            <div
                                key={p.id}
                                className={`flex items-center justify-between p-3 rounded-lg ${idx === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-[#283039]'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-white/60 text-sm">#{idx + 1}</span>
                                    <span className="text-white font-medium">{p.name}</span>
                                </div>
                                <span className="text-primary font-bold">{p.finalScore ?? '?'} pts</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="bg-primary hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg"
                    >
                        Back to Lobby
                    </button>
                </div>
            </div>
        );
    }

    // Active game (MEMORIZE or PLAYING phase)
    return (
        <>
            <GameTable
                gameState={gameState}
                myPlayerId={player.id}
                players={players}
                myHand={myHand}
                myPrivate={myPrivate}
                onDrawDeck={handleDrawDeck}
                onDrawDiscard={handleDrawDiscard}
                onSwapCard={handleSwapCard}
                onDiscardDrawn={handleDiscardDrawn}
                onSlap={handleSlap}
                onCallKabul={handleCallKabul}
                onSelectOwnCard={handleSelectOwnCard}
                onSelectEnemyCard={handleSelectEnemyCard}
                onConfirmSwap={handleConfirmSwap}
                onSkipAbility={handleSkipAbility}
                onOpenRules={() => setShowRules(true)}
            />

            {/* Voice indicator */}
            {voiceActive && (
                <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse z-50">
                    <span className="material-symbols-outlined text-sm">mic</span>
                    <span className="text-xs font-bold uppercase">Listening...</span>
                </div>
            )}

            <RulesModal
                isOpen={showRules}
                onClose={() => setShowRules(false)}
            />
        </>
    );
};

export default GameRoomPage;
