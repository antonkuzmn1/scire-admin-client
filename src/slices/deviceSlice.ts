import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export enum DeviceSize {
    Large = "Large",
    Medium = "Medium",
    Small = "Small"
}

export interface DeviceState {
    size: DeviceSize;
    isMobile: boolean;
}

const initialState: DeviceState = {
    size: DeviceSize.Medium,
    isMobile: true,
};

const deviceSlice = createSlice({
    name: 'device',
    initialState,
    reducers: {
        setDeviceSize: (state, action: PayloadAction<DeviceSize>) => {
            state.size = action.payload;
        },
        setDeviceIsMobile: (state, action: PayloadAction<boolean>) => {
            state.isMobile = action.payload;
        }
    },
});

export const {
    setDeviceSize,
    setDeviceIsMobile,
} = deviceSlice.actions;

export default deviceSlice.reducer;
