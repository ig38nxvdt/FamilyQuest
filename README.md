# FamilyQuest — Retrone Memories v4

## Correzioni v4

- Foto principale di ogni missione: dettaglio da fotografare.
- Tasto Aiutino: apre solo la foto grandangolare.
- Cache aggiornata a v4 per evitare che GitHub Pages/iPhone mostrino la vecchia versione.
- Scanner foto più severo in modalità automatica.
- Modalità assistita disponibile dalle Opzioni.
- Le immagini hanno `?v=4` per forzare aggiornamento.

## Riconoscimento foto

Questa versione usa un controllo locale migliorato:
- istogramma colore
- hash luminosità
- controllo crop centrale

Non usa server. Non è ancora AI vera con TensorFlow.js: quella sarà la prossima versione se vuoi il salto serio.

## GitHub Pages

Carica tutti i file nella root del repository. Dopo il commit, su iPhone apri il sito e se vedi ancora vecchie immagini fai:
Safari → ricarica pagina, oppure rimuovi e riaggiungi l’app dalla schermata Home.
