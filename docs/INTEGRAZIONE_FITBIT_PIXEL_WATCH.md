# Integrazione App Dieta con Pixel Watch / Fitbit

## Obiettivo
Usare l'applicazione **Dieta** come strumento rapido e intelligente per registrare i pasti (scattando una foto o scrivendo una breve descrizione, analizzata dall'AI con calorie e macronutrienti), ed **inviarli automaticamente all'account Fitbit / Google Health**.

In questo modo:
- Sul **Pixel Watch** e nell'app **Fitbit** avrai sempre il computo aggiornato delle calorie consumate vs calorie ingerite.
- Eviti l'inserimento manuale e noioso del cibo nell'app di Fitbit.
- Su Android, i dati si sincronizzeranno a cascata anche su **Google Connessione Salute (Health Connect)**.

---

## Come funziona il flusso (User Experience)
1. **Scatto o descrizione**: Nell'app Dieta inserisci il pasto (foto del piatto o testo, es. *"Petto di pollo ai ferri con insalata e 50g di pane"*).
2. **Analisi AI**: Gemini calcola calorie, proteine, carboidrati e grassi.
3. **Sincronizzazione**: Al salvataggio, un interruttore (o invio automatico) invia il pasto a Fitbit tramite le sue API ufficiali (`foods/log.json`).
4. **Risultato immediato**: Aprendo l'app Fitbit o guardando il quadrante del Pixel Watch, il cerchio delle calorie e i nutrienti risulteranno aggiornati.

---

## I passi operativi

### 1. Registrazione App su Fitbit (Porta Sviluppatori)
- Accedere al portale sviluppatori: [dev.fitbit.com](https://dev.fitbit.com) con l'account Google associato al Pixel Watch.
- Creare una nuova applicazione ("Register An App") per ottenere:
  - `OAuth 2.0 Client ID`
  - `Client Secret`
  - Impostare `Callback URL` (Redirect URI)
  - `Default Access Type`: Read & Write

### 2. Implementazione nel codice di Dieta
- **Autenticazione OAuth 2.0**: Flusso di autorizzazione con permessi nutrizionali (`scope: nutrition activity`).
- **Endpoint/Client API di sincronizzazione**: Chiamata a `https://api.fitbit.com/1/user/-/foods/log.json` con dati pasto e macronutrienti.
- **Interfaccia Utente**:
  - Sezione nelle Impostazioni per collegare/scollegare l'account Fitbit.
  - Indicatore di sincronizzazione o opzione rapida di invio al momento del salvataggio pasto.
