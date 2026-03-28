export interface IContactInformationFormValues {
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    dob: string | null;
    register_me?: boolean;
}
export declare enum TViewMode {
    contact = "contact",
    login = "login"
}
export declare function ContactFormView(): import("react/jsx-runtime").JSX.Element;
export default function ContactInformationForm(): import("react/jsx-runtime").JSX.Element;
