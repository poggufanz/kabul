import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameLobby, RulesModal } from '../components';
import { usePlayer } from '../App';
import FirebaseService from '../FirebaseService';

// Firebase config - uses Vite env variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-api-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://your-project.firebaseio.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
};

// Singleton Firebase service
let firebaseService = null;
const getFirebaseService = () => {
    if (!firebaseService) {
        firebaseService = new FirebaseService(firebaseConfig);
    }
    return firebaseService;
};

export { getFirebaseService };

const LobbyPage = () => {
    const navigate = useNavigate();
    const { player } = usePlayer();
    const [rooms, setRooms] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRules, setShowRules] = useState(false);
    const [error, setError] = useState(null);

    const firebase = getFirebaseService();

    // Fetch rooms on mount
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                const roomList = await firebase.listRooms();
                setRooms(roomList);
            } catch (err) {
                console.error('Failed to fetch rooms:', err);
                setError('Failed to load rooms');
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();

        // Poll for updates every 5 seconds
        const interval = setInterval(fetchRooms, 5000);
        return () => clearInterval(interval);
    }, []);

    // Create new room
    const handleCreateRoom = async () => {
        try {
            const roomName = prompt('Enter room name:', `${player.name}'s Game`);
            if (!roomName) return;

            const result = await firebase.createRoom(roomName, player.id, player.name);
            if (result.roomId) {
                navigate(`/room/${result.roomId}`);
            }
        } catch (err) {
            console.error('Failed to create room:', err);
            alert('Failed to create room: ' + err.message);
        }
    };

    // Join existing room
    const handleJoinRoom = async (roomId) => {
        try {
            await firebase.joinRoom(roomId, player.id, player.name);
            navigate(`/room/${roomId}`);
        } catch (err) {
            console.error('Failed to join room:', err);
            alert('Failed to join room: ' + err.message);
        }
    };

    // Select room for preview
    const handleSelectRoom = (roomId) => {
        setSelectedRoomId(roomId);
    };

    if (loading && rooms.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-white/60 text-sm">Loading rooms...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                    <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
                    <p className="text-red-400">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <GameLobby
                rooms={rooms}
                currentUser={player}
                selectedRoomId={selectedRoomId}
                onSelectRoom={handleSelectRoom}
                onJoinRoom={handleJoinRoom}
                onCreateRoom={handleCreateRoom}
                onOpenRules={() => setShowRules(true)}
            />
            <RulesModal
                isOpen={showRules}
                onClose={() => setShowRules(false)}
            />
        </>
    );
};

export default LobbyPage;
