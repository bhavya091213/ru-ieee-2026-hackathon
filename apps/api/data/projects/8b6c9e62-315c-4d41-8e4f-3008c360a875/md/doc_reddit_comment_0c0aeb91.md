---
doc_id: doc_reddit_comment_0c0aeb91
canonical_product: nvidia_6090_gpu
source_type: reddit_comment
source_url: https://reddit.com/r/hardware/comments/1q5d97x/a_discussion_on_the_announced_specs_of_rubin_vs/ny159ca/
title: A Discussion on the Announced Specs of Rubin vs Blackwell and how that could
  translate to Consumer Chips
published_at: '1767717065.0'
author: -protonsandneutrons-
language: en
retrieved_at: '2026-04-19T19:31:07.936523Z'
---

Super exciting to see Vera CPU details. This will now be the sixth major microarchitecture design group with actually shipping hardware:

1. Intel - x86
2. AMD - x86
3. Apple - Arm
4. Qualcomm - Arm
5. Arm - Arm
6. **NVIDIA - Arm**

Of course, smaller players like Fujitsu on Arm, Ampere on Arm, IBM on PowerISA, all the RISC-V groups, etc.

&gt;At the heart of the Vera CPU are 88 NVIDIA custom Olympus cores, **designed for high single-thread performance and energy efficiency with full Arm-compatibility**. **The cores employ a wide, deep microarchitecture with improved branch prediction, prefetching, and load-store performance, optimized for control-heavy and data-movement-intensive workloads.**

&gt;Vera introduces Spatial Multithreading, a new type of multithreading that runs two hardware threads per core by physically partitioning resources instead of time-slicing, enabling a run-time tradeoff between performance and efficiency.. This approach increases throughput and virtual CPU density while maintaining predictable performance and strong isolation, a critical requirement for multi-tenant AI factories

&gt; Vera supports the Arm v9.2 architecture and integrates seamlessly with the Arm software ecosystem. Major Linux distributions, AI frameworks, and orchestration platforms run unmodified, allowing existing infrastructure software to scale onto Vera-based systems without disruption.

In some ways, this will be another heavy blow to x86: if NVIDIA has devoted this much time &amp; effort on a custom uArch, they are in this for the long haul.