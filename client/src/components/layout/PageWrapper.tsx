import React from 'react';
import styles from './PageWrapper.module.css';

interface PageWrapperProps {
    children: React.ReactNode;
    className?: string;
}

function PageWrapper({ children, className }: PageWrapperProps) {
    const combinedClassName = `${styles.pageWrapper} ${className || ''}`.trim();

    return (
        <main className={combinedClassName}>
            {children}
        </main>
    );
}

export default PageWrapper; 