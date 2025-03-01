import React, {useCallback, useEffect, useReducer, useState} from "react";
import {AppDispatch} from "../../utils/store.ts";
import {useDispatch} from "react-redux";
import {setAppError} from "../../slices/appSlice.ts";
import {apiOauth, apiScire} from "../../utils/api.ts";
import {useNavigate} from "react-router-dom";
import {Admin, Company, Ticket, User} from "../../utils/messengerInterfaces.ts";
import {adminIdToName, statusToText, userIdToName} from "../../utils/messengerTools.ts";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import {useWebSocket} from "../WebSocketContext.tsx";
import {dateToString} from "../../utils/formatDate.ts";

interface State {
    tickets: Ticket[];
    users: User[];
    admins: Admin[];
}

type Action =
    | { type: 'SET_TICKETS', payload: Ticket[] }
    | { type: 'ADD_TICKET', payload: Ticket }
    | { type: 'UPDATE_TICKET', payload: Ticket }
    | { type: 'DELETE_TICKET', payload: Ticket }
    | { type: 'SET_USERS', payload: User[] }
    | { type: 'SET_ADMINS', payload: Admin[] }

const initialState: State = {
    tickets: [],
    users: [],
    admins: [],
}


const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_TICKETS':
            return {...state, tickets: action.payload}
        case 'ADD_TICKET':
            return {...state, tickets: [action.payload, ...state.tickets]}
        case 'UPDATE_TICKET':
            return {
                ...state,
                tickets: state.tickets.map(ticket =>
                    ticket.id === action.payload.id ? action.payload : ticket
                ),
            }
        case 'DELETE_TICKET':
            return {...state, tickets: state.tickets.filter(ticket => ticket.id !== action.payload.id)}
        case 'SET_USERS':
            return {...state, users: action.payload}
        case 'SET_ADMINS':
            return {...state, admins: action.payload}
        default:
            return state;
    }
}

