import React, {useEffect, useState} from "react";
import {Visibility} from "@mui/icons-material";

interface InputProps {
    label: string;
    type: React.HTMLInputTypeAttribute | undefined;
    placeholder?: string;
    value?: string | number;
    readOnly?: boolean;
    onChange?: (e: any) => void;
}

const Input: React.FC<InputProps> = (props: InputProps) => {
    const [passwordVisibility, setPasswordVisibility] = useState<boolean>(false);

    const togglePasswordVisibility = () => {
        setPasswordVisibility(!passwordVisibility);
    }

    useEffect(() => {
    })

    return (
        <div className={'border border-gray-300 h-12 flex'}>
            <label className={'border-r border-gray-300 min-w-36 flex items-center justify-center text-gray-700'}>
                {props.label}
            </label>
            <input
                type={props.type === 'password' ? (passwordVisibility ? 'text' : 'password') : props.type}
                placeholder={props.placeholder}
                value={props.value}
                readOnly={props.readOnly}
                onChange={props.onChange}
                className={'p-2 w-full text-gray-700'}
            />
            {props.type === 'password' && (
                <button
                    className={`${passwordVisibility ? 'bg-gray-300' : ''} cursor-pointer hover:bg-gray-300 transition-colors duration-200 px-2 text-gray-700`}
                    onClick={togglePasswordVisibility}
                    children={<Visibility/>}
                />
            )}
        </div>
    )
}

export default Input;
