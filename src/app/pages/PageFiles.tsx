import React, {ReactNode, useCallback, useEffect, useReducer} from "react";
import {AppDispatch} from "../../utils/store.ts";
import {useDispatch} from "react-redux";
import {setAppError, setAppLoading} from "../../slices/appSlice.ts";
import Table from "../components/Table.tsx";
import Dialog from "../components/Dialog.tsx";
import {apiOauth, apiStorage} from "../../utils/api.ts";
import {formatFileSize} from "../../utils/formatFileSize.ts";
import Input from "../components/Input.tsx";
import {dateToString} from "../../utils/formatDate.ts";

interface Item {
    uuid: string;
    name: string;
    size: number;
    sizeFormatted: string;
    user_id: number;
    userName: string;
    created_at: string | null;
    updated_at: string | null;
    file: File | null;
}

interface Company {
    id: number;
    username: string;
    description: string;
    created_at: string | null;
    updated_at: string | null;
}

interface User {
    id: number;
    username: string;
    password: string;
    surname: string;
    name: string;
    middlename: string | null;
    department: string | null;
    remote_workplace: string | null;
    local_workplace: string | null;
    phone: string | null;
    cellular: string | null;
    post: string | null;
    company_id: number;
    company: Company;
    companyName: string;
    created_at: string | null;
    updated_at: string | null;
}

interface State {
    items: Item[];
    dialog: 'create' | 'delete' | null;
    currentItem: Item;
    users: User[];
}

type Action =
    | { type: 'SET_ITEMS', payload: Item[] }
    | { type: 'OPEN_DIALOG', payload: { dialog: 'create' | 'delete', item?: Item } }
    | { type: 'CLOSE_DIALOG' }
    | { type: 'UPDATE_CURRENT_ITEM', payload: Partial<Item> }
    | { type: 'ADD_ITEM', payload: Item }
    | { type: 'DELETE_ITEM', payload: Item }
    | { type: 'SET_USERS', payload: User[] };

const defaultItem: Item = {
    uuid: '',
    name: '',
    size: 0,
    sizeFormatted: '',
    user_id: 0,
    userName: '',
    created_at: null,
    updated_at: null,
    file: null,
}

const initialState: State = {
    items: [],
    dialog: null,
    currentItem: defaultItem,
    users: [],
}

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_ITEMS':
            return {
                ...state,
                items: action.payload,
            }
        case 'OPEN_DIALOG':
            return {
                ...state,
                dialog: action.payload.dialog,
                currentItem: action.payload.item || defaultItem,
            }
        case 'CLOSE_DIALOG':
            return {
                ...state,
                dialog: null,
                currentItem: defaultItem,
            }
        case 'UPDATE_CURRENT_ITEM':
            return {
                ...state,
                currentItem: {...state.currentItem, ...action.payload},
            }
        case 'ADD_ITEM':
            return {
                ...state,
                items: [...state.items, action.payload],
                dialog: null,
            }
        case 'DELETE_ITEM':
            return {
                ...state,
                items: state.items.filter(item => item.uuid !== action.payload.uuid),
                dialog: null,
            }
        case 'SET_USERS':
            return {
                ...state,
                users: action.payload,
            }
        default:
            return state;
    }
}

type TypeField = 'String' | 'Integer' | 'Boolean' | 'Date';

interface TableHeaders {
    text: string,
    field: keyof Item,
    width: string,
    type: TypeField,
}

const tableHeaders: TableHeaders[] = [
    {text: 'UUID', field: 'uuid', width: '400px', type: 'String'},
    {text: 'Name', field: 'name', width: '200px', type: 'String'},
    {text: 'Size', field: 'sizeFormatted', width: '150px', type: 'String'},
    {text: 'User', field: 'userName', width: '200px', type: 'String'},
    {text: 'Created at', field: 'created_at', width: '200px', type: 'Date'},
]

