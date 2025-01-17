import React, { useState } from 'react';
import {
  Box, 
  Container, 
  Paper, 
  Typography, 
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  ListSubheader,
  Chip,
  Divider,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Collapse,
  IconButton as MuiIconButton,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  CompareArrows as CompareArrowsIcon,
  AccountTree as BranchIcon,
  Label as TagIcon,
  Commit as CommitIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
  Email as EmailIcon,
  History as HistoryIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Create as ModifyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import './App.css';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(2),
  boxShadow: '0 3px 5px 2px rgba(0, 0, 0, .05)',
}));

const CommitCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: theme.spacing(1),
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const CommitHash = styled(Typography)(({ theme }) => ({
  fontFamily: 'monospace',
  cursor: 'pointer',
  '&:hover': { 
    color: theme.palette.primary.main,
    '& .copy-icon': {
      opacity: 1,
    }
  },
  '& .copy-icon': {
    opacity: 0,
    transition: 'opacity 0.2s',
    marginLeft: theme.spacing(1),
    fontSize: '0.9em'
  }
}));

const CommitMetaItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  color: theme.palette.text.secondary,
  marginRight: theme.spacing(3),
  '& .MuiSvgIcon-root': {
    fontSize: '1rem',
    marginRight: theme.spacing(0.5),
  }
}));

const RefChip = styled(Chip)(({ theme, isTag }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: isTag ? theme.palette.info.light : theme.palette.success.light,
  color: theme.palette.common.white,
  '& .MuiChip-icon': {
    color: theme.palette.common.white,
  },
}));

const API_BASE_URL = 'http://localhost:3001/api';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(3),
  },
  '& .MuiDialogTitle-root': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
}));

const FileChangeItem = styled(ListItem)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StatChip = styled(Chip)(({ theme, type }) => ({
  margin: theme.spacing(0, 0.5),
  backgroundColor: type === 'additions' 
    ? theme.palette.success.light 
    : theme.palette.error.light,
  color: theme.palette.common.white,
  '& .MuiChip-label': {
    fontWeight: 'bold',
  },
}));

const DiffContent = styled('pre')(({ theme }) => ({
  margin: 0,
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  overflow: 'auto',
  maxHeight: '300px',
  fontFamily: 'monospace',
  fontSize: '0.875rem',
  '& .addition': {
    backgroundColor: '#e6ffed',
    display: 'block',
  },
  '& .deletion': {
    backgroundColor: '#ffeef0',
    display: 'block',
  },
}));

