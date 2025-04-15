import React from 'react';
import styles from './HomePage.module.css'; // Import CSS module
import Card from '../components/common/Card'; // Import Card

function HomePage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Welcome to MyModelArena!</h1>
            <p className={styles.introText}>
                Your personal workbench for configuring, generating, running, and evaluating LLM performance on custom test sets.
            </p>

            <ul className={styles.featuresList}>
                <li>
                    <Card className={styles.featureItem}>
                        Configure different <strong>Models</strong> you want to test, including API details and pricing.
                    </Card>
                </li>
                <li>
                    <Card className={styles.featureItem}>
                        Generate tailored <strong>Evals</strong> using your configured models based on specific prompts and criteria.
                    </Card>
                </li>
                <li>
                    <Card className={styles.featureItem}>
                        Manage and organize your <strong>Evals</strong> with descriptions, tags, and versioning.
                    </Card>
                </li>
                <li>
                    <Card className={styles.featureItem}>
                        Execute <strong>Evals</strong> against multiple models simultaneously and store detailed results.
                    </Card>
                </li>
                <li>
                    <Card className={styles.featureItem}>
                        Score model <strong>Responses</strong> manually or use another LLM as an automated judge.
                    </Card>
                </li>
                <li>
                    <Card className={styles.featureItem}>
                        Use <strong>Judge Mode</strong> to assess the quality of your generated evaluation questions.
                    </Card>
                </li>
                <li>
                    <Card className={styles.featureItem}>
                        Analyze performance, costs, and quality with built-in <strong>Reporting</strong> features.
                    </Card>
                </li>
            </ul>
        </div>
    );
}

export default HomePage; 