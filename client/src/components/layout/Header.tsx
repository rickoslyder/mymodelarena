import React from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Header.module.css';

// Simple helper to generate title from pathname
function getTitleFromPathname(pathname: string): string {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Home';

    const lastSegment = segments[segments.length - 1];
    // Basic capitalization
    let title = lastSegment.replace(/-/g, ' ').replace(/^[a-z]/, char => char.toUpperCase());

    // More specific titles based on path structure
    if (segments[0] === 'models') title = 'Models';
    if (segments[0] === 'evals') {
        if (segments.length === 1) title = 'Evaluations';
        if (segments[1] === 'generate') title = 'Generate Eval';
        if (segments.length === 2 && segments[1] !== 'generate') title = 'Evaluation Detail'; // Assuming /evals/:id
        if (segments.length === 3 && segments[2] === 'run') title = 'Run Evaluation'; // Assuming /evals/:id/run
    }
    if (segments[0] === 'reporting') title = 'Reporting';

    return title;
}

interface HeaderProps {
    onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
    const location = useLocation();
    const title = getTitleFromPathname(location.pathname);

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                <button 
                    className={styles.menuButton}
                    onClick={onMenuToggle}
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <h1 className={styles.title}>{title}</h1>
            </div>
            {/* Add breadcrumbs or user info later */}
        </header>
    );
};

export default Header; 