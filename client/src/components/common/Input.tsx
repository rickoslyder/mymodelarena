import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input: React.FC<InputProps> = ({
    label,
    id,
    error,
    className,
    ...props
}) => {
    const inputId = id || (label ? label.replace(/\s+/g, '').toLowerCase() : undefined);
    const inputClasses = [
        styles.input,
        error ? styles.error : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={styles.formGroup}>
            {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
            <input
                id={inputId}
                className={inputClasses}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${inputId}-error` : undefined}
                {...props}
            />
            {error && <p id={`${inputId}-error`} className={styles.errorMessage}>{error}</p>}
        </div>
    );
};

export default Input; 