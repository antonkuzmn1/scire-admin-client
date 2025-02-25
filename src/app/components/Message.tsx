import {AppDispatch, RootState} from "../../utils/store.ts";
import {useDispatch, useSelector} from "react-redux";
import {setAppMessage} from "../../slices/appSlice.ts";
import Dialog from "./Dialog.tsx";

const Message = () => {
    const dispatch: AppDispatch = useDispatch();

    const message = useSelector((state: RootState) => state.app.message);

    if (message.length === 0) return null;

    return (
        <Dialog
            title={"Message"}
            close={() => dispatch(setAppMessage(""))}
            message={message}
            buttons={[
                {text: "Close", onClick: () => dispatch(setAppMessage(""))},
            ]}
        />
    );
};

export default Message;
