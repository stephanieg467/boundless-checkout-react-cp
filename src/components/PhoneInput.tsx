import React from "react";
import { IMaskInput } from "react-imask";

interface PhoneInputProps {
	onChange: (event: { target: { name: string; value: string } }) => void;
	name: string;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
	function PhoneInput(props, ref) {
		const { onChange, name, ...other } = props;
		return (
			<IMaskInput
				{...other}
				mask="(#00)-000-0000"
				definitions={{
					'#': /[1-9]/,
				}}
				inputRef={ref}
				onAccept={(value: any) => onChange({ target: { name, value } })}
				overwrite
			/>
		);
	}
);