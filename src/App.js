import React, { useState, useEffect } from 'react';
import './App.css';
const { ipcRenderer } = window.require('electron');

function App() {
    const [repoPath, setRepoPath] = useState('');
    const [branches, setBranches] = useState([]);
    const [error, setError] = useState('');
    const [selectedCommit, setSelectedCommit] = useState(null);
    const [commitDetails, setCommitDetails] = useState(null);

    useEffect(() => {
        ipcRenderer.invoke('open-directory-dialog').then((absolutePath) => {
            if (absolutePath) {
                setRepoPath(absolutePath);
                fetchBranches(absolutePath);
            }
        }).catch(error => {
            console.error('Error selecting directory:', error);
        });
    }, []);

    const fetchBranches = (path) => {
        fetch('http://localhost:5000/api/branches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ repoPath: path }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                setError(data.error);
                setBranches([]);
            } else {
                setBranches(data.branches || []);
            }
        })
        .catch(error => {
            console.error('Error fetching branches:', error);
            setError('Failed to fetch branches');
            setBranches([]);
        });
    };

    const handleCommitClick = (commitId) => {
        fetch(`http://localhost:5000/api/commit/${commitId}`, {
            method: 'GET',
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                setError(data.error);
            } else {
                setCommitDetails(data);
                setSelectedCommit(commitId);
            }
        })
        .catch(error => {
            console.error('Error fetching commit details:', error);
            setError('Failed to fetch commit details');
        });
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Git Repository Selector</h1>
            </header>
            <main>
                <input
                    type="text"
                    value={repoPath}
                    readOnly
                    placeholder="Selected repository path will appear here"
                    className="repo-path-input"
                />
                {error && <p className="error">{error}</p>}
                <ul>
                    {branches.map((branch, index) => (
                        <li key={index}>{branch}</li>
                    ))}
                </ul>
                {selectedCommit && commitDetails && (
                    <div className="commit-details">
                        <h2>Commit Details</h2>
                        <p><strong>Commit ID:</strong> {commitDetails.id}</p>
                        <p><strong>Message:</strong> {commitDetails.message}</p>
                        <p><strong>Author:</strong> {commitDetails.author}</p>
                        <p><strong>Date:</strong> {commitDetails.date}</p>
                        <h3>Files Affected</h3>
                        <ul>
                            {commitDetails.files.map((file, index) => (
                                <li key={index}>{file}</li>
                            ))}
                        </ul>
                        <h3>Diff</h3>
                        <pre>{commitDetails.diff}</pre>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;