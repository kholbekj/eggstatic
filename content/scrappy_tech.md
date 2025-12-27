# Scrappy Tech

I've been working on and off on a collection of projects for around a year now, and I think it's time to write a bit about what I'm onto here.

Last year, I stumbled on the question: could I build my dad a static website. He doesn't really need one these days, but he used to want a website, and I hated that the answer more or less had to be WordPress back then for him to actually author content.

Static sites are fantastic things, you can host them for free, they can be made in ways that don't break, and really, they just make sense. Why rely on server logic to do what a browser can do already?

The challenges, however, are many:

- Production of static sites is mostly technical. Either author in html/js/css, or use a generator, but these are not made for regular users.
- Understanding their limitations and workarounds requires technical expertise.
- Getting people started when WSIWYG online SaaS things exists is a tough sell.

However, I think the opportunities outweigh the challenges:

- Owning your own data and website
- Creating technical literacy if wanted
- Easy and free to host
- Won't disappear just because a provider does

## Eggstatic

I set out to create my first scrappy project, [eggstatic](https://eggstatic.site/).

It's a static website which allows the creation and editing of other static websites. That is, you can go there now, make your own site, download it and upload it to a host somewhere.

You don't need a code editor, you can just drag your zip back up into the eggstatic editor to edit it.

Further, to make the actual editing approachable for non-techies, it comes with a system that transforms markdown files into html content at runtime, meaning without a buildstep we can author simple markdown and create a website that way. It's pretty cool, if nothing else as a little prototype.

However, I wasn't completely satisfied with the zip file management.

## Drifting Ink

[drifting.ink](https://drifting.ink) is my own free static site host. I don't advertise it or anything, but it's basically a phoenix app that allows users to make an account and deploy static sites.

Why write my own host?

I found one critical capability missing in other free static site hosts: the ability to deploy in the browser. That is, a static site could not call an API and create a release of a website. Preposterous.

drifting.ink allows you to authorize via a browser redirect for a short-lived token, and then deploy sites via its API, all in CORS-friendly fashion.

The result is you can now go to eggstatic.site, create a new site, edit some text, click "deploy to drifting.ink" and your site is live. I think that's neat, even if I myself actually take advantage of it more or less exclusively via its CLI.

## Ledger

Static sites are fantastic for sites which behave statically. That is obvious. What is less obvious is they can be powerful dynamic sites, too, just in different ways than we're used to.

I was thinking about how I might execute an old pet project of mine without a backend (the project is a quick coop decision making app, I've previously implemented it in Rails), and I started experimenting with databases that are synced between browsers.

From that, [ledger](https://github.com/kholbekj/ledger) was born — sqlite + cr-sqlite compiled to WASM, using WebRTC to merge databases. Very awesome.

Ledger is a small piece of glue that effectively limits what you can do a lot, but gives you the kind of batteries we talk about in "batteries included" frameworks. You can plug in ledger and have a synced database via a token. [Try it out!](https://ledger.drifting.ink)

## Parchment

Ledger gave me the idea that if I could take eggstatic's markdown content system and bolt it onto a database, I'd essentially be able to make collaborative content editing systems with ease. But the first step was to extract from eggstatic the essence of that system, and make it more unobtrusive.

[parchment](https://github.com/kholbekj/parchment) is that extraction, a small library that takes marked.js and hooks up browser navigation via virtual query param paths.

## Signalling

WebRTC, of course, does need a bit of backend to work. Namely, a signalling endpoint is needed for clients to find each other. Currently I know of no better way to make the connection, but I made ledger with a simple protocol that is trivial to implement in many languages, it comes with an example server you can use, but just to make sure this is not a blocker for real software, I added a generic open signalling server to drifting.ink, found at wss://drifting.ink/ws/signal which anyone can use to make their distributed software. Just beware that using non-safe tokens, such as words, could result in interference and craziness.

## Scrappy Wiki

Finally, I had the components to create a demo that gives an impression of the kinds of things possible with static sites.

[Scrappy Wiki](https://github.com/kholbekj/scrappy_wiki) is a static-site, offline-first p2p wiki.

You can try it at [wiki.drifting.ink](https://wiki.drifting.ink)

Upon visiting the site, you can create new wikis identified by their token, and share links with others. These wikis are synced as soon as multiple clients are online at the same time. No sophisticated conflict avoidance algorithm is used here, to do this much better one would need to use CRDT at the page text level. But it does a basic wiki: version history, images, markdown, linking. And all of the content lives only in the browsers of its peers. Freaky!

# Why?

It's interesting (to me, anyway) why all this draws me in so much. Why I keep revisiting static sites.

I want to write more about my views on the technological dystopia the internet is becoming, and how it saddens me that users and makers are two different classes of people in it. And I think it gives me hope to create tools that can bridge that gap. Tools that can help spawn user-owned software, and software that decouples us from the grips of tech giants.

There are also interesting philosophical implications in this kind of software. The invention of bitcoin launched a deep investigation into what can be achieved with trustless decentralized systems.

I'm more curious what can be achieved with trustful decentralized systems. Ie. if we assume that a group of users is small enough to police themselves, what kind of collaborative software is possible to create for them? Removing the chains of the always-under-attack SaaS or the convoluted and expensive incentive systems of crypto-applications, what is the third way? Does it matter that software is insecure in all contexts? Do I need complex governance to run a family knowledge base, with calendars, chores, board-game leaderboards?

I want to build much more scrappy tech.

