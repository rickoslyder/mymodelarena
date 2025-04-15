import React, { useState, useMemo } from 'react';
import styles from './Table.module.css';

// Define Sort Direction
type SortDirection = 'asc' | 'desc' | null;

// Generic Column Definition
export interface ColumnDefinition<T> {
    key: keyof T | string; // Accessor key or custom string key
    header: string;
    // Optional custom render function for the cell
    render?: (item: T) => React.ReactNode;
    // Optional width or other styling props
    // width?: string | number;
    sortable?: boolean; // Allow opting out of sorting for a column
}

interface TableProps<T> {
    columns: ColumnDefinition<T>[];
    data: T[];
    // Add key extractor prop
    keyExtractor?: (item: T, index: number) => string | number;
    initialSort?: { key: keyof T | string, direction: 'asc' | 'desc' }; // Optional initial sort
}

// Helper for sorting
const sortData = <T,>(data: T[], sortKey: keyof T | string | null, sortDirection: SortDirection): T[] => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
        const valA = a[sortKey as keyof T];
        const valB = b[sortKey as keyof T];

        // Basic comparison logic (can be extended for different types)
        if (valA === null || valA === undefined) return sortDirection === 'asc' ? -1 : 1;
        if (valB === null || valB === undefined) return sortDirection === 'asc' ? 1 : -1;

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
};

function Table<T>({ columns, data, keyExtractor, initialSort }: TableProps<T>) {
    const [sortKey, setSortKey] = useState<keyof T | string | null>(initialSort?.key || null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(initialSort?.direction || null);

    const handleSort = (key: keyof T | string) => {
        if (!key) return;
        let newDirection: SortDirection = 'asc';
        if (sortKey === key && sortDirection === 'asc') {
            newDirection = 'desc';
        } else if (sortKey === key && sortDirection === 'desc') {
            newDirection = null; // Cycle back to unsorted or remove sort
            setSortKey(null); // Reset key if direction is null
        }

        if (newDirection !== null) {
            setSortKey(key);
        }
        setSortDirection(newDirection);
    };

    const sortedData = useMemo(() => {
        return sortData(data, sortKey, sortDirection);
    }, [data, sortKey, sortDirection]);

    const renderCellContent = (item: T, column: ColumnDefinition<T>) => {
        if (column.render) {
            return column.render(item);
        }
        // Default rendering: access property by key
        // Handle potential nested keys later if needed (e.g., 'model.name')
        const value = item[column.key as keyof T];
        if (typeof value === 'number') {
            // Basic number formatting (can be customized)
            return value.toLocaleString();
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return value as React.ReactNode ?? '-'; // Display '-' for null/undefined
    };

    // Helper to safely get ID or index
    const getRowKey = (item: T, index: number): string | number => {
        if (keyExtractor) {
            return keyExtractor(item, index);
        }
        // Check if item is an object and has an id property
        if (typeof item === 'object' && item !== null && 'id' in item && (typeof item.id === 'string' || typeof item.id === 'number')) {
            return item.id;
        }
        return `row-${index}`; // Fallback to index
    };

    const getAriaSort = (key: keyof T | string): "ascending" | "descending" | "none" => {
        if (sortKey !== key) return "none";
        if (sortDirection === 'asc') return "ascending";
        if (sortDirection === 'desc') return "descending";
        return "none";
    };

    if (!data || data.length === 0) {
        return <p>No data available.</p>; // Or render an empty state
    }

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={String(col.key)}
                                onClick={() => col.sortable !== false && handleSort(col.key)}
                                className={col.sortable !== false ? styles.sortableHeader : ''}
                                aria-sort={getAriaSort(col.key)}
                                scope="col"
                            >
                                {col.header}
                                {/* Add Sort Indicators */}
                                {sortKey === col.key && (
                                    <span className={styles.sortIndicator}>
                                        {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item, index) => {
                        const rowKey = getRowKey(item, index);
                        return (
                            <tr key={rowKey}>
                                {columns.map((col) => (
                                    <td key={`${rowKey}-${String(col.key)}`}>
                                        {renderCellContent(item, col)}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default Table; 