import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

function Sidebar({ isOpen = true, onClose }: SidebarProps) {
    return (
        <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
            <div className={styles.header}>
                <h2>MyModelArena</h2>
                <button 
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close sidebar"
                >
                    ×
                </button>
            </div>
            <nav>
                <ul>
                    <li>
                        <NavLink
                            to="/"
                            className={({ isActive }) => isActive ? styles.active : ''}
                            end // Use end prop for exact match on root path
                        >
                            Home
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/models"
                            className={({ isActive }) => isActive ? styles.active : ''}
                        >
                            Models
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/evals"
                            className={({ isActive }) => isActive ? styles.active : ''}
                        >
                            Evals
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/evals/generate"
                            className={({ isActive }) => isActive ? styles.active : ''}
                        >
                            Generate Eval
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/templates"
                            className={({ isActive }) => isActive ? styles.active : ''}
                        >
                            Templates
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/reporting"
                            className={({ isActive }) => isActive ? styles.active : ''}
                        >
                            Reporting
                        </NavLink>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}

export default Sidebar; 