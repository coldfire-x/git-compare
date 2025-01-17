const express = require('express');
const cors = require('cors');
const { simpleGit } = require('simple-git');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Get recent branches and tags for a repository
app.get('/api/branches', async (req, res) => {
  try {
    const repoPath = req.query.path;
    const git = simpleGit(repoPath);
    
    // Get all branches and tags with their creation dates
    const [branches, tags] = await Promise.all([
      git.raw(['for-each-ref', '--sort=-creatordate', 'refs/heads/', '--format=%(refname:short),%(creatordate:iso)']),
      git.raw(['for-each-ref', '--sort=-creatordate', 'refs/tags/', '--format=%(refname:short),%(creatordate:iso)'])
    ]);

    // Process branches and tags
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const processRefs = (refsString, prefix = '') => {
      return refsString
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [name, date] = line.split(',');
          return {
            name: prefix + name,
            date: new Date(date)
          };
        })
        .filter(ref => ref.date >= thirtyDaysAgo);
    };

    const branchList = processRefs(branches);
    const tagList = processRefs(tags, 'tag: ');

    // Combine and sort all refs by date
    const allRefs = [...branchList, ...tagList]
      .sort((a, b) => b.date - a.date)
      .map(ref => ref.name);

    res.json(allRefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get commit history comparison
app.get('/api/compare', async (req, res) => {
  try {
    const { path: repoPath, branch1, branch2 } = req.query;
    const git = simpleGit(repoPath);

    // Remove 'tag: ' prefix if present for comparison
    const ref1 = branch1.replace('tag: ', '');
    const ref2 = branch2.replace('tag: ', '');

    // Find the merge base (common ancestor)
    const mergeBase = await git.raw(['merge-base', ref1, ref2]);
    const commonParent = mergeBase.trim();

    // Get detailed commit information including stats
    const getDetailedCommits = async (from, to) => {
      const commits = await git.log({ from, to });
      const detailedCommits = await Promise.all(
        commits.all.map(async (commit) => {
          // Get commit stats
          const stats = await git.raw([
            'show',
            '--numstat',
            '--format=',
            commit.hash
          ]).catch(() => '');

          const [additions, deletions] = stats.split('\n')
            .filter(line => line.trim())
            .reduce((acc, line) => {
              const [add, del] = line.split('\t').map(Number);
              return [
                acc[0] + (isNaN(add) ? 0 : add),
                acc[1] + (isNaN(del) ? 0 : del)
              ];
            }, [0, 0]);

          return {
            hash: commit.hash,
            message: commit.message,
            author: commit.author_name,
            author_email: commit.author_email,
            date: commit.date,
            stats: {
              additions,
              deletions
            }
          };
        })
      );
      return detailedCommits;
    };

    // Get commits from common parent to each branch with detailed information
    const [leftCommits, rightCommits] = await Promise.all([
      getDetailedCommits(commonParent, ref1),
      getDetailedCommits(commonParent, ref2)
    ]);

    res.json({
      commonParent,
      left: leftCommits,
      right: rightCommits
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/commit/:hash', async (req, res) => {
    try {
        const { repoPath } = req.body;
        const { hash } = req.params;
        const git = simpleGit(repoPath);

        // Get commit details
        const commit = await git.show([
            '--pretty=format:{"hash": "%H", "author": "%an", "date": "%ai", "message": "%s"}',
            '--numstat',
            '--patch',
            hash
        ]);

        // Parse the commit output
        const [header, ...rest] = commit.split('\n');
        const details = JSON.parse(header);
        const files = [];
        let diff = '';
        let parsingFiles = true;

        for (const line of rest) {
            if (line.startsWith('diff --git')) {
                parsingFiles = false;
            }
            
            if (parsingFiles && line.trim()) {
                const [additions, deletions, path] = line.split('\t');
                if (path) {
                    files.push({
                        path,
                        additions: parseInt(additions) || 0,
                        deletions: parseInt(deletions) || 0
                    });
                }
            } else {
                diff += line + '\n';
            }
        }

        res.json({
            ...details,
            files,
            diff
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/commit-details', async (req, res) => {
  try {
    const { repoPath, commitHash } = req.body;
    const git = simpleGit(repoPath);

    // Get the commit details
    const show = await git.show([
      '--name-status',
      '--format=%H%n%an%n%ai%n%s%n%b',
      commitHash
    ]);

    // Parse the output
    const [hash, author, date, subject, ...rest] = show.split('\n');
    const message = subject + '\n' + rest[0]; // Combine subject and body

    // Get the changed files
    const files = [];
    for (let i = 1; i < rest.length; i++) {
      const line = rest[i].trim();
      if (!line) continue;

      const [status, path] = line.split('\t');
      if (!path) continue;

      // Get the file stats
      const stats = await git.raw([
        'diff',
        '--numstat',
        `${commitHash}^..${commitHash}`,
        '--',
        path
      ]);

      const [additions, deletions] = stats.split('\t').map(n => parseInt(n) || 0);

      files.push({
        path,
        status,
        additions,
        deletions
      });
    }

    res.json({
      hash,
      author,
      date,
      message,
      files
    });
  } catch (error) {
    console.error('Error getting commit details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add the new file-diff endpoint
app.post('/api/file-diff', async (req, res) => {
    try {
        const { repoPath, commitHash, filePath } = req.body;
        
        if (!repoPath || !commitHash || !filePath) {
            return res.status(400).json({ 
                error: 'Missing required parameters: repoPath, commitHash, or filePath' 
            });
        }

        const git = simpleGit(repoPath);

        // Get the file diff
        const diff = await git.raw([
            'show',
            '--format=',  // Empty format to skip commit message
            '--patch',    // Show patch/diff
            `${commitHash}`,
            '--',        // Separator between commit ref and path
            filePath
        ]);

        // If no diff is found
        if (!diff) {
            return res.status(404).json({ 
                error: 'No diff found for the specified file' 
            });
        }

        res.json({ 
            diff,
            filePath,
            commitHash 
        });

    } catch (error) {
        console.error('Error getting file diff:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to get file diff',
            details: {
                repoPath,
                commitHash,
                filePath
            }
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 