const PageMessenger: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [state, localDispatch] = useReducer(reducer, initialState);
    const navigate = useNavigate();
    const [initDone, setInitDone] = useState<boolean>(false);
    const {socket} = useWebSocket();

    const init = useCallback(async () => {
        setInitDone(false);
        try {
            const usersResponse = await apiOauth.get("/users/");
            localDispatch({type: "SET_USERS", payload: usersResponse.data});

            const adminsResponse = await apiOauth.get("/admins/");
            const adminData = adminsResponse.data.map((admin: Admin) => {
                return {
                    ...admin,
                    companyNames: admin.companies.map((company: Company) => company.username).join(', '),
                }
            });
            localDispatch({type: "SET_ADMINS", payload: adminData});

            const response = await apiScire.get("/tickets/");
            const data = response.data.map((ticket: Ticket) => {
                return {
                    ...ticket,
                    statusText: statusToText(ticket.status),
                    userName: userIdToName(ticket.user_id, usersResponse.data),
                    adminName: adminIdToName(ticket.admin_id, adminsResponse.data),
                }
            })
            data.sort((a: Ticket, b: Ticket) => {
                return new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()
            });
            localDispatch({type: "SET_TICKETS", payload: data});
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
    }, [dispatch, init]);

    const getUserById = (userId: number | undefined) => {
        return state.users.find(user => user.id === userId);
    }

    const getAdminById = (adminId: number | undefined) => {
        return state.admins.find(admin => admin.id === adminId);
    }

    useEffect(() => {
        if (socket) {
            socket.onmessage = (event: any) => {
                const message = JSON.parse(event.data);
                console.log(message);
                switch (message.action) {
                    case "create_ticket":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({
                            type: 'ADD_TICKET',
                            payload: message.data,
                        });
                        break;
                    case "add_file_to_ticket":
                        break;
                    case "close_ticket":
                        console.log("close_ticket");
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({
                            type: 'DELETE_TICKET',
                            payload: message.data,
                        })
                        break;
                    case "reopen_ticket":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({
                            type: 'ADD_TICKET',
                            payload: message.data,
                        });
                        break;
                    case "send_message":
                        break;
                    case "connect_ticket":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({type: "UPDATE_TICKET", payload: message.data});
                        break;
                    case "disconnect_ticket":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({type: "UPDATE_TICKET", payload: message.data});
                        break;
                    case "set_ticket_status":
                        message.data.statusText = statusToText(message.data.status);
                        message.data.userName = userIdToName(message.data.user_id, state.users);
                        message.data.adminName = adminIdToName(message.data.admin_id, state.admins);
                        localDispatch({type: "UPDATE_TICKET", payload: message.data});
                        break;
                    default:
                        dispatch(setAppError("Unknown message type received via WebSocket"));
                        break;
                }
            };
        }
    }, []);

    if (!initDone) return <LoadingSpinner/>;

    return (
        <>
            <div className="flex overflow-x-scroll">
                <div className={'py-4 pr-2 pl-4 min-w-sm w-full gap-2 flex flex-col max-h-[calc(100dvh-57px)] hide-scrollbar overflow-y-scroll'}>
                    {state.tickets.filter((ticket: Ticket) => ticket.status === 0).map((ticket: Ticket, index) => (
                        <div
                            key={index}
                            className={'border border-gray-300 p-4 h-fit cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                            onClick={() => navigate(`/${ticket.id}`)}
                        >
                            <h1 className={'font-bold text-xl'}>#{ticket.id} - {ticket.title}</h1>
                            <p className={'whitespace-pre-line'}>{ticket.description}</p>
                            <br/>
                            <p className={'w-fit bg-red-200'}>Status: {ticket.statusText}</p>
                            <br/>
                            <p>User:</p>
                            <p>Fullname: {ticket.userName || 'None'}</p>
                            <p>Company: {getUserById(ticket.user_id)?.company.username || 'None'}</p>
                            <p>Department: {getUserById(ticket.user_id)?.department || 'None'}</p>
                            <p>Post: {getUserById(ticket.user_id)?.post || 'None'}</p>
                            <p>Local workplace: {getUserById(ticket.user_id)?.local_workplace || 'None'}</p>
                            <p>Remote workplace: {getUserById(ticket.user_id)?.remote_workplace || 'None'}</p>
                            <p>Phone: {getUserById(ticket.user_id)?.phone || 'None'}</p>
                            <p>Cellular: {getUserById(ticket.user_id)?.cellular || 'None'}</p>
                            <br/>
                            <p className={'w-fit bg-yellow-200'}>Admin:</p>
                            {ticket.admin_id ? (<>
                                <p>Fullname: {ticket.adminName || 'None'}</p>
                                <p>Companies: {getAdminById(ticket.admin_id)?.companyNames || 'None'}</p>
                                <p>Department: {getAdminById(ticket.admin_id)?.department || 'None'}</p>
                                <p>Post: {getAdminById(ticket.admin_id)?.post || 'None'}</p>
                                <p>Phone: {getAdminById(ticket.admin_id)?.phone || 'None'}</p>
                                <p>Cellular: {getAdminById(ticket.admin_id)?.cellular || 'None'}</p>
                            </>) : <p>None</p>}
                            <br/>
                            <p className={'text-right'}>
                                {dateToString(new Date(String(ticket.created_at)))}
                            </p>
                        </div>
                    ))}
                </div>
                <div className={'py-4 pl-2 pr-4 min-w-sm w-full gap-2 flex flex-col max-h-[calc(100dvh-57px)] hide-scrollbar overflow-y-scroll'}>
                    {state.tickets.filter((ticket: Ticket) => ticket.status === 1).map((ticket: Ticket, index) => (
                        <div
                            key={index}
                            className={'border border-gray-300 p-4 h-fit cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                            onClick={() => navigate(`/${ticket.id}`)}
                        >
                            <h1 className={'font-bold text-xl'}>#{ticket.id} - {ticket.title}</h1>
                            <p className={'whitespace-pre-line'}>{ticket.description}</p>
                            <br/>
                            <p className={'w-fit bg-yellow-200'}>Status: {ticket.statusText}</p>
                            <br/>
                            <p>User:</p>
                            <p>Fullname: {ticket.userName || 'None'}</p>
                            <p>Company: {getUserById(ticket.user_id)?.company.username || 'None'}</p>
                            <p>Department: {getUserById(ticket.user_id)?.department || 'None'}</p>
                            <p>Post: {getUserById(ticket.user_id)?.post || 'None'}</p>
                            <p>Local workplace: {getUserById(ticket.user_id)?.local_workplace || 'None'}</p>
                            <p>Remote workplace: {getUserById(ticket.user_id)?.remote_workplace || 'None'}</p>
                            <p>Phone: {getUserById(ticket.user_id)?.phone || 'None'}</p>
                            <p>Cellular: {getUserById(ticket.user_id)?.cellular || 'None'}</p>
                            <br/>
                            <p className={'w-fit bg-yellow-200'}>Admin:</p>
                            {ticket.admin_id ? (<>
                                <p>Fullname: {ticket.adminName || 'None'}</p>
                                <p>Companies: {getAdminById(ticket.admin_id)?.companyNames || 'None'}</p>
                                <p>Department: {getAdminById(ticket.admin_id)?.department || 'None'}</p>
                                <p>Post: {getAdminById(ticket.admin_id)?.post || 'None'}</p>
                                <p>Phone: {getAdminById(ticket.admin_id)?.phone || 'None'}</p>
                                <p>Cellular: {getAdminById(ticket.admin_id)?.cellular || 'None'}</p>
                            </>) : <p>None</p>}
                            <br/>
                            <p className={'text-right'}>
                                {dateToString(new Date(String(ticket.created_at)))}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}

export default PageMessenger;
