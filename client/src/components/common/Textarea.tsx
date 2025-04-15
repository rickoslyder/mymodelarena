import React from 'react';
import styles from './Textarea.module.css';
import inputStyles from './Input.module.css'; // Import base input styles for error message

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

const Textarea: React.FC<TextareaProps> = ({
    label,
    id,
    error,
    className,
    ...props
}) => {
    const textareaId = id || (label ? label.replace(/\s+/g, '').toLowerCase() : undefined);
    const textareaClasses = [
        styles.textarea,
        error ? inputStyles.error : '', // Use error class from Input styles
        className,
    ].filter(Boolean).join(' ');

    return (
        // Use formGroup class from Input styles for consistent layout
        <div className={inputStyles.formGroup}>
            {label && <label htmlFor={textareaId} className={inputStyles.label}>{label}</label>}
            <textarea
                id={textareaId}
                className={textareaClasses}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${textareaId}-error` : undefined}
                {...props}
            />
            {/* Use errorMessage class from Input styles */}
            {error && <p id={`${textareaId}-error`} className={inputStyles.errorMessage}>{error}</p>}
        </div>
    );
};

export default Textarea; 