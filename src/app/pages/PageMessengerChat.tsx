import React, {ChangeEvent, useCallback, useEffect, useReducer, useRef, useState} from "react";
import {AppDispatch} from "../../utils/store.ts";
import {useDispatch} from "react-redux";
import {setAppError} from "../../slices/appSlice.ts";
import {apiOauth, apiScire, apiStorage} from "../../utils/api.ts";
import {useNavigate, useParams} from "react-router-dom";
import {dateToString} from "../../utils/formatDate.ts";
import {Download, Send} from "@mui/icons-material";
import {formatFileSize} from "../../utils/formatFileSize.ts";
import {Admin, Ticket, User, Message, TicketFile, MessageFile, Company} from "../../utils/messengerInterfaces.ts";
import {adminIdToName, statusToText, userIdToName} from "../../utils/messengerTools.ts";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import {useWebSocket} from "../WebSocketContext.tsx";

interface State {
    ticket: Ticket;
    messages: Message[];
    admins: Admin[];
    users: User[];
    ticketFiles: TicketFile[];
    messageFiles: MessageFile[];
    files: File[];
    message: string;
    account: Admin | null;
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
    | { type: 'SET_MESSAGE', payload: string }
    | { type: 'SET_ACCOUNT', payload: Admin };

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
    account: null,
}

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_TICKET':
            return {...state, ticket: action.payload}
        case 'SET_MESSAGES':
            return {...state, messages: action.payload}
        case 'ADD_MESSAGE':
            return {...state, messages: [...state.messages, action.payload]}
        case 'SET_ADMINS':
            return {...state, admins: action.payload}
        case 'SET_USERS':
            return {...state, users: action.payload}
        case 'SET_TICKET_FILES':
            return {...state, ticketFiles: action.payload}
        case 'SET_MESSAGE_FILES':
            return {...state, messageFiles: action.payload}
        case 'ADD_FILE':
            return {...state, files: action.payload ? [...state.files, action.payload] : state.files}
        case 'DELETE_FILE':
            return {...state, files: state.files.filter((_, i) => i !== action.payload)}
        case 'SET_MESSAGE':
            return {...state, message: action.payload}
        case 'SET_ACCOUNT':
            return {...state, account: action.payload}
        default:
            return state;
    }
}

