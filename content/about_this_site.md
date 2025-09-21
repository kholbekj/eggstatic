# About this site
This site was made with the minimalistic Parchment template. 

Static sites generally come in two flavors:
- Written as HTML, and served
- Written as templates, and built by a generator (such as jekyll, hugo, gatsby)

Parchment takes a middleway - you author content in markdown, but serve a single html file which does the parsing of markdown into html on the fly. 

## Tradeoffs

### Javascript
The main thing to call out is that currently, the website is unusable without javascript. That may or may not matter, depending on your audience.

I would ideally like to find _some_ workaround to this, but haven't thought hard about it yet.

### Simplicity
It's simpler to author than any of the other methods.

On a technical level, it's more complicated than authoring html, as javascript doing ajaxy navigation emulation is involved.

It is certainly more simple than a fullblown generator, but certain usecases may not be - ie styling the resulting html, embedding things, etc.

### Performance
This is a curious one. At the time of writing, the index page is under 50kb. This could be less if the page would not include the javascript to handle the markdown conversion. However, every subsequent pageload is markdown, which is smaller than HTML, and so with site usage the network performance gets better than any the other methods discussed.

As the client has to generate the HTML from markdown, this does incur a computational overhead on the client, but this seems negligible.

## Missing features
We're in early ideation still. I plan on adding
- ~~Simulated navigation + permalinking~~
- Some kind of fallback to no JS
- Some baseline header/footer templating
- Instructions on the capabilities of the markdown parser and your customization options
