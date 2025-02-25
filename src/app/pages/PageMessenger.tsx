import React, {useCallback, useEffect, useReducer, useRef} from "react";
import {AppDispatch} from "../../utils/store.ts";
import {useDispatch} from "react-redux";
import {setAppError, setAppLoading} from "../../slices/appSlice.ts";
import {apiOauth, apiScire, wsScire} from "../../utils/api.ts";
import Cookies from "js-cookie";
import {useNavigate} from "react-router-dom";
import {Admin, Ticket, User} from "../../utils/messengerInterfaces.ts";
import {adminIdToName, statusToText, userIdToName} from "../../utils/messengerTools.ts";

interface State {
    tickets: Ticket[];
    users: User[];
    admins: Admin[];
}

type Action =
    | { type: 'SET_TICKETS', payload: Ticket[] }
    | { type: 'ADD_TICKET', payload: Ticket }
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
            return {
                ...state,
                tickets: action.payload,
            }
        case 'ADD_TICKET':
            return {
                ...state,
                tickets: [action.payload, ...state.tickets],
            }
        case 'SET_USERS':
            return {
                ...state,
                users: action.payload,
            }
        case 'SET_ADMINS':
            return {
                ...state,
                admins: action.payload,
            }
        default:
            return state;
    }
}

const PageMessenger: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [state, localDispatch] = useReducer(reducer, initialState);
    const wsRef = useRef<WebSocket | null>(null);
    const navigate = useNavigate();

    const getTickets = useCallback(async () => {
        dispatch(setAppLoading(true));
        try {
            const usersResponse = await apiOauth.get("/users/");
            localDispatch({type: "SET_USERS", payload: usersResponse.data});

            const adminsResponse = await apiOauth.get("/admins/");
            localDispatch({type: "SET_ADMINS", payload: adminsResponse.data});

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
            dispatch(setAppLoading(false));
        }
    }, []);

    useEffect(() => {
        getTickets().then();
    }, [dispatch]);

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
                    case "create_ticket":
                        const data: Ticket = message.data;
                        data.statusText = statusToText(data.status);
                        data.userName = userIdToName(data.user_id, state.users);
                        data.adminName = adminIdToName(data.admin_id, state.admins);
                        localDispatch({
                            type: 'ADD_TICKET',
                            payload: message.data,
                        });
                        break;
                    case "add_file_to_ticket":
                        break;
                    default:
                        dispatch(setAppError("Unknown message type received via WebSocket"));
                        break;
                }
            };
        }
    }, []);

    return (
        <>
            <div className="p-4 flex justify-center pb-20">
                <div className={'max-w-xl w-full gap-2 flex flex-col'}>
                    {state.tickets.map((ticket: Ticket, index) => (
                        <div key={index} className={'border border-gray-300 p-4 h-fit'}>
                            <h1>{ticket.title} ({ticket.statusText})</h1>
                            <p>{ticket.description}</p>
                            <button
                                className={'border border-gray-300 px-4 cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                                onClick={() => navigate(`/messenger/${ticket.id}`)}
                            >
                                Open
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}

export default PageMessenger;
