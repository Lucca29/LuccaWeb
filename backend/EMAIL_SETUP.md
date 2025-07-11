# Configuration Email - Formulaire de Contact

## Configuration Gmail

Pour que le formulaire de contact fonctionne, vous devez configurer l'authentification Gmail :

### 1. Activer l'authentification à 2 facteurs
- Allez dans les paramètres de votre compte Google
- Activez l'authentification à 2 facteurs

### 2. Générer un mot de passe d'application
- Allez dans "Sécurité" > "Mots de passe d'application"
- Sélectionnez "Autre (nom personnalisé)" et nommez-le "Agence Lucca"
- Copiez le mot de passe généré (16 caractères)

### 3. Configuration des variables d'environnement
Créez un fichier `.env` dans le dossier `backend/` avec :

```env
# Configuration Email (Gmail)
EMAIL_USER=luccads.contact@gmail.com
EMAIL_PASS=votre_mot_de_passe_application_gmail
```

### 4. Test du formulaire
Une fois configuré, le formulaire de contact :
- Envoie un email détaillé à `luccads.contact@gmail.com`
- Envoie un email de confirmation automatique au client
- Inclut toutes les informations du formulaire
- Limite les envois à 3 par IP toutes les 15 minutes

### 5. Redémarrage du serveur
Après configuration, redémarrez le serveur :
```bash
npm run pm2:restart
```

## Fonctionnalités

✅ **Validation des champs** : Nom, email, service et message requis  
✅ **Validation email** : Format email vérifié  
✅ **Rate limiting** : Protection contre le spam  
✅ **Email de confirmation** : Envoi automatique au client  
✅ **Email détaillé** : Toutes les informations du formulaire  
✅ **Gestion d'erreurs** : Messages d'erreur clairs  
✅ **Interface utilisateur** : Feedback visuel pendant l'envoi  

## Endpoint API

`POST /api/contact/send`

**Corps de la requête :**
```json
{
  "name": "Nom du client",
  "email": "email@exemple.com",
  "phone": "06 12 34 56 78",
  "company": "Entreprise",
  "service": "site-vitrine",
  "budget": "1000-3000",
  "message": "Description du projet"
}
```

**Réponse de succès :**
```json
{
  "success": true,
  "message": "Votre message a été envoyé avec succès !"
}
``` 