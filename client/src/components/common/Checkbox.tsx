import React from 'react';
import styles from './Checkbox.module.css';
import inputStyles from './Input.module.css';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string; // Label is required for checkboxes
    error?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
    label,
    id,
    error,
    className, // Allow passing custom class to the input itself
    ...props
}) => {
    const checkboxId = id || (label ? label.replace(/\s+/g, '').toLowerCase() : undefined);
    const inputClasses = [
        styles.checkboxInput,
        error ? inputStyles.error : '', // Reuse error style
        className,
    ].filter(Boolean).join(' ');

    return (
        // Use wrapper for spacing, but error message is outside label
        <div className={styles.checkboxWrapper}>
            <label htmlFor={checkboxId} className={styles.checkboxLabel}>
                <input
                    id={checkboxId}
                    type="checkbox"
                    className={inputClasses}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? `${checkboxId}-error` : undefined}
                    {...props} // Pass checked, onChange, disabled etc.
                />
                {label}
            </label>
            {error && <p id={`${checkboxId}-error`} className={inputStyles.errorMessage}>{error}</p>}
        </div>
    );
};

export default Checkbox; 