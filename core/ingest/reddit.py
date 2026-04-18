import os
import json
import logging
import praw
from pathlib import Path
from typing import List, Dict

logger = logging.getLogger(__name__)

def fetch_reddit(
    subreddit_name: str,
    query: str,
    max_posts: int = 25,
    data_dir: str = "data/raw",
) -> List[Dict]:
    """Fetch posts and qualifying comments from a subreddit."""
    
    # 1. Validate Environment Variables
    client_id = os.environ.get("REDDIT_CLIENT_ID")
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
    user_agent = os.environ.get("REDDIT_USER_AGENT")

    if not all([client_id, client_secret, user_agent]):
        missing = [k for k, v in {"REDDIT_CLIENT_ID": client_id, 
                                 "REDDIT_CLIENT_SECRET": client_secret, 
                                 "REDDIT_USER_AGENT": user_agent}.items() if not v]
        raise ValueError(f"Missing required Reddit environment variables: {', '.join(missing)}")

    # 2. Initialize PRAW
    reddit = praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        user_agent=user_agent
    )

    results = []
    try:
        subreddit = reddit.subreddit(subreddit_name)
        search_results = subreddit.search(query, sort="relevance", limit=max_posts)

        for submission in search_results:
            # 3. Process the Post
            post_data = {
                "doc_id": f"reddit_post_{submission.id}",
                "title": submission.title,
                "text": submission.selftext,
                "score": submission.score,
                "url": f"https://reddit.com{submission.permalink}",
                "author": str(submission.author) if submission.author else "[deleted]",
                "date": str(submission.created_utc),
                "source_type": "reddit_post"
            }
            results.append(post_data)

            # 4. Process Comments (Flattened)
            submission.comments.replace_more(limit=0) # Flatten tree
            all_comments = submission.comments.list()
            
            # Filter: Score > 5 and Sort by best
            qualified_comments = sorted(
                [c for c in all_comments if c.score > 5],
                key=lambda x: x.score,
                reverse=True
            )[:20] # Cap at 20

            for comment in qualified_comments:
                results.append({
                    "doc_id": f"reddit_comment_{comment.id}",
                    "text": comment.body,
                    "score": comment.score,
                    "author": str(comment.author) if comment.author else "[deleted]",
                    "date": str(comment.created_utc),
                    "parent_post_title": submission.title,
                    "url": f"https://reddit.com{comment.permalink}",
                    "source_type": "reddit_comment"
                })

            # 5. Save Raw JSON
            output_path = Path(data_dir) / f"reddit_{submission.id}.json"
            with open(output_path, "w") as f:
                json.dump(post_data, f, indent=2)

    except Exception as e:
        logger.warning(f"Error fetching from r/{subreddit_name}: {e}")
        
    return results