import React from 'react';
import { Link } from 'react-router-dom';
import { EvalListItem as EvalListItemType } from '../../types'; // Use type alias
import styles from './EvalList.module.css';
// Import TagChip later when created
// import TagChip from '../../components/common/TagChip';

interface EvalListItemProps {
    evalItem: EvalListItemType;
}

// Helper to format date strings
const formatDate = (dateString: string) => {
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return 'Invalid Date';
    }
}

const EvalListItem: React.FC<EvalListItemProps> = ({ evalItem }) => {
    return (
        <Link to={`/evals/${evalItem.id}`} className={styles.listItem}>
            <div className={styles.name}>{evalItem.name || 'Untitled Eval'}</div>
            {evalItem.description && (
                <div className={styles.description}>{evalItem.description}</div>
            )}
            <div className={styles.meta}>
                <div className={styles.metaInfo}>
                    <span>Questions: {evalItem._count?.questions ?? 'N/A'}</span>
                    <span>Difficulty: {evalItem.difficulty || 'N/A'}</span>
                    {/* Add Generator Model Name later if needed */}
                </div>
                <div className={styles.tags}>
                    {/* Render tags later using TagChip */}
                    {/* {evalItem.tags?.map(t => <TagChip key={t.tag.id} label={t.tag.name} />)} */}
                </div>
            </div>
            <div className={styles.metaInfo} style={{ marginTop: 'var(--space-2)' }}>
                <span>Created: {formatDate(evalItem.createdAt)}</span>
            </div>
        </Link>
    );
};

interface EvalListProps {
    evals: EvalListItemType[];
}

const EvalList: React.FC<EvalListProps> = ({ evals }) => {
    // Empty state handled in the page component
    return (
        <div className={styles.listContainer}>
            {evals.map((evalItem) => (
                <EvalListItem key={evalItem.id} evalItem={evalItem} />
            ))}
        </div>
    );
};

export default EvalList; 