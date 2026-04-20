# PanelForge Content & Marketing

## Directory Structure

```
apps/content/
├── linkedin/           # 7-day LinkedIn posting schedule
│   ├── day-1/post.md   # Hackathon experience (Text + Carousel)
│   ├── day-2/post.md   # Project idea & market gap (Text + Links)
│   ├── day-3/post.md   # UI/UX design deep dive (Text + Screenshots)
│   ├── day-4/post.md   # Data pipeline engineering (Text + GitHub)
│   ├── day-5/post.md   # AI infrastructure & agents (Text + Screenshots + GitHub)
│   ├── day-6/post.md   # Claude & GPT as dev tools (Text)
│   └── day-7/post.md   # Demo video & wrap-up (Video + Devpost)
├── resume/
│   └── bullet-points.md  # 110 STAR/XYZ format bullet points (categorized)
└── remotion-demo/        # Programmatic demo video (React + Remotion)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── Root.tsx
        ├── PanelForgeDemo.tsx
        └── scenes/         # 9 animated scenes
            ├── TitleScene.tsx
            ├── ProblemScene.tsx
            ├── SolutionScene.tsx
            ├── PipelineScene.tsx
            ├── PersonaScene.tsx
            ├── SimulationScene.tsx
            ├── DashboardScene.tsx
            ├── TechStackScene.tsx
            └── OutroScene.tsx
```

## Usage

### LinkedIn Posts
Each day's post is a self-contained markdown file with:
- Platform & format info
- Full post copy (ready to paste)
- Suggested media/images
- Engagement notes & strategy tips

### Resume Bullet Points
110 bullet points in Google XYZ / STAR format, categorized by:
- Workstream 1: Data Pipeline & Infrastructure (25 bullets)
- Workstream 2: AI Engine & Orchestration (37 bullets)
- Workstream 3: Frontend & Visualization (17 bullets)
- Cross-Cutting / Project-Level (16 bullets)
- Targeted Role Variants (9 bullets)
- Soft Skills & Leadership (5 bullets)

### Remotion Demo Video
```bash
cd apps/content/remotion-demo
npm install
npm start          # Opens Remotion Studio (preview)
npm run render     # Renders to out/demo.mp4
```

The video is a 90-second animated explainer with 9 scenes covering:
problem → solution → pipeline → personas → simulation → dashboard → tech stack → outro
