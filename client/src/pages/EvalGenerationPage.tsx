import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import EvalGenForm, { EvalGenFormData } from '../features/EvalGeneration/EvalGenForm';
import * as api from '../lib/api';
import { Eval as EvalType } from '../types'; // Rename imported Eval to avoid conflict
import ErrorMessage from '../components/common/ErrorMessage'; // Import ErrorMessage

function EvalGenerationPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Define mutation hook
    const generationMutation = useMutation<EvalType, Error, EvalGenFormData>({
        mutationFn: api.generateEvalSet,
        onSuccess: (data) => {
            console.log('Eval generation successful:', data);
            // Invalidate queries that might list evals
            queryClient.invalidateQueries({ queryKey: ['evals'] }); // Assuming 'evals' is the query key for the list page
            // Navigate to the detail page of the newly created eval
            navigate(`/evals/${data.id}`); // Assuming backend returns the created eval with its ID
        },
        onError: (error) => {
            console.error("Eval generation failed:", error.message);
            // Error is displayed below form
        }
    });

    // Handler calls the mutation
    const handleGenerateSubmit = (data: EvalGenFormData) => {
        console.log('Submitting eval generation request:', data);
        generationMutation.mutate(data);
    };

    return (
        <div>
            {/* Render error message if mutation failed */}
            {generationMutation.isError && (
                <ErrorMessage message={generationMutation.error.message || 'Failed to generate evaluation set.'} />
            )}

            {/* Render the form, passing submit handler and loading state */}
            <EvalGenForm
                onSubmit={handleGenerateSubmit}
                isSubmitting={generationMutation.isPending}
            />
        </div>
    );
}

export default EvalGenerationPage; 