import React from 'react';
import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
    children?: React.ReactNode;
    message?: string;
    id?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ children, message, id }) => {
    const content = children || message;
    if (!content) {
        return null;
    }

    return (
        <div id={id} className={styles.errorMessage} role="alert">
            {content}
        </div>
    );
};

export default ErrorMessage; 