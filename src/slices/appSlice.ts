import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export interface AppState {
    loading: boolean;
    error: string;
    message: string;
}

const initialState: AppState = {
    loading: false,
    error: '',
    message: '',
}

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setAppLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setAppError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
        },
        setAppMessage: (state, action: PayloadAction<string>) => {
            state.message = action.payload;
        },
    },
});

export const {
    setAppLoading,
    setAppError,
    setAppMessage,
} = appSlice.actions;

export default appSlice.reducer;
