import React from 'react';
import styles from '../EvalGenWizard.module.css';

interface Step {
  id: string;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number;
  onStepClick: (stepIndex: number) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick
}) => {
  const getStepStatus = (index: number) => {
    if (index < completedSteps) return 'completed';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className={styles.stepIndicator}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div 
            className={styles.stepItem}
            onClick={() => onStepClick(index)}
          >
            <div className={`${styles.stepCircle} ${styles[getStepStatus(index)]}`}>
              {index < completedSteps ? '✓' : index + 1}
            </div>
            <div className={styles.stepTitle}>{step.title}</div>
            <div className={styles.stepDescription}>{step.description}</div>
          </div>
          
          {index < steps.length - 1 && (
            <div className={`${styles.stepConnector} ${index < completedSteps ? styles.completed : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;