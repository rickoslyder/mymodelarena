import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import { Eval as EvalType, Question } from '../types'; // Use alias for Eval
import Spinner from '../components/common/Spinner';
import ErrorMessage from '../components/common/ErrorMessage';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import QuestionEditForm from '../features/EvalManagement/QuestionEditForm';
import TagChip from '../components/common/TagChip';
import TagManager from '../features/EvalManagement/TagManager';
import JudgeModeConfig, { JudgeModeConfigData } from '../features/JudgeMode/JudgeModeConfig'; // Import Judge config
import JudgeResultsDisplay from '../features/JudgeMode/JudgeResultsDisplay'; // Import results display
import toast from 'react-hot-toast'; // Import toast
import styles from './EvalDetailPage.module.css'; // Import styles
// Import Button and other components for actions later

function EvalDetailPage() {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();

    // State for modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);

    // Fetch Eval Data Query
    const { data: evalData, isLoading, error, isError } = useQuery<EvalType, Error>({
        queryKey: ['eval', id],
        queryFn: () => api.getEvalById(id!),
        enabled: !!id,
    });

    // --- Mutations --- 
    const updateQuestionMutation = useMutation<Question, Error, { questionId: string; data: { text: string } }>({
        mutationFn: (vars) => api.updateQuestion(id!, vars.questionId, vars.data),
        onSuccess: () => {
            toast.success(`Question updated successfully!`);
            queryClient.invalidateQueries({ queryKey: ['eval', id] });
            handleCloseEditModal();
        },
        onError: (error) => {
            console.error('Update question failed:', error.message);
            toast.error(`Failed to update question: ${error.message}`);
        }
    });

    const deleteQuestionMutation = useMutation<void, Error, string>({
        mutationFn: (questionId) => api.deleteQuestion(id!, questionId),
        onSuccess: () => {
            toast.success('Question deleted successfully.');
            queryClient.invalidateQueries({ queryKey: ['eval', id] });
            handleCloseConfirmDeleteModal();
        },
        onError: (error) => {
            console.error('Delete question failed:', error.message);
            toast.error(`Failed to delete question: ${error.message}`);
            handleCloseConfirmDeleteModal();
        }
    });

    // Judge Mode Mutation
    const triggerJudgingMutation = useMutation<{ message: string }, Error, JudgeModeConfigData & { evalId: string }>({
        mutationFn: api.triggerJudging,
        onSuccess: (data) => {
            toast.success(data.message || 'Judge Mode initiated.');
            setIsJudgeModalOpen(false);
        },
        onError: (error) => {
            console.error("Failed to trigger judging:", error.message);
            toast.error(`Failed to start judging: ${error.message}`);
        }
    });

    // --- Handlers --- 
    const handleOpenEditModal = (question: Question) => {
        setSelectedQuestion(question);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setSelectedQuestion(null);
        setIsEditModalOpen(false);
        updateQuestionMutation.reset();
    };

    const handleOpenConfirmDeleteModal = (question: Question) => {
        setSelectedQuestion(question);
        setIsConfirmDeleteModalOpen(true);
    };

    const handleCloseConfirmDeleteModal = () => {
        setSelectedQuestion(null);
        setIsConfirmDeleteModalOpen(false);
        deleteQuestionMutation.reset();
    };

    const handleConfirmDelete = () => {
        if (selectedQuestion) {
            deleteQuestionMutation.mutate(selectedQuestion.id);
        }
    };

    const handleEditFormSubmit = (newText: string) => {
        if (selectedQuestion) {
            updateQuestionMutation.mutate({ questionId: selectedQuestion.id, data: { text: newText } });
        }
    };

    const handleOpenJudgeModal = () => {
        setIsJudgeModalOpen(true);
    };
    const handleCloseJudgeModal = () => setIsJudgeModalOpen(false);

    const handleJudgeSubmit = (configData: JudgeModeConfigData) => {
        if (!id) return;
        triggerJudgingMutation.mutate({ ...configData, evalId: id });
    };

    // --- Render Logic --- 
    if (!id) return <ErrorMessage message="No evaluation ID provided in URL." />;
    if (isLoading) return <Spinner />;
    if (isError) return <ErrorMessage message={error?.message || `Failed to load evaluation ${id}.`} />;
    if (!evalData) return <ErrorMessage message={`Evaluation with ID ${id} not found.`} />;

    const isMutating = updateQuestionMutation.isPending || deleteQuestionMutation.isPending || triggerJudgingMutation.isPending;

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div className={styles.headerContent}>
                    <h1 className={styles.evalName}>{evalData.name || 'Untitled Eval'}</h1>
                    <div className={styles.evalMeta}>
                        <span>ID: {evalData.id}</span>
                        <span>Created: {new Date(evalData.createdAt).toLocaleDateString()}</span>
                        <span>Difficulty: {evalData.difficulty || 'N/A'}</span>
                        {/* Add Generator Model later */}
                    </div>
                    <div className={styles.tagsContainer}>
                        {evalData.tags && evalData.tags.length > 0 ? (
                            evalData.tags.map(et => <TagChip key={et.tagId} label={et.tag.name} />)
                        ) : (
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>No tags assigned</span>
                        )}
                    </div>
                    {evalData.description && <p className={styles.evalDescription}>{evalData.description}</p>}
                </div>
                {/* Add Edit Metadata button later? */}
                <Button onClick={handleOpenJudgeModal} disabled={isMutating}>
                    Judge Questions
                </Button>
            </div>

            <TagManager evalData={evalData} />

            <div className={styles.section}>
                <h2 className={styles.sectionHeader}>Questions ({evalData.questions?.length ?? 0})</h2>
                {evalData.questions && evalData.questions.length > 0 ? (
                    <ul className={styles.questionList}>
                        {evalData.questions.map((q) => (
                            <li key={q.id} className={styles.questionItem}>
                                <span className={styles.questionText}>{q.text}</span>
                                <div className={styles.questionActions}>
                                    <Button size="sm" variant="secondary" onClick={() => handleOpenEditModal(q)} disabled={isMutating}>Edit</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleOpenConfirmDeleteModal(q)} disabled={isMutating}>Delete</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>This evaluation set currently has no questions.</p>
                )}
            </div>

            {/* Wrap results in a section */}
            {id && <div className={styles.section}><JudgeResultsDisplay evalId={id} /></div>}

            {/* --- Modals --- */}
            {selectedQuestion && (
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    title="Edit Question"
                >
                    <QuestionEditForm
                        initialText={selectedQuestion.text}
                        onSubmit={handleEditFormSubmit}
                        onClose={handleCloseEditModal}
                        isSubmitting={updateQuestionMutation.isPending}
                    />
                    {updateQuestionMutation.isError &&
                        <ErrorMessage message={updateQuestionMutation.error.message || 'Failed to update question.'} />
                    }
                </Modal>
            )}

            {selectedQuestion && (
                <ConfirmationModal
                    isOpen={isConfirmDeleteModalOpen}
                    onClose={handleCloseConfirmDeleteModal}
                    onConfirm={handleConfirmDelete}
                    title="Delete Question?"
                    message={`Are you sure you want to delete this question? This action cannot be undone.`}
                    confirmText="Delete"
                    isConfirming={deleteQuestionMutation.isPending}
                />
            )}

            <Modal
                isOpen={isJudgeModalOpen}
                onClose={handleCloseJudgeModal}
                title="Configure Judge Mode"
            >
                <JudgeModeConfig
                    evalId={id!}
                    onSubmit={handleJudgeSubmit}
                    isSubmitting={triggerJudgingMutation.isPending}
                />
            </Modal>
        </div>
    );
}

export default EvalDetailPage; 