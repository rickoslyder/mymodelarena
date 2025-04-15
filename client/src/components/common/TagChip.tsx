import React from 'react';
import styles from './TagChip.module.css';

interface TagChipProps {
    label: string;
    // Add onClick or other props later if needed (e.g., for removal)
}

const TagChip: React.FC<TagChipProps> = ({ label }) => {
    return (
        <span className={styles.tagChip}>
            {label}
        </span>
    );
};

export default TagChip; 