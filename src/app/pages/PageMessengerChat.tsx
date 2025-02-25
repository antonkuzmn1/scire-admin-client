import React, {ChangeEvent, useCallback, useEffect, useReducer, useRef} from "react";
import {AppDispatch} from "../../utils/store.ts";
import {useDispatch} from "react-redux";
import {setAppError, setAppLoading} from "../../slices/appSlice.ts";
import {apiOauth, apiScire, apiStorage, wsScire} from "../../utils/api.ts";
import Cookies from "js-cookie";
import {useNavigate, useParams} from "react-router-dom";
import {dateToString} from "../../utils/formatDate.ts";
import {Download, Send} from "@mui/icons-material";
import {formatFileSize} from "../../utils/formatFileSize.ts";
import {Admin, Ticket, User, Message, TicketFile, MessageFile} from "../../utils/messengerInterfaces.ts";

interface State {
    ticket: Ticket;
    messages: Message[];
    admins: Admin[];
    users: User[];
    ticketFiles: TicketFile[];
    messageFiles: MessageFile[];
    files: File[];
    message: string;
}

type Action =
    | { type: 'SET_TICKET', payload: Ticket }
    | { type: 'SET_MESSAGES', payload: Message[] }
    | { type: 'ADD_MESSAGE', payload: Message }
    | { type: 'SET_ADMINS', payload: Admin[] }
    | { type: 'SET_USERS', payload: User[] }
    | { type: 'SET_TICKET_FILES', payload: TicketFile[] }
    | { type: 'SET_MESSAGE_FILES', payload: MessageFile[] }
    | { type: 'ADD_FILE', payload: File | null }
    | { type: 'DELETE_FILE', payload: number }
    | { type: 'SET_MESSAGE', payload: string };

const defaultTicket: Ticket = {
    id: 0,
    title: '',
    description: '',
    status: 0,
    statusText: 'Pending',
    user_id: 0,
    userName: '',
    admin_id: null,
    adminName: '',
    created_at: null,
    updated_at: null,
}

const initialState: State = {
    ticket: defaultTicket,
    messages: [],
    admins: [],
    users: [],
    ticketFiles: [],
    messageFiles: [],
    files: [],
    message: "",
}

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_TICKET':
            return {
                ...state,
                ticket: action.payload,
            }
        case 'SET_MESSAGES':
            return {
                ...state,
                messages: action.payload,
            }
        case 'ADD_MESSAGE':
            return {
                ...state,
                messages: [...state.messages, action.payload],
            }
        case 'SET_ADMINS':
            return {
                ...state,
                admins: action.payload,
            }
        case 'SET_USERS':
            return {
                ...state,
                users: action.payload,
            }
        case 'SET_TICKET_FILES':
            return {
                ...state,
                ticketFiles: action.payload,
            }
        case 'SET_MESSAGE_FILES':
            return {
                ...state,
                messageFiles: action.payload,
            }
        case 'ADD_FILE':
            return {
                ...state,
                files: action.payload ? [...state.files, action.payload] : state.files,
            }
        case 'DELETE_FILE':
            return {
                ...state,
                files: state.files.filter((_, i) => i !== action.payload),
            }
        case 'SET_MESSAGE':
            return {
                ...state,
                message: action.payload,
            }
        default:
            return state;
    }
}

function statusToText(status: 0 | 1 | 2) {
    return status === 2
        ? 'Solved'
        : status === 1
            ? 'In progress'
            : 'Pending';
}

function adminIdToName(adminId: number | null, admins: Admin[]) {
    const admin = admins.find((admin: Admin) => admin.id === adminId);
    if (!admin) {
        return '';
    }
    return `${admin.surname} ${admin.name} ${admin.middlename}`.trim()
}

function userIdToName(userId: number | null, users: User[]) {
    const user = users.find((user: User) => user.id === userId);
    if (!user) {
        return '';
    }
    return `${user.surname} ${user.name} ${user.middlename}`.trim()
}

