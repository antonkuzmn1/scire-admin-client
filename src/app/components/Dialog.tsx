import React, {ReactNode} from "react";
import {Close} from "@mui/icons-material";

export interface DialogProps {
    title: string;
    message?: string;
    children?: ReactNode;
    buttons?: DialogButton[]
    close: () => void;
}

export interface DialogButton {
    text: string;
    onClick: () => void;
}

export const Dialog: React.FC<DialogProps> = ({title, message, children, buttons, close}) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="border border-gray-300 bg-white max-w-4xl w-full">
                <div className={'border-b h-12 border-gray-300 flex justify-between items-center'}>
                    <h2 className={'h-full flex items-center justify-center px-2 text-gray-700'}>
                        {title}
                    </h2>
                    <div
                        className={'h-full flex items-center justify-center w-12 cursor-pointer hover:bg-gray-300 transition-colors duration-200 text-gray-700'}
                        onClick={close}
                    >
                        <Close/>
                    </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                    {message &&
                        <p className={'px-4 pt-4 text-gray-700'}>{message}</p>
                    }
                    <div className="space-y-2 p-2">{children}</div>
                </div>
                <div className="border-t h-12 border-gray-300 flex justify-between items-center">
                    {buttons && buttons.map((button, index) => (
                        <button
                            key={index}
                            className={'h-full w-full cursor-pointer hover:bg-gray-300 transition-colors duration-200 text-gray-700'}
                            onClick={button.onClick}
                        >{button.text}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Dialog;