function App() {
  const [repoPath, setRepoPath] = useState('');
  const [recentPaths, setRecentPaths] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem('recentRepoPaths');
    return saved ? JSON.parse(saved) : [];
  });
  const [branches, setBranches] = useState([]);
  const [selectedBranch1, setSelectedBranch1] = useState('');
  const [selectedBranch2, setSelectedBranch2] = useState('');
  const [commits, setCommits] = useState({ left: [], right: [], commonParent: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [commitDetails, setCommitDetails] = useState(null);

  // Add repository to recent paths
  const addToRecentPaths = (path) => {
    setRecentPaths(prevPaths => {
      const newPaths = [
        path,
        ...prevPaths.filter(p => p !== path) // Remove duplicates
      ].slice(0, 10); // Keep only 10 most recent
      
      // Save to localStorage
      localStorage.setItem('recentRepoPaths', JSON.stringify(newPaths));
      return newPaths;
    });
  };

  // Remove repository from recent paths
  const removeFromRecentPaths = (pathToRemove) => {
    setRecentPaths(prevPaths => {
      const newPaths = prevPaths.filter(path => path !== pathToRemove);
      localStorage.setItem('recentRepoPaths', JSON.stringify(newPaths));
      return newPaths;
    });
  };

  const handleLoadRepo = async () => {
    if (!repoPath) {
      setError('Please enter a repository path');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/branches?path=${encodeURIComponent(repoPath)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load repository');
      }
      const branchesData = await response.json();
      setBranches(branchesData);
      addToRecentPaths(repoPath); // Add to recent paths after successful load
    } catch (error) {
      console.error('Error fetching branches:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (selectedBranch1 && selectedBranch2) {
      try {
        setError('');
        setLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/compare?` + 
          `path=${encodeURIComponent(repoPath)}&` +
          `branch1=${encodeURIComponent(selectedBranch1)}&` +
          `branch2=${encodeURIComponent(selectedBranch2)}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to compare branches');
        }
        const comparisonData = await response.json();
        setCommits(comparisonData);
      } catch (error) {
        console.error('Error comparing branches:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderMenuItem = (ref) => {
    const isTag = ref.startsWith('tag: ');
    return (
      <MenuItem key={ref} value={ref}>
        <RefChip
          icon={isTag ? <TagIcon /> : <BranchIcon />}
          label={ref}
          size="small"
          isTag={isTag}
        />
      </MenuItem>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      full: date.toLocaleString(),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 30) {
      return date.toLocaleDateString();
    } else if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleCommitClick = async (commit) => {
    try {
      setSelectedCommit(commit);
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/commit-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoPath,
          commitHash: commit.hash,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch commit details');
      }

      const details = await response.json();
      setCommitDetails(details);
    } catch (error) {
      console.error('Error fetching commit details:', error);
      setError(error.message || 'Failed to fetch commit details');
    } finally {
      setLoading(false);
    }
  };

  const renderCommitCard = (commit, side) => (
    <Card 
      key={commit.hash}
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' }
      }}
      onClick={() => handleCommitClick(commit)}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          <CommitIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1" component="div">
            {commit.message}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Box display="flex" alignItems="center">
            <PersonIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {commit.author}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <TimeIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {new Date(commit.date).toLocaleString()}
            </Typography>
          </Box>
          <Tooltip title="Copy hash">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(commit.hash);
              }}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );

  const CommitDialog = ({ commit, details, onClose }) => {
    const [expandedFiles, setExpandedFiles] = useState({});
    const [fileDiffs, setFileDiffs] = useState({});

    const handleFileClick = async (filePath) => {
      // Toggle expansion state
      setExpandedFiles(prev => ({
        ...prev,
        [filePath]: !prev[filePath]
      }));

      // Fetch diff content if not already loaded
      if (!fileDiffs[filePath] && !expandedFiles[filePath]) {
        try {
          const response = await fetch(`${API_BASE_URL}/file-diff`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              repoPath,
              commitHash: commit.hash,
              filePath,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to fetch diff');
          }

          const data = await response.json();
          setFileDiffs(prev => ({
            ...prev,
            [filePath]: data.diff
          }));
        } catch (error) {
          console.error('Error fetching file diff:', error);
          setError('Failed to fetch file diff');
        }
      }
    };

    const renderDiffContent = (diff) => {
      return diff.split('\n').map((line, index) => {
        if (line.startsWith('+')) {
          return <span key={index} className="addition">{line}</span>;
        } else if (line.startsWith('-')) {
          return <span key={index} className="deletion">{line}</span>;
        }
        return <span key={index}>{line}</span>;
      });
    };

    return (
      <StyledDialog 
        open={Boolean(commit && details)} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" component="span">
                Commit Details
              </Typography>
              <Chip
                label={commit?.hash.substring(0, 8)}
                size="small"
                color="secondary"
                sx={{ ml: 1 }}
              />
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Commit Information Section */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="h6" gutterBottom color="primary">
                  {details?.message}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2">
                        <strong>Author:</strong> {details?.author}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <TimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2">
                        <strong>Date:</strong> {details?.date && new Date(details.date).toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Changed Files Section */}
            <Grid item xs={12}>
              <Box mb={2}>
                <Typography variant="h6" color="primary" gutterBottom>
                  Changed Files
                  <Chip 
                    label={`${details?.files.length} files`}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Box>
              <List>
                {details?.files.map((file, index) => (
                  <React.Fragment key={index}>
                    <FileChangeItem 
                      onClick={() => handleFileClick(file.path)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center">
                            {file.status === 'A' && (
                              <Tooltip title="Added">
                                <AddIcon color="success" />
                              </Tooltip>
                            )}
                            {file.status === 'D' && (
                              <Tooltip title="Deleted">
                                <RemoveIcon color="error" />
                              </Tooltip>
                            )}
                            {file.status === 'M' && (
                              <Tooltip title="Modified">
                                <ModifyIcon color="primary" />
                              </Tooltip>
                            )}
                            <Typography ml={1} fontFamily="monospace">
                              {file.path}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box display="flex" alignItems="center" mt={0.5}>
                            {file.additions > 0 && (
                              <StatChip
                                type="additions"
                                size="small"
                                label={`+${file.additions}`}
                                icon={<AddIcon />}
                              />
                            )}
                            {file.deletions > 0 && (
                              <StatChip
                                type="deletions"
                                size="small"
                                label={`-${file.deletions}`}
                                icon={<RemoveIcon />}
                              />
                            )}
                          </Box>
                        }
                      />
                      <MuiIconButton edge="end">
                        {expandedFiles[file.path] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </MuiIconButton>
                    </FileChangeItem>
                    <Collapse in={expandedFiles[file.path]} timeout="auto">
                      <Box sx={{ pl: 2, pr: 2, pb: 2 }}>
                        {fileDiffs[file.path] ? (
                          <DiffContent>
                            {renderDiffContent(fileDiffs[file.path])}
                          </DiffContent>
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography color="text.secondary">
                              Loading diff...
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </React.Fragment>
                ))}
              </List>
            </Grid>
          </Grid>
        </DialogContent>
      </StyledDialog>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ my: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ 
            textAlign: 'center',
            fontWeight: 'bold',
            color: 'primary.main'
          }}
        >
          Git Branch Comparison Tool
        </Typography>

        <StyledPaper elevation={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={10}>
              <Autocomplete
                freeSolo
                value={repoPath}
                onChange={(event, newValue) => {
                  if (newValue) {
                    setRepoPath(newValue);
                  }
                }}
                onInputChange={(event, newInputValue) => {
                  setRepoPath(newInputValue);
                }}
                options={recentPaths}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Repository Path"
                    variant="outlined"
                    error={!!error}
                    helperText={error || "Enter the absolute path to your Git repository"}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <HistoryIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <Typography noWrap sx={{ maxWidth: '90%' }}>
                        {option}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromRecentPaths(option);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </li>
                )}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                onClick={handleLoadRepo}
                fullWidth
                sx={{ height: '56px' }}
                disabled={loading}
              >
                Load Repo
              </Button>
            </Grid>

            {branches.length > 0 && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip label="Select References" />
                  </Divider>
                </Grid>
                <Grid item xs={12} md={5}>
                  <FormControl fullWidth>
                    <InputLabel>First Reference</InputLabel>
                    <Select
                      value={selectedBranch1}
                      onChange={(e) => setSelectedBranch1(e.target.value)}
                      label="First Reference"
                      disabled={loading}
                    >
                      <ListSubheader>Recent Branches and Tags (Last 30 Days)</ListSubheader>
                      {branches.map(renderMenuItem)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconButton 
                    color="primary" 
                    sx={{ transform: 'rotate(90deg)' }}
                    disabled={!selectedBranch1 || !selectedBranch2 || loading}
                    onClick={handleCompare}
                  >
                    <CompareArrowsIcon fontSize="large" />
                  </IconButton>
                </Grid>

                <Grid item xs={12} md={5}>
                  <FormControl fullWidth>
                    <InputLabel>Second Reference</InputLabel>
                    <Select
                      value={selectedBranch2}
                      onChange={(e) => setSelectedBranch2(e.target.value)}
                      label="Second Reference"
                      disabled={loading}
                    >
                      <ListSubheader>Recent Branches and Tags (Last 30 Days)</ListSubheader>
                      {branches.map(renderMenuItem)}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </StyledPaper>

        {commits.commonParent && (
          <StyledPaper elevation={3}>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary' }}>
              Common Parent: 
              <Tooltip title="Copy hash" placement="top">
                <Typography
                  component="span"
                  sx={{ 
                    ml: 1,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    '&:hover': { color: 'primary.main' }
                  }}
                  onClick={() => navigator.clipboard.writeText(commits.commonParent)}
                >
                  {commits.commonParent.substring(0, 8)}
                </Typography>
              </Tooltip>
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <Box sx={{ mb: 2 }}>
                  <RefChip
                    icon={selectedBranch1.startsWith('tag:') ? <TagIcon /> : <BranchIcon />}
                    label={selectedBranch1}
                    isTag={selectedBranch1.startsWith('tag:')}
                  />
                </Box>
                {commits.left.map(commit => renderCommitCard(commit, 'left'))}
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ mb: 2 }}>
                  <RefChip
                    icon={selectedBranch2.startsWith('tag:') ? <TagIcon /> : <BranchIcon />}
                    label={selectedBranch2}
                    isTag={selectedBranch2.startsWith('tag:')}
                  />
                </Box>
                {commits.right.map(commit => renderCommitCard(commit, 'right'))}
              </Grid>
            </Grid>
          </StyledPaper>
        )}
      </Box>
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      {selectedCommit && commitDetails && (
        <CommitDialog
          commit={selectedCommit}
          details={commitDetails}
          onClose={() => {
            setSelectedCommit(null);
            setCommitDetails(null);
          }}
        />
      )}
    </Container>
  );
}

export default App;
