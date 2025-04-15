import React from 'react';
import { Model } from '../../types';
import ModelListItem from './ModelListItem';
import styles from './ModelList.module.css';

interface ModelListProps {
    models: Model[];
    onEditModel: (model: Model) => void; // Pass down from page
    onDeleteModel: (model: Model) => void; // Pass down from page
}

const ModelList: React.FC<ModelListProps> = ({ models, onEditModel, onDeleteModel }) => {
    if (!models || models.length === 0) {
        return <div className={styles.emptyState}>No models configured yet. Click "Add Model" to set up an LLM connection.</div>;
    }

    return (
        <div className={styles.listContainer}>
            {models.map((model) => (
                <ModelListItem
                    key={model.id}
                    model={model}
                    onEdit={onEditModel}
                    onDelete={onDeleteModel}
                />
            ))}
        </div>
    );
};

export default ModelList; 