const PageMessengerChat: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [state, localDispatch] = useReducer(reducer, initialState);
    const {socket} = useWebSocket();
    const navigate = useNavigate();
    const {ticketId} = useParams();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [initDone, setInitDone] = useState<boolean>(false);

    const init = useCallback(async () => {
        setInitDone(false);
        try {
            const adminsResponse = await apiOauth.get("/admins/");
            const adminData = adminsResponse.data.map((admin: Admin) => {
                return {
                    ...admin,
                    companyNames: admin.companies.map((company: Company) => company.username).join(', '),
                }
            });
            localDispatch({type: "SET_ADMINS", payload: adminData});

            const usersResponse = await apiOauth.get("/users/");
            localDispatch({type: "SET_USERS", payload: usersResponse.data});

            const accountResponse = await apiOauth.get("/admins/profile");
            const accountData = {
                ...accountResponse.data,
                companyNames: accountResponse.data.companies.map((company: Company) => company.username).join(', '),
            }
            localDispatch({type: "SET_ACCOUNT", payload: accountData});

            const ticketResponse = await apiScire.get(`/tickets/${ticketId}`);
            const data = ticketResponse.data;
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
                    userName: userIdToName(message.user_id, usersResponse.data),
                    adminName: adminIdToName(message.admin_id, adminData),
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
            setInitDone(true);
        }
    }, []);

    useEffect(() => {
        init().then();
    }, [dispatch]);

    const getUserById = (userId: number | undefined) => {
        return state.users.find(user => user.id === userId);
    }

    const getAdminById = (adminId: number | undefined) => {
        return state.admins.find(admin => admin.id === adminId);
    }

    const handleKeyDown = (event: any) => {
        if (event.key === "Enter") {
            if (event.shiftKey) {
                event.preventDefault();
                localDispatch({type: 'SET_MESSAGE', payload: state.message + '\n'});
            } else {
                event.preventDefault();
                sendMessage();
            }
        }
    };

    const connectTicket = () => {
        setInitDone(false);

        const payload = {
            action: 'connect_ticket',
            data: {
                item_id: ticketId,
            }
        }
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        } else {
            dispatch(setAppError("WebSocket error"));
        }

        setInitDone(true);
    }

    const disconnectTicket = () => {
        setInitDone(false);

        const payload = {
            action: 'disconnect_ticket',
            data: {
                item_id: ticketId,
            }
        }
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        } else {
            dispatch(setAppError("WebSocket error"));
        }

        setTicketStatus(0);

        setInitDone(true);
    }

    const setTicketStatus = (status: 0 | 1 | 2) => {
        setInitDone(false);

        const payload = {
            action: 'set_ticket_status',
            data: {
                item_id: ticketId,
                status: status,
            }
        }
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        } else {
            dispatch(setAppError("WebSocket error"));
        }

        setInitDone(true);
    }

    const sendMessage = () => {
        localDispatch({type: 'SET_MESSAGE', payload: ''});
        const text = state.message.trim();
        if (!text) {
            dispatch(setAppError('Message text required'));
            return;
        }

        setInitDone(false);

        if (state.ticket.admin_id && state.ticket.admin_id !== state.account?.id) {
            dispatch(setAppError('Access denied'));
            return;
        }

        if (!state.ticket.admin_id) {
            connectTicket();
        }

        const payload = {
            action: 'send_message',
            data: {
                text,
                user_id: state.ticket.user_id,
                ticket_id: ticketId,
            }
        }
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        } else {
            dispatch(setAppError("WebSocket error"));
        }

        setInitDone(true);
    }

    const downloadTicketFile = async (ticketFile: TicketFile) => {
        setInitDone(false);
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
            setInitDone(true);
        }
    }

    useEffect(() => {
        if (socket) {
            socket.onmessage = (event: any) => {
                const message = JSON.parse(event.data);
                console.log(message);
                switch (message.action) {
                    case "create_ticket":
                        break;
                    case "add_file_to_ticket":
                        break;
                    case "send_message":
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({type: "ADD_MESSAGE", payload: message.data});
                        break;
                    case "close_ticket":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({type: "SET_TICKET", payload: message.data});
                        break;
                    case "reopen_ticket":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({type: "SET_TICKET", payload: message.data});
                        break;
                    case "connect_ticket":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({type: "SET_TICKET", payload: message.data});
                        break;
                    case "disconnect_ticket":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({type: "SET_TICKET", payload: message.data});
                        break;
                    case "set_ticket_status":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({type: "SET_TICKET", payload: message.data});
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
    }, [state.messages]);

    if (!initDone) return <LoadingSpinner/>;

    return (
        <>
            <div
                ref={containerRef}
                className={'fixed w-full h-[calc(100%-137px)] overflow-y-auto flex flex-col gap-2 p-4'}
            >
                <div className={'border border-gray-300 p-4'}>
                    <h1 className={'font-bold text-xl'}>#{state.ticket?.id} - {state.ticket?.title}</h1>
                    <p className={'whitespace-pre-line'}>{state.ticket?.description}</p>
                    <br/>
                    <p
                        className={`w-fit + ${state.ticket?.status === 2
                            ? 'bg-green-200'
                            : state.ticket?.status === 1
                                ? 'bg-yellow-200'
                                : 'bg-red-200'}
                                `}
                    >
                        Status: {state.ticket?.statusText}
                    </p>
                    {state.ticket?.status !== 0 && state.account?.id === state.ticket?.admin_id && (
                        <button
                            className={'bg-red-200 border border-gray-300 p-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                            onClick={() => setTicketStatus(0)}
                        >
                            Pending
                        </button>
                    )}
                    {state.ticket?.status !== 1 && state.account?.id === state.ticket?.admin_id && (
                        <button
                            className={'bg-yellow-200 border border-gray-300 p-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                            onClick={() => setTicketStatus(1)}
                        >
                            In progress
                        </button>
                    )}
                    {state.ticket?.status !== 2 && state.account?.id === state.ticket?.admin_id && (
                        <button
                            className={'bg-green-200 border border-gray-300 p-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                            onClick={() => setTicketStatus(2)}
                        >
                            Solved
                        </button>
                    )}
                    <br/>
                    <br/>
                    <p>User:</p>
                    <p>Fullname: {state.ticket?.userName || 'None'}</p>
                    <p>Company: {getUserById(state.ticket.user_id)?.company.username || 'None'}</p>
                    <p>Department: {getUserById(state.ticket?.user_id)?.department || 'None'}</p>
                    <p>Post: {getUserById(state.ticket?.user_id)?.post || 'None'}</p>
                    <p>Local workplace: {getUserById(state.ticket?.user_id)?.local_workplace || 'None'}</p>
                    <p>Remote workplace: {getUserById(state.ticket?.user_id)?.remote_workplace || 'None'}</p>
                    <p>Phone: {getUserById(state.ticket?.user_id)?.phone || 'None'}</p>
                    <p>Cellular: {getUserById(state.ticket?.user_id)?.cellular || 'None'}</p>
                    <br/>
                    <p className={'w-fit bg-yellow-200'}>Admin:</p>
                    {state.ticket?.admin_id ? (<>
                        <p>Fullname: {state.ticket?.adminName || 'None'}</p>
                        <p>Companies: {getAdminById(state.ticket?.admin_id)?.companyNames || 'None'}</p>
                        <p>Department: {getAdminById(state.ticket?.admin_id)?.department || 'None'}</p>
                        <p>Post: {getAdminById(state.ticket?.admin_id)?.post || 'None'}</p>
                        <p>Phone: {getAdminById(state.ticket?.admin_id)?.phone || 'None'}</p>
                        <p>Cellular: {getAdminById(state.ticket?.admin_id)?.cellular || 'None'}</p>
                    </>) : <p>None</p>}
                    {state.ticket?.admin_id !== state.account?.id && (
                        <button
                            className={'bg-yellow-200 border border-gray-300 p-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                            onClick={connectTicket}
                        >
                            Connect
                        </button>
                    )}
                    {state.ticket?.admin_id === state.account?.id && (
                        <button
                            className={'bg-red-200 border border-gray-300 p-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                            onClick={disconnectTicket}
                        >
                            Disconnect
                        </button>
                    )}
                    <p className={'text-right'}>{dateToString(new Date(String(state.ticket.created_at)))}</p>
                    {state.ticketFiles.length > 0 && (
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
                    )}
                </div>
                {state.messages.map((message, index) => {
                    if (message.admin_id &&
                        message.text === '' &&
                        !message.admin_connected &&
                        !message.admin_disconnected &&
                        !message.in_progress &&
                        !message.solved
                    ) {
                        return (
                            <div key={index} className={'border border-gray-300 p-4 bg-yellow-200'}>
                                <div className={'whitespace-pre-line'}>
                                    [Admin] {message.adminName} marked ticket as Pending
                                </div>
                                <div className={'w-full text-right'}>
                                    {dateToString(new Date(String(message.created_at)))}
                                </div>
                            </div>
                        )
                    }
                    if (!message.admin_id &&
                        message.text === '' &&
                        !message.admin_connected &&
                        !message.admin_disconnected &&
                        !message.in_progress &&
                        !message.solved
                    ) {
                        return (
                            <div key={index} className={'border border-gray-300 p-4'}>
                                <div className={'whitespace-pre-line'}>
                                    {message.userName} marked ticket as Pending
                                </div>
                                <div className={'w-full text-right'}>
                                    {dateToString(new Date(String(message.created_at)))}
                                </div>
                            </div>
                        )
                    }
                    if (message.admin_id &&
                        message.text === '' &&
                        !message.admin_connected &&
                        !message.admin_disconnected &&
                        message.in_progress &&
                        !message.solved
                    ) {
                        return (
                            <div key={index} className={'border border-gray-300 p-4 bg-yellow-200'}>
                                <div className={'whitespace-pre-line'}>
                                    [Admin] {message.adminName} marked ticket as In progress
                                </div>
                                <div className={'w-full text-right'}>
                                    {dateToString(new Date(String(message.created_at)))}
                                </div>
                            </div>
                        )
                    }
                    if (message.admin_id &&
                        message.text === '' &&
                        !message.admin_connected &&
                        !message.admin_disconnected &&
                        !message.in_progress &&
                        message.solved
                    ) {
                        return (
                            <div key={index} className={'border border-gray-300 p-4 bg-yellow-200'}>
                                <div className={'whitespace-pre-line'}>
                                    [Admin] {message.adminName} marked ticket as Solved
                                </div>
                                <div className={'w-full text-right'}>
                                    {dateToString(new Date(String(message.created_at)))}
                                </div>
                            </div>
                        )
                    }
                    if (message.admin_connected) {
                        return (
                            <div key={index} className={'border border-gray-300 p-4 bg-yellow-200'}>
                                <div className={'whitespace-pre-line'}>
                                    [Admin] {message.adminName} connected
                                </div>
                                <div className={'w-full text-right'}>
                                    {dateToString(new Date(String(message.created_at)))}
                                </div>
                            </div>
                        )
                    }
                    if (message.admin_disconnected) {
                        return (
                            <div key={index} className={'border border-gray-300 p-4 bg-yellow-200'}>
                                <div className={'whitespace-pre-line'}>
                                    [Admin] {message.adminName} disconnected
                                </div>
                                <div className={'w-full text-right'}>
                                    {dateToString(new Date(String(message.created_at)))}
                                </div>
                            </div>
                        )
                    }
                    if (message.solved && !message.admin_id) {
                        return (
                            <div key={index} className={'border border-gray-300 p-4'}>
                                <div className={'whitespace-pre-line'}>
                                    {message.userName} marked ticket as Solved
                                </div>
                                <div className={'w-full text-right'}>
                                    {dateToString(new Date(String(message.created_at)))}
                                </div>
                            </div>
                        )
                    }
                    if (message.admin_id) {
                        return (
                            <div key={index} className={'border border-gray-300 p-4 bg-yellow-200'}>
                                <div>
                                    [Admin] {message.adminName}:
                                </div>
                                <div className={'whitespace-pre-line'}>
                                    {message.text}
                                </div>
                                <div className={'w-full text-right'}>
                                    {dateToString(new Date(String(message.created_at)))}
                                </div>
                            </div>
                        )
                    }
                    return (
                        <div key={index} className={'border border-gray-300 p-4'}>
                            <div>
                                {message.userName}:
                            </div>
                            <div className={'whitespace-pre-line'}>
                                {message.text}
                            </div>
                            <div className={'w-full text-right'}>
                                {dateToString(new Date(String(message.created_at)))}
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className={'w-full border-t border-gray-300 flex fixed bottom-14 left-0 bg-white'}>
                <button
                    className={'p-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                    onClick={() => navigate(`/`)}
                >
                    Back
                </button>
                <textarea
                    className={'w-full h-full resize-none p-4'}
                    placeholder={'Enter message'}
                    value={state.message}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => localDispatch({
                        type: 'SET_MESSAGE',
                        payload: e.target.value,
                    })}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className={'p-4 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                    onClick={sendMessage}
                >
                    <Send/>
                </button>
            </div>
        </>
    )
}

export default PageMessengerChat;
