import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import { Eval as EvalType, Question, Model, EvalRunResults, Eval } from '../types'; // Use alias for Eval, add Model and EvalRunResults
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
import EvalRunConfig from '../features/EvalExecution/EvalRunConfig'; // Import Eval Run config
import EvalResultsTable from '../features/EvalExecution/EvalResultsTable'; // Import the results table
import Input from '../components/common/Input'; // Import Input for modals
import Textarea from '../components/common/Textarea'; // Import Textarea for description editing
import toast from 'react-hot-toast'; // Import toast
import styles from './EvalDetailPage.module.css'; // Import styles
// Import Button and other components for actions later

function EvalDetailPage() {
    const { id: evalId } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // State for modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
    const [isRunModalOpen, setIsRunModalOpen] = useState(false); // State for Run modal
    const [isDeleteEvalModalOpen, setIsDeleteEvalModalOpen] = useState(false);
    // Add state for new modals
    const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
    const [isAddQuestionsModalOpen, setIsAddQuestionsModalOpen] = useState(false);
    const [numQuestionsInput, setNumQuestionsInput] = useState<number>(10); // Default for new modals
    const regenerateInputRef = useRef<HTMLInputElement>(null); // Ref for focusing input
    const addQuestionsInputRef = useRef<HTMLInputElement>(null); // Ref for focusing input
    
    // Add state for inline editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [editDescriptionValue, setEditDescriptionValue] = useState('');

    // Fetch Eval Data Query
    const { data: evalData, isLoading: isLoadingEval, error: evalError, isError: isEvalError } = useQuery<EvalType, Error>({
        queryKey: ['eval', evalId],
        queryFn: () => api.getEvalById(evalId!),
        enabled: !!evalId,
    });

    // Fetch available Models for Run Config
    const { data: models, isLoading: isLoadingModels, error: modelsError, isError: isModelsError } = useQuery<Model[], Error>({
        queryKey: ['models'],
        queryFn: api.getModels,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    // Fetch Latest Eval Run Results Query
    const { data: latestRunResults, isLoading: isLoadingLatestRun, error: latestRunError, isError: isLatestRunError } = useQuery<EvalRunResults | null, Error>({
        queryKey: ['latestEvalRunResults', evalId], // Use evalId in the query key
        queryFn: () => api.getLatestEvalRunResults(evalId!),
        enabled: !!evalId,
        staleTime: 1000 * 60, // Refetch results every minute or so
    });

    // --- Mutations --- 
    const updateQuestionMutation = useMutation<Question, Error, { questionId: string; data: { text: string } }>({
        mutationFn: (vars) => api.updateQuestion(evalId!, vars.questionId, vars.data),
        onSuccess: () => {
            toast.success(`Question updated successfully!`);
            queryClient.invalidateQueries({ queryKey: ['eval', evalId] });
            handleCloseEditModal();
        },
        onError: (error) => {
            console.error('Update question failed:', error.message);
            toast.error(`Failed to update question: ${error.message}`);
        }
    });

    const deleteQuestionMutation = useMutation<void, Error, string>({
        mutationFn: (questionId) => api.deleteQuestion(evalId!, questionId),
        onSuccess: () => {
            toast.success('Question deleted successfully.');
            queryClient.invalidateQueries({ queryKey: ['eval', evalId] });
            handleCloseConfirmDeleteModal();
        },
        onError: (error) => {
            console.error('Delete question failed:', error.message);
            toast.error(`Failed to delete question: ${error.message}`);
            handleCloseConfirmDeleteModal();
        }
    });

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

    // Eval Run Mutation
    const createEvalRunMutation = useMutation<
        { evalRunId: string },
        Error,
        { evalId: string; modelIds: string[] }
    >({
        mutationFn: api.createEvalRun,
        onSuccess: (data) => {
            handleCloseRunModal();
            toast.success(`Evaluation run started (ID: ${data.evalRunId}).`);
            // Invalidate results query so it refetches when navigating back or polling
            queryClient.invalidateQueries({ queryKey: ['latestEvalRunResults', evalId] });
            // Maybe navigate to a dedicated run page later?
            // navigate(`/evals/${evalId}/run/${data.evalRunId}`);
        },
        onError: (error) => {
            console.error("Failed to start eval run:", error.message);
            toast.error(`Failed to start run: ${error.message}`);
        }
    });

    // Add Delete Eval Mutation
    const deleteEvalMutation = useMutation<void, Error, string>({
        mutationFn: api.deleteEval,
        onSuccess: () => {
            toast.success('Evaluation deleted successfully.');
            queryClient.invalidateQueries({ queryKey: ['evals'] });
            navigate('/evals');
            handleCloseDeleteEvalModal();
        },
        onError: (error) => {
            console.error('Delete eval failed:', error.message);
            toast.error(`Failed to delete evaluation: ${error.message}`);
            handleCloseDeleteEvalModal();
        }
    });

    // Add Regenerate Mutation
    const regenerateMutation = useMutation<Eval, Error, { evalId: string; numQuestions: number }>({
        mutationFn: (vars) => api.regenerateEvalQuestions(vars.evalId, vars.numQuestions),
        onSuccess: (data) => {
            toast.success(`Successfully regenerated ${data.questions?.length || 0} questions.`);
            queryClient.invalidateQueries({ queryKey: ['eval', evalId] });
            handleCloseRegenerateModal();
        },
        onError: (error) => {
            toast.error(`Failed to regenerate questions: ${error.message}`);
            // Keep modal open on error
        }
    });

    // Add Add Questions Mutation
    const addQuestionsMutation = useMutation<Eval, Error, { evalId: string; numQuestions: number }>({
        mutationFn: (vars) => api.generateAdditionalEvalQuestions(vars.evalId, vars.numQuestions),
        onSuccess: (data) => {
            const newQuestionCount = data.questions?.length || 0;
            const oldQuestionCount = evalData?.questions?.length || 0;
            toast.success(`Successfully added ${newQuestionCount - oldQuestionCount} questions.`);
            queryClient.invalidateQueries({ queryKey: ['eval', evalId] });
            handleCloseAddQuestionsModal();
        },
        onError: (error) => {
            toast.error(`Failed to add questions: ${error.message}`);
            // Keep modal open on error
        }
    });

    // Add Update Eval Mutation
    const updateEvalMutation = useMutation<Eval, Error, { evalId: string; data: { name?: string; description?: string; difficulty?: string } }>({
        mutationFn: (vars) => api.updateEval(vars.evalId, vars.data),
        onSuccess: (data) => {
            toast.success('Evaluation updated successfully.');
            queryClient.invalidateQueries({ queryKey: ['eval', evalId] });
            setIsEditingName(false);
            setIsEditingDescription(false);
        },
        onError: (error) => {
            toast.error(`Failed to update evaluation: ${error.message}`);
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
        if (!evalId) return;
        triggerJudgingMutation.mutate({ ...configData, evalId: evalId });
    };

    // Run Modal Handlers
    const handleOpenRunModal = () => setIsRunModalOpen(true);
    const handleCloseRunModal = () => {
        setIsRunModalOpen(false);
        createEvalRunMutation.reset(); // Reset mutation state on close
    }

    const handleRunSubmit = (selectedModelIds: string[]) => {
        if (!evalId) return;
        createEvalRunMutation.mutate({ evalId: evalId, modelIds: selectedModelIds });
    };

    // Add Handlers for Delete Eval Modal
    const handleOpenDeleteEvalModal = () => {
        setIsDeleteEvalModalOpen(true);
    };
    const handleCloseDeleteEvalModal = () => {
        setIsDeleteEvalModalOpen(false);
        deleteEvalMutation.reset();
    };
    const handleConfirmDeleteEval = () => {
        if (evalId) {
            deleteEvalMutation.mutate(evalId);
        }
    };

    // Handlers for new modals
    const handleOpenRegenerateModal = () => {
        setNumQuestionsInput(evalData?.questions?.length || 10); // Default to current number or 10
        setIsRegenerateModalOpen(true);
        // Focus input when modal opens
        setTimeout(() => regenerateInputRef.current?.focus(), 0);
    };
    const handleCloseRegenerateModal = () => setIsRegenerateModalOpen(false);
    const handleConfirmRegenerate = () => {
        if (evalId && numQuestionsInput > 0) {
            regenerateMutation.mutate({ evalId, numQuestions: numQuestionsInput });
        }
    };

    const handleOpenAddQuestionsModal = () => {
        setNumQuestionsInput(10); // Default to adding 10 more
        setIsAddQuestionsModalOpen(true);
        // Focus input when modal opens
        setTimeout(() => addQuestionsInputRef.current?.focus(), 0);
    };
    const handleCloseAddQuestionsModal = () => setIsAddQuestionsModalOpen(false);
    const handleConfirmAddQuestions = () => {
        if (evalId && numQuestionsInput > 0) {
            addQuestionsMutation.mutate({ evalId, numQuestions: numQuestionsInput });
        }
    };

    const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        setNumQuestionsInput(isNaN(value) ? 0 : value);
    };

    // Inline editing handlers
    const handleStartEditName = () => {
        setEditNameValue(evalData?.name || '');
        setIsEditingName(true);
    };

    const handleStartEditDescription = () => {
        setEditDescriptionValue(evalData?.description || '');
        setIsEditingDescription(true);
    };

    const handleSaveName = () => {
        if (evalId && editNameValue.trim() !== (evalData?.name || '')) {
            updateEvalMutation.mutate({
                evalId,
                data: { name: editNameValue.trim() }
            });
        } else {
            setIsEditingName(false);
        }
    };

    const handleSaveDescription = () => {
        if (evalId && editDescriptionValue.trim() !== (evalData?.description || '')) {
            updateEvalMutation.mutate({
                evalId,
                data: { description: editDescriptionValue.trim() }
            });
        } else {
            setIsEditingDescription(false);
        }
    };

    const handleCancelEditName = () => {
        setIsEditingName(false);
        setEditNameValue('');
    };

    const handleCancelEditDescription = () => {
        setIsEditingDescription(false);
        setEditDescriptionValue('');
    };

    const handleNameKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            handleCancelEditName();
        }
    };

    const handleDescriptionKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSaveDescription();
        } else if (e.key === 'Escape') {
            handleCancelEditDescription();
        }
    };

    // --- Render Logic --- 
    if (!evalId) return <ErrorMessage message="No evaluation ID provided in URL." />;
    if (isLoadingEval || isLoadingModels) return <Spinner />;
    if (isEvalError) return <ErrorMessage message={evalError?.message || `Failed to load evaluation ${evalId}.`} />;
    if (!evalData) return <ErrorMessage message={`Evaluation with ID ${evalId} not found.`} />;
    if (isModelsError) {
        toast.error(`Failed to load models for Run config: ${modelsError?.message}`);
    }

    const isMutating = updateQuestionMutation.isPending || deleteQuestionMutation.isPending || triggerJudgingMutation.isPending || createEvalRunMutation.isPending || deleteEvalMutation.isPending || regenerateMutation.isPending || addQuestionsMutation.isPending || updateEvalMutation.isPending;

    const canRegenerateOrAdd = !!evalData.generationPrompt && !!evalData.generatorModelId;

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div className={styles.headerContent}>
                    {/* Editable Name */}
                    <div className={styles.evalNameContainer}>
                        {isEditingName ? (
                            <div className={styles.inlineEditContainer}>
                                <Input
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    onKeyDown={handleNameKeyPress}
                                    placeholder="Enter evaluation name"
                                    disabled={updateEvalMutation.isPending}
                                    autoFocus
                                />
                                <div className={styles.inlineEditActions}>
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={handleSaveName}
                                        disabled={updateEvalMutation.isPending}
                                        title="Save (Enter)"
                                    >
                                        ✓
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={handleCancelEditName}
                                        disabled={updateEvalMutation.isPending}
                                        title="Cancel (Escape)"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.evalNameDisplay}>
                                <h1 className={styles.evalName}>{evalData.name || 'Untitled Eval'}</h1>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleStartEditName}
                                    disabled={isMutating}
                                    title="Edit name"
                                    className={styles.editButton}
                                >
                                    ✏️
                                </Button>
                            </div>
                        )}
                    </div>

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

                    {/* Editable Description */}
                    <div className={styles.evalDescriptionContainer}>
                        {isEditingDescription ? (
                            <div className={styles.inlineEditContainer}>
                                <Textarea
                                    value={editDescriptionValue}
                                    onChange={(e) => setEditDescriptionValue(e.target.value)}
                                    onKeyDown={handleDescriptionKeyPress}
                                    placeholder="Enter evaluation description"
                                    disabled={updateEvalMutation.isPending}
                                    rows={3}
                                    autoFocus
                                />
                                <div className={styles.inlineEditActions}>
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={handleSaveDescription}
                                        disabled={updateEvalMutation.isPending}
                                        title="Save (Ctrl+Enter)"
                                    >
                                        ✓
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={handleCancelEditDescription}
                                        disabled={updateEvalMutation.isPending}
                                        title="Cancel (Escape)"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.evalDescriptionDisplay}>
                                {evalData.description ? (
                                    <p className={styles.evalDescription}>{evalData.description}</p>
                                ) : (
                                    <p className={styles.noDescription}>No description provided</p>
                                )}
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleStartEditDescription}
                                    disabled={isMutating}
                                    title="Edit description"
                                    className={styles.editButton}
                                >
                                    ✏️
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                {/* Action Buttons */}
                <div className={styles.headerActions}>
                    <Button
                        onClick={handleOpenRunModal}
                        variant="primary"
                        disabled={isMutating || !models || models.length === 0 || !evalData.questions || evalData.questions.length === 0}
                        title={!evalData.questions || evalData.questions.length === 0 ? 'Add questions before running' : !models || models.length === 0 ? 'Configure models before running' : 'Run Evaluation'}
                    >
                        Run Evaluation
                    </Button>
                    <Button onClick={handleOpenJudgeModal} disabled={isMutating}>
                        Judge Questions
                    </Button>
                    <Button
                        onClick={handleOpenAddQuestionsModal}
                        variant="secondary"
                        disabled={isMutating || !canRegenerateOrAdd}
                        title={!canRegenerateOrAdd ? "Original prompt/model missing" : "Add more questions"}
                    >
                        Add Questions
                    </Button>
                    <Button
                        onClick={handleOpenRegenerateModal}
                        variant="secondary"
                        disabled={isMutating || !canRegenerateOrAdd}
                        title={!canRegenerateOrAdd ? "Original prompt/model missing" : "Regenerate all questions"}
                    >
                        Regenerate Questions
                    </Button>
                    <Button onClick={handleOpenDeleteEvalModal} variant="danger" disabled={isMutating}>
                        Delete Eval
                    </Button>
                </div>
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

            {/* --- Render Eval Results Section --- */}
            <div className={styles.section}>
                <h2 className={styles.sectionHeader}>Latest Run Results</h2>
                {isLoadingLatestRun && <Spinner size="sm" />}
                {isLatestRunError && <ErrorMessage message={`Failed to load latest run results: ${latestRunError.message}`} />}
                {!isLoadingLatestRun && !isLatestRunError && (
                    latestRunResults ? (
                        <EvalResultsTable results={latestRunResults} />
                    ) : (
                        <p>No completed evaluation runs found for this set.</p>
                    )
                )}
            </div>

            {/* --- Render Judge Results Section --- */}
            {evalId && <div className={styles.section}><JudgeResultsDisplay evalId={evalId} /></div>}

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
                        <ErrorMessage message={updateQuestionMutation.error?.message || 'Failed to update question.'} />
                    }
                </Modal>
            )}

            {selectedQuestion && (
                <ConfirmationModal
                    isOpen={isConfirmDeleteModalOpen}
                    onClose={handleCloseConfirmDeleteModal}
                    onConfirm={handleConfirmDelete}
                    title="Confirm Delete Question"
                    message={`Are you sure you want to delete the question: "${selectedQuestion.text}"? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                />
            )}

            {/* Add Delete Eval Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteEvalModalOpen}
                onClose={handleCloseDeleteEvalModal}
                onConfirm={handleConfirmDeleteEval}
                title="Confirm Delete Evaluation"
                message={`Are you sure you want to permanently delete this evaluation set (${evalData?.name || evalId}) and all associated questions, runs, responses, scores, and judgments? This action cannot be undone.`}
                confirmText="Delete Forever"
                cancelText="Cancel"
            />

            {/* Judge Modal */}
            <Modal isOpen={isJudgeModalOpen} onClose={handleCloseJudgeModal} title="Configure Judge Mode">
                <JudgeModeConfig
                    evalId={evalId}
                    onSubmit={handleJudgeSubmit}
                    isSubmitting={triggerJudgingMutation.isPending}
                />
            </Modal>

            {/* Run Eval Modal */}
            <Modal isOpen={isRunModalOpen} onClose={handleCloseRunModal} title="Configure Evaluation Run">
                <EvalRunConfig
                    evalId={evalId}
                    availableModels={models || []}
                    isLoadingModels={isLoadingModels}
                    modelsError={isModelsError ? (modelsError?.message || 'Failed to load models') : null}
                    onSubmit={handleRunSubmit}
                    onClose={handleCloseRunModal}
                    isSubmitting={createEvalRunMutation.isPending}
                />
            </Modal>

            {/* Add Regenerate Questions Modal (Confirmation + Input) */}
            <Modal isOpen={isRegenerateModalOpen} onClose={handleCloseRegenerateModal} title="Regenerate Questions">
                <div className={styles.modalContent}>
                    <p>This will **delete all existing questions** and generate new ones using the original prompt.</p>
                    <p>Specify the number of questions to generate:</p>
                    <Input
                        type="number"
                        value={numQuestionsInput.toString()} // Input expects string
                        onChange={handleNumQuestionsChange}
                        min="1"
                        max="50" // Add a reasonable max
                        required
                        disabled={regenerateMutation.isPending}
                    />
                    {regenerateMutation.isError && (
                        <ErrorMessage message={regenerateMutation.error.message || 'Failed to regenerate.'} />
                    )}
                    <div className={styles.modalActions}>
                        <Button variant="secondary" onClick={handleCloseRegenerateModal} disabled={regenerateMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmRegenerate}
                            isLoading={regenerateMutation.isPending}
                            disabled={regenerateMutation.isPending || numQuestionsInput <= 0}
                        >
                            Regenerate
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Add Questions Modal (Input) */}
            <Modal isOpen={isAddQuestionsModalOpen} onClose={handleCloseAddQuestionsModal} title="Add More Questions">
                <div className={styles.modalContent}>
                    <p>Generate additional questions using the original prompt.</p>
                    <p>Number of additional questions to generate:</p>
                    <Input
                        type="number"
                        value={numQuestionsInput.toString()} // Input expects string
                        onChange={handleNumQuestionsChange}
                        min="1"
                        max="50" // Add a reasonable max
                        required
                        disabled={addQuestionsMutation.isPending}
                    />
                    {addQuestionsMutation.isError && (
                        <ErrorMessage message={addQuestionsMutation.error.message || 'Failed to add questions.'} />
                    )}
                    <div className={styles.modalActions}>
                        <Button variant="secondary" onClick={handleCloseAddQuestionsModal} disabled={addQuestionsMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmAddQuestions}
                            isLoading={addQuestionsMutation.isPending}
                            disabled={addQuestionsMutation.isPending || numQuestionsInput <= 0}
                        >
                            Add Questions
                        </Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}

export default EvalDetailPage; 