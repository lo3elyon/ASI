---
title: AI control, explained like an exam hall
excerpt: The simplest way I found to explain trusted monitoring, audits and honeypots is a college exam with a strict invigilator.
date: 2026-10-29
tags: ai control, explainer
cover: cover-control
---

Every student in India knows the feeling of an exam hall. The invigilator walks up and down. Some students are honest. A few might try to cheat. The college does not know who is who, so it sets up rules that work either way.

That is basically **AI control**.

## The cast

Think of the powerful AI model as a brilliant student who might be cheating. We call it the **untrusted model**. It does great work, but we cannot see inside its head.

The invigilator is a **trusted model**. It is not as smart as the student, but we are confident it is not part of any plan. Its job is to watch everything and raise a flag when something looks off.

The principal is the **human auditor**. When the principal checks a paper carefully, cheating is almost always caught. But the principal has limited time and can only check a few papers.

## The rules of the hall

**Trusted monitoring.** The invigilator gives every answer sheet a suspicion score. The principal checks the most suspicious few. That is how you use a small audit budget wisely.

**Defer to trusted.** If a sheet looks a bit odd but not enough for the principal, you throw out that answer and use a simpler safe answer instead. You lose some marks, but you avoid the risk.

**Honeypots.** Suppose you let another top student act as invigilator because they are sharper. The risk is they help their friend cheat. So you secretly plant a few fake cheat sheets. If the student invigilator does not report them, you have caught the invigilator lying.

## Why I love this idea

Redwood Research, who proposed it, did not try to read the model's mind. They asked a simpler question. If the model were trying its hardest to sneak something past us, would our setup still catch it?

You test that with a **red team** playing the cheater and a **blue team** designing the rules. If the blue team still wins, the rules are strong.

I made a small game on the AI Control page where you are the blue team. Try it. You will quickly feel the real trade off: the more you audit and defer, the safer you are, but the less useful work you get. Real labs have to balance that every day.