const PageMessengerChat: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [state, localDispatch] = useReducer(reducer, initialState);
    const wsRef = useRef<WebSocket | null>(null);
    const navigate = useNavigate();
    const {ticketId} = useParams();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const init = useCallback(async () => {
        dispatch(setAppLoading(true));
        try {
            const adminsResponse = await apiOauth.get("/admins/");
            localDispatch({type: "SET_ADMINS", payload: adminsResponse.data});

            const usersResponse = await apiOauth.get("/users/");
            localDispatch({type: "SET_USERS", payload: usersResponse.data});

            const ticketResponse = await apiScire.get(`/tickets/${ticketId}`);
            const data = ticketResponse.data;
            console.log(data);
            data.statusText = statusToText(data.status);
            data.userName = userIdToName(data.user_id, usersResponse.data);
            data.adminName = adminIdToName(data.admin_id, adminsResponse.data);
            localDispatch({type: "SET_TICKET", payload: data});

            const ticketFilesResponse = await apiScire.get(`/tickets/${ticketId}/files`);
            const ticketFiles = ticketFilesResponse.data;
            localDispatch({type: "SET_TICKET_FILES", payload: ticketFiles});

            const messagesResponse = await apiScire.get(`/messages/${ticketId}`);
            const messages: Message[] = messagesResponse.data.map((message: Message) => {
                return {
                    ...message,
                    userName: userIdToName(data.user_id, usersResponse.data),
                    adminName: adminIdToName(data.admin_id, adminsResponse.data),
                }
            });
            localDispatch({type: "SET_MESSAGES", payload: messages});
        } catch (error: unknown) {
            if (error instanceof Error) {
                dispatch(setAppError(error.message));
            } else {
                dispatch(setAppError("An unknown error occurred"));
            }
        } finally {
            dispatch(setAppLoading(false));
        }
    }, []);

    useEffect(() => {
        init().then();
    }, [dispatch]);

    const assignTicket = () => {
        dispatch(setAppLoading(true));

        const payload = {
            action: 'assign_ticket',
            data: {
                item_id: ticketId,
            }
        }
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        } else {
            dispatch(setAppError("WebSocket error"));
        }

        dispatch(setAppLoading(false));
    }

    const sendMessage = () => {
        localDispatch({type: 'SET_MESSAGE', payload: ''});
        const text = state.message.trim();
        if (!text) {
            dispatch(setAppError('Message text required'));
        }

        dispatch(setAppLoading(true));

        const payload = {
            action: 'send_message',
            data: {
                text,
                user_id: state.ticket.user_id,
                ticket_id: ticketId,
            }
        }
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        } else {
            dispatch(setAppError("WebSocket error"));
        }

        dispatch(setAppLoading(false));
    }

    const downloadTicketFile = async (ticketFile: TicketFile) => {
        dispatch(setAppLoading(true));
        try {
            const response = await apiStorage.get(`/file/${ticketFile.file_uuid}`, {
                responseType: "blob",
            });

            const blob = new Blob([response.data], {type: response.headers["content-type"]});
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = ticketFile.file_name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
        } catch (error: unknown) {
            if (error instanceof Error) {
                dispatch(setAppError(error.message));
            } else {
                dispatch(setAppError("An unknown error occurred"));
            }
        } finally {
            dispatch(setAppLoading(false));
        }
    }

    useEffect(() => {
        const token = Cookies.get('token');
        wsRef.current = new WebSocket(wsScire, ["token", token || '']);

        wsRef.current.onopen = () => {
        };

        wsRef.current.onerror = (error: any) => {
            console.log('WebSocket error');
            dispatch(setAppError(error || 'WebSocket error'));
        };

        wsRef.current.onclose = () => {
            console.log('WebSocket closed');
            // dispatch(setAppMessage("WebSocket closed"));
        };

        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
                console.log('WebSocket closed');
            }
        };
    }, []);

    useEffect(() => {
        if (wsRef.current) {
            wsRef.current.onmessage = (event: any) => {
                const message = JSON.parse(event.data);
                console.log(message);
                switch (message.action) {
                    case "send_message":
                        const sendMessageData: Message = message.data;
                        sendMessageData.userName = userIdToName(sendMessageData.user_id, state.users);
                        sendMessageData.adminName = adminIdToName(sendMessageData.admin_id, state.admins);
                        localDispatch({type: "ADD_MESSAGE", payload: sendMessageData});
                        break;
                    case "close_ticket":
                        const closeTicketData: Ticket = message.data;
                        closeTicketData.statusText = statusToText(closeTicketData.status);
                        closeTicketData.userName = userIdToName(closeTicketData.user_id, state.users);
                        closeTicketData.adminName = adminIdToName(closeTicketData.admin_id, state.admins);
                        localDispatch({type: "SET_TICKET", payload: closeTicketData});
                        break;
                    case "assign_ticket":
                        const assignTicket: Ticket = message.data;
                        assignTicket.statusText = statusToText(assignTicket.status);
                        assignTicket.userName = userIdToName(assignTicket.user_id, state.users);
                        assignTicket.adminName = adminIdToName(assignTicket.admin_id, state.admins);
                        console.log(assignTicket);
                        localDispatch({type: "SET_TICKET", payload: assignTicket});
                        break;
                    default:
                        dispatch(setAppError("Unknown message type received via WebSocket"));
                        break;
                }
            };
        }
    }, [state.files, state.users, state.admins]);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
        console.log(state.messages);
    }, [state.messages]);

    return (
        <>
            <div className="flex flex-col mx-auto justify-center pb-14 h-[100vh]">
                <button
                    className={'border border-gray-300 mb-[-1px] p-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                    onClick={() => navigate(`/messenger`)}
                >
                    Back
                </button>
                <div ref={containerRef}
                     className={'w-full gap-2 flex flex-col border border-gray-300 p-4 overflow-y-auto h-full'}>
                    <div className={'border border-gray-300 p-4'}>
                        <h1>Title: {state.ticket?.title || 'Loading...'}</h1>
                        <p>Description: {state.ticket?.description || 'Loading...'}</p>
                        <p>Status: {state.ticket?.statusText || 'Loading...'}</p>
                        <p>Initiator: {state.ticket?.userName || 'Loading...'}</p>
                        <p>Assigned: {state.ticket?.adminName || 'None'}</p>
                        <button
                            className={'border border-gray-300 p-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                            onClick={assignTicket}
                        >
                            Assign ticket
                        </button>
                        <p>Date: {state.ticket ? dateToString(new Date(String(state.ticket.created_at))) : 'Loading...'}</p>
                        <div className={'border border-gray-300 p-2 space-y-2'}>
                            {state.ticketFiles.map((ticketFile, index) => (
                                <div key={index}
                                     className={'border border-gray-300 flex justify-between items-center pl-2 h-12'}>
                                    {ticketFile.file_name} - {formatFileSize(ticketFile.file_size)}
                                    <button
                                        className={'w-12 h-full cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                                        onClick={() => downloadTicketFile(ticketFile)}
                                    >
                                        <Download/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {state.messages.map((message, index) => {
                        if (message.admin_connected) {
                            return (
                                <div key={index} className={'border border-gray-300 p-4'}>
                                    <div>[Admin] {message.adminName} connected</div>
                                </div>
                            )
                        }
                        if (message.solved && !message.admin_id) {
                            return (
                                <div key={index} className={'border border-gray-300 p-4'}>
                                    <div>[Admin] {message.userName} marked ticket as Solved</div>
                                </div>
                            )
                        }
                        if (message.admin_id) {
                            return (
                                <div key={index} className={'border border-gray-300 p-4'}>
                                    <div>[Admin] {message.userName}: {message.text}</div>
                                </div>
                            )
                        }
                        return (
                            <div key={index} className={'border border-gray-300 p-4'}>
                                <div>{message.userName}: {message.text}</div>
                            </div>
                        )
                    })}
                </div>
                <div className={'mt-[-1px] w-full border border-gray-300 flex'}>
                    <textarea
                        className={'w-full h-full resize-none p-4'}
                        placeholder={'Enter message'}
                        value={state.message}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => localDispatch({
                            type: 'SET_MESSAGE',
                            payload: e.target.value,
                        })}
                    />
                    <button
                        className={'p-4 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                        onClick={sendMessage}
                    >
                        <Send/>
                    </button>
                </div>
            </div>
        </>
    )
}

export default PageMessengerChat;
