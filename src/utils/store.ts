import {configureStore} from "@reduxjs/toolkit";
import deviceReducer from './../slices/deviceSlice';
import appSlice from "../slices/appSlice.ts";
import accountSlice from "../slices/accountSlice.ts";

export const store = configureStore({
    reducer: {
        device: deviceReducer,
        app: appSlice,
        account: accountSlice,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
