---
doc_id: doc_reddit_post_dc030c44
canonical_product: nvidia_6090_gpu
source_type: reddit_post
source_url: https://reddit.com/r/hardware/comments/1q5d97x/a_discussion_on_the_announced_specs_of_rubin_vs/
title: A Discussion on the Announced Specs of Rubin vs Blackwell and how that could
  translate to Consumer Chips
published_at: '1767688617.0'
author: ResponsibleJudge3172
language: en
retrieved_at: '2026-04-19T19:14:06.002321Z'
---

Unlike with the launch of B100, Nvidia has released a more extensive PR with hardware specs. The most interesting for now being transistor density improvements, compute uplift across FP64, FP32, FP 8\* (specifically in training), and NVFP 4\* (specifically in inference). I will first explore the uplifts and my understanding of the ceiling of possible improvements in client GPUs given the hardware constraints and design achievements. I understand client and datacenter are not necessarily the same, but the last 2 gens of GPUs have had both using the same node family and there is like 5% difference between top of the line 3nm and base N3E even if we have a similar case to day where datacenter uses top of the line while client uses the basic in Blackwell. Blackwell datacenter uses a custom TSMC N4P while client uses custom N5P/N4. The improvements of Rubin datacenter vs Blackwell could be achieved by hypothetical client GPU vs 5090, as long as the 6090 has the same die size as 5090 and equal or more memory bandwidth. I will assume they compare B100 vs R100 in my analysis.

Rubin has 60% higher density and unknown clock speeds.

  
TLDR; A client Rubin with similar design achievements, could achieve 45-60% higher performance. Depending on the focus on RT cores, etc and whether a 6090 would be same die size as 5090. This 45% average is accross the stack from 6060 to 6090.  

Hopper vs Blackwell VS Rubin

Vector Performance

FP64: 34 vs 40 vs 33

FP32:  67 vs 80 vs 130

FP16 (Assumed, its my guess for Rubin): 134 vs 160 vs 260

  
Matrix/Tensor Performance

FP64: 67 vs 150\* vs 200\*

FP32: 495 vs 227\* vs 400\*

FP8(training):4PF vs 5PF vs 17.5PF

NVFP4(Inference): N/a vs 10 vs 50\*

SFU in the SM increased by 2X

\-Stuff with the \* is stated to be emulated. They didn't say how, but likely they seem to be quoting Ozaki scheme, which allows tensor cores to emulate any precision of compute with stated bit level accuracy. You can ignore those vs Hopper, but can compare vs Blackwell since it shows improved throughput of Tensor core In8, which has always been equal to FP8 in throoughput. So it likely shows FP8 improvements as well, which is useful with the new DLSS 4.5. Ozaki scheme for context, and yes its not an AI emulation in the sense you are used to. Nvidia likely wishes that Ozaki would help in games I bet.

[https://journals.sagepub.com/doi/10.1177/10943420241313064](https://journals.sagepub.com/doi/10.1177/10943420241313064)

Now the Gaming GPU part:

FP32 performance was improved by 63%. Tensor cores in FP8 by 3X. Client tensor cores are usuallly nerfed in overall throughput so hard to say. Maybe 2X. SFU which handles stuff like square root (which was extremely useful for Doom for example) by 2X.

For context, 4080 increased FP32 vs 3080 by 63% so a 6080 with same die size would as 5080 would achieve a similar uplift as 4080 vs 3080. Which was 50%. Maybe more since blackwell swims in too much bandwidth, the exact opposite of rtx 40. Bandwidth being a major source of rtx 50's uplift over rtx 40 as it is.

It's been a while since we looked at per SM change in SFU, no idea how it would help in modern gaming workloads.

In RT core, historically the biggest use of transistors seems to be when making new features. Like rtx 40 with new OMM, DMM and rtx 50 which expanded on this a lot, such that they sacrificed the rest of the SM to make a simpler ALU design to allocate the transistor budget freed for the RT cores. If rtx 60 RT cores continue to add new acceleration structures, then overall "raw" performance goes down to maybe 40% for top end. Otherwise if throughput is the focus, overall "raw" performance could be closer to 50%. If 6090 is reduced in size to the size of 4090, then top performance could be 30% gain. Of course TFLOPs don't line exactly with new architectures due to bottlenecks being improved and shifting elsewhere in the GPU when it comes to gaming.

Hypothetical line up:

6090 (RB102): 220 SM, 3ghz (3.2 boost), 512 bit bus 36gbps GDDR7 (48GB VRAM)

6080 (RB103): 96 SM (even though it should be 108 by now), 3.2ghz+ for 80TFLOPS, 256 bit bus 36gbps GDDR7 (24 GB VRAM) for 1.15TB/s perf. roughly just below 5090 or equal

6070ti (RB103): 84 SM, 3.2ghz+ for 70TFLOPS, 192 bit bus 36gbps GDDR7 (18GB VRAM) for 864GB/s perf. roughly 5% faster than 4090

6070 (RB105): 60 SM, 3.2ghz+ for 50TFLOPS ghz, 192 bit bus 36gbps GDDR7 (18GB VRAM) for 864TB/s perf. roughly just below or equal to 5080

6060ti (RB106): 48SM, 3.2ghz+ for 40TFLOPS , 128 bit bus 36gbps GDDR7 (12GB VRAM) for 576 GB/s perf. roughly equal to rx 9070/rtx 4070ti, or rx 7900XT

6060 (RB106): 36SM, 3.2ghz+ for 30TFLOPS, 128 bit bus 36gbps GDDR7 (12GB VRAM) for 576 GB/s perf. roughly equivalent to 4070S or 3080ti

6050 (RB107): 24SM, 3.2ghz+ for 20TFLOPS, 96 bit bus 32gbps GDDR7 (9GB VRAM, reviewers would have a ffield day with this one) for 386 GB/s perf. equivalent to rx 9060XT. Or if they downclock as usual, than maybe rtx 3070