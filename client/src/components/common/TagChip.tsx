import React from 'react';
import styles from './TagChip.module.css';

interface TagChipProps {
    label: string;
    onRemove?: () => void;
    variant?: 'default' | 'removable';
    size?: 'sm' | 'md';
}

const TagChip: React.FC<TagChipProps> = ({ 
    label, 
    onRemove, 
    variant = 'default',
    size = 'md' 
}) => {
    const chipClasses = [
        styles.tagChip,
        styles[variant],
        styles[size],
        onRemove ? styles.removable : ''
    ].filter(Boolean).join(' ');

    return (
        <span className={chipClasses}>
            <span className={styles.label}>{label}</span>
            {onRemove && (
                <button
                    className={styles.removeButton}
                    onClick={onRemove}
                    aria-label={`Remove ${label} tag`}
                >
                    ×
                </button>
            )}
        </span>
    );
};

export default TagChip; 