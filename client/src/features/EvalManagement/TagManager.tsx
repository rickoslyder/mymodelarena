import React, { useState, useMemo, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue } from 'react-select';
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

    // Mutation to create a new tag
    const createTagMutation = useMutation<Tag, Error, string>({
        mutationFn: api.createTag,
        onSuccess: (newTag) => {
            // Update tags cache
            queryClient.setQueryData(['tags'], (oldTags: Tag[] = []) => [...oldTags, newTag]);
            console.log('Tag created successfully:', newTag.name);
        },
        onError: (error) => {
            console.error('Failed to create tag:', error);
        }
    });

    // Mutation to update the eval's tags
    const updateTagsMutation = useMutation<EvalType, Error, string[]>({
        mutationFn: (tagIds) => api.updateEvalTags(evalData.id, tagIds),
        onSuccess: (updatedEval) => {
            // Update the cache for the specific eval
            queryClient.setQueryData(['eval', evalData.id], updatedEval);
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

    // Handle creating new tags
    const handleCreateTag = async (inputValue: string) => {
        const trimmedName = inputValue.trim();
        if (!trimmedName) return;
        
        try {
            const newTag = await createTagMutation.mutateAsync(trimmedName);
            // Add the new tag to current selection
            const newOption = { value: newTag.id, label: newTag.name };
            const updatedSelection = [...selectedTags, newOption];
            setSelectedTags(updatedSelection);
            // Update eval tags with the new selection
            const selectedTagIds = updatedSelection.map(option => option.value);
            updateTagsMutation.mutate(selectedTagIds);
        } catch (error) {
            console.error('Failed to create and assign tag:', error);
        }
    };

    if (isLoadingTags) return <div>Loading tags...</div>;
    if (tagsError) return <ErrorMessage message={tagsError.message || 'Failed to load tags.'} />;

    return (
        <div style={{ marginTop: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-lg)' }}>Tags</h3>
            <CreatableSelect<TagOption, true>
                options={tagOptions}
                isMulti
                value={selectedTags}
                onChange={handleSelectionChange}
                onCreateOption={handleCreateTag}
                placeholder="Select or create tags..."
                isLoading={updateTagsMutation.isPending || createTagMutation.isPending}
                isDisabled={updateTagsMutation.isPending || createTagMutation.isPending}
                formatCreateLabel={(inputValue) => `Create tag "${inputValue}"`}
            />
            {updateTagsMutation.isError && (
                <ErrorMessage message={updateTagsMutation.error?.message || 'Error updating tags.'} />
            )}
            {createTagMutation.isError && (
                <ErrorMessage message={createTagMutation.error?.message || 'Error creating tag.'} />
            )}
        </div>
    );
};

export default TagManager; 