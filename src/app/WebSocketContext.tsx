import React, {createContext, ReactNode, useContext, useEffect, useRef, useState} from 'react';
import {wsScire} from "../utils/api.ts";
import Cookies from "js-cookie";

const RECONNECT_INTERVAL = 5000;

type WebSocketContextType = {
    socket: WebSocket | null;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

interface Props {
    children: ReactNode;
}

export const WebSocketProvider: React.FC<Props> = ({ children }: Props) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const reconnectTimer = useRef<any>(null);

    const connectWebSocket = () => {
        const token = Cookies.get('token');
        const ws = token ? new WebSocket(wsScire, ["token", token]) : new WebSocket(wsScire);

        ws.onopen = () => {
            console.log('WebSocket connected');
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
                reconnectTimer.current = null;
            }
        };

        ws.onmessage = (event) => {
            console.log('Received message:', event.data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error', error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected, attempting to reconnect...');
            reconnectTimer.current = setTimeout(connectWebSocket, RECONNECT_INTERVAL);
        };

        setSocket(ws);
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (socket) {
                socket.close();
            }
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
            }
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{ socket }}>
            {children}
        </WebSocketContext.Provider>
    );
};
