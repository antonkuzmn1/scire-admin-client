import React, {useCallback, useEffect, useReducer, useState} from "react";
import {AppDispatch} from "../../utils/store.ts";
import {useDispatch} from "react-redux";
import Cookies from "js-cookie";
import axios from "axios";
import {setAccountAuthorized} from "../../slices/accountSlice.ts";
import {setAppError} from "../../slices/appSlice.ts";
import {dateToString} from "../../utils/formatDate.ts";
import Input from "../components/Input.tsx";
import {apiOauth} from "../../utils/api.ts";
import LoadingSpinner from "../components/LoadingSpinner.tsx";
import {Admin, Company} from "../../utils/messengerInterfaces.ts";

interface State {
    data: Admin;
}

type Action =
    | { type: 'SET_DATA', payload: Admin }

const initialState: State = {
    data: {
        id: 0,
        username: '',
        password: '',
        surname: '',
        name: '',
        middlename: null,
        department: null,
        phone: null,
        cellular: null,
        post: null,
        companies: [],
        companyNames: '',
        created_at: null,
        updated_at: null
    },
}

const reducer = (state: State, action: Action) => {
    switch (action.type) {
        case 'SET_DATA':
            return {...state, data: action.payload};
        default:
            return state;
    }
}

const PageMe: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [state, localDispatch] = useReducer(reducer, initialState);
    const [initDone, setInitDone] = useState<boolean>(false);

    const init = useCallback(async () => {
        setInitDone(false);
        try {
            const response = await apiOauth.get("/admins/profile");
            const data = {
                ...response.data,
                companyNames: response.data.companies.map((company: Company) => company.username).join(', '),
            }
            localDispatch({type: "SET_DATA", payload: data});
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

    const logout = () => {
        Cookies.remove('token');
        delete axios.defaults.headers.common['Authorization'];
        dispatch(setAccountAuthorized(false));
    }

    if (!initDone) return <LoadingSpinner/>;

    return (
        <>
            <div className="flex justify-center">
                <div className={'py-4 max-w-xl w-full gap-2 flex flex-col max-h-[calc(100dvh-57px)] overflow-y-scroll hide-scrollbar'}>
                    <Input
                        label={'ID'}
                        type={'number'}
                        placeholder={'Empty'}
                        value={state.data.id}
                        readOnly={true}
                    />
                    <Input
                        label={'Username'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.username}
                        readOnly={true}
                    />
                    <Input
                        label={'Surname'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.surname}
                        readOnly={true}
                    />
                    <Input
                        label={'Name'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.name}
                        readOnly={true}
                    />
                    <Input
                        label={'Middlename'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.middlename || ''}
                        readOnly={true}
                    />
                    <Input
                        label={'Department'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.department || ''}
                        readOnly={true}
                    />
                    <Input
                        label={'Phone'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.phone || ''}
                        readOnly={true}
                    />
                    <Input
                        label={'Cellular'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.cellular || ''}
                        readOnly={true}
                    />
                    <Input
                        label={'Post'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.post || ''}
                        readOnly={true}
                    />
                    <Input
                        label={'Companies'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.companyNames || ''}
                        readOnly={true}
                    />
                    <Input
                        label={'Created'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.created_at ? dateToString(new Date(state.data.created_at)) : ''}
                        readOnly={true}
                    />
                    <Input
                        label={'Updated'}
                        type={'text'}
                        placeholder={'Empty'}
                        value={state.data.updated_at ? dateToString(new Date(state.data.updated_at)) : ''}
                        readOnly={true}
                    />
                    <div className="flex w-full min-h-12 gap-2">
                        <button
                            className="border border-gray-300 flex items-center justify-center w-full hover:bg-gray-300 transition-colors duration-200 text-gray-600"
                            onClick={logout}
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PageMe;