const PageFiles: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [state, localDispatch] = useReducer(reducer, initialState);

    const getItems = useCallback(async () => {
        dispatch(setAppLoading(true));
        try {
            const usersResponse = await apiOauth.get("/users/");
            localDispatch({type: "SET_USERS", payload: usersResponse.data});

            const response = await apiStorage.get("/file");
            const data = response.data.map((item: Item) => {
                return {
                    ...item,
                    sizeFormatted: formatFileSize(item.size),
                    userName: usersResponse.data.find((user: User) => user.id === item.user_id)?.username,
                }
            })
            data.sort((a: Item, b: Item) => {
                return new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()
            });
            localDispatch({type: "SET_ITEMS", payload: data});
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
        getItems().then();
    }, [getItems]);

    const openDialog = useCallback((dialog: "create" | "delete", item?: Item) => {
        localDispatch({type: "OPEN_DIALOG", payload: {dialog, item}});
    }, []);

    const closeDialog = useCallback(() => {
        localDispatch({type: "CLOSE_DIALOG"});
    }, []);

    const createItem = useCallback(async () => {
        if (!state.currentItem.file) {
            dispatch(setAppError('Select file'));
            return;
        }

        const formData = new FormData();
        formData.append("file", state.currentItem.file);
        formData.append("user_id", String(state.currentItem.user_id || state.users[0].id));

        dispatch(setAppLoading(true));
        try {
            const response = await apiStorage.post("/file", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            response.data.sizeFormatted = formatFileSize(response.data.size);
            response.data.userName = state.users.find((user: User) => user.id === response.data.user_id)?.username;
            localDispatch({type: "ADD_ITEM", payload: response.data});
        } catch (error: unknown) {
            if (error instanceof Error) {
                dispatch(setAppError(error.message));
            } else {
                dispatch(setAppError("An unknown error occurred"));
            }
        } finally {
            dispatch(setAppLoading(false));
        }
    }, [state.currentItem, dispatch]);

    const download = useCallback(async (item: Item) => {
        dispatch(setAppLoading(true));
        try {
            const response = await apiStorage.get(`/file/${item.uuid}`, {
                responseType: "blob",
            });

            const blob = new Blob([response.data], { type: response.headers["content-type"] });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = item.name;
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
    }, [state.currentItem, dispatch]);

    const deleteItem = useCallback(async () => {
        dispatch(setAppLoading(true));
        try {
            await apiStorage.delete(`/file/${state.currentItem.uuid}`);
            localDispatch({type: "DELETE_ITEM", payload: state.currentItem});
        } catch (error: unknown) {
            if (error instanceof Error) {
                dispatch(setAppError(error.message));
            } else {
                dispatch(setAppError("An unknown error occurred"));
            }
        } finally {
            dispatch(setAppLoading(false));
        }
    }, [state.currentItem, dispatch]);

    return (
        <>
            <Table
                tableHeaders={tableHeaders}
                rows={state.items}
                openCreateDialog={() => openDialog("create")}
                openDeleteDialog={(item) => openDialog("delete", item)}
                download={(item) => download(item)}
            />
            {state.dialog === 'create' && (
                <DialogActions
                    type={state.dialog}
                    closeDialog={closeDialog}
                    action={createItem}
                    dialogFields={<>
                        <div className={'border border-gray-300 h-12 flex'}>
                            <label
                                className={'border-r border-gray-300 min-w-36 flex items-center justify-center text-gray-700'}>
                                File
                            </label>
                            <div className="relative w-full">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    onChange={(event) => localDispatch({
                                        type: 'UPDATE_CURRENT_ITEM',
                                        payload: {file: event.target.files ? event.target.files[0] : null},
                                    })}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="absolute inset-0 flex items-center px-3 cursor-pointer text-gray-700 hover:bg-gray-300 transition-colors duration-200"
                                >
                                    {state.currentItem.file
                                        ? (state.currentItem.file.name + " - " + formatFileSize(state.currentItem.file.size))
                                        : "Upload file"
                                    }
                                </label>
                            </div>
                        </div>
                        <div className={'border border-gray-300 h-12 flex'}>
                            <label className={'border-r border-gray-300 min-w-36 flex items-center justify-center text-gray-700'}>
                                User
                            </label>
                            <select
                                value={state.currentItem.user_id}
                                className={'p-2 w-full text-gray-700'}
                                onChange={(e) => localDispatch({
                                    type: 'UPDATE_CURRENT_ITEM',
                                    payload: {user_id: Number(e.target.value)}
                                })}
                            >
                                {state.users.map(user => (
                                    <option key={user.id} value={user.id}>{user.username}</option>
                                ))}
                            </select>
                        </div>
                    </>}
                />
            )}
            {state.dialog === 'delete' && (
                <DialogActions
                    type={state.dialog}
                    closeDialog={closeDialog}
                    action={deleteItem}
                    dialogFields={<>
                        <Input
                            label={'UUID'}
                            type={'text'}
                            value={state.currentItem.uuid || ''}
                            readOnly={true}
                        />
                        <Input
                            label={'Name'}
                            type={'text'}
                            value={state.currentItem.name || ''}
                            readOnly={true}
                        />
                        <Input
                            label={'Size'}
                            type={'text'}
                            value={state.currentItem.sizeFormatted || ''}
                            readOnly={true}
                        />
                        <Input
                            label={'User'}
                            type={'text'}
                            value={state.currentItem.userName || ''}
                            readOnly={true}
                        />
                        <Input
                            label={'Created at'}
                            type={'text'}
                            value={dateToString(new Date(String(state.currentItem.created_at))) || ''}
                            readOnly={true}
                        />
                    </>}
                />
            )}
        </>
    )
}

export default PageFiles;

interface DialogActionsProps {
    type: 'create' | 'delete'
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
                    title={"Create item"}
                    buttons={[
                        {text: "Cancel", onClick: closeDialog},
                        {text: "Create", onClick: action},
                    ]}
                    children={dialogFields}
                />
            );
        case "delete":
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
