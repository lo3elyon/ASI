---
title: I build AI agents. Here is what scares me a little
excerpt: From the inside of a hackathon, you see how fast agents are getting and how little anyone checks what they do.
date: 2026-10-29
tags: agents, personal
cover: cover-watch
---

Most of my weekends go into hackathons. I build agents that browse the web, write code, fill forms and call tools. It is the most fun I have had with computers.

It also showed me something that I think more people should know.

## Agents are getting good fast

Two years ago an agent would get lost after a few steps. Now I can give one a task that takes a human an hour and it often finishes. Research groups like METR measure this properly and have found the length of tasks agents can complete has been growing quickly.

That is exciting for productivity. It also means we are handing more and more real actions to systems we do not fully understand.

## Nobody checks most of it

In a hackathon, nobody audits what your agent does. It has your API keys, it can send emails, it can run shell commands. If it does something weird, you usually notice only if it breaks.

Now scale that to a company with thousands of agents running all day. Or a lab where agents write the code that trains the next model. That is exactly the setting AI control was designed for. It is why I care about monitoring, logging and permissions much more than I used to.

## Small habits I follow now

1. Give agents the least access they need.
2. Log every action and read the logs sometimes.
3. Put a human approval step before anything that spends money or sends messages.
4. Test with tricky inputs, like a web page that tries to give the agent new instructions.

These are tiny versions of the same ideas the big labs use. If you build agents too, start with them.

## Why only a little scared

Because I also see how much good these tools can do, and how many smart people are working on safety. Fear is useful when it makes you careful. It is useless when it makes you freeze. I choose careful.
