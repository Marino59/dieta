# Guida all'uso di Google Stitch con l'Agente

Google Stitch è uno strumento di progettazione UI basato sull'intelligenza artificiale che consente di generare interfacce utente complete (codice React, Tailwind CSS, ecc.) partendo da descrizioni testuali o immagini.

Hai configurato un **Server MCP (Model Context Protocol)** per Stitch nel file `mcp_config.json`. Questo permette all'agente (me) di interagire direttamente con Stitch per generare e recuperare codice per il tuo progetto.

## 1. Stato Attuale della Configurazione

Attualmente, vedo la configurazione in `mcp_config.json` per il server `google-stitch` (usando `@_davideast/stitch-mcp` via npx), ma **il server non risulta attivo** nella mia sessione corrente.

> **Azione Richiesta:** Per attivare il server, prova a **riavviare l'agente** o ricaricare la finestra dell'IDE. Una volta riavviato, l'agente dovrebbe caricare i nuovi strumenti forniti dal server Stitch.

## 2. Cosa puoi fare con Stitch (tramite l'Agente)

Una volta attivo il server MCP, avrò accesso a strumenti specifici che mi permetteranno di:

*   **Generare Schermate (UI):** Creare nuove interfacce da zero basandosi su una descrizione in linguaggio naturale.
*   **Recuperare Codice:** Scaricare il codice React/Tailwind di una schermata creata sull'interfaccia web di Stitch.
*   **Estrarre Contesto di Design:** Analizzare una schermata esistente per riutilizzarne lo stile.
*   **Gestire Progetti:** Creare e listare progetti e schermate.

### Esempi di richieste che potrai farmi:

*   *"Crea una schermata di login moderna per la mia app Dieta usando Stitch."*
*   *"Prendi il codice della schermata 'Home' dal mio progetto Stitch e salvalo in `app/page.js`."*
*   *"Usa lo stile della schermata 'Dashboard' per generare una nuova pagina 'Impostazioni'."*

## 3. Workflow Consigliato

1.  **Assicurati che il server sia attivo.** Se vedi errori relativi a strumenti mancanti ("tool not found"), è probabile che il server MCP non sia partito.
2.  **Autenticazione:** Il server MCP potrebbe richiedere l'autenticazione tramite Google Cloud (`gcloud auth login` o Application Default Credentials) se la chiave API non è sufficiente. Controlla i log se la connessione fallisce.
3.  **Usa l'interfaccia Web (Opzionale):** Puoi usare Stitch via browser per iterare visivamente e poi chiedere a me di importare il risultato finale.

## 4. Risoluzione Problemi

Se continuo a non vedere gli strumenti di Stitch dopo il riavvio:
*   Verifica che la chiave API in `mcp_config.json` sia corretta.
*   Verifica di avere `node` e `npm` installati correttamente nel sistema, dato che il server viene lanciato con `npx`.
*   Controlla se il pacchetto `@_davideast/stitch-mcp` richiede parametri aggiuntivi o versioni specifiche di Node.js.
