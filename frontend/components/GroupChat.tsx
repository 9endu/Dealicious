"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, User } from 'lucide-react';
import { db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where } from "firebase/firestore";
import api from "@/lib/api";

interface Message {
    id: string;
    text: string;
    userId: string;
    createdAt: any;
    userName?: string;
}

interface GroupChatProps {
    groupId: string;
    currentUserId: string;
    isMember: boolean;
}

export default function GroupChat({ groupId, currentUserId, isMember }: GroupChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!groupId) return;

        let isMounted = true;
        const fetchMessages = async () => {
            try {
                const res = await api.get(`/groups/${groupId}/chat`);
                if (isMounted) {
                    setMessages(res.data);
                    if (scrollRef.current) {
                        // Only scroll if near bottom or first load? For now just scroll.
                        // scrollRef.current.scrollIntoView({ behavior: "smooth" });
                    }
                }
            } catch (e) {
                console.error("Poll error", e);
            }
        };

        // Initial fetch
        fetchMessages();

        // Poll every 3 seconds
        const intervalId = setInterval(fetchMessages, 3000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [groupId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            // Use Backend API to send message (Bypassing Firestore Rules / Handling Auth there)
            await api.post(`/groups/${groupId}/chat`, {
                text: newMessage
            });
            setNewMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message: " + error);
        }
    };

    if (!isMember) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 text-center">
                <p className="text-gray-500">Join the group to chat with members.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col h-[500px]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-white">Group Chat</h3>
                <p className="text-xs text-gray-500">{messages.length} messages</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 my-auto pt-20">
                        <p>No messages yet. Say hi!</p>
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.userId === currentUserId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                }`}>
                                {!isMe && <p className="text-[10px] font-bold opacity-70 mb-1">{msg.userName || 'Member'}</p>}
                                <p>{msg.text}</p>
                                <p className="text-[10px] opacity-70 text-right mt-1">
                                    {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
