import React, {ChangeEvent, ReactNode, useCallback, useEffect, useReducer, useRef} from "react";
import Input from "../components/Input.tsx";
import {AppDispatch} from "../../utils/store.ts";
import {useDispatch} from "react-redux";
import {setAppError, setAppLoading} from "../../slices/appSlice.ts";
import {apiOauth, apiScire, apiStorage, wsScire} from "../../utils/api.ts";
import Dialog from "../components/Dialog.tsx";
import Cookies from "js-cookie";
import {formatFileSize} from "../../utils/formatFileSize.ts";
import {useNavigate} from "react-router-dom";

// interface StorageFile {
//     uuid: string;
//     name: string;
//     size: number;
//     sizeFormatted: string;
//     user_id: number;
//     userName: string;
//     created_at: string | null;
//     updated_at: string | null;
//     file: File | null;
// }

interface Company {
    id: number;
    username: string;
    description: string;
    created_at: string | null;
    updated_at: string | null;
}

interface Admin {
    id: number;
    username: string;
    password: string;
    surname: string;
    name: string;
    middlename: string | null;
    department: string | null;
    phone: string | null;
    cellular: string | null;
    post: string | null;
    companies: Company[]
    companyNames: string;
    created_at: string | null;
    updated_at: string | null;
}

// interface MessageFile {
//     item_id: number;
//     file_uuid: string;
//     file_name: string;
//     file_size: number;
// }

// interface TicketFile {
//     item_id: number;
//     file_uuid: string;
//     file_name: string;
//     file_size: number;
// }
//
// interface Message {
//     id: number;
//     text: string;
//     user_id: number;
//     admin_id: number | null;
//     ticket_id: Ticket['id'];
//     admin_connected: boolean;
//     admin_disconnected: boolean;
//     in_progress: boolean;
//     solved: boolean;
//     files: MessageFile[];
// }

interface Ticket {
    id: number;
    title: string;
    description: string;
    status: 0 | 1 | 2
    statusText: 'Pending' | 'In progress' | 'Solved';
    user_id: number;
    admin_id: number | null;
    adminName: string;
    created_at: string | null;
    updated_at: string | null;
}

interface State {
    tickets: Ticket[];
    dialog: 'create' | 'ticket' | null;
    currentTicket: Ticket;
    admins: Admin[]
    files: File[];
}


type Action =
    | { type: 'SET_TICKETS', payload: Ticket[] }
    | { type: 'OPEN_DIALOG', payload: { dialog: 'create' | 'ticket', ticket?: Ticket } }
    | { type: 'CLOSE_DIALOG' }
    | { type: 'UPDATE_CURRENT_TICKET', payload: Partial<Ticket> }
    | { type: 'ADD_TICKET', payload: Ticket }
    | { type: 'SET_ADMINS', payload: Admin[] }
    | { type: 'ADD_FILE', payload: File | null }
    | { type: 'DELETE_FILE', payload: number };

const defaultTicket: Ticket = {
    id: 0,
    title: '',
    description: '',
    status: 0,
    statusText: 'Pending',
    user_id: 0,
    admin_id: null,
    adminName: '',
    created_at: null,
    updated_at: null,
}

const initialState: State = {
    tickets: [],
    dialog: null,
    currentTicket: defaultTicket,
    admins: [],
    files: [],
}


