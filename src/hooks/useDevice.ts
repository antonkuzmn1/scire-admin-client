import {DeviceSize, setDeviceIsMobile, setDeviceSize} from "../slices/deviceSlice.ts";
import {AppDispatch} from "../utils/store.ts";
import {useDispatch} from "react-redux";
import {useEffect} from "react";

const getDeviceSize = (width: number, height: number): DeviceSize => {
    if (width > 1000 && height >= 200) return DeviceSize.Large;
    if (width >= 300 && height >= 200) return DeviceSize.Medium;
    return DeviceSize.Small;
};

const getDeviceIsMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const useDevice = () => {
    const dispatch: AppDispatch = useDispatch();

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const deviceSize = getDeviceSize(width, height);
            dispatch(setDeviceSize(deviceSize));

            const deviceIsMobile = getDeviceIsMobile();
            dispatch(setDeviceIsMobile(deviceIsMobile));
        };

        handleResize();

        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [dispatch]);
};

export default useDevice;
