import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close modal on Escape key press
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Close modal on overlay click
    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    // Prevent background scroll when open (simplified)
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = originalOverflow;
        }
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Directly use isOpen for rendering
    if (!isOpen) {
        return null;
    }

    // Remove transition-specific classes, always render as 'open'
    const overlayClasses = `${styles.modalOverlay} ${styles.open}`; // Assume open styles handle visibility

    return ReactDOM.createPortal(
        <div className={overlayClasses} onClick={handleOverlayClick}>
            <div className={styles.modalContent} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={title ? "modal-title" : undefined}>
                <div className={styles.modalHeader}>
                    {title && <h2 id="modal-title" className={styles.modalTitle}>{title}</h2>}
                    {!title && <div style={{ flexGrow: 1 }}></div>}
                    <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">
                        &times;
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
};

export default Modal; 