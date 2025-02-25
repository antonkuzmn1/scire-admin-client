import {AppDispatch, RootState} from "../../utils/store.ts";
import {useDispatch, useSelector} from "react-redux";
import {setAppError} from "../../slices/appSlice.ts";
import Dialog from "./Dialog.tsx";

const ErrorMessage = () => {
    const dispatch: AppDispatch = useDispatch();

    const error = useSelector((state: RootState) => state.app.error);

    if (error.length === 0) return null;

    return (
        <Dialog
            title={"Error"}
            close={() => dispatch(setAppError(""))}
            message={error}
            buttons={[
                {text: "Close", onClick: () => dispatch(setAppError(""))},
            ]}
        />
    );
};

export default ErrorMessage;
