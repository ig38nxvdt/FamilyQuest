# FamilyQuest Engine 1.0

Rifondazione pulita del progetto.

## Cosa cambia

- Architettura a moduli:
  - AudioManager
  - RecognitionEngine
  - SaveManager
  - GameLogic
- Scanner riscritto per iPhone:
  - riduce subito la foto
  - non salva Base64 pesanti
  - usa canvas piccolo 96×96
  - niente album fotografico pesante
- Audio reale MP3
- Inventario, trofei, diario, eventi casuali, editor base
- Tutto statico e compatibile con GitHub Pages

## Pubblicazione

Carica tutti i file nella root del repository GitHub.
Poi Settings → Pages → Deploy from branch → main → root.

## Test su iPhone

1. Apri il link da Safari.
2. Non usare subito l'icona vecchia in Home.
3. Vai su Opzioni → Prova audio.
4. Lascia Scanner assistito spento per test reale.
5. Prova Missione 1 con foto giusta e poi foto sbagliata.

Se avevi l'app vecchia in Home, rimuovila e aggiungila di nuovo.
