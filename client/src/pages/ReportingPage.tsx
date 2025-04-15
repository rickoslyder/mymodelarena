import React from 'react';
import Leaderboard from '../features/Reporting/Leaderboard';
import CostReport from '../features/Reporting/CostReport';
import TokenUsageChart from '../features/Reporting/TokenUsageChart';
import styles from './ReportingPage.module.css';

function ReportingPage() {
    return (
        <div className={styles.container}>
            <div className={styles.section}>
                <Leaderboard />
            </div>

            <div className={styles.section}>
                <CostReport />
            </div>

            <div className={styles.section}>
                <TokenUsageChart />
            </div>
        </div>
    );
}

export default ReportingPage; 