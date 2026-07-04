# FamilyQuest Engine 1.2

## Novità

- Lumi ora cambia espressione in base al momento.
- Rimossi testi tecnici visibili ai giocatori.
- Dialoghi missione più immersivi.
- Editor con generatore automatico di dialoghi/indizi.
- Base pronta per collegare IA vera in futuro.

## IA vera nell'editor

Su GitHub Pages puro non conviene usare una vera API AI, perché la chiave sarebbe pubblica.
La soluzione corretta sarà una piccola funzione backend sicura, ad esempio:
- Netlify Functions
- Vercel Functions
- Cloudflare Worker

Per ora l'editor usa generazione automatica a template, già utile per creare nuove missioni senza scrivere tutto da zero.
