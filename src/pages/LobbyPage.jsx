import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameLobby, RulesModal, CreateGameModal } from '../components';
import { usePlayer } from '../App';
import FirebaseService from '../FirebaseService';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqAAOhCbNZ1Fy8CU5u5iZcOJ3wFVcEFqw",
    authDomain: "mlt-id.firebaseapp.com",
    databaseURL: "https://mlt-id-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mlt-id",
    storageBucket: "mlt-id.firebasestorage.app",
    messagingSenderId: "6709876343",
    appId: "1:6709876343:web:7b270282b3095af36ed872",
    measurementId: "G-8YP9BT18XJ"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

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
    const [showCreateModal, setShowCreateModal] = useState(false);
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
    const handleCreateRoom = async ({ roomName, costume }) => {
        try {
            const result = await firebase.createRoom(roomName, player.id, player.name, costume);
            if (result.roomId) {
                setShowCreateModal(false);
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
                onCreateRoom={() => setShowCreateModal(true)}
                onOpenRules={() => setShowRules(true)}
            />
            <RulesModal
                isOpen={showRules}
                onClose={() => setShowRules(false)}
            />
            <CreateGameModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateRoom}
                playerName={player.name}
            />
        </>
    );
};

export default LobbyPage;
