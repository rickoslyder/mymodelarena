import React from 'react';
import { Model } from '../../types';
import styles from './ModelListItem.module.css';
import Button from '../../components/common/Button'; // Import Button
import Card from '../../components/common/Card'; // Import Card

interface ModelListItemProps {
    model: Model;
    onEdit: (model: Model) => void; // Placeholder for edit action
    onDelete: (model: Model) => void; // Placeholder for delete action
}

// Simple function to truncate URL for display
const truncateUrl = (url: string, length = 50) => {
    if (url.length <= length) return url;
    try {
        const parsedUrl = new URL(url);
        const displayPath = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname;
        const displayUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${displayPath}`;
        return displayUrl.length > length ? displayUrl.substring(0, length - 3) + '...' : displayUrl;
    } catch {
        // Fallback for invalid URLs (no error object needed here)
        return url.substring(0, length - 3) + '...';
    }
};

const ModelListItem: React.FC<ModelListItemProps> = ({ model, onEdit, onDelete }) => {
    return (
        <Card className={styles.listItemCard}>
            <div className={styles.contentWrapper}>
                <div className={styles.listItemInfo}>
                    <div className={styles.listItemName}>{model.name}</div>
                    <div className={styles.listItemUrl}>{truncateUrl(model.baseUrl)}</div>
                    {/* Add costs/other info later if needed */}
                </div>
                <div className={styles.listItemActions}>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEdit(model)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(model)}
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default ModelListItem; 