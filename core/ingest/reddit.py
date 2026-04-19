import os
import json
import logging
import time
from pathlib import Path
from typing import List, Dict

import requests

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": "PanelForge/0.1 (focus-group research tool)",
}


def fetch_reddit(
    subreddit_name: str,
    query: str,
    max_posts: int = 25,
    data_dir: str = "data/raw",
) -> List[Dict]:
    """Fetch posts and qualifying comments from a subreddit.

    Tries PRAW first (if credentials are set), otherwise falls back to
    Reddit's public JSON API which requires no authentication.
    """
    client_id = os.environ.get("REDDIT_CLIENT_ID")
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
    user_agent = os.environ.get("REDDIT_USER_AGENT")

    if all([client_id, client_secret, user_agent]):
        logger.info("Reddit credentials found — using PRAW for r/%s", subreddit_name)
        return _fetch_via_praw(
            subreddit_name, query, max_posts, data_dir,
            client_id, client_secret, user_agent,
        )

    logger.info(
        "No Reddit API credentials — using public JSON API for r/%s (query=%s)",
        subreddit_name, query,
    )
    return _fetch_via_public_json(subreddit_name, query, max_posts, data_dir)


def _fetch_via_praw(
    subreddit_name: str,
    query: str,
    max_posts: int,
    data_dir: str,
    client_id: str,
    client_secret: str,
    user_agent: str,
) -> List[Dict]:
    import praw

    reddit = praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        user_agent=user_agent,
    )

    results: List[Dict] = []
    try:
        subreddit = reddit.subreddit(subreddit_name)
        search_results = subreddit.search(query, sort="relevance", limit=max_posts)

        for submission in search_results:
            post_data = {
                "doc_id": f"reddit_post_{submission.id}",
                "title": submission.title,
                "text": submission.selftext,
                "score": submission.score,
                "url": f"https://reddit.com{submission.permalink}",
                "author": str(submission.author) if submission.author else "[deleted]",
                "date": str(submission.created_utc),
                "source_type": "reddit_post",
            }
            results.append(post_data)

            submission.comments.replace_more(limit=0)
            all_comments = submission.comments.list()

            qualified_comments = sorted(
                [c for c in all_comments if c.score > 5],
                key=lambda x: x.score,
                reverse=True,
            )[:20]

            for comment in qualified_comments:
                results.append({
                    "doc_id": f"reddit_comment_{comment.id}",
                    "text": comment.body,
                    "score": comment.score,
                    "author": str(comment.author) if comment.author else "[deleted]",
                    "date": str(comment.created_utc),
                    "parent_post_title": submission.title,
                    "url": f"https://reddit.com{comment.permalink}",
                    "source_type": "reddit_comment",
                })

            output_path = Path(data_dir) / f"reddit_{submission.id}.json"
            with open(output_path, "w") as f:
                json.dump(post_data, f, indent=2)

    except Exception as e:
        logger.warning("PRAW error fetching from r/%s: %s", subreddit_name, e)

    return results


def _fetch_via_public_json(
    subreddit_name: str,
    query: str,
    max_posts: int,
    data_dir: str,
) -> List[Dict]:
    """Scrape Reddit using the public .json endpoints (no auth required)."""
    results: List[Dict] = []

    search_url = f"https://www.reddit.com/r/{subreddit_name}/search.json"
    params = {
        "q": query,
        "restrict_sr": "on",
        "sort": "relevance",
        "limit": min(max_posts, 50),
        "t": "year",
    }
    logger.info("Reddit JSON search: %s  params=%s", search_url, params)

    try:
        resp = requests.get(search_url, headers=_HEADERS, params=params, timeout=15)
        logger.info("Reddit search response: status=%d, length=%d", resp.status_code, len(resp.text))
        resp.raise_for_status()
        listing = resp.json()
    except Exception as exc:
        logger.error("Reddit JSON search failed for r/%s: %s", subreddit_name, exc)
        return _fetch_subreddit_hot(subreddit_name, max_posts, data_dir)

    posts = listing.get("data", {}).get("children", [])
    logger.info("Reddit search returned %d posts for r/%s q=%s", len(posts), subreddit_name, query)

    if not posts:
        logger.info("Search returned 0 posts — falling back to hot posts in r/%s", subreddit_name)
        return _fetch_subreddit_hot(subreddit_name, max_posts, data_dir)

    for child in posts:
        post = child.get("data", {})
        post_id = post.get("id", "unknown")
        post_data = {
            "doc_id": f"reddit_post_{post_id}",
            "title": post.get("title", ""),
            "text": post.get("selftext", ""),
            "score": post.get("score", 0),
            "url": f"https://reddit.com{post.get('permalink', '')}",
            "author": post.get("author", "[deleted]"),
            "date": str(post.get("created_utc", "")),
            "source_type": "reddit_post",
        }
        results.append(post_data)

        output_path = Path(data_dir) / f"reddit_{post_id}.json"
        with open(output_path, "w") as f:
            json.dump(post_data, f, indent=2)

        results.extend(_fetch_post_comments(post, data_dir))

        time.sleep(1.0)

    logger.info("Reddit public JSON: fetched %d items from r/%s", len(results), subreddit_name)
    return results


def _fetch_subreddit_hot(
    subreddit_name: str,
    max_posts: int,
    data_dir: str,
) -> List[Dict]:
    """Fallback: grab hot posts from the subreddit without a search query."""
    results: List[Dict] = []
    hot_url = f"https://www.reddit.com/r/{subreddit_name}/hot.json"
    params = {"limit": min(max_posts, 25)}

    try:
        resp = requests.get(hot_url, headers=_HEADERS, params=params, timeout=15)
        logger.info("Reddit hot response: status=%d", resp.status_code)
        resp.raise_for_status()
        listing = resp.json()
    except Exception as exc:
        logger.error("Reddit hot fetch failed for r/%s: %s", subreddit_name, exc)
        return results

    posts = listing.get("data", {}).get("children", [])
    logger.info("Reddit hot returned %d posts for r/%s", len(posts), subreddit_name)

    for child in posts:
        post = child.get("data", {})
        if post.get("stickied"):
            continue
        post_id = post.get("id", "unknown")
        post_data = {
            "doc_id": f"reddit_post_{post_id}",
            "title": post.get("title", ""),
            "text": post.get("selftext", ""),
            "score": post.get("score", 0),
            "url": f"https://reddit.com{post.get('permalink', '')}",
            "author": post.get("author", "[deleted]"),
            "date": str(post.get("created_utc", "")),
            "source_type": "reddit_post",
        }
        results.append(post_data)

        output_path = Path(data_dir) / f"reddit_{post_id}.json"
        with open(output_path, "w") as f:
            json.dump(post_data, f, indent=2)

        results.extend(_fetch_post_comments(post, data_dir))

        time.sleep(1.0)

    return results


def _fetch_post_comments(post: dict, data_dir: str) -> List[Dict]:
    """Fetch top comments for a single post via the public JSON API."""
    permalink = post.get("permalink", "")
    if not permalink:
        return []

    comments_url = f"https://www.reddit.com{permalink}.json"
    results: List[Dict] = []

    try:
        resp = requests.get(comments_url, headers=_HEADERS, params={"limit": 20, "sort": "top"}, timeout=10)
        if resp.status_code != 200:
            return results
        data = resp.json()
    except Exception:
        return results

    if not isinstance(data, list) or len(data) < 2:
        return results

    comment_listing = data[1].get("data", {}).get("children", [])
    post_title = post.get("title", "")

    for child in comment_listing[:20]:
        if child.get("kind") != "t1":
            continue
        cdata = child.get("data", {})
        score = cdata.get("score", 0)
        if score <= 5:
            continue

        results.append({
            "doc_id": f"reddit_comment_{cdata.get('id', 'unknown')}",
            "text": cdata.get("body", ""),
            "score": score,
            "author": cdata.get("author", "[deleted]"),
            "date": str(cdata.get("created_utc", "")),
            "parent_post_title": post_title,
            "url": f"https://reddit.com{cdata.get('permalink', '')}",
            "source_type": "reddit_comment",
        })

    return results