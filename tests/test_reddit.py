import pytest
from unittest.mock import MagicMock, patch
from core.ingest.reddit import fetch_reddit

@patch('praw.Reddit')
def test_fetch_reddit_returns_posts(mock_reddit_class, tmp_data_dir):
    # Setup Mock
    mock_reddit = mock_reddit_class.return_value
    mock_post = MagicMock()
    mock_post.title = "Test Post"
    mock_post.id = "123"
    mock_post.selftext = "Content"
    mock_post.score = 10
    mock_post.permalink = "/r/test/comments/123"
    mock_post.author = "user1"
    mock_post.created_utc = 1600000000
    
    # Mock comment forest
    mock_comment = MagicMock()
    mock_comment.body = "Great point!"
    mock_comment.score = 10
    mock_comment.id = "c1"
    mock_post.comments.list.return_value = [mock_comment]
    
    mock_reddit.subreddit.return_value.search.return_value = [mock_post]
    
    # Run
    with patch.dict('os.environ', {'REDDIT_CLIENT_ID': 'id', 'REDDIT_CLIENT_SECRET': 'secret', 'REDDIT_USER_AGENT': 'ua'}):
        results = fetch_reddit("test", "query", data_dir=str(tmp_data_dir))
    
    assert len(results) > 0
    assert results[0]['title'] == "Test Post"