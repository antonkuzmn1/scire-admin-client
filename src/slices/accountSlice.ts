import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export interface AccountState {
    authorized: boolean;
}

const initialState: AccountState = {
    authorized: false,
}

const accountSlice = createSlice({
    name: 'account',
    initialState,
    reducers: {
        setAccountAuthorized: (state, action: PayloadAction<boolean>) => {
            state.authorized = action.payload;
        },
    },
});

export const {
    setAccountAuthorized,
} = accountSlice.actions;

export default accountSlice.reducer;
