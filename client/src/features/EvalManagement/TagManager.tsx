import React, { useState, useMemo, useEffect } from 'react';
import Select, { MultiValue } from 'react-select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { Tag, Eval as EvalType } from '../../types';
import ErrorMessage from '../../components/common/ErrorMessage';

// Define the structure for react-select options
interface TagOption {
    value: string; // Tag ID
    label: string; // Tag Name
}

interface TagManagerProps {
    evalData: EvalType;
}

const TagManager: React.FC<TagManagerProps> = ({ evalData }) => {
    const queryClient = useQueryClient();
    const [selectedTags, setSelectedTags] = useState<MultiValue<TagOption>>([]);

    // Fetch all available tags
    const { data: allTags, isLoading: isLoadingTags, error: tagsError } = useQuery<Tag[], Error>({
        queryKey: ['tags'],
        queryFn: api.getTags,
        staleTime: 1000 * 60 * 10, // Tags don't change that often
    });

    // Mutation to update the eval's tags
    const updateTagsMutation = useMutation<EvalType, Error, string[]>({
        mutationFn: (tagIds) => api.updateEvalTags(evalData.id, tagIds),
        onSuccess: (updatedEval) => {
            // Update the cache for the specific eval
            queryClient.setQueryData(['eval', evalData.id], updatedEval);
            // Optionally invalidate the general evals list query if tags are shown there
            // queryClient.invalidateQueries({ queryKey: ['evals'] }); 
            console.log('Tags updated successfully');
        },
        onError: (error) => {
            console.error('Failed to update tags:', error);
            // Reset selection to original state on error?
            setSelectedTags(currentEvalTagsToOptions(evalData.tags));
        }
    });

    // Map tag data for react-select
    const tagOptions = useMemo(() => {
        return allTags?.map(tag => ({ value: tag.id, label: tag.name })) ?? [];
    }, [allTags]);

    // Helper to convert current eval tags to react-select option format
    const currentEvalTagsToOptions = (evalTags: EvalType['tags']): MultiValue<TagOption> => {
        return evalTags?.map(et => ({ value: et.tag.id, label: et.tag.name })) ?? [];
    };

    // Initialize selectedTags state when evalData is available or changes
    useEffect(() => {
        if (evalData?.tags) {
            setSelectedTags(currentEvalTagsToOptions(evalData.tags));
        }
    }, [evalData?.tags]);

    // Handle change in selection
    const handleSelectionChange = (selectedOptions: MultiValue<TagOption>) => {
        setSelectedTags(selectedOptions);
        // Immediately trigger mutation on change
        const selectedTagIds = selectedOptions.map(option => option.value);
        updateTagsMutation.mutate(selectedTagIds);
    };

    // TODO: Add functionality to create new tags (likely requires CreatableSelect)

    if (isLoadingTags) return <div>Loading tags...</div>;
    if (tagsError) return <ErrorMessage message={tagsError.message || 'Failed to load tags.'} />;

    return (
        <div style={{ marginTop: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-lg)' }}>Tags</h3>
            <Select<TagOption, true> // isMulti is true
                options={tagOptions}
                isMulti
                value={selectedTags}
                onChange={handleSelectionChange}
                placeholder="Select or add tags..."
                isLoading={updateTagsMutation.isPending}
                isDisabled={updateTagsMutation.isPending}
            // Add styles or Creatable functionality later
            // styles={{ ... }} 
            // components={{ Option: ... }} // For custom rendering if needed
            />
            {updateTagsMutation.isError && (
                <ErrorMessage message={updateTagsMutation.error?.message || 'Error updating tags.'} />
            )}
        </div>
    );
};

export default TagManager; 