import React from 'react';
import styles from './Select.module.css';
import inputStyles from './Input.module.css'; // For formGroup, label, errorMessage

// Generic option type
interface OptionType {
    value: string | number;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: OptionType[]; // Array of options
    placeholderOption?: string; // Text for the initial disabled option
    isLoading?: boolean; // Add isLoading prop
}

const Select: React.FC<SelectProps> = ({
    label,
    id,
    error,
    className,
    options,
    placeholderOption = '-- Select an Option --',
    isLoading = false, // Add default value
    ...props
}) => {
    const selectId = id || (label ? label.replace(/\s+/g, '').toLowerCase() : undefined);
    const selectClasses = [
        styles.select,
        error ? inputStyles.error : '',
        className,
    ].filter(Boolean).join(' ');

    // Optionally add loading style or disable differently
    const isDisabled = props.disabled || isLoading;

    return (
        <div className={inputStyles.formGroup}>
            {label && <label htmlFor={selectId} className={inputStyles.label}>{label}</label>}
            <select
                id={selectId}
                className={selectClasses}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${selectId}-error` : undefined}
                disabled={isDisabled} // Use combined disabled state
                {...props} // Pass down value, onChange, disabled, required etc.
            >
                {/* Optionally show loading message */}
                {isLoading && <option>Loading...</option>}
                {!isLoading && placeholderOption && <option value="" disabled>{placeholderOption}</option>}
                {!isLoading && options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <p id={`${selectId}-error`} className={inputStyles.errorMessage}>{error}</p>}
        </div>
    );
};

export default Select;
