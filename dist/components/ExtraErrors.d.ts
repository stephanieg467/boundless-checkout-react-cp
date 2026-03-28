import { FormikErrors } from "formik";
/**
 * Some fields might not be represented in the form,
 * but in the response might be errors related to these hidden fields (e.g. some system errors).
 *
 * We need to display errors in any case.
 */
export default function ExtraErrors({ excludedFields, errors }: {
    excludedFields: string[];
    errors: FormikErrors<any>;
}): import("react/jsx-runtime").JSX.Element;
