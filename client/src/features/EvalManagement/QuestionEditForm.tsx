import React, { useState, useEffect, FormEvent } from 'react';
import Input from '../../components/common/Input'; // Assuming Input handles textarea via type or separate component needed
import Button from '../../components/common/Button';
import styles from './QuestionEditForm.module.css'; // Create this CSS module

interface QuestionEditFormProps {
    initialText: string;
    onSubmit: (newText: string) => void;
    onClose: () => void;
    isSubmitting?: boolean;
}

const QuestionEditForm: React.FC<QuestionEditFormProps> = ({
    initialText,
    onSubmit,
    onClose,
    isSubmitting = false,
}) => {
    const [text, setText] = useState(initialText);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setText(initialText); // Reset text if initialText changes (e.g., opening modal for different question)
        setError(null);
    }, [initialText]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!text.trim()) {
            setError('Question text cannot be empty.');
            return;
        }
        setError(null);
        onSubmit(text);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {/* Assuming Input can be used as a textarea by passing appropriate props 
           or a dedicated Textarea component should be created/used */}
            <Input
                // type="textarea" // Or use a <textarea> directly or a Textarea component
                label="Question Text"
                name="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                disabled={isSubmitting}
                error={error || undefined}
            // Add props like rows={5} if using Input as textarea wrapper
            />
            <div className={styles.formActions}>
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                    Save Changes
                </Button>
            </div>
        </form>
    );
};

export default QuestionEditForm; 