from __future__ import annotations

import random

DEMO_CHUNKS: list[dict] = [
    # --- camera (10) ---
    {"chunk_id": "mock-camera-01", "text": "The 200MP main sensor captures incredible detail in daylight. Zooming in shows textures I've never seen on a phone before.", "facet": "camera", "stance": "positive", "community_id": "community-camera-pos"},
    {"chunk_id": "mock-camera-02", "text": "Night mode is a massive step up from last year. Low-light shots are crisp and the noise reduction doesn't smear details.", "facet": "camera", "stance": "positive", "community_id": "community-camera-pos"},
    {"chunk_id": "mock-camera-03", "text": "The 5x optical zoom is genuinely useful. I was skeptical but the periscope lens delivers sharp results even at full extension.", "facet": "camera", "stance": "positive", "community_id": "community-camera-pos"},
    {"chunk_id": "mock-camera-04", "text": "HDR processing is way too aggressive. Shadows get lifted to the point where photos look flat and unrealistic.", "facet": "camera", "stance": "negative", "community_id": "community-camera-neg"},
    {"chunk_id": "mock-camera-05", "text": "Video stabilization is terrible above 4K. At 8K the footage looks like jello. Basically unusable for action shots.", "facet": "camera", "stance": "negative", "community_id": "community-camera-neg"},
    {"chunk_id": "mock-camera-06", "text": "The selfie camera is just okay. Portrait mode cutouts still struggle with hair edges, especially in complex backgrounds.", "facet": "camera", "stance": "mixed", "community_id": "community-camera-neg"},
    {"chunk_id": "mock-camera-07", "text": "Rumor has it the next model will get a 1-inch sensor from Sony. If true, that would be a game changer for mobile photography.", "facet": "camera", "stance": "rumor", "community_id": "community-camera-pos"},
    {"chunk_id": "mock-camera-08", "text": "Compared side by side, the camera beats the iPhone in zoom but loses in video color science. Pick your priority.", "facet": "camera", "stance": "review", "community_id": "community-camera-pos"},
    {"chunk_id": "mock-camera-09", "text": "Pro mode gives you full manual control including shutter speed and ISO. Great for enthusiasts who want to tweak settings.", "facet": "camera", "stance": "positive", "community_id": "community-camera-pos"},
    {"chunk_id": "mock-camera-10", "text": "The macro lens is basically a gimmick. 2MP sensor produces blurry images that look worse than cropping from the main camera.", "facet": "camera", "stance": "negative", "community_id": "community-camera-neg"},
    # --- battery (8) ---
    {"chunk_id": "mock-battery-01", "text": "Easily gets me through a full day of heavy use. I end the day with 20-30% remaining which is way better than my old phone.", "facet": "battery", "stance": "positive", "community_id": "community-battery"},
    {"chunk_id": "mock-battery-02", "text": "The 5000mAh battery is massive and it shows. Two day battery life is realistic if you keep screen brightness reasonable.", "facet": "battery", "stance": "positive", "community_id": "community-battery"},
    {"chunk_id": "mock-battery-03", "text": "Charging speed is disappointing. 25W in 2025 is embarrassing when competitors offer 100W+. Takes over an hour for a full charge.", "facet": "battery", "stance": "negative", "community_id": "community-battery"},
    {"chunk_id": "mock-battery-04", "text": "Wireless charging works but its painfully slow. I gave up and went back to cable. Not worth the convenience trade-off.", "facet": "battery", "stance": "negative", "community_id": "community-battery"},
    {"chunk_id": "mock-battery-05", "text": "Battery drain during GPS navigation is brutal. Lost 30% in a 45-minute drive with the screen on. Barely usable for road trips.", "facet": "battery", "stance": "negative", "community_id": "community-battery"},
    {"chunk_id": "mock-battery-06", "text": "The adaptive battery feature actually works well. It learns your usage patterns and limits background apps effectively.", "facet": "battery", "stance": "positive", "community_id": "community-battery"},
    {"chunk_id": "mock-battery-07", "text": "Battery life is good for normal use but gaming destroys it. Expect 3-4 hours of intensive gaming before you need a charger.", "facet": "battery", "stance": "mixed", "community_id": "community-battery"},
    {"chunk_id": "mock-battery-08", "text": "Reverse wireless charging is a nice touch for topping up earbuds. Not a game changer but a solid convenience feature.", "facet": "battery", "stance": "positive", "community_id": "community-battery"},
    # --- price (8) ---
    {"chunk_id": "mock-price-01", "text": "At $1,299 this is getting ridiculous. Flagship prices have gone up $200 in three years and the improvements don't justify it.", "facet": "price", "stance": "negative", "community_id": "community-price"},
    {"chunk_id": "mock-price-02", "text": "The trade-in program actually makes this affordable. Got $600 for my old phone so the upgrade was only $699 out of pocket.", "facet": "price", "stance": "positive", "community_id": "community-price"},
    {"chunk_id": "mock-price-03", "text": "Compared to the competition, the base model is actually competitively priced. You get more storage and better specs per dollar.", "facet": "price", "stance": "positive", "community_id": "community-price"},
    {"chunk_id": "mock-price-04", "text": "The 256GB model is the sweet spot. The 128GB base is too small and the 512GB is overpriced. Mid tier is the way to go.", "facet": "price", "stance": "review", "community_id": "community-price"},
    {"chunk_id": "mock-price-05", "text": "I'm waiting for the inevitable holiday sale. Last year they dropped $200 by Black Friday. No reason to pay full price at launch.", "facet": "price", "stance": "mixed", "community_id": "community-price"},
    {"chunk_id": "mock-price-06", "text": "For what you get this is still expensive. My mid-range phone does 90% of what this does for literally half the price.", "facet": "price", "stance": "negative", "community_id": "community-price"},
    {"chunk_id": "mock-price-07", "text": "The monthly payment plan makes it manageable. $36/month over 36 months is doable for most people even if the total is high.", "facet": "price", "stance": "mixed", "community_id": "community-price"},
    {"chunk_id": "mock-price-08", "text": "Resale value is excellent. These phones hold their value way better than Android competitors so the effective cost is lower.", "facet": "price", "stance": "positive", "community_id": "community-price"},
    # --- design (8) ---
    {"chunk_id": "mock-design-01", "text": "The titanium frame feels incredible in hand. It's lighter than stainless steel and has this nice brushed texture.", "facet": "design", "stance": "positive", "community_id": "community-design"},
    {"chunk_id": "mock-design-02", "text": "It's too big and too heavy for one-handed use. I miss the compact flagship days. Not everyone has giant hands.", "facet": "design", "stance": "negative", "community_id": "community-design"},
    {"chunk_id": "mock-design-03", "text": "The new color options are stunning. The deep blue is subtle and professional. Finally moving past boring black and white.", "facet": "design", "stance": "positive", "community_id": "community-design"},
    {"chunk_id": "mock-design-04", "text": "Camera bump is enormous. The phone rocks on a flat surface and the bump collects dust. Needs a case to sit flat.", "facet": "design", "stance": "negative", "community_id": "community-design"},
    {"chunk_id": "mock-design-05", "text": "Screen bezels are practically non-existent. The display goes edge to edge and looks amazing for watching videos.", "facet": "design", "stance": "positive", "community_id": "community-design"},
    {"chunk_id": "mock-design-06", "text": "The matte back finish resists fingerprints beautifully. My old glossy phone looked disgusting after five minutes of use.", "facet": "design", "stance": "positive", "community_id": "community-design"},
    {"chunk_id": "mock-design-07", "text": "Build quality is top notch but there's nothing innovative here. Looks almost identical to last year's model. Boring evolution.", "facet": "design", "stance": "mixed", "community_id": "community-design"},
    {"chunk_id": "mock-design-08", "text": "IP68 water resistance gives me peace of mind at the pool. Accidentally dunked it and it was totally fine.", "facet": "design", "stance": "positive", "community_id": "community-design"},
    # --- privacy (6) ---
    {"chunk_id": "mock-privacy-01", "text": "On-device processing for photos and voice assistant is a big deal. My data never leaves the phone for most operations.", "facet": "privacy", "stance": "positive", "community_id": "community-privacy"},
    {"chunk_id": "mock-privacy-02", "text": "The new AI features require cloud processing which defeats the whole privacy promise. Can't have it both ways.", "facet": "privacy", "stance": "negative", "community_id": "community-privacy"},
    {"chunk_id": "mock-privacy-03", "text": "App tracking transparency is great but the company still collects tons of telemetry data themselves. Hypocritical honestly.", "facet": "privacy", "stance": "negative", "community_id": "community-privacy"},
    {"chunk_id": "mock-privacy-04", "text": "The privacy dashboard showing which apps accessed what is incredibly useful. Found three apps accessing my mic without reason.", "facet": "privacy", "stance": "positive", "community_id": "community-privacy"},
    {"chunk_id": "mock-privacy-05", "text": "End-to-end encrypted messaging and iCloud backup encryption make this the most private mainstream phone available.", "facet": "privacy", "stance": "positive", "community_id": "community-privacy"},
    {"chunk_id": "mock-privacy-06", "text": "I switched from Android primarily for the privacy features. The granular permission controls are years ahead.", "facet": "privacy", "stance": "positive", "community_id": "community-privacy"},
    # --- ecosystem (5) ---
    {"chunk_id": "mock-ecosystem-01", "text": "AirDrop, Handoff, Universal Clipboard — the ecosystem integration is why I stay. Switching to Android would break all my workflows.", "facet": "ecosystem", "stance": "positive", "community_id": "community-ecosystem"},
    {"chunk_id": "mock-ecosystem-02", "text": "The lock-in is getting worse. Now even basic features push you toward their subscription services. It's death by a thousand cuts.", "facet": "ecosystem", "stance": "negative", "community_id": "community-ecosystem"},
    {"chunk_id": "mock-ecosystem-03", "text": "Cross-device continuity for calls and messages is seamless. Start on phone, continue on tablet, finish on laptop.", "facet": "ecosystem", "stance": "positive", "community_id": "community-ecosystem"},
    {"chunk_id": "mock-ecosystem-04", "text": "Trying to use this phone with a Windows PC and Android tablet is painful. Everything is designed to punish mixed-ecosystem users.", "facet": "ecosystem", "stance": "negative", "community_id": "community-ecosystem"},
    {"chunk_id": "mock-ecosystem-05", "text": "The watch and earbuds integration is best in class. Auto-switching between devices actually works unlike every competitor.", "facet": "ecosystem", "stance": "positive", "community_id": "community-ecosystem"},
    # --- other (5) ---
    {"chunk_id": "mock-other-01", "text": "This is genuinely the best phone I've ever used. Everything just works and works well. Worth every penny of the upgrade.", "facet": "other", "stance": "positive", "community_id": "community-general"},
    {"chunk_id": "mock-other-02", "text": "Honestly I'm underwhelmed. The S-upgrade cycle is real. Skip this one and wait for next year's actual redesign.", "facet": "other", "stance": "negative", "community_id": "community-general"},
    {"chunk_id": "mock-other-03", "text": "The Pixel offers 90% of the experience at 60% of the price. Unless you need the ecosystem, there are better value options.", "facet": "other", "stance": "mixed", "community_id": "community-general"},
    {"chunk_id": "mock-other-04", "text": "Software updates for 7 years is a strong commitment. This phone will be relevant and secure long after you've forgotten the price.", "facet": "other", "stance": "positive", "community_id": "community-general"},
    {"chunk_id": "mock-other-05", "text": "Performance is blazing fast but I genuinely can't tell the difference from last year's chip in daily use. Benchmarks don't matter.", "facet": "other", "stance": "mixed", "community_id": "community-general"},
]


def mock_retrieve(
    query_facets: list[str],
    top_k: int = 10,
) -> list[dict]:
    if not query_facets:
        sample = random.sample(DEMO_CHUNKS, min(top_k, len(DEMO_CHUNKS)))
        return sample

    matched = [c for c in DEMO_CHUNKS if c["facet"] in query_facets]

    if len(matched) < top_k:
        remaining = [c for c in DEMO_CHUNKS if c["facet"] not in query_facets]
        pad = random.sample(remaining, min(top_k - len(matched), len(remaining)))
        matched = matched + pad

    return matched[:top_k]


def get_community_labels() -> dict[str, str]:
    labels: dict[str, str] = {}
    for chunk in DEMO_CHUNKS:
        labels[chunk["chunk_id"]] = chunk["community_id"]
    return labels
