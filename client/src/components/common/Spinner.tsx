import React from 'react';
import styles from './Spinner.module.css';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'lg', className }) => {
    const spinnerClasses = [
        styles.spinner,
        styles[size],
        className
    ].filter(Boolean).join(' ');

    return <div className={spinnerClasses} role="status" aria-live="polite"></div>;
};

export default Spinner; 