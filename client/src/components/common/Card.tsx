import React from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    // Add other props like title, actions later if needed
}

const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
    const cardClasses = [
        styles.card,
        onClick ? styles.cardClickable : '',
        className
    ].filter(Boolean).join(' ');

    const Tag = onClick ? 'button' : 'div'; // Use button if clickable for semantics

    return (
        <Tag
            className={cardClasses}
            onClick={onClick}
            // Disable button styles if rendered as button
            style={onClick ? { border: 'none', background: 'none', padding: 0, textAlign: 'left', font: 'inherit' } : {}}
        >
            {/* Apply padding internally so button reset doesn't affect it */}
            <div style={{ padding: 'var(--space-4)' }}>
                {children}
            </div>
        </Tag>
    );
};

export default Card; 