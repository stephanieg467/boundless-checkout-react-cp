import { FormikProps, FormikValues } from "formik";
import { FormikHandlers } from "formik/dist/types";
export interface IFieldAttrs {
    name: string;
    error: boolean;
    value: string;
    onChange: FormikHandlers["handleChange"];
    helperText?: string;
}
export declare function fieldAttrs<V extends FormikValues>(field: string, formikProps: FormikProps<V>, helperText?: string): IFieldAttrs;
interface ICheckAttrs {
    name: string;
    onChange: FormikHandlers["handleChange"];
    checked?: boolean;
}
export declare function checkAttrs<V extends FormikValues>(field: string, formikProps: FormikProps<V>): ICheckAttrs;
export type TApiErrors = {
    field: string;
    message: string;
}[];
export declare function apiErrors2Formik(errors: TApiErrors): {
    [field: string]: string;
};
export {};
