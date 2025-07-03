import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import EvalGenWizard, { EvalGenWizardData } from '../features/EvalGeneration/EvalGenWizard';
import * as api from '../lib/api';
import { Eval as EvalType } from '../types'; // Rename imported Eval to avoid conflict
import ErrorMessage from '../components/common/ErrorMessage'; // Import ErrorMessage

function EvalGenerationPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Define mutation hook using enhanced API
    const generationMutation = useMutation<EvalType, Error, api.EnhancedEvalGenData>({
        mutationFn: api.generateEvalSetEnhanced,
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

    // Convert wizard data to enhanced API format
    const convertWizardDataToApiFormat = (wizardData: EvalGenWizardData): api.EnhancedEvalGenData => {
        return {
            generatorModelIds: wizardData.generatorModelIds,
            userPrompt: wizardData.userPrompt,
            templateId: wizardData.template,
            numQuestions: wizardData.options.count,
            questionTypes: wizardData.options.questionTypes,
            difficulty: wizardData.options.difficulty,
            format: wizardData.options.format,
            evalName: wizardData.evalName,
            evalDescription: wizardData.evalDescription,
            mode: wizardData.mode,
        };
    };

    // Handler calls the mutation
    const handleGenerateSubmit = (wizardData: EvalGenWizardData) => {
        console.log('Submitting eval generation request:', wizardData);
        const apiData = convertWizardDataToApiFormat(wizardData);
        generationMutation.mutate(apiData);
    };

    return (
        <div>
            {/* Render error message if mutation failed */}
            {generationMutation.isError && (
                <ErrorMessage message={generationMutation.error.message || 'Failed to generate evaluation set.'} />
            )}

            {/* Render the wizard, passing submit handler and loading state */}
            <EvalGenWizard
                onSubmit={handleGenerateSubmit}
                isSubmitting={generationMutation.isPending}
            />
        </div>
    );
}

export default EvalGenerationPage; 