import React from "react";
interface PhoneInputProps {
    onChange: (event: {
        target: {
            name: string;
            value: string;
        };
    }) => void;
    name: string;
}
export declare const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps & React.RefAttributes<HTMLInputElement>>;
export {};