const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_TICKETS':
            return {
                ...state,
                tickets: action.payload,
            }
        case 'OPEN_DIALOG':
            return {
                ...state,
                dialog: action.payload.dialog,
                currentTicket: action.payload.ticket || defaultTicket,
            }
        case 'CLOSE_DIALOG':
            return {
                ...state,
                dialog: null,
                currentTicket: defaultTicket,
            }
        case 'UPDATE_CURRENT_TICKET':
            return {
                ...state,
                currentTicket: {...state.currentTicket, ...action.payload},
            }
        case 'ADD_TICKET':
            return {
                ...state,
                tickets: [action.payload, ...state.tickets],
                dialog: null,
            }
        case 'SET_ADMINS':
            return {
                ...state,
                admins: action.payload,
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

const PageMessenger: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [state, localDispatch] = useReducer(reducer, initialState);
    const wsRef = useRef<WebSocket | null>(null);
    const navigate = useNavigate();

    const getTickets = useCallback(async () => {
        dispatch(setAppLoading(true));
        try {
            const adminsResponse = await apiOauth.get("/admins/");
            localDispatch({type: "SET_ADMINS", payload: adminsResponse.data});

            const response = await apiScire.get("/tickets/");
            const data = response.data.map((ticket: Ticket) => {
                return {
                    ...ticket,
                    statusText: statusToText(ticket.status),
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

    const openDialog = useCallback((dialog: "create" | "ticket", ticket?: Ticket) => {
        localDispatch({type: "OPEN_DIALOG", payload: {dialog, ticket}});
    }, []);

    const closeDialog = useCallback(() => {
        localDispatch({type: "CLOSE_DIALOG"});
    }, []);

    const createTicket = useCallback(() => {
        const title = state.currentTicket.title.trim();
        const description = state.currentTicket.description.trim();
        if (!title || !description) {
            dispatch(setAppError('Title and Description required'));
        }

        dispatch(setAppLoading(true));

        const payload = {
            action: 'create_ticket',
            data: {
                title,
                description,
            }
        }
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        } else {
            dispatch(setAppError("WebSocket error"));
        }

        dispatch(setAppLoading(false));
    }, [dispatch, state.currentTicket]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const newFile = e.target.files[0];

        localDispatch({
            type: 'ADD_FILE',
            payload: newFile,
        });

        e.target.value = '';
    };

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
                    case "create_ticket":
                        const data: Ticket = message.data;
                        data.statusText = statusToText(data.status);
                        data.adminName = adminIdToName(data.admin_id, state.admins);
                        localDispatch({
                            type: 'ADD_TICKET',
                            payload: message.data,
                        });
                        state.files.forEach(async (file: File) => {
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                                const response = await apiStorage.post("/file", formData, {
                                    headers: {
                                        "Content-Type": "multipart/form-data",
                                    },
                                });

                                const payload = {
                                    action: 'add_file_to_ticket',
                                    data: {
                                        item_id: data.id,
                                        file_uuid: response.data.uuid,
                                        file_name: response.data.name,
                                        file_size: response.data.size,
                                    }
                                }
                                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                    wsRef.current.send(JSON.stringify(payload));
                                } else {
                                    dispatch(setAppError("WebSocket error"));
                                }
                            } catch (error: unknown) {
                                if (error instanceof Error) {
                                    dispatch(setAppError(error.message));
                                } else {
                                    dispatch(setAppError("An unknown error occurred"));
                                }
                            }
                        })
                        break;
                    case "add_file_to_ticket":
                        break;
                    default:
                        dispatch(setAppError("Unknown message type received via WebSocket"));
                        break;
                }
            };
        }
    }, [state.files]);

    return (
        <>
            <div className="p-4 flex justify-center pb-20">
                <div className={'max-w-xl w-full gap-2 flex flex-col'}>
                    <div
                        className={'border border-gray-300 p-4 h-fit cursor-pointer hover:bg-gray-300 transition-colors duration-200'}
                        onClick={() => openDialog('create')}
                    >
                        <h1>Create new ticket</h1>
                    </div>
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
            {state.dialog === 'create' && (
                <DialogActions
                    type={state.dialog}
                    closeDialog={closeDialog}
                    action={createTicket}
                    dialogFields={<>
                        <Input
                            label={'Title'}
                            type={'text'}
                            placeholder={'Enter title'}
                            value={state.currentTicket.title || ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => localDispatch({
                                type: 'UPDATE_CURRENT_TICKET',
                                payload: {title: e.target.value},
                            })}
                        />
                        <div className={'border border-gray-300 h-48 flex'}>
                            <label
                                className={'border-r border-gray-300 min-w-36 flex items-center justify-center text-gray-700'}>
                                Description
                            </label>
                            <textarea
                                placeholder={'Enter description'}
                                value={state.currentTicket.description || ''}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => localDispatch({
                                    type: 'UPDATE_CURRENT_TICKET',
                                    payload: {description: e.target.value},
                                })}
                                className={'p-2 w-full text-gray-700 resize-none'}
                            />
                        </div>
                        <div className={'border border-gray-300 h-fit flex'}>
                            <label
                                className={'border-r border-gray-300 min-w-36 flex items-center justify-center text-gray-700'}>
                                Files
                            </label>
                            <div className={'w-full p-2 space-y-2'}>
                                <input
                                    className={'hidden'}
                                    type='file'
                                    id="file-upload"
                                    onChange={handleFileChange}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="h-12 px-3 w-full border border-gray-300 flex items-center cursor-pointer text-gray-700 hover:bg-gray-300 transition-colors duration-200"
                                >
                                    Add file
                                </label>
                                {state.files.map((file: File, index: number) => (
                                    <div key={index}
                                         className={'h-12 w-full border border-gray-300 pl-2 flex items-center justify-between text-gray-700'}>
                                        {file.name + " - " + formatFileSize(file.size)}
                                        <button
                                            className={'h-12 px-2 w-100px flex items-center cursor-pointer text-gray-700 hover:bg-gray-300 transition-colors duration-200'}
                                            onClick={() => localDispatch({
                                                type: 'DELETE_FILE',
                                                payload: index,
                                            })}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>}
                />
            )}
        </>
    )
}

export default PageMessenger;

interface DialogActionsProps {
    type: 'create' | 'ticket'
    closeDialog: () => void;
    action: () => void;
    dialogFields?: ReactNode;
}

const DialogActions: React.FC<DialogActionsProps> = ({type, closeDialog, action, dialogFields}) => {
    switch (type) {
        case "create":
            return (
                <Dialog
                    close={closeDialog}
                    title={"Create ticket"}
                    buttons={[
                        {text: "Cancel", onClick: closeDialog},
                        {text: "Create", onClick: action},
                    ]}
                    children={dialogFields}
                />
            );
        case "ticket":
            return (
                <Dialog
                    close={closeDialog}
                    title={"Delete item"}
                    message={'Are you sure you want to delete this item?'}
                    buttons={[
                        {text: "Cancel", onClick: closeDialog},
                        {text: "Delete", onClick: action},
                    ]}
                    children={dialogFields}
                />
            );
        default:
            return null
    }
}
