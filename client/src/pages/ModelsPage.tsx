import { useState } from 'react'; // Keep useState for modal later
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppAlerts } from '../App';
import * as api from '../lib/api';
import ModelList from '../features/ModelManagement/ModelList';
import LoadingState from '../components/common/LoadingState';
import ErrorMessage from '../components/common/ErrorMessage';
import Button from '../components/common/Button'; // Import Button
import Modal from '../components/common/Modal'; // Import Modal
import ModelForm, { ModelFormData } from '../features/ModelManagement/ModelForm'; // Import ModelForm
import ConfirmationModal from '../components/common/ConfirmationModal'; // Import ConfirmationModal
import { Model } from '../types';
import toast from 'react-hot-toast'; // Import toast

function ModelsPage() {
    // Add state for modal later
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false); // State for confirm modal
    const [editingModel, setEditingModel] = useState<Model | null>(null);
    const [modelToDelete, setModelToDelete] = useState<Model | null>(null); // State for model to delete
    const queryClient = useQueryClient(); // Get query client instance
    const alerts = useAppAlerts();

    const { data: models, isLoading, error, isError } = useQuery<Model[], Error>({
        queryKey: ['models'],
        queryFn: api.getModels
    });

    // --- Mutations (Add placeholder for Step 22) --- 
    const createModelMutation = useMutation<Model, Error, ModelFormData>({
        mutationFn: api.createModel,
        onSuccess: (newModel) => {
            toast.success(`Model "${newModel.name}" created successfully!`);
            queryClient.invalidateQueries({ queryKey: ['models'] });
            handleCloseFormModal();
        },
        onError: (error) => {
            console.error("Create model failed:", error.message);
            toast.error(`Failed to create model: ${error.message}`);
        }
    });

    const updateModelMutation = useMutation<Model, Error, { id: string; data: ModelFormData }>({
        mutationFn: (variables) => api.updateModel(variables.id, variables.data),
        onSuccess: (updatedModel) => {
            toast.success(`Model "${updatedModel.name}" updated successfully!`);
            queryClient.invalidateQueries({ queryKey: ['models'] });
            handleCloseFormModal();
        },
        onError: (error) => {
            console.error("Update model failed:", error.message);
            toast.error(`Failed to update model: ${error.message}`);
        }
    });

    // Delete Mutation
    const deleteModelMutation = useMutation<void, Error, string>({
        mutationFn: api.deleteModel,
        onSuccess: () => {
            toast.success('Model deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['models'] });
            handleCloseConfirmModal();
        },
        onError: (error) => {
            console.error("Delete model failed:", error.message);
            toast.error(`Failed to delete model: ${error.message}`);
            handleCloseConfirmModal();
        }
    });

    const handleAddModelClick = () => {
        setEditingModel(null); // Ensure no model is being edited
        setModelToDelete(null);
        setIsFormModalOpen(true);
    };

    const handleEditModel = (model: Model) => {
        setEditingModel(model);
        setModelToDelete(null);
        setIsFormModalOpen(true);
    };

    // Open confirmation modal when delete is clicked
    const handleDeleteModelClick = (model: Model) => {
        setModelToDelete(model);
        setIsConfirmModalOpen(true);
    };

    // Close the main form modal
    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
        setEditingModel(null);
        createModelMutation.reset();
        updateModelMutation.reset();
    };

    // Close the confirmation modal
    const handleCloseConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setModelToDelete(null);
        // Only reset mutation if it wasn't successful (error handled elsewhere)
        if (!deleteModelMutation.isSuccess) {
            deleteModelMutation.reset();
        }
    };

    // Called when confirm button in ConfirmationModal is clicked
    const handleConfirmDelete = () => {
        if (modelToDelete) {
            console.log("Confirming delete:", modelToDelete.id);
            deleteModelMutation.mutate(modelToDelete.id);
            // onSuccess/onError handles closing modal and feedback
        }
    };

    // Handle form submission (called from ModelForm)
    const handleFormSubmit = (data: ModelFormData) => {
        if (editingModel) {
            console.log("Submitting update:", editingModel.id, data);
            updateModelMutation.mutate({ id: editingModel.id, data: data });
            // onSuccess will close the modal & show toast
        } else {
            console.log("Submitting create:", data);
            createModelMutation.mutate(data);
            // onSuccess will close the modal & show toast
        }
    };

    // Determine loading states
    const isQueryLoading = isLoading;
    const isMutating = createModelMutation.isPending || updateModelMutation.isPending || deleteModelMutation.isPending;

    // Determine error states
    const queryError = isError ? (error?.message || 'Failed to load models.') : null;
    const mutationError =
        createModelMutation.error?.message ||
        updateModelMutation.error?.message ||
        null; // Delete error handled via alert for now

    return (
        <div>
            {/* Use Header component's title now, remove h1 */}
            {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Configured Models</h1> 
            </div> */}
            <div style={{ textAlign: 'right', marginBottom: 'var(--space-4)' }}> {/* Move button to right */}
                <Button onClick={handleAddModelClick} variant="primary" disabled={isMutating}>
                    Add Model
                </Button>
            </div>

            {/* Show mutation error if present (excluding delete error shown via alert) */}
            {mutationError && <ErrorMessage message={mutationError} />}

            {isQueryLoading && <Spinner />}
            {queryError && !mutationError && <ErrorMessage message={queryError} />}

            {models && (
                <ModelList
                    models={models}
                    onEditModel={handleEditModel}
                    onDeleteModel={handleDeleteModelClick} // Use the click handler
                />
            )}

            {/* --- Form Modal --- */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={handleCloseFormModal}
                title={editingModel ? 'Edit Model' : 'Add New Model'}
            >
                <ModelForm
                    modelToEdit={editingModel}
                    onSubmit={handleFormSubmit}
                    onClose={handleCloseFormModal}
                    isSubmitting={createModelMutation.isPending || updateModelMutation.isPending}
                />
            </Modal>

            {/* --- Confirmation Modal --- */}
            {modelToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={handleCloseConfirmModal}
                    onConfirm={handleConfirmDelete}
                    title="Delete Model?"
                    message={`Are you sure you want to delete the model "${modelToDelete.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    isConfirming={deleteModelMutation.isPending}
                />
            )}
        </div>
    );
}

export default ModelsPage